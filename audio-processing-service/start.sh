#!/bin/bash
# Production start script for Railway deployment

echo "🚀 Starting Audio Processing Service in Production Mode"
echo "🔧 Using htdemucs_6s model for 6-track separation"
echo "🎵 Configured for 6-track audio separation: vocals, drums, bass, guitar, piano, other"
echo "⚡ Running with Gunicorn WSGI server for production stability"

# Start Gunicorn with production configuration
exec gunicorn --config gunicorn.conf.py app:app