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

# Check Node version requirement
echo ""
echo "🔍 Checking Node.js version..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
    if [ "$MAJOR_VERSION" -ge 20 ]; then
        echo "✅ Node.js $NODE_VERSION (>= 20.0.0 required)"
    else
        echo "⚠️  Node.js $NODE_VERSION found, but >= 20.0.0 is required for dependencies"
        echo "   Docker will use Node 20 internally, but local development may have issues"
    fi
else
    echo "⚠️  Node.js not found locally (Docker will use Node 20)"
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

# Check main Dockerfile
if [ -f "Dockerfile" ]; then
    echo "✅ Main Dockerfile exists"
else
    echo "❌ Main Dockerfile is missing"
fi

echo ""
echo "🎯 Docker configuration test complete!"
echo ""
echo "Key changes made:"
echo "  ✅ Upgraded to Node 20 (from Node 18)"
echo "  ✅ Added Python build dependencies"
echo "  ✅ Set YOUTUBE_DL_SKIP_PYTHON_CHECK=1"
echo "  ✅ Added build-essential for native modules"
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