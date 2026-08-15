FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

RUN pip install --no-cache-dir uv

COPY pyproject.toml ./

RUN uv sync

COPY . .

CMD ["uv", "run", "python", "-m", "app.analyzer"]