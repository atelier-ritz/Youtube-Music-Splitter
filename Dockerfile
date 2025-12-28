# Multi-stage Dockerfile for Band Practice Webapp
# This builds all services and runs them together

# Stage 1: Build Frontend
FROM node:20-slim as frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-slim as backend-builder

# Install Python and system dependencies needed for backend build
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
COPY backend/package*.json ./

# Set environment variable to skip Python check for youtube-dl-exec
ENV YOUTUBE_DL_SKIP_PYTHON_CHECK=1

RUN npm install --include=dev
COPY backend/ ./
RUN npm run build

# Stage 3: Final runtime image
FROM node:20-slim

# Install system dependencies for all services
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    libsndfile1 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create Python virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Set working directory
WORKDIR /app

# Copy root package.json and install concurrently
COPY package*.json ./
RUN npm install

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY backend/src ./backend/src

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY --from=frontend-builder /app/frontend/node_modules ./frontend/node_modules
COPY --from=frontend-builder /app/frontend/package*.json ./frontend/
COPY frontend/vite.config.ts ./frontend/

# Copy audio processing service
COPY audio-processing-service/ ./audio-processing-service/

# Install Python dependencies for audio service
WORKDIR /app/audio-processing-service
RUN pip install --no-cache-dir -r requirements.txt

# Install yt-dlp for backend
RUN pip install --no-cache-dir yt-dlp

# Back to main directory
WORKDIR /app

# Set environment variables
ENV YOUTUBE_DL_SKIP_PYTHON_CHECK=1
ENV NODE_ENV=production

# Expose port (Railway will set this)
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:$PORT/api/health || exit 1

# Start all services
CMD ["npm", "start"]