# Docker Deployment Guide

This project has been migrated from nixpacks to Docker for better control and consistency across environments.

## Architecture

The application consists of three main services:
- **Frontend**: React/Vite application (port 5173 in dev, served by backend in prod)
- **Backend**: Node.js/Express API server (port 3001)
- **Audio Service**: Python/Flask audio processing service (port 5000)

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

- `Dockerfile` - Multi-stage production build
- `docker-compose.yml` - Development and production services
- `.dockerignore` - Optimizes build context
- Individual service Dockerfiles in each service directory

## Environment Variables

### Production (Railway)
- `PORT` - Set automatically by Railway
- `NODE_ENV=production`

### Development
- Frontend: `PORT=5173`, `VITE_API_URL=http://localhost:3001`
- Backend: `PORT=3001`, `AUDIO_SERVICE_URL=http://audio-service:5000`
- Audio Service: `PORT=5000`

## Build Optimization

The main Dockerfile uses multi-stage builds:
1. **Stage 1**: Build frontend (React/Vite)
2. **Stage 2**: Build backend (TypeScript compilation)
3. **Stage 3**: Runtime image with all services

Benefits:
- Smaller final image size
- Better caching
- Consistent builds across environments
- No nixpacks dependency

## Troubleshooting

### Build Issues
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

### Port Conflicts
```bash
# Check what's using ports
lsof -i :3001
lsof -i :5000
lsof -i :5173
```

### Service Communication
Services communicate via Docker network:
- Frontend → Backend: `http://backend:3001`
- Backend → Audio Service: `http://audio-service:5000`

## Migration from Nixpacks

Changes made:
1. ✅ Created main `Dockerfile` for production builds
2. ✅ Added `docker-compose.yml` for development
3. ✅ Updated `railway.json` to use Docker builder
4. ✅ Added `.dockerignore` for build optimization
5. ✅ Added Docker scripts to `package.json`

The application now has full control over the build process and dependencies, making it more reliable and easier to debug than the previous nixpacks setup.