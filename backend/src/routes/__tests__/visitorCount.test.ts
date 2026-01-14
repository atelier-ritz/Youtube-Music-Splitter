/**
 * Unit tests for Visitor Count API
 */

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import visitorCountRoutes from '../visitorCount';

// Create a test app
function createTestApp() {
  const app = express();
  
  // Add session middleware
  app.use(session({
    secret: 'test-secret',
    name: 'visitor_session',
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax'
    }
  }));
  
  app.use('/api/visitor-count', visitorCountRoutes);
  
  return app;
}

describe('Visitor Count API', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = createTestApp();
  });
  
  it('should return visitor count for new visitor', async () => {
    const response = await request(app)
      .get('/api/visitor-count')
      .expect(200);
    
    expect(response.body).toHaveProperty('count');
    expect(typeof response.body.count).toBe('number');
  });
  
  it('should increment count for new visitor', async () => {
    // First request - new visitor
    const response1 = await request(app)
      .get('/api/visitor-count')
      .expect(200);
    
    const firstCount = response1.body.count;
    
    // Second request - different session (new visitor)
    const response2 = await request(app)
      .get('/api/visitor-count')
      .expect(200);
    
    const secondCount = response2.body.count;
    
    // Count should have incremented
    expect(secondCount).toBeGreaterThan(firstCount);
  });
  
  it('should not increment count for returning visitor with session', async () => {
    const agent = request.agent(app);
    
    // First request - new visitor
    const response1 = await agent
      .get('/api/visitor-count')
      .expect(200);
    
    const firstCount = response1.body.count;
    
    // Second request - same session (returning visitor)
    const response2 = await agent
      .get('/api/visitor-count')
      .expect(200);
    
    const secondCount = response2.body.count;
    
    // Count should NOT have incremented
    expect(secondCount).toBe(firstCount);
  });
  
  it('should set session cookie for new visitors', async () => {
    const response = await request(app)
      .get('/api/visitor-count')
      .expect(200);
    
    // Check that a session cookie was set
    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.headers['set-cookie'][0]).toContain('visitor_session');
  });
});
