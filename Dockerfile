# Build frontend
FROM node:25-alpine AS frontend-build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
RUN npm run build


# Production
FROM python:3.14-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx supervisor && \
    rm -rf /var/lib/apt/lists/*

# Install backend dependencies
WORKDIR /app

COPY backend/ ./
RUN pip install --no-cache-dir .

# Nginx
COPY --from=frontend-build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default

# Supervisord
COPY supervisord.conf /etc/supervisor/conf.d/app.conf

# Storage volume
RUN mkdir -p /app/storage
VOLUME /app/storage


RUN useradd -m appuser && \
    chown -R appuser:appuser /app && \
    chown -R appuser:appuser /var/log/nginx /var/lib/nginx /run
USER appuser

EXPOSE 8080

CMD ["supervisord", "-n", "-c", "/etc/supervisor/conf.d/app.conf"]
