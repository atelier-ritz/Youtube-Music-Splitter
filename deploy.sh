#!/bin/bash

# Band Practice App - Railway Deployment Script

echo "🚀 Deploying Band Practice App to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway..."
    railway login
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"
echo "📱 Your app will be available at the Railway-provided URL"
echo "🔗 Check your Railway dashboard for the deployment URL"