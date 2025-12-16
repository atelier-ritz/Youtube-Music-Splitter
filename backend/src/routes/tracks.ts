/**
 * Tracks API routes
 * Handles serving separated audio track files from the audio processing service
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { asyncHandler, AppError } from '../middleware/errorHandler';

const router = Router();

const AUDIO_PROCESSING_SERVICE_URL = process.env.AUDIO_PROCESSING_SERVICE_URL || 'http://localhost:8000';

/**
 * GET /api/tracks/:jobId/:filename
 * Proxy separated track files from the audio processing service
 */
router.get('/:jobId/:filename', asyncHandler(async (req: Request, res: Response) => {
  const { jobId, filename } = req.params;

  if (!jobId || !filename) {
    throw new AppError('Job ID and filename are required', 400, 'MISSING_PARAMETERS');
  }

  try {
    // Proxy the request to the audio processing service
    const response = await axios.get(
      `${AUDIO_PROCESSING_SERVICE_URL}/api/tracks/${jobId}/${filename}`,
      {
        responseType: 'stream',
        timeout: 30000 // 30 second timeout
      }
    );

    // Set appropriate headers for audio streaming
    res.set({
      'Content-Type': response.headers['content-type'] || 'audio/mpeg',
      'Content-Length': response.headers['content-length'],
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Range'
    });

    // Handle range requests for audio seeking
    if (req.headers.range && response.headers['accept-ranges'] === 'bytes') {
      res.status(206); // Partial Content
    }

    // Pipe the audio stream to the response
    response.data.pipe(res);

  } catch (error) {
    console.error(`Failed to proxy track ${jobId}/${filename}:`, error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new AppError('Track file not found', 404, 'TRACK_NOT_FOUND');
      } else if (error.code === 'ECONNREFUSED') {
        throw new AppError('Audio processing service unavailable', 503, 'SERVICE_UNAVAILABLE');
      }
    }
    
    throw new AppError('Failed to retrieve track file', 500, 'TRACK_RETRIEVAL_ERROR');
  }
}));

/**
 * HEAD /api/tracks/:jobId/:filename
 * Handle HEAD requests for audio metadata
 */
router.head('/:jobId/:filename', asyncHandler(async (req: Request, res: Response) => {
  const { jobId, filename } = req.params;

  if (!jobId || !filename) {
    throw new AppError('Job ID and filename are required', 400, 'MISSING_PARAMETERS');
  }

  try {
    // Make HEAD request to the audio processing service
    const response = await axios.head(
      `${AUDIO_PROCESSING_SERVICE_URL}/api/tracks/${jobId}/${filename}`,
      {
        timeout: 10000 // 10 second timeout for HEAD requests
      }
    );

    // Forward the headers
    res.set({
      'Content-Type': response.headers['content-type'] || 'audio/mpeg',
      'Content-Length': response.headers['content-length'],
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Range'
    });

    res.status(200).end();

  } catch (error) {
    console.error(`Failed to get track metadata ${jobId}/${filename}:`, error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new AppError('Track file not found', 404, 'TRACK_NOT_FOUND');
      }
    }
    
    throw new AppError('Failed to retrieve track metadata', 500, 'TRACK_METADATA_ERROR');
  }
}));

export default router;