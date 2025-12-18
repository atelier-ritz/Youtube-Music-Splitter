# Railway Deployment Guide

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Push your code to GitHub
3. **Railway CLI** (optional): `npm install -g @railway/cli`

## Deployment Steps

### Option 1: Deploy via Railway Dashboard (Recommended)

**IMPORTANT**: Deploy each service separately for best results.

#### Step 1: Deploy Backend Service

1. **Connect Repository**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

2. **Configure Backend Service**:
   - Railway will auto-detect your Node.js app
   - In Settings → Service:
     - **Root Directory**: `backend`
     - **Build Command**: `npm install --include=dev`
     - **Start Command**: `npm start`
   - Set Environment Variables:
     ```
     NODE_ENV=production
     PORT=${{PORT}}
     ```

#### Step 2: Deploy Audio Processing Service

1. **Add Second Service**:
   - In your Railway project, click "New Service"
   - Select "GitHub Repo" (same repository)
   
2. **Configure Audio Service**:
   - In Settings → Service:
     - **Root Directory**: `audio-processing-service`
     - **Build Command**: `pip install --no-cache-dir -r requirements.txt`
     - **Start Command**: `./start.sh` (Production with Gunicorn)
     - **Alternative Start Command**: `gunicorn --config gunicorn.conf.py app:app`
   - **IMPORTANT**: Increase build timeout in Railway settings:
     - Go to Settings → General
     - Set **Build Timeout** to 20-30 minutes (Demucs installation is heavy)
   - Set Environment Variables:
     ```
     PORT=${{PORT}}
     BACKEND_URL=https://your-backend-service-url.railway.app
     ```

3. **If Build Still Times Out or Image Too Large (8GB+)**:
   
   **Solution A: Use Minimal Requirements**
   - Rename `requirements-minimal.txt` to `requirements.txt`
   - Uses CPU-only PyTorch (much smaller)
   - Deploy with this lighter version
   
   **Solution B: Multi-stage Docker Build**
   - Rename `Dockerfile.multistage` to `Dockerfile`
   - Uses multi-stage build to reduce final image size
   - Should be under 4GB instead of 8GB+
   
   **Solution C: Alternative Deployment**
   - Deploy audio service to Render.com or Heroku
   - These platforms handle ML dependencies better
   - Connect via environment variables

#### Step 3: Update Backend Environment

After both services are deployed:
1. Go to your backend service settings
2. Add this environment variable:
   ```
   AUDIO_SERVICE_URL=https://your-audio-service-url.railway.app
   ```

#### Step 4: Frontend (Served by Backend)

The frontend is automatically built and served by the backend service in production mode. No separate deployment needed!

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

1. **Audio Service Build Timeout**:
   - **Increase build timeout**: Go to Railway Settings → General → Build Timeout (set to 30 minutes)
   - **Use lighter requirements**: Deploy with `requirements-light.txt` first, then update
   - **Docker deployment**: Use the provided Dockerfile for optimized builds
   - **Alternative**: Deploy audio service to a different platform (Render, Heroku) if Railway keeps timing out

2. **Memory Issues**:
   - Increase memory allocation for audio processing service (minimum 2GB)
   - Monitor usage in Railway metrics
   - Consider using Railway's Pro plan for better resources

3. **Port Conflicts**:
   - Ensure PORT environment variable is used
   - Check service communication URLs

### Audio Service Image Size Issue (8GB+)

**Why so large?**
- PyTorch: ~2-3GB (machine learning framework)
- Demucs models: ~1-2GB (AI models for audio separation)
- Scientific libraries: ~1-2GB (NumPy, SciPy, librosa)
- Build cache: ~1-2GB (temporary files)

**Solutions:**

### Strategy 1: Minimal Requirements ⭐ (Recommended)
```bash
# Use requirements-minimal.txt instead of requirements.txt
# This uses CPU-only PyTorch and minimal dependencies
# Final image: ~3-4GB instead of 8GB+
```

### Strategy 2: Multi-stage Docker Build
```bash
# Use Dockerfile.multistage
# Builds dependencies in one stage, copies only needed files to final stage
# Final image: ~4-5GB
```

### Strategy 3: Light First Deployment
1. Deploy with `requirements-light.txt` (Flask only)
2. Once running, gradually add dependencies
3. Update to minimal requirements

### Strategy 4: Alternative Platform
- **Render.com**: Better for ML apps, handles large images
- **Heroku**: With performance dynos
- **Google Cloud Run**: Supports larger container images
- **Hugging Face Spaces**: Specifically designed for ML apps

### Quick Fix Commands:
```bash
# Option A: Use minimal requirements
cp requirements-minimal.txt requirements.txt

# Option B: Use multi-stage Docker
cp Dockerfile.multistage Dockerfile

# Then redeploy
```

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