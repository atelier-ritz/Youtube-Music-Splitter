/**
 * Audio Processing API routes
 * Handles audio processing requests and status checking
 */

import { Router, Request, Response } from 'express';
import { audioProcessingService } from '../services/audioProcessingService';
import { ProcessingRequest, ProcessingResponse, ProcessingStatusResponse } from '../types/processingTypes';
import { asyncHandler, ValidationError, AppError, ProcessingError } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/process
 * Start a new audio processing job
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { audioFilePath }: ProcessingRequest = req.body;

  if (!audioFilePath) {
    throw new ValidationError('Audio file path is required', 'audioFilePath');
  }

  // Validate that the audio file exists
  const fs = require('fs');
  if (!fs.existsSync(audioFilePath)) {
    throw new ValidationError('Audio file not found', 'audioFilePath');
  }

  try {
    // Start processing
    const jobId = await audioProcessingService.startProcessing(audioFilePath);

    const response: ProcessingResponse = {
      jobId,
      status: 'pending',
      message: 'Audio processing started successfully'
    };

    res.status(202).json(response);
  } catch (error) {
    console.error('Processing start error:', error);
    throw new ProcessingError('Failed to start audio processing. Please try again.', undefined, 'start');
  }
}));

/**
 * GET /api/process/:jobId
 * Get the status of a processing job
 */
router.get('/:jobId', (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        error: 'Job ID is required'
      });
    }

    const job = audioProcessingService.getJobStatus(jobId);
    
    if (!job) {
      return res.status(404).json({
        error: 'Processing job not found'
      });
    }

    const response: ProcessingStatusResponse = {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      tracks: job.tracks,
      bpm: job.bpm,
      error: job.error
    };

    res.json(response);

  } catch (error) {
    console.error('Processing status error:', error);
    res.status(500).json({
      error: 'Failed to get processing status'
    });
  }
});

/**
 * GET /api/process
 * Get all processing jobs (for debugging/admin)
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const jobs = audioProcessingService.getAllJobs();
    res.json(jobs);
  } catch (error) {
    console.error('Get all processing jobs error:', error);
    res.status(500).json({
      error: 'Failed to get processing jobs'
    });
  }
});

/**
 * DELETE /api/process/cleanup
 * Clean up old completed/failed jobs
 */
router.delete('/cleanup', (req: Request, res: Response) => {
  try {
    const maxAgeHours = parseInt(req.query.maxAgeHours as string) || 24;
    const cleanedCount = audioProcessingService.cleanupOldJobs(maxAgeHours);
    
    res.json({
      message: `Cleaned up ${cleanedCount} jobs older than ${maxAgeHours} hours`,
      cleanedCount
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      error: 'Failed to cleanup old jobs'
    });
  }
});

/**
 * DELETE /api/process/:jobId
 * Cancel a processing job
 */
router.delete('/:jobId', (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        error: 'Job ID is required'
      });
    }

    const cancelled = audioProcessingService.cancelJob(jobId);
    
    if (!cancelled) {
      return res.status(404).json({
        error: 'Job not found or cannot be cancelled'
      });
    }

    res.json({
      message: 'Job cancelled successfully',
      jobId
    });

  } catch (error) {
    console.error('Job cancellation error:', error);
    res.status(500).json({
      error: 'Failed to cancel job'
    });
  }
});

/**
 * GET /api/process/status/:status
 * Get jobs by status
 */
router.get('/status/:status', (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    
    if (!['pending', 'processing', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be one of: pending, processing, completed, failed'
      });
    }

    const jobs = audioProcessingService.getJobsByStatus(status as any);
    res.json(jobs);

  } catch (error) {
    console.error('Get jobs by status error:', error);
    res.status(500).json({
      error: 'Failed to get jobs by status'
    });
  }
});

/**
 * GET /api/process/stats
 * Get processing statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = audioProcessingService.getProcessingStats();
    res.json(stats);
  } catch (error) {
    console.error('Get processing stats error:', error);
    res.status(500).json({
      error: 'Failed to get processing statistics'
    });
  }
});

export default router;