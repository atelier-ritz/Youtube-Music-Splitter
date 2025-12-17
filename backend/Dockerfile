# Backend Dockerfile with YouTube download dependencies
FROM node:18-slim

# Install system dependencies for YouTube downloads
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp (better than youtube-dl)
RUN pip3 install --break-system-packages yt-dlp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
ENV YOUTUBE_DL_SKIP_PYTHON_CHECK=1
RUN npm install --include=dev

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE $PORT

# Start command
CMD ["npm", "start"]