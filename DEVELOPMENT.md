# Development Setup Guide

This guide will help you set up the Band Practice Partner application for local development.

## Prerequisites

- Node.js >= 20.0.0
- Python >= 3.12.0
- npm >= 10.0.0

## Quick Start

### 1. Install All Dependencies
```bash
npm run install:all
```

### 2. Development Mode (All Services)
```bash
npm run dev
```
This starts:
- Frontend dev server (usually port 5173)
- Backend dev server (port 3001 or next available)
- Audio processing service (port 5001)

### 3. Individual Services

#### Backend Only
```bash
npm run dev:backend
# Or directly in backend folder:
cd backend && npm run dev
```

#### Frontend Only
```bash
npm run dev:frontend
# Or directly in frontend folder:
cd frontend && npm run dev
```

#### Audio Processing Only
```bash
npm run dev:audio
# Or directly in audio-processing-service folder:
cd audio-processing-service && python app.py
```

## Port Configuration

If you encounter port conflicts, you can specify custom ports:

### Backend
```bash
PORT=3005 npm run dev:backend
# Or in backend folder:
cd backend && PORT=3005 npm run dev
```

### Frontend
The frontend dev server will automatically find an available port, usually starting from 5173.

## Available Scripts

### Root Level Scripts
- `npm run dev` - Start all services in development mode
- `npm run dev:frontend` - Start frontend dev server only
- `npm run dev:backend` - Start backend dev server only
- `npm run dev:audio` - Start audio processing service only
- `npm run build` - Build both frontend and backend
- `npm run start` - Start production backend only
- `npm run start:services` - Start backend + audio processing
- `npm install:all` - Install dependencies for all services

### Backend Scripts (in backend/ folder)
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run clear-audio-files` - Clear cached audio files
- `npm run clear-temp-files` - Clear temporary files
- `npm run cache-status` - Check cache status

### Frontend Scripts (in frontend/ folder)
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Environment Variables

### Backend (.env file in backend/ folder)
```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Audio Processing Service URL
AUDIO_PROCESSING_SERVICE_URL=http://localhost:5001

# Stripe Configuration (optional for donations)
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# File Handling
TEMP_STORAGE_PATH=./temp
MAX_FILE_SIZE=100MB
```

## Troubleshooting

### Port Already in Use
If you get "EADDRINUSE" errors:
1. Check what's using the port: `lsof -ti:3001`
2. Kill the process: `kill <process_id>`
3. Or use a different port: `PORT=3005 npm run dev:backend`

### Missing Dependencies
```bash
# Reinstall all dependencies
npm run install:all

# Or install individually
cd backend && npm install
cd ../frontend && npm install
cd ../audio-processing-service && pip install -r requirements.txt
```

### TypeScript Errors
```bash
# Rebuild backend
cd backend && npm run build
```

### Python/Audio Processing Issues
Make sure Python 3.12+ is installed and accessible:
```bash
python --version
# or
python3 --version
```

## Development Workflow

1. **Start Development Servers**:
   ```bash
   npm run dev
   ```

2. **Make Changes**:
   - Frontend changes auto-reload at http://localhost:5173
   - Backend changes auto-reload (nodemon)
   - Audio service needs manual restart

3. **Test Changes**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001/api/health
   - Audio Processing: http://localhost:5001/health

4. **Build for Production**:
   ```bash
   npm run build
   ```

## API Endpoints

### Backend (http://localhost:3001)
- `GET /api/health` - Health check
- `POST /api/download` - Download YouTube audio
- `POST /api/process` - Process audio for track separation
- `GET /api/tracks/:filename` - Serve separated track files
- `POST /api/donate/create-checkout-session` - Create Stripe donation session

### Audio Processing (http://localhost:5001)
- `GET /health` - Health check
- `POST /separate` - Separate audio tracks

## Tips

- Use `rs` in the backend terminal to manually restart nodemon
- Frontend hot reload works for most changes
- Check browser console for frontend errors
- Check terminal output for backend/audio processing errors
- Use the debug endpoint `/api/debug/paths` to troubleshoot file paths in production

## ✅ Development Setup Status

**COMPLETED**: All development services are properly configured and tested:

- ✅ **Audio Processing Service**: Running on port 5001 with virtual environment activation
- ✅ **Backend Service**: Running on port 3001 with correct audio service URL configuration  
- ✅ **Frontend Service**: Running on port 5173 with proper API connections
- ✅ **Port Configuration**: All services updated to use port 5001 for audio processing (avoiding macOS AirPlay conflicts)
- ✅ **Environment Variables**: Backend .env file updated with correct audio service URL
- ✅ **Documentation**: All documentation files updated with correct port references

The development environment is ready for use. Run `npm run dev` to start all services.