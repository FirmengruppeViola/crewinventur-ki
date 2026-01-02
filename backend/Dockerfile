FROM python:3.13-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies without cache
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8080

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
