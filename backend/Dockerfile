FROM python:3.12-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies without cache
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Railway uses startCommand from railway.toml with $PORT
