#!/bin/bash

# Development script for audio processing service
# This script activates the virtual environment and starts the Flask app

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Please create it first:"
    echo "  python -m venv venv"
    echo "  source venv/bin/activate"
    echo "  pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
if ! python -c "import flask" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
fi

# Start the Flask application on port 5001 (to avoid macOS AirPlay conflict)
echo "🚀 Starting audio processing service..."
echo "📍 Service will be available at: http://localhost:5001"
PORT=5001 python app.py