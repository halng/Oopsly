FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml .
COPY app ./app
RUN pip install --no-cache-dir .

COPY alembic ./alembic
COPY alembic.ini .

RUN useradd --system --no-create-home appuser \
    && chown -R appuser /app
USER appuser

ENV PORT=9008
EXPOSE 9008

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
