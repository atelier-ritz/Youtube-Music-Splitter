# Multi-stage build for Band Practice App
FROM node:18-slim as frontend-builder

# Install frontend dependencies and build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production

COPY frontend/ ./
RUN npm run build

# Backend build stage
FROM node:18-slim as backend-builder

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ ./
RUN npm run build

# Python runtime stage
FROM python:3.12-slim as runtime

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js for backend
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Set working directory
WORKDIR /app

# Copy Python service
COPY audio-processing-service/ ./audio-processing-service/
RUN cd audio-processing-service && pip install --no-cache-dir -r requirements.txt

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package.json ./backend/

# Copy built frontend (served by backend)
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy root package.json and install concurrently
COPY package.json ./
RUN npm install --only=production

# Expose ports
EXPOSE 3001 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start services
CMD ["npm", "run", "start:services"]