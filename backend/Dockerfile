FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV UV_PYTHON=3.12
ENV UV_PYTHON_DOWNLOADS=never

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock ./

RUN uv sync --python 3.12 --frozen

COPY . .

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--reload"]