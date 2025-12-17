# Railway Deployment Guide

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Push your code to GitHub
3. **Railway CLI** (optional): `npm install -g @railway/cli`

## Deployment Steps

### Option 1: Deploy via Railway Dashboard (Recommended)

1. **Connect Repository**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

2. **Configure Services**:
   Railway will automatically detect your app structure. You'll need to create 2 services:

   **Service 1: Backend + Frontend (Main Service)**
   - Root directory: `/`
   - Build command: `npm run build`
   - Start command: `npm run start:backend`
   - Port: `3001`

   **Service 2: Audio Processing Service**
   - Root directory: `/audio-processing-service`
   - Build command: `pip install -r requirements.txt`
   - Start command: `python app.py`
   - Port: `5000`

3. **Environment Variables**:
   Set these in Railway dashboard for the main service:
   ```
   NODE_ENV=production
   PORT=3001
   AUDIO_SERVICE_URL=http://audio-processing-service:5000
   ```

   For the audio processing service:
   ```
   PORT=5000
   BACKEND_URL=${{RAILWAY_STATIC_URL}}
   ```

### Option 2: Deploy via Railway CLI

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Initialize Project**:
   ```bash
   cd Youtube-Music-Splitter
   railway init
   ```

4. **Deploy**:
   ```bash
   railway up
   ```

## Configuration Files Created

- `railway.json` - Railway configuration
- `Dockerfile` - Multi-stage build for all services
- `package.json` - Root package.json for monorepo
- `.env.example` - Environment variables template

## Important Notes

### Memory Requirements
- **Backend**: 512MB minimum
- **Audio Processing**: 2GB minimum (for Demucs AI model)

### Storage
- Railway provides ephemeral storage
- Processed files are temporary and cleaned up automatically
- For persistent storage, consider Railway's volume mounts

### Networking
- Services communicate via internal Railway networking
- Frontend is served by the backend in production
- CORS is configured for cross-origin requests

### Performance
- First audio processing may take 2-3 minutes (model download)
- Subsequent processing: 30-60 seconds per song
- Railway auto-scales based on usage

## Troubleshooting

### Common Issues

1. **Build Timeout**:
   - Increase build timeout in Railway settings
   - Consider using Docker deployment for faster builds

2. **Memory Issues**:
   - Increase memory allocation for audio processing service
   - Monitor usage in Railway metrics

3. **Port Conflicts**:
   - Ensure PORT environment variable is used
   - Check service communication URLs

### Monitoring

Railway provides built-in monitoring:
- View logs in real-time
- Monitor CPU/memory usage
- Set up alerts for downtime

## Cost Estimation

Railway pricing (as of 2024):
- **Hobby Plan**: $5/month - Good for testing
- **Pro Plan**: $20/month + usage - Recommended for production
- **Team Plan**: $20/user/month - For team collaboration

Estimated monthly cost for this app:
- Small usage: $5-15/month
- Medium usage: $20-40/month
- Heavy usage: $40-80/month

## Custom Domain (Optional)

1. Go to Railway dashboard
2. Select your project
3. Go to Settings → Domains
4. Add your custom domain
5. Update DNS records as instructed

## Backup Strategy

1. **Code**: Keep in GitHub repository
2. **Database**: Use Railway PostgreSQL with automated backups
3. **Files**: Implement cloud storage (AWS S3, Cloudinary) for persistence

## Next Steps After Deployment

1. Test all functionality on the deployed URL
2. Set up monitoring and alerts
3. Configure custom domain (optional)
4. Set up CI/CD pipeline for automatic deployments
5. Monitor performance and optimize as needed