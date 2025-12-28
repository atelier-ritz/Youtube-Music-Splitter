# Frontend Dockerfile for Railway
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use npm install instead of npm ci)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE $PORT

# Start the preview server
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "$PORT"]