/**
 * YouTube audio downloader service
 * Handles downloading audio from YouTube URLs using youtube-dl-exec
 */

import youtubeDl from 'youtube-dl-exec';

// Use default youtube-dl-exec (will find yt-dlp automatically)
const ytDlp = youtubeDl;
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { DownloadJob } from '../types/downloadTypes';

export class YouTubeDownloaderService {
  private jobs: Map<string, DownloadJob> = new Map();
  private downloadDir: string;

  constructor() {
    // Use temp directory for downloads
    this.downloadDir = path.join(process.cwd(), 'temp');
    this.ensureDownloadDirectory();
  }

  private async ensureDownloadDirectory(): Promise<void> {
    try {
      await fs.access(this.downloadDir);
    } catch {
      await fs.mkdir(this.downloadDir, { recursive: true });
    }
  }

  /**
   * Simulate download progress for better user feedback
   */
  private simulateDownloadProgress(jobId: string): NodeJS.Timeout {
    const job = this.jobs.get(jobId);
    if (!job) return setTimeout(() => {}, 0);

    let currentProgress = 5;
    const targetProgress = 85; // Stop at 85% to let the actual completion set 90%
    const progressIncrement = 2; // Increase by 2% every interval
    const intervalMs = 1500; // Update every 1.5 seconds

    return setInterval(() => {
      const job = this.jobs.get(jobId);
      if (!job || job.status !== 'downloading') {
        return;
      }

      currentProgress = Math.min(currentProgress + progressIncrement, targetProgress);
      job.progress = currentProgress;

      // Add realistic download messages
      if (currentProgress < 20) {
        job.message = 'Connecting to YouTube...';
      } else if (currentProgress < 40) {
        job.message = 'Downloading video stream...';
      } else if (currentProgress < 60) {
        job.message = 'Extracting audio...';
      } else if (currentProgress < 80) {
        job.message = 'Converting to MP3...';
      } else {
        job.message = 'Finalizing download...';
      }

      console.log(`Download progress for ${jobId}: ${currentProgress}%`);
    }, intervalMs);
  }

  /**
   * Start a new download job
   */
  async startDownload(youtubeUrl: string): Promise<string> {
    const jobId = randomUUID();
    const job: DownloadJob = {
      id: jobId,
      youtubeUrl,
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    };

    this.jobs.set(jobId, job);

    // Start download asynchronously
    this.performDownload(jobId).catch(error => {
      console.error(`Download failed for job ${jobId}:`, error);
      const failedJob = this.jobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.error = error.message || 'Unknown download error';
        failedJob.completedAt = new Date();
      }
    });

    return jobId;
  }

  /**
   * Get the status of a download job
   */
  getJobStatus(jobId: string): DownloadJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs (for debugging/admin purposes)
   */
  getAllJobs(): DownloadJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Clean up old completed jobs
   */
  async cleanupOldJobs(maxAgeHours: number = 24): Promise<void> {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.completedAt && job.completedAt < cutoffTime) {
        // Clean up audio file if it exists
        if (job.audioFilePath) {
          try {
            await fs.unlink(job.audioFilePath);
          } catch (error) {
            console.warn(`Failed to delete audio file ${job.audioFilePath}:`, error);
          }
        }
        
        // Remove job from memory
        this.jobs.delete(jobId);
      }
    }
  }

  /**
   * Perform the actual download
   */
  private async performDownload(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    try {
      job.status = 'downloading';
      job.progress = 5;

      // Generate output filename
      const outputTemplate = path.join(this.downloadDir, `${jobId}.%(ext)s`);

      // Simulate more granular progress during download
      const progressSimulation = this.simulateDownloadProgress(jobId);

      // Download audio using youtube-dl-exec with basic options
      const output = await ytDlp(job.youtubeUrl, {
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: 192,
        output: outputTemplate,
        noPlaylist: true,
        // Basic retry option
        retries: 3,
        // Progress callback would be nice but youtube-dl-exec doesn't support it directly
      });

      // Stop progress simulation
      clearInterval(progressSimulation);
      job.progress = 90;

      // Find the downloaded file
      const expectedPath = path.join(this.downloadDir, `${jobId}.mp3`);
      
      try {
        await fs.access(expectedPath);
        job.audioFilePath = expectedPath;
      } catch {
        // If mp3 doesn't exist, try to find any file with the job ID
        const files = await fs.readdir(this.downloadDir);
        const downloadedFile = files.find(file => file.startsWith(jobId));
        
        if (downloadedFile) {
          job.audioFilePath = path.join(this.downloadDir, downloadedFile);
        } else {
          throw new Error('Downloaded audio file not found');
        }
      }

      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error occurred';
      job.completedAt = new Date();
      throw error;
    }
  }
}

// Singleton instance
export const youtubeDownloaderService = new YouTubeDownloaderService();