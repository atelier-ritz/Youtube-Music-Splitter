import { Request, Response, NextFunction } from 'express';

/**
 * Custom Error class for application-specific errors
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error class for input validation failures
 */
export class ValidationError extends AppError {
  public field?: string;

  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }
}

/**
 * Network Error class for external service failures
 */
export class NetworkError extends AppError {
  public service?: string;
  public originalError?: Error;

  constructor(message: string, service?: string, originalError?: Error) {
    super(message, 503, 'NETWORK_ERROR');
    this.service = service;
    this.originalError = originalError;
  }
}

/**
 * Processing Error class for audio processing failures
 */
export class ProcessingError extends AppError {
  public jobId?: string;
  public stage?: string;

  constructor(message: string, jobId?: string, stage?: string) {
    super(message, 422, 'PROCESSING_ERROR');
    this.jobId = jobId;
    this.stage = stage;
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  error: string;
  code?: string;
  statusCode: number;
  timestamp: string;
  path: string;
  details?: any;
  stack?: string;
}

/**
 * Global error handling middleware
 * 
 * Catches all errors and formats them into consistent API responses
 * Requirements: 1.5, 2.4, 7.4
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_ERROR';
  let details: any = undefined;

  // Handle different error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code || 'APP_ERROR';
    
    // Add specific details for different error types
    if (error instanceof ValidationError) {
      details = { field: error.field };
    } else if (error instanceof NetworkError) {
      details = { 
        service: error.service,
        originalMessage: error.originalError?.message 
      };
    } else if (error instanceof ProcessingError) {
      details = { 
        jobId: error.jobId,
        stage: error.stage 
      };
    }
  } else if (error.name === 'ValidationError') {
    // Handle Mongoose/Joi validation errors
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = { validationErrors: error.message };
  } else if (error.name === 'CastError') {
    // Handle database cast errors
    statusCode = 400;
    message = 'Invalid data format';
    code = 'CAST_ERROR';
  } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
    // Handle database errors
    statusCode = 503;
    message = 'Database error';
    code = 'DATABASE_ERROR';
  } else if (error.message.includes('ENOENT')) {
    // Handle file not found errors
    statusCode = 404;
    message = 'File not found';
    code = 'FILE_NOT_FOUND';
  } else if (error.message.includes('EACCES')) {
    // Handle permission errors
    statusCode = 403;
    message = 'Permission denied';
    code = 'PERMISSION_DENIED';
  } else if (error.message.includes('EMFILE') || error.message.includes('ENFILE')) {
    // Handle too many open files
    statusCode = 503;
    message = 'Server temporarily unavailable';
    code = 'RESOURCE_EXHAUSTED';
  }

  // Log error details
  console.error('Error Handler:', {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    statusCode,
    code,
    message,
    stack: error.stack,
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Create error response
  const errorResponse: ErrorResponse = {
    error: message,
    code,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // Add details if available
  if (details) {
    errorResponse.details = details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper
 * 
 * Wraps async route handlers to catch errors and pass them to error middleware
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND');
  next(error);
};

/**
 * Request timeout handler
 */
export const timeoutHandler = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        const error = new AppError('Request timeout', 408, 'TIMEOUT');
        next(error);
      }
    }, timeoutMs);

    // Clear timeout when response is finished
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

/**
 * Rate limiting error handler
 */
export const rateLimitHandler = (req: Request, res: Response): void => {
  const errorResponse: ErrorResponse = {
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
    statusCode: 429,
    timestamp: new Date().toISOString(),
    path: req.path
  };

  res.status(429).json(errorResponse);
};

/**
 * Validation middleware
 */
export const validateRequest = (schema: any, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req[property]);
    
    if (error) {
      const validationError = new ValidationError(
        error.details[0].message,
        error.details[0].path[0] as string
      );
      next(validationError);
    } else {
      next();
    }
  };
};

/**
 * Health check error handler
 */
export const healthCheckError = (service: string, error: Error): AppError => {
  return new NetworkError(
    `Health check failed for ${service}: ${error.message}`,
    service,
    error
  );
};