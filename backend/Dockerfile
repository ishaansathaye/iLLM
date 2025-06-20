# backend/Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system build tools for pip dependencies
RUN apt-get update && \
    apt-get install -y build-essential gcc python3-dev libmupdf-dev pkg-config && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy your FastAPI app
COPY app ./app
COPY app/data ./app/data

# Expose port and run Uvicorn
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]