#!/bin/bash

# Audio Processing Service Startup Script

echo "🎵 Starting Audio Processing Service with Demucs..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/upgrade dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Download Demucs models if not already present
echo "🤖 Checking Demucs models..."
python -c "
try:
    import demucs.pretrained
    demucs.pretrained.get_model('htdemucs')
    print('✅ Demucs models ready')
except Exception as e:
    print(f'📥 Downloading Demucs models... (this may take a few minutes)')
    import demucs.pretrained
    demucs.pretrained.get_model('htdemucs')
    print('✅ Demucs models downloaded')
"

# Create necessary directories
mkdir -p uploads separated temp

echo "🚀 Starting service on http://localhost:8000"
echo "💡 Press Ctrl+C to stop the service"
echo ""

# Start the Flask application
python app.py