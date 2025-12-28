# Backend Dockerfile with YouTube download dependencies
FROM node:20-slim

# Install system dependencies for YouTube downloads
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp (better than youtube-dl)
RUN pip3 install --break-system-packages yt-dlp

# Set working directory
WORKDIR /app

# Copy package files and TypeScript configs first
COPY package*.json ./
COPY tsconfig*.json ./

# Set environment variable to skip Python check for youtube-dl-exec
ENV YOUTUBE_DL_SKIP_PYTHON_CHECK=1

# Install Node.js dependencies
RUN npm install --include=dev

# Copy source code
COPY . .

# Build TypeScript (run explicitly instead of relying on postinstall)
RUN npm run build

# Expose port
EXPOSE $PORT

# Start command
CMD ["npm", "start"]