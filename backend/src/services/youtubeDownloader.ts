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
    this.checkSystemRequirements();
  }

  /**
   * Check if system requirements are met for YouTube downloads
   */
  private async checkSystemRequirements(): Promise<void> {
    try {
      // Check if Node.js is available (it should be since we're running in Node.js)
      const nodeVersion = process.version;
      console.log(`Node.js version: ${nodeVersion}`);
      
      // Set environment variable for yt-dlp JavaScript runtime
      if (!process.env.YT_DLP_JS_RUNTIME) {
        process.env.YT_DLP_JS_RUNTIME = 'node';
        console.log('Set YT_DLP_JS_RUNTIME to node');
      }
      
      // Check yt-dlp version
      try {
        const versionOutput = await ytDlp('--version', {});
        console.log(`yt-dlp version: ${versionOutput}`);
      } catch (error) {
        console.warn('Could not check yt-dlp version:', error);
      }
      
    } catch (error) {
      console.error('System requirements check failed:', error);
    }
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
   * Test if a YouTube URL is accessible and extractable
   */
  private async testYouTubeUrl(url: string): Promise<boolean> {
    try {
      // Use yt-dlp to just extract info without downloading
      await ytDlp(url, {
        dumpSingleJson: true,
        noPlaylist: true,
        quiet: true
      } as any);
      return true;
    } catch (error) {
      console.warn(`YouTube URL test failed for ${url}:`, error);
      return false;
    }
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
      createdAt: new Date(),
      message: 'Validating YouTube URL...'
    };

    this.jobs.set(jobId, job);

    // Test URL accessibility first (optional - don't fail if test fails)
    try {
      const isAccessible = await this.testYouTubeUrl(youtubeUrl);
      if (!isAccessible) {
        console.warn(`YouTube URL may not be accessible: ${youtubeUrl}`);
        job.message = 'URL validation failed, attempting download anyway...';
      } else {
        job.message = 'URL validated, starting download...';
      }
    } catch (error) {
      console.warn('URL test failed, proceeding with download:', error);
      job.message = 'Starting download...';
    }

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

      // Enhanced yt-dlp options to handle modern YouTube restrictions

      console.log(`Starting download for ${jobId} with enhanced options`);

      let downloadOptions = {
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: 192,
        output: outputTemplate,
        noPlaylist: true,
        // Config file will handle: retries, user-agent, format, timeouts, headers, etc.
        configLocation: '/etc/yt-dlp.conf',
        // Verbose output for debugging
        verbose: process.env.NODE_ENV === 'development'
      } as any;

      let output;
      try {
        // Try with config file first
        output = await ytDlp(job.youtubeUrl, downloadOptions);
      } catch (enhancedError) {
        console.warn(`Config-based download failed for ${jobId}, trying fallback options:`, enhancedError);
        
        // Fallback to basic options without config file
        const fallbackOptions = {
          extractAudio: true,
          audioFormat: 'mp3',
          audioQuality: 192,
          output: outputTemplate,
          noPlaylist: true,
          retries: 3,
          // Basic format selection
          format: 'bestaudio',
          // Basic user agent
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        } as any;
        
        output = await ytDlp(job.youtubeUrl, fallbackOptions);
      }

      // Download audio using youtube-dl-exec with enhanced options

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
      job.message = 'Download completed successfully';

      console.log(`Download completed for ${jobId}: ${job.audioFilePath}`);

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error occurred';
      job.completedAt = new Date();
      
      // Enhanced error handling with specific messages
      if (error instanceof Error) {
        if (error.message.includes('403')) {
          job.error = 'YouTube blocked the download request. This video may be restricted or require authentication.';
        } else if (error.message.includes('No supported JavaScript runtime')) {
          job.error = 'JavaScript runtime not available. Please ensure Node.js is properly installed.';
        } else if (error.message.includes('SABR streaming')) {
          job.error = 'YouTube is using SABR streaming which is not supported. Try a different video.';
        } else if (error.message.includes('formats have been skipped')) {
          job.error = 'Some video formats are unavailable. The download may still succeed with available formats.';
        }
      }
      
      console.error(`Download failed for job ${jobId}:`, error);
      throw error;
    }
  }
}

// Singleton instance
export const youtubeDownloaderService = new YouTubeDownloaderService();