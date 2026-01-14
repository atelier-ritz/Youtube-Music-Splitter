import express from 'express';
import { AppError } from '../middleware/errorHandler';
import { readVisitorCount, incrementVisitorCount } from '../services/visitorCountStorage';

const router = express.Router();

// Initialize visitor count from storage on startup
let visitorCount = readVisitorCount();

/**
 * GET /api/visitor-count
 * Returns the current visitor count and increments for new visitors
 */
router.get('/', (req, res, next) => {
  try {
    // Check if this is a new visitor based on session
    const isNewVisitor = !req.session.hasVisited;
    
    // Increment count for new visitors only
    if (isNewVisitor) {
      // Increment and persist the count
      visitorCount = incrementVisitorCount(visitorCount);
      
      // Mark this session as visited
      req.session.hasVisited = true;
    }
    
    // Return the current count
    res.json({
      count: visitorCount
    });
    
  } catch (error) {
    console.error('Visitor count error:', error);
    // Fallback to in-memory counting on error
    next(new AppError('Failed to retrieve visitor count', 500, 'VISITOR_COUNT_ERROR'));
  }
});

export default router;
