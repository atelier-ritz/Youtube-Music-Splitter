# Docker Deployment Guide

This project has been migrated from nixpacks to Docker for better control and consistency across environments.

## Requirements

- **Node.js**: >= 20.0.0 (updated from 18 for compatibility)
- **Python**: >= 3.12.0
- **Docker**: Latest version
- **Docker Compose**: Latest version

## Architecture

The application consists of three main services:
- **Frontend**: React/Vite application (port 5173 in dev, served by backend in prod)
- **Backend**: Node.js/Express API server (port 3001)
- **Audio Service**: Python/Flask audio processing service (port 5001)

## Local Development

### Option 1: Docker Compose (Recommended)
```bash
# Start all services in development mode
npm run docker:dev

# Start in detached mode (background)
npm run docker:dev:detached

# Stop all services
npm run docker:stop

# Clean up containers, volumes, and images
npm run docker:clean
```

### Option 2: Individual Services
```bash
# Build and run individual services
cd frontend && docker build -t band-practice-frontend .
cd backend && docker build -t band-practice-backend .
cd audio-processing-service && docker build -t band-practice-audio .
```

## Production Deployment

### Railway (Current Platform)
The `railway.json` has been updated to use Docker:
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  }
}
```

### Local Production Build
```bash
# Build and run production container
npm run docker:build
npm run docker:run

# Or use docker-compose with production profile
npm run docker:prod
```

## Docker Configuration Files

- `Dockerfile` - Multi-stage production build (Node 20)
- `docker-compose.yml` - Development and production services
- `.dockerignore` - Optimizes build context
- Individual service Dockerfiles in each service directory

## Environment Variables

### Production (Railway)
- `PORT` - Set automatically by Railway
- `NODE_ENV=production`
- `YOUTUBE_DL_SKIP_PYTHON_CHECK=1` - Skips Python check for youtube-dl-exec

### Development
- Frontend: `PORT=5173`, `VITE_API_URL=http://localhost:3001`
- Backend: `PORT=3001`, `AUDIO_SERVICE_URL=http://audio-service:5001`, `YOUTUBE_DL_SKIP_PYTHON_CHECK=1`
- Audio Service: `PORT=5001`

## Build Optimization

The main Dockerfile uses multi-stage builds:
1. **Stage 1**: Build frontend (React/Vite) with Node 20
2. **Stage 2**: Build backend (TypeScript compilation) with Node 20 + Python
3. **Stage 3**: Runtime image with all services

Benefits:
- Smaller final image size
- Better caching
- Consistent builds across environments
- No nixpacks dependency
- Proper Node 20 support

## Troubleshooting

### Build Issues
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

### Node Version Issues
The project now requires Node 20+ due to dependency requirements. Make sure your local environment also uses Node 20:
```bash
node --version  # Should be >= 20.0.0
```

### Python/YouTube-DL Issues
The `YOUTUBE_DL_SKIP_PYTHON_CHECK=1` environment variable is set to handle youtube-dl-exec installation issues.

### Port Conflicts
```bash
# Check what's using ports
lsof -i :3001
lsof -i :5001
lsof -i :5173
```

### Service Communication
Services communicate via Docker network:
- Frontend → Backend: `http://backend:3001`
- Backend → Audio Service: `http://audio-service:5001`

## Migration from Nixpacks

Changes made:
1. ✅ Created main `Dockerfile` for production builds
2. ✅ Added `docker-compose.yml` for development
3. ✅ Updated `railway.json` to use Docker builder
4. ✅ Added `.dockerignore` for build optimization
5. ✅ Added Docker scripts to `package.json`
6. ✅ **Updated to Node 20** for dependency compatibility
7. ✅ **Added Python build dependencies** for youtube-dl-exec
8. ✅ **Set YOUTUBE_DL_SKIP_PYTHON_CHECK=1** environment variable

The application now has full control over the build process and dependencies, making it more reliable and easier to debug than the previous nixpacks setup.