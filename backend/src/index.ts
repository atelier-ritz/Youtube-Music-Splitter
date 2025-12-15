import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import downloadRoutes from './routes/download';
import processRoutes from './routes/process';
import cacheRoutes from './routes/cache';
import { 
  errorHandler, 
  notFoundHandler, 
  timeoutHandler, 
  rateLimitHandler,
  AppError 
} from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Request timeout middleware (30 seconds)
app.use(timeoutHandler(30000));

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limiting for download endpoints
const downloadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 download requests per minute
  message: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes with rate limiting
app.use('/api/download', downloadLimiter, downloadRoutes);
app.use('/api/process', processRoutes);
app.use('/api/cache', cacheRoutes);

// Health check endpoint with error handling
app.get('/api/health', (req, res, next) => {
  try {
    // Basic health checks
    const healthStatus = {
      status: 'OK',
      message: 'Band Practice Webapp Backend is running',
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});