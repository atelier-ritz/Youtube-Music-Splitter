#!/bin/bash

# Docker Setup Test Script
echo "🐳 Testing Docker Configuration for Band Practice Webapp"
echo "=================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker is installed"
echo "✅ Docker Compose is available"

# Test Dockerfile syntax
echo ""
echo "🔍 Testing Dockerfile syntax..."
if docker build -t band-practice-test . --dry-run 2>/dev/null; then
    echo "✅ Main Dockerfile syntax is valid"
else
    echo "❌ Main Dockerfile has syntax issues"
fi

# Test docker-compose syntax
echo ""
echo "🔍 Testing docker-compose.yml syntax..."
if docker-compose config > /dev/null 2>&1; then
    echo "✅ docker-compose.yml syntax is valid"
else
    echo "❌ docker-compose.yml has syntax issues"
    docker-compose config
fi

# Check individual Dockerfiles
echo ""
echo "🔍 Testing individual service Dockerfiles..."

services=("frontend" "backend" "audio-processing-service")
for service in "${services[@]}"; do
    if [ -f "$service/Dockerfile" ]; then
        echo "✅ $service/Dockerfile exists"
    else
        echo "❌ $service/Dockerfile is missing"
    fi
done

echo ""
echo "🎯 Docker configuration test complete!"
echo ""
echo "To start development:"
echo "  npm run docker:dev"
echo ""
echo "To build for production:"
echo "  npm run docker:build"
echo "  npm run docker:run"
echo ""
echo "To deploy to Railway:"
echo "  git push (Railway will use the new Docker configuration)"