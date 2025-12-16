# Audio Processing Service with Demucs

This is a local audio processing service that uses Facebook's Demucs for high-quality audio source separation. It provides an API compatible with the band-practice-webapp backend.

## Features

- **Free and unlimited** audio separation using Demucs
- **High-quality separation** into vocals, drums, bass, and other instruments
- **BPM detection** using librosa
- **RESTful API** compatible with your existing backend
- **File cleanup** to manage disk space
- **Progress tracking** for long-running separations

## Installation

### Prerequisites

- Python 3.8 or higher
- At least 4GB RAM
- 2GB free disk space

### Setup

1. **Create a virtual environment:**
```bash
cd audio-processing-service
python -m venv venv

# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Download Demucs models (first run only):**
```bash
python -c "import demucs.pretrained; demucs.pretrained.get_model('htdemucs')"
```
This downloads ~300MB of AI models.

## Usage

### Start the service:
```bash
python app.py
```

The service will start on `http://localhost:8000`

### API Endpoints

#### Process Audio
```bash
POST /api/process
Content-Type: multipart/form-data

# Upload audio file for separation
curl -X POST -F "audio_file=@song.mp3" http://localhost:8000/api/process
```

#### Check Job Status
```bash
GET /api/process/{job_id}

# Returns job status and separated track URLs when complete
curl http://localhost:8000/api/process/12345-67890-abcdef
```

#### Download Separated Tracks
```bash
GET /api/tracks/{job_id}/{track_name}.mp3

# Download individual tracks
curl http://localhost:8000/api/tracks/12345-67890-abcdef/vocals.mp3
```

## Integration with Band Practice Partner

Your Node.js backend is already configured to work with this service! Just:

1. **Start this service** on port 8000
2. **Start your backend** with `npm run dev`
3. **The backend will automatically** send audio files here for processing

## Performance

**Typical processing times:**
- 3-minute song: 2-5 minutes on laptop, 1-2 minutes on desktop
- 5-minute song: 4-8 minutes on laptop, 2-4 minutes on desktop

**System requirements during processing:**
- CPU: High usage (expect fan noise)
- RAM: 2-4GB temporarily
- Disk: ~5x original file size for temporary files

## File Management

- **Uploads**: Stored in `./uploads/`
- **Separated tracks**: Stored in `./separated/`
- **Auto-cleanup**: Files older than 24 hours are automatically deleted
- **Max file size**: 50MB per upload

## Supported Formats

**Input**: MP3, WAV, FLAC, M4A, AAC, OGG
**Output**: MP3 (192kbps)

## Troubleshooting

### "ModuleNotFoundError: No module named 'demucs'"
```bash
pip install demucs
```

### "CUDA out of memory" (if using GPU)
```bash
# Force CPU-only processing
export CUDA_VISIBLE_DEVICES=""
python app.py
```

### Service won't start on port 8000
```bash
# Check if port is in use
lsof -i :8000

# Kill process using port 8000
kill -9 <PID>
```

### Processing is very slow
- **Normal**: 2-5 minutes per song on laptop
- **Try**: Close other applications to free up CPU/RAM
- **Upgrade**: Consider desktop with more CPU cores

## Development

### Test the service:
```bash
# Health check
curl http://localhost:8000/api/health

# List all jobs
curl http://localhost:8000/api/jobs
```

### Logs
The service prints processing status to console. Watch for:
- Job creation and progress updates
- Demucs command execution
- File cleanup operations

## Cost Analysis

**This solution costs:**
- $0 in API fees
- $0 in server costs
- Only your computer's electricity (~$0.10-0.50 per song)

**Compared to commercial APIs:**
- LALAL.AI: ~$0.50-1.00 per song
- Moises.ai: ~$0.30-0.80 per song
- This solution: ~$0.10 per song in electricity

## Next Steps

Once this is running:
1. Test with your existing backend
2. Complete the frontend playback interface
3. Add the Web Audio API integration
4. Implement the track control UI

The audio separation will be fully functional and free!