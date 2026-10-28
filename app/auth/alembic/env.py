from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool, text

from alembic import context
from app import models  # noqa: F401
from app.config import settings
from app.db import AUTH_SCHEMA, Base

# Same lock id the Go service used, so old and new instances never migrate together.
ADVISORY_LOCK_ID = 727274

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url_normalized())
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url_normalized(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table_schema=AUTH_SCHEMA,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        # Instances start together: one migrates, the others wait, then do nothing.
        connection.execute(
            text("SELECT pg_advisory_lock(:id)"), {"id": ADVISORY_LOCK_ID}
        )
        connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {AUTH_SCHEMA}"))
        connection.commit()
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            version_table_schema=AUTH_SCHEMA,
        )
        try:
            with context.begin_transaction():
                context.run_migrations()
        finally:
            connection.rollback()
            connection.execute(
                text("SELECT pg_advisory_unlock(:id)"), {"id": ADVISORY_LOCK_ID}
            )
            connection.commit()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
