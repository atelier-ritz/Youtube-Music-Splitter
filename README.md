# Band Practice Webapp

A web application that helps musicians practice with their band by providing audio track separation and playback control features. Users can download audio from YouTube videos, separate the audio into individual instrument tracks, and use interactive playback controls for focused practice sessions.

## Project Structure

```
band-practice-webapp/
├── frontend/                    # React TypeScript frontend with Vite
│   ├── src/
│   │   ├── components/         # React components (MainPage, etc.)
│   │   └── services/          # AudioPlayer service and utilities
├── backend/                    # Node.js Express backend with TypeScript
│   ├── src/
│   │   ├── routes/            # API routes (download, process, cache)
│   │   ├── services/          # Business logic services
│   │   └── utils/             # Utility functions
│   └── temp/                  # Temporary file storage
├── audio-processing-service/   # Local Demucs audio separation service
│   ├── app.py                 # Flask application
│   ├── uploads/               # Uploaded audio files
│   ├── separated/             # Separated track files
│   ├── temp/                  # Temporary processing files
│   └── venv/                  # Python virtual environment
├── package.json               # Root package.json for managing all projects
└── README.md
```

## Prerequisites

- Node.js (v20.19+ or v22.12+)
- Python 3.12+ (for audio processing service)
- npm or yarn
- curl (for cache management commands)

## Installation

### 1. Install Node.js Dependencies

Install all dependencies for both frontend and backend:

```bash
npm run install:all
```

Or install manually:

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
```

### 2. Set Up Audio Processing Service

The audio processing service uses Facebook's Demucs for high-quality audio separation:

```bash
cd audio-processing-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate     # On Windows

# Install dependencies
pip install flask flask-cors demucs librosa

# The service will automatically download the Demucs model on first use (~300MB)
```

## Development

### Start All Services

Start the complete development environment:

```bash
# Start backend (port 3001)
npm run dev:backend

# Start frontend (port 5173) - in another terminal
npm run dev:frontend

# Start audio processing service (port 8000) - in another terminal
cd audio-processing-service
source venv/bin/activate && python app.py
```

Or start them separately:

```bash
# Start backend only
npm run dev:backend

# Start frontend only
npm run dev:frontend
```

## Build

Build both projects:

```bash
npm run build
```

## Environment Configuration

Copy the example environment file and configure as needed:

```bash
cp backend/.env.example backend/.env
```

## Cache Management

The application provides several commands to manage cached audio files and free up disk space:

### NPM Scripts
```bash
# Clear all cached audio files (uploads, separated tracks, temp files)
npm run clear-audio-files

# Clear temporary files only from both backend and audio processing service
npm run clear-temp-files

# View current cache usage and file counts
npm run cache-status
```

### Cache Management Script
For easier usage with formatted output, use the provided shell script:

```bash
# Using npm script (recommended)
npm run cache status      # Show cache status with formatted output
npm run cache clear-all   # Clear all cached files
npm run cache clear-temp  # Clear temporary files only
npm run cache help        # Show help

# Or run script directly
chmod +x scripts/cache-management.sh  # Make executable (first time only)
./scripts/cache-management.sh status
./scripts/cache-management.sh clear-all
./scripts/cache-management.sh clear-temp
./scripts/cache-management.sh help
```

## API Endpoints

### Core Application
- `GET /api/health` - Health check endpoint
- `POST /api/download` - Download audio from YouTube URL
- `GET /api/download/:jobId` - Get download status
- `POST /api/process` - Start audio separation process
- `GET /api/process/:jobId` - Get processing status

### Cache Management
- `POST /api/cache/clear` - Clear all cached audio files
- `POST /api/cache/clear-temp` - Clear temporary files only
- `GET /api/cache/status` - Get cache status information

### Audio Processing Service (Port 8000)
- `GET /api/health` - Service health check
- `POST /api/process` - Upload and process audio file
- `GET /api/process/:jobId` - Get job status and results
- `GET /api/tracks/:jobId/:filename` - Serve separated track files
- `POST /api/cache/clear` - Clear all processing cache
- `POST /api/cache/clear-temp` - Clear temporary processing files
- `GET /api/cache/status` - Get processing service cache status

## Technology Stack

### Frontend
- React with TypeScript
- Vite for build tooling
- **AudioPlayer Service** - Web Audio API abstraction for multi-track playback
  - Individual track control (volume, pan, mute)
  - Synchronized playback across all tracks
  - Position tracking and seeking
  - Memory management with cache clearing
- Axios for HTTP requests

### Backend
- Node.js with Express
- TypeScript
- youtube-dl-exec for YouTube audio extraction
- Multer for file uploads
- CORS for cross-origin requests
- **Cache Management** - File cleanup and disk space management

### Audio Processing Service
- **Python Flask** - RESTful API server
- **Facebook's Demucs** - State-of-the-art AI audio source separation
  - htdemucs model for high-quality separation
  - Separates into: vocals, drums, bass, other instruments
- **Librosa** - BPM detection and audio analysis
- **Automatic Cleanup** - Files older than 24 hours are automatically removed

## Features

### ✅ Implemented
1. **YouTube Audio Download** - Extract audio from YouTube URLs
2. **Local Audio Processing** - High-quality track separation using Demucs AI
3. **Multi-track Audio Player** - Web Audio API-based player with individual track controls
4. **BPM Detection** - Automatic tempo detection for practice coordination
5. **Cache Management** - Disk space management with multiple clearing options
6. **File Management** - Automatic cleanup and secure file serving
7. **Error Handling** - Comprehensive error handling and user feedback

### 🔄 In Development
1. Track view interface components
2. Navigation cursor and timeline
3. Responsive design for mobile devices
4. Real-time audio control UI

### 📋 Planned
1. Practice session management
2. Audio effects and filters
3. Export and sharing features

## Usage

1. **Start all services** (backend, frontend, audio processing)
2. **Open the application** in your browser (typically http://localhost:5173)
3. **Enter a YouTube URL** in the input field
4. **Wait for processing** - the system will:
   - Download the audio from YouTube
   - Separate it into individual tracks using AI
   - Detect the BPM automatically
5. **Practice with separated tracks** using individual volume, pan, and mute controls
6. **Manage disk space** using the cache clearing commands when needed

## Performance Notes

- **Processing Time**: 2-5 minutes for typical 3-4 minute songs
- **Memory Usage**: 2-4GB during active processing
- **Disk Usage**: ~5x original file size during processing
- **Model Size**: ~300MB for Demucs model (downloaded automatically)
- **Cost**: $0 ongoing operational costs, unlimited usage

## Troubleshooting

### Audio Processing Service Issues
```bash
# Check if service is running
curl http://localhost:8000/api/health

# View service logs
cd audio-processing-service
source venv/bin/activate && python app.py

# Clear cache if disk space is low
npm run clear-audio-files
```

### Backend Issues
```bash
# Check backend status
curl http://localhost:3001/api/health

# View backend logs
npm run dev:backend
```

### Cache Management
```bash
# Check current disk usage
npm run cache-status

# Free up space
npm run clear-temp-files  # Clear temp files only
npm run clear-audio-files # Clear all cached files
```