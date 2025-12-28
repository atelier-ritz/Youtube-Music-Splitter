# Band Practice Partner

A web application that helps musicians practice with their band by providing audio track separation and playback control features. Users can download audio from YouTube videos, separate the audio into individual instrument tracks, and use interactive playback controls for focused practice sessions.

## 🎵 Features

- **YouTube Audio Download** - Extract high-quality audio from YouTube videos
- **AI-Powered Track Separation** - Separate songs into vocals, drums, bass, and other instruments
- **Professional DAW Interface** - Multi-track audio player with individual controls
- **Mobile-Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **Donation System** - Optional Stripe integration for user support
- **BPM Detection** - Automatic tempo detection for practice coordination
- **Real-time Controls** - Volume, pan, mute, and solo controls for each track
- **Timeline Navigation** - Click-to-seek timeline with visual playhead

## 🚀 Quick Start

### Prerequisites
- Node.js >= 20.0.0
- Python >= 3.12.0
- npm >= 10.0.0

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd Youtube-Music-Splitter

# Install all dependencies
npm run install:all
```

### Development
```bash
# Start all services (recommended)
npm run dev

# Or start services individually:
npm run dev:frontend   # Frontend dev server (port 5173)
npm run dev:backend    # Backend dev server (port 3001)
npm run dev:audio      # Audio processing service (port 5000)
```

### Production Build
```bash
npm run build
npm start
```

## 📁 Project Structure

```
Youtube-Music-Splitter/
├── frontend/                    # React TypeScript frontend with Vite
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── MainPage.tsx    # Landing page with URL input
│   │   │   ├── TrackView.tsx   # DAW interface with multi-track player
│   │   │   ├── DonationBanner.tsx # Stripe donation integration
│   │   │   └── ...
│   │   ├── services/          # AudioPlayer service and utilities
│   │   └── hooks/             # Custom React hooks
├── backend/                    # Node.js Express backend with TypeScript
│   ├── src/
│   │   ├── routes/            # API routes
│   │   │   ├── download.ts    # YouTube download handling
│   │   │   ├── process.ts     # Audio processing coordination
│   │   │   ├── donation.ts    # Stripe donation endpoints
│   │   │   └── ...
│   │   ├── services/          # Business logic services
│   │   └── middleware/        # Express middleware
├── audio-processing-service/   # Python Flask audio separation service
│   ├── app.py                 # Flask application with Demucs integration
│   ├── uploads/               # Uploaded audio files
│   ├── separated/             # AI-separated track files
│   └── requirements.txt       # Python dependencies
├── DEVELOPMENT.md             # Detailed development guide
├── STRIPE_SETUP.md           # Stripe donation setup guide
└── package.json              # Root package management
```

## 🛠️ Development

### Quick Development Setup
```bash
# Install all dependencies
npm run install:all

# Start all services in development mode
npm run dev
```

This starts:
- **Frontend**: http://localhost:5173 (with hot reload)
- **Backend**: http://localhost:3001 (with nodemon auto-restart)
- **Audio Processing**: http://localhost:5000 (Python Flask service)

### Individual Service Development
```bash
# Start services individually
npm run dev:frontend   # Frontend only (React + Vite)
npm run dev:backend    # Backend only (Node.js + Express)
npm run dev:audio      # Audio processing only (Python + Flask)
```

### Available Scripts
```bash
# Development
npm run dev            # Start all services
npm run dev:frontend   # Frontend dev server
npm run dev:backend    # Backend dev server  
npm run dev:audio      # Audio processing service

# Building
npm run build          # Build both frontend and backend
npm run build:frontend # Build frontend only
npm run build:backend  # Build backend only

# Production
npm start              # Start production backend
npm run start:services # Start backend + audio processing

# Utilities
npm run install:all    # Install all dependencies
npm run clear-audio-files  # Clear cached audio files
npm run clear-temp-files   # Clear temporary files
npm run cache-status       # Check cache usage
```

### Environment Configuration

#### Backend (.env in backend/ folder)
```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Audio Processing Service
AUDIO_PROCESSING_SERVICE_URL=http://localhost:5000

# Stripe Donation System (optional)
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# File Handling
TEMP_STORAGE_PATH=./temp
MAX_FILE_SIZE=100MB
```

See `DEVELOPMENT.md` for detailed development setup and troubleshooting.

## 🌐 Deployment

### Docker Deployment
```bash
# Build and run with Docker
docker build -t band-practice-webapp .
docker run -p 8080:8080 band-practice-webapp

# Or use Docker Compose
docker-compose up --build
```

### Railway Deployment
The application is configured for Railway deployment with:
- Multi-stage Docker build
- Automatic environment variable handling
- Health checks and monitoring

See `railway.json` for deployment configuration.

### Stripe Donation Setup
To enable the donation system:
1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard
3. Set environment variables:
   ```bash
   STRIPE_SECRET_KEY=sk_live_your_secret_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```
4. Configure webhook endpoint: `https://your-domain.com/api/donate/webhook`

See `STRIPE_SETUP.md` for detailed setup instructions.

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

## 🎛️ API Endpoints

### Backend API (http://localhost:3001)
```bash
# Core Application
GET  /api/health                    # Health check
POST /api/download                  # Download YouTube audio
GET  /api/download/:jobId           # Download status
POST /api/process                   # Start audio separation
GET  /api/process/:jobId            # Processing status
GET  /api/tracks/:filename          # Serve separated tracks

# Donation System (Stripe)
POST /api/donate/create-checkout-session  # Create donation session
POST /api/donate/webhook                   # Stripe webhook handler
GET  /api/donate/stats                     # Donation statistics

# Cache Management
POST /api/cache/clear               # Clear all cached files
POST /api/cache/clear-temp          # Clear temporary files
GET  /api/cache/status              # Cache usage information

# Debug (production)
GET  /api/debug/paths               # File system debug info
```

### Audio Processing Service (http://localhost:5000)
```bash
GET  /health                        # Service health check
POST /separate                      # Upload and separate audio
GET  /tracks/:jobId/:filename       # Serve separated track files
POST /cache/clear                   # Clear processing cache
GET  /cache/status                  # Processing cache status
```

## 🔧 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Web Audio API** for multi-track audio playback
- **Custom AudioPlayer Service** with individual track controls
- **Responsive Design** for mobile, tablet, and desktop
- **Axios** for HTTP requests

### Backend  
- **Node.js 20** with Express and TypeScript
- **youtube-dl-exec** for YouTube audio extraction
- **Stripe** integration for donations
- **Rate limiting** and security middleware
- **File management** with automatic cleanup
- **Comprehensive error handling**

### Audio Processing
- **Python 3.12** with Flask
- **Facebook's Demucs AI** for source separation
- **Librosa** for BPM detection and audio analysis
- **Automatic model downloading** and caching
- **Background job processing**

### Infrastructure
- **Docker** multi-stage builds for production
- **Railway** deployment configuration
- **Concurrently** for development orchestration
- **TypeScript** throughout for type safety

## ✨ Features Status

### ✅ Completed Features
- **YouTube Audio Download** - High-quality audio extraction
- **AI Track Separation** - Vocals, drums, bass, other instruments  
- **Professional DAW Interface** - Multi-track player with timeline
- **Mobile-Responsive Design** - Works on all device sizes
- **Individual Track Controls** - Volume, pan, mute, solo for each track
- **BPM Detection** - Automatic tempo analysis
- **Donation System** - Stripe integration with customizable amounts
- **Timeline Navigation** - Click-to-seek with visual playhead
- **Grouped Transport Controls** - Professional DAW-style interface
- **Cache Management** - Automatic cleanup and disk space management
- **Error Handling** - Comprehensive error recovery and user feedback
- **Development Tools** - Hot reload, TypeScript, comprehensive logging

### 🔄 In Progress
- Performance optimizations
- Additional audio effects
- Enhanced mobile experience

### 📋 Planned
- Practice session management
- Audio export features
- User accounts and saved sessions
- Advanced audio effects and filters

## 🎯 Usage

1. **Start the application**:
   ```bash
   npm run dev  # Development mode
   # or
   npm start    # Production mode
   ```

2. **Open in browser**: http://localhost:5173 (dev) or http://localhost:3001 (prod)

3. **Process a song**:
   - Enter a YouTube URL in the input field
   - Click "Start Practice" and wait for processing (2-5 minutes)
   - The system will automatically:
     - Download high-quality audio from YouTube
     - Separate into individual tracks using AI
     - Detect BPM and prepare the DAW interface

4. **Practice with separated tracks**:
   - Use individual volume sliders for each track
   - Mute/solo specific instruments
   - Navigate using the timeline
   - Control playback with transport buttons

5. **Manage storage**:
   ```bash
   npm run cache-status      # Check disk usage
   npm run clear-temp-files  # Free up space
   ```

## 📊 Performance & Requirements

### System Requirements
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space for processing
- **CPU**: Multi-core processor recommended
- **Network**: Stable internet for YouTube downloads

### Performance Metrics
- **Processing Time**: 2-5 minutes for typical songs
- **Memory Usage**: 2-4GB during active processing  
- **Disk Usage**: ~5x original file size during processing
- **Model Size**: ~300MB (downloaded automatically)
- **Operational Cost**: $0 - completely free to run

### Audio Quality
- **Input**: Up to 320kbps from YouTube
- **Output**: High-quality separated tracks
- **Formats**: MP3, WAV support
- **Separation Quality**: Professional-grade using Demucs AI

## 🔧 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Find and kill process using port
lsof -ti:3001 | xargs kill
# Or use different port
PORT=3005 npm run dev:backend
```

**Audio Processing Fails**
```bash
# Check Python service
curl http://localhost:5000/health
# Clear cache if disk full
npm run clear-audio-files
```

**Frontend Build Issues**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Memory Issues During Processing**
```bash
# Clear temporary files
npm run clear-temp-files
# Monitor system resources
npm run cache-status
```

### Getting Help
- Check `DEVELOPMENT.md` for detailed development setup
- Check `STRIPE_SETUP.md` for donation system setup
- Use debug endpoint: `GET /api/debug/paths` for file system issues
- Check browser console for frontend errors
- Check terminal output for backend/processing errors

## 📄 Documentation

- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Comprehensive development setup guide
- **[STRIPE_SETUP.md](STRIPE_SETUP.md)** - Donation system configuration
- **API Documentation** - Available in code comments and this README

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Facebook Research** for the Demucs audio separation model
- **YouTube** for providing audio content
- **Stripe** for payment processing infrastructure
- **Open Source Community** for the amazing tools and libraries