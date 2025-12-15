/**
 * Download API routes
 * Handles YouTube audio download requests and status checking
 */

import { Router, Request, Response } from 'express';
import { validateYouTubeUrl } from '../utils/youtubeValidator';
import { youtubeDownloaderService } from '../services/youtubeDownloader';
import { DownloadRequest, DownloadResponse, DownloadStatusResponse } from '../types/downloadTypes';

const router = Router();

/**
 * POST /api/download
 * Start a new YouTube audio download
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { youtubeUrl }: DownloadRequest = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({
        error: 'YouTube URL is required'
      });
    }

    // Validate YouTube URL
    const validation = validateYouTubeUrl(youtubeUrl);
    if (!validation.isValid) {
      return res.status(400).json({
        error: validation.error || 'Invalid YouTube URL'
      });
    }

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
    res.status(500).json({
      error: 'Failed to start download'
    });
  }
});

/**
 * GET /api/download/:jobId
 * Get the status of a download job
 */
router.get('/:jobId', (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        error: 'Job ID is required'
      });
    }

    const job = youtubeDownloaderService.getJobStatus(jobId);
    
    if (!job) {
      return res.status(404).json({
        error: 'Download job not found'
      });
    }

    const response: DownloadStatusResponse = {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      audioFilePath: job.audioFilePath,
      error: job.error
    };

    res.json(response);

  } catch (error) {
    console.error('Download status error:', error);
    res.status(500).json({
      error: 'Failed to get download status'
    });
  }
});

/**
 * GET /api/download
 * Get all download jobs (for debugging/admin)
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const jobs = youtubeDownloaderService.getAllJobs();
    res.json(jobs);
  } catch (error) {
    console.error('Get all jobs error:', error);
    res.status(500).json({
      error: 'Failed to get download jobs'
    });
  }
});

export default router;