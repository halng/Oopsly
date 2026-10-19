from app.config import Settings


def test_database_url_accepts_railway_and_plain_postgres():
    railway = Settings(database_url="postgres://user:pass@host:5432/oopsly")
    plain = Settings(database_url="postgresql://user:pass@host:5432/oopsly")
    driver = Settings(database_url="postgresql+psycopg://user:pass@host:5432/oopsly")
    assert railway.database_url_normalized() == "postgresql+psycopg://user:pass@host:5432/oopsly"
    assert plain.database_url_normalized() == "postgresql+psycopg://user:pass@host:5432/oopsly"
    assert driver.database_url_normalized() == "postgresql+psycopg://user:pass@host:5432/oopsly"
