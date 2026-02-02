# VelvetPOS Dockerfile
# Multi-stage build for production deployment

# Stage 1: Python dependencies
FROM python:3.9-slim as dependencies

WORKDIR /tmp

# Install dependencies
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Production image
FROM python:3.9-slim

WORKDIR /app

# Install production dependencies only
COPY --from=dependencies /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages

# Copy application files
COPY server/ ./server/
COPY client/ ./client/
COPY config/ ./config/

# Create logs directory
RUN mkdir -p logs

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "server.app:app"]
