#!/bin/bash
# Production start script for Railway deployment

echo "🚀 Starting Audio Processing Service in Production Mode"
echo "📊 Memory: $(free -h | grep Mem | awk '{print $2}') available"
echo "🔧 Using htdemucs_6s model for 6-track separation"

# Start Gunicorn with production configuration
exec gunicorn --config gunicorn.conf.py app:app