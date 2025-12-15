/**
 * Download API routes
 * Handles YouTube audio download requests and status checking
 */

import { Router, Request, Response } from 'express';
import { validateYouTubeUrl } from '../utils/youtubeValidator';
import { youtubeDownloaderService } from '../services/youtubeDownloader';
import { DownloadRequest, DownloadResponse, DownloadStatusResponse } from '../types/downloadTypes';
import { asyncHandler, ValidationError, AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/download
 * Start a new YouTube audio download
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { youtubeUrl }: DownloadRequest = req.body;

  if (!youtubeUrl) {
    throw new ValidationError('YouTube URL is required', 'youtubeUrl');
  }

  // Validate YouTube URL
  const validation = validateYouTubeUrl(youtubeUrl);
  if (!validation.isValid) {
    throw new ValidationError(validation.error || 'Invalid YouTube URL', 'youtubeUrl');
  }

  try {
    // Start download
    const jobId = await youtubeDownloaderService.startDownload(youtubeUrl);

    const response: DownloadResponse = {
      jobId,
      status: 'pending',
      message: 'Download started successfully'
    };

    res.status(202).json(response);
  } catch (error) {
    console.error('Download start error:', error);
    throw new AppError('Failed to start download. Please try again.', 500, 'DOWNLOAD_START_ERROR');
  }
}));

/**
 * GET /api/download/:jobId
 * Get the status of a download job
 */
router.get('/:jobId', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;

  if (!jobId) {
    throw new ValidationError('Job ID is required', 'jobId');
  }

  const job = youtubeDownloaderService.getJobStatus(jobId);
  
  if (!job) {
    throw new AppError('Download job not found', 404, 'JOB_NOT_FOUND');
  }

  const response: DownloadStatusResponse = {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    audioFilePath: job.audioFilePath,
    error: job.error
  };

  res.json(response);
}));

/**
 * GET /api/download
 * Get all download jobs (for debugging/admin)
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const jobs = youtubeDownloaderService.getAllJobs();
  res.json(jobs);
}));

export default router;