FROM node:20-alpine AS builder

WORKDIR /app

# Khai báo argument và biến môi trường build API URL
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Copy package files
COPY frontend/package*.json ./
RUN npm ci --prefer-offline --no-audit

# Copy toàn bộ mã nguồn frontend
COPY frontend/ ./

# Build production bundle
RUN npm run build

# Stage 2: Serve với Nginx siêu nhẹ
FROM nginx:alpine

# Copy file cấu hình Nginx SPA + Reverse Proxy sang backend
COPY <<-"EOF" /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy các request /api sang Backend container
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy Swagger docs và OpenAPI schema
    location /docs {
        proxy_pass http://backend:8000/docs;
    }
    location /openapi.json {
        proxy_pass http://backend:8000/openapi.json;
    }

    # Proxy health check
    location /health {
        proxy_pass http://backend:8000/health;
    }
}
EOF

# Copy static assets từ build stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
