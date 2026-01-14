import dotenv from 'dotenv';

// Load environment variables FIRST, before any other imports
dotenv.config();

// Import session type augmentation
import './types/session';

import express from 'express';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import downloadRoutes from './routes/download';
import processRoutes from './routes/process';
import cacheRoutes from './routes/cache';
import tracksRoutes from './routes/tracks';
import donationRoutes from './routes/donation';
import visitorCountRoutes from './routes/visitorCount';
import { 
  errorHandler, 
  notFoundHandler, 
  timeoutHandler, 
  rateLimitHandler,
  AppError 
} from './middleware/errorHandler';

// More lenient rate limiting for track serving (audio files)
const trackServingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // allow many track requests for loading 6 tracks + waveform generation
  message: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Request timeout middleware (30 seconds)
app.use(timeoutHandler(30000));

// Rate limiting middleware - more lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // increased limit for track loading and waveform generation
  message: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);



// Basic middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware for visitor tracking
app.use(session({
  secret: process.env.SESSION_SECRET || 'band-practice-partner-secret-key-change-in-production',
  name: 'visitor_session',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' // Use secure cookies in production
  }
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes with differentiated rate limiting
app.use('/api/download', downloadRoutes);
app.use('/api/process', processRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/tracks', trackServingLimiter, tracksRoutes);
app.use('/api/donate', donationRoutes);
app.use('/api/visitor-count', visitorCountRoutes);

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  // In Docker, frontend dist is at /app/frontend/dist
  // Backend dist is at /app/backend/dist
  // So from backend/dist, we need to go up to /app then to frontend/dist
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  
  console.log('Frontend path:', frontendPath);
  console.log('Frontend path exists:', require('fs').existsSync(frontendPath));
  
  app.use(express.static(frontendPath));
  
  // Serve index.html for all non-API routes (SPA routing)
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    const indexPath = path.join(frontendPath, 'index.html');
    console.log('Serving index.html from:', indexPath);
    res.sendFile(indexPath);
  });
}

// Health check endpoint with error handling
app.get('/api/health', (req, res, next) => {
  try {
    // Basic health checks
    const healthStatus = {
      status: 'OK',
      message: 'Band Practice Partner Backend is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    };

    res.json(healthStatus);
  } catch (error) {
    next(new AppError('Health check failed', 503, 'HEALTH_CHECK_ERROR'));
  }
});

// Debug endpoint for production troubleshooting
app.get('/api/debug/paths', (req, res) => {
  const fs = require('fs');
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  const currentDir = __dirname;
  
  try {
    const debugInfo: {
      currentDir: string;
      frontendPath: string;
      frontendExists: boolean;
      nodeEnv: string | undefined;
      files: string[];
    } = {
      currentDir,
      frontendPath,
      frontendExists: fs.existsSync(frontendPath),
      nodeEnv: process.env.NODE_ENV,
      files: []
    };
    
    // List files in current directory
    try {
      debugInfo.files = fs.readdirSync(path.join(__dirname, '../..'));
    } catch (e) {
      debugInfo.files = ['Error reading directory'];
    }
    
    res.json(debugInfo);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Debug info failed', message: errorMessage });
  }
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in production, just log the error
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Exit the process for uncaught exceptions
  process.exit(1);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Server accessible at: http://0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Current working directory: ${process.cwd()}`);
  console.log(`__dirname: ${__dirname}`);
  
  // Log frontend path info
  if (process.env.NODE_ENV === 'production') {
    const fs = require('fs');
    const frontendPath = path.join(__dirname, '../../frontend/dist');
    console.log(`Frontend path: ${frontendPath}`);
    console.log(`Frontend exists: ${fs.existsSync(frontendPath)}`);
    
    // List contents of app directory
    try {
      const appContents = fs.readdirSync(path.join(__dirname, '../..'));
      console.log(`App directory contents: ${appContents.join(', ')}`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      console.log(`Error reading app directory: ${errorMessage}`);
    }
  }
});