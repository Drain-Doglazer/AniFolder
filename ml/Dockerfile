FROM python:3.12-slim AS service-deps
WORKDIR /service
ENV PYTHONUNBUFFERED=1 OPENBLAS_NUM_THREADS=1
COPY requirements-service.txt ./
RUN pip install --no-cache-dir -r requirements-service.txt
RUN useradd --create-home ml && mkdir -p artifacts && chown ml:ml artifacts
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1", "--log-config", "logging.json"]

FROM service-deps AS training-deps
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

FROM training-deps AS training
COPY app ./app
COPY logging.json ./
USER ml

# Последняя цель — лёгкий образ по умолчанию. Зависимости обучения не наследуются.
FROM service-deps AS serving
COPY app ./app
COPY logging.json ./
ENV ML_TRAINING_URL=http://ml-training:8001
USER ml
