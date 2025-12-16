/**
 * Audio Processing Service
 * Handles communication with external audio processing service for track separation and BPM detection
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import FormData from 'form-data';
import axios from 'axios';
import { 
  ProcessingJob, 
  Track, 
  ExternalProcessingServiceRequest,
  ExternalProcessingServiceResponse 
} from '../types/processingTypes';

class AudioProcessingService {
  private jobs: Map<string, ProcessingJob> = new Map();
  private readonly EXTERNAL_SERVICE_URL = process.env.AUDIO_PROCESSING_SERVICE_URL || 'http://localhost:8000';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds
  private readonly POLLING_INTERVAL = 5000; // 5 seconds
  private readonly TEMP_DIR = path.join(process.cwd(), 'temp');
  private readonly JOB_PERSISTENCE_FILE = path.join(this.TEMP_DIR, 'processing-jobs.json');
  private readonly MAX_JOB_AGE_HOURS = 24;
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Only initialize in non-test environment
    if (process.env.NODE_ENV !== 'test') {
      this.ensureTempDirectory();
      this.loadPersistedJobs();
      this.startPeriodicCleanup();
    }
  }

  /**
   * Start audio processing job
   */
  async startProcessing(audioFilePath: string): Promise<string> {
    const jobId = uuidv4();
    
    const job: ProcessingJob = {
      id: jobId,
      status: 'pending',
      progress: 0,
      originalAudioUrl: audioFilePath,
      createdAt: new Date()
    };

    this.jobs.set(jobId, job);
    this.persistJobs();

    // Start processing asynchronously
    this.processAudioFile(jobId, audioFilePath).catch(error => {
      console.error(`Processing job ${jobId} failed:`, error);
      this.updateJobStatus(jobId, 'failed', 0, undefined, undefined, error.message);
    });

    return jobId;
  }

  /**
   * Get processing job status
   */
  getJobStatus(jobId: string): ProcessingJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all processing jobs (for debugging)
   */
  getAllJobs(): ProcessingJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Process audio file with external service
   */
  private async processAudioFile(jobId: string, audioFilePath: string): Promise<void> {
    try {
      // Update job status to processing
      this.updateJobStatus(jobId, 'processing', 10);

      // Read audio file
      const audioBuffer = await fs.promises.readFile(audioFilePath);
      const filename = path.basename(audioFilePath);

      // Send to external processing service
      const externalJobId = await this.uploadToExternalService(audioBuffer, filename);
      
      // Update progress
      this.updateJobStatus(jobId, 'processing', 30);

      // Poll external service for completion
      const result = await this.pollExternalService(externalJobId, jobId);

      // Process results and create tracks
      const tracks = await this.processExternalServiceResult(result);

      // Update job with final results
      this.updateJobStatus(jobId, 'completed', 100, tracks, result.bpm);

    } catch (error) {
      console.error(`Audio processing failed for job ${jobId}:`, error);
      this.updateJobStatus(jobId, 'failed', 0, undefined, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Upload audio file to external processing service using proper HTTP request
   */
  private async uploadToExternalService(audioBuffer: Buffer, filename: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`Upload attempt ${attempt}/${this.MAX_RETRIES}: Uploading ${filename} to ${this.EXTERNAL_SERVICE_URL}/api/process`);
        
        // Create FormData with the audio buffer
        const formData = new FormData();
        formData.append('audio_file', audioBuffer, {
          filename: filename,
          contentType: 'audio/mpeg'
        });

        // Make HTTP request to external service using axios
        const response = await axios.post(`${this.EXTERNAL_SERVICE_URL}/api/process`, formData, {
          headers: {
            ...formData.getHeaders(),
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000 // 30 second timeout
        });

        const result = response.data as { jobId?: string };
        console.log(`Upload successful, response:`, result);

        if (result.jobId) {
          console.log(`Upload successful, got job ID: ${result.jobId}`);
          return result.jobId;
        } else {
          throw new Error(`Invalid response format: ${JSON.stringify(result)}`);
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown upload error');
        console.error(`Upload attempt ${attempt} failed:`, lastError.message);

        if (attempt < this.MAX_RETRIES) {
          console.log(`Retrying in ${this.RETRY_DELAY * attempt}ms...`);
          await this.delay(this.RETRY_DELAY * attempt); // Exponential backoff
        }
      }
    }

    throw new Error(`Failed to upload after ${this.MAX_RETRIES} attempts: ${lastError?.message}`);
  }

  /**
   * Poll external service for processing completion
   */
  private async pollExternalService(externalJobId: string, jobId?: string): Promise<ExternalProcessingServiceResponse> {
    const maxPollingTime = 10 * 60 * 1000; // 10 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxPollingTime) {
      try {
        const response = await axios.get(`${this.EXTERNAL_SERVICE_URL}/api/process/${externalJobId}`, {
          timeout: 10000 // 10 second timeout
        });

        const result = response.data as ExternalProcessingServiceResponse;

        // Update local job progress based on external service progress
        if (jobId) {
          const adjustedProgress = Math.round(30 + (result.progress * 0.6)); // Map external progress to 30-90% range
          this.updateJobStatus(jobId, 'processing', adjustedProgress);
        }

        if (result.status === 'completed') {
          return result;
        }

        if (result.status === 'failed') {
          throw new Error(result.error || 'External processing service failed');
        }

        // Continue polling
        await this.delay(this.POLLING_INTERVAL);

      } catch (error) {
        console.error('Polling error:', error);
        // Continue polling unless it's a critical error
        if (error instanceof Error && error.message.includes('status check failed')) {
          await this.delay(this.POLLING_INTERVAL);
          continue;
        }
        throw error;
      }
    }

    throw new Error('Processing timeout: External service did not complete within the expected time');
  }

  /**
   * Process external service result and create Track objects
   */
  private async processExternalServiceResult(result: ExternalProcessingServiceResponse): Promise<Track[]> {
    if (!result.tracks) {
      throw new Error('No tracks returned from external processing service');
    }

    const tracks: Track[] = [];
    const trackNames = ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other'] as const;

    for (const trackName of trackNames) {
      const trackUrl = result.tracks?.[trackName as keyof typeof result.tracks];
      if (trackUrl) {
        tracks.push({
          id: uuidv4(),
          name: trackName,
          audioUrl: trackUrl,
          duration: 0, // Will be determined by frontend when loading
          volume: 1.0,
          pan: 0.0,
          muted: false,
          soloed: false
        });
      }
    }

    if (tracks.length === 0) {
      throw new Error('No valid tracks were processed');
    }

    return tracks;
  }

  /**
   * Update job status
   */
  private updateJobStatus(
    jobId: string, 
    status: ProcessingJob['status'], 
    progress: number, 
    tracks?: Track[], 
    bpm?: number, 
    error?: string
  ): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      job.progress = Math.round(progress);
      if (tracks) job.tracks = tracks;
      if (bpm) job.bpm = bpm;
      if (error) job.error = error;
      if (status === 'completed' || status === 'failed') {
        job.completedAt = new Date();
      }
      
      // Persist changes to disk
      this.persistJobs();
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Ensure temp directory exists
   */
  private ensureTempDirectory(): void {
    if (!fs.existsSync(this.TEMP_DIR)) {
      fs.mkdirSync(this.TEMP_DIR, { recursive: true });
    }
  }

  /**
   * Load persisted jobs from disk
   */
  private loadPersistedJobs(): void {
    try {
      if (fs.existsSync(this.JOB_PERSISTENCE_FILE)) {
        const data = fs.readFileSync(this.JOB_PERSISTENCE_FILE, 'utf8');
        const jobsArray = JSON.parse(data) as ProcessingJob[];
        
        // Convert dates back from strings and restore jobs
        for (const job of jobsArray) {
          job.createdAt = new Date(job.createdAt);
          if (job.completedAt) {
            job.completedAt = new Date(job.completedAt);
          }
          this.jobs.set(job.id, job);
        }
        
        console.log(`Loaded ${jobsArray.length} persisted processing jobs`);
      }
    } catch (error) {
      console.error('Failed to load persisted jobs:', error);
      // Continue without persisted jobs
    }
  }

  /**
   * Persist jobs to disk
   */
  private persistJobs(): void {
    // Skip persistence in test environment
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    
    try {
      const jobsArray = Array.from(this.jobs.values());
      fs.writeFileSync(this.JOB_PERSISTENCE_FILE, JSON.stringify(jobsArray, null, 2));
    } catch (error) {
      console.error('Failed to persist jobs:', error);
    }
  }

  /**
   * Start periodic cleanup of old jobs
   */
  private startPeriodicCleanup(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldJobs();
    }, 60 * 60 * 1000);
  }

  /**
   * Stop periodic cleanup (for testing)
   */
  stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: ProcessingJob['status']): ProcessingJob[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  /**
   * Get jobs created within a time range
   */
  getJobsInTimeRange(startTime: Date, endTime: Date): ProcessingJob[] {
    return Array.from(this.jobs.values()).filter(job => 
      job.createdAt >= startTime && job.createdAt <= endTime
    );
  }

  /**
   * Cancel a processing job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === 'pending' || job.status === 'processing') {
      job.status = 'failed';
      job.error = 'Job cancelled by user';
      job.completedAt = new Date();
      this.persistJobs();
      return true;
    }

    return false;
  }

  /**
   * Clean up old jobs and associated files
   */
  cleanupOldJobs(maxAgeHours: number = this.MAX_JOB_AGE_HOURS): number {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.createdAt < cutoffTime && (job.status === 'completed' || job.status === 'failed')) {
        // Clean up associated files if they exist
        this.cleanupJobFiles(job);
        this.jobs.delete(jobId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.persistJobs();
      console.log(`Cleaned up ${cleanedCount} old processing jobs`);
    }

    return cleanedCount;
  }

  /**
   * Clean up files associated with a job
   */
  private cleanupJobFiles(job: ProcessingJob): void {
    try {
      // Clean up original audio file if it's in temp directory
      if (job.originalAudioUrl && job.originalAudioUrl.includes(this.TEMP_DIR)) {
        if (fs.existsSync(job.originalAudioUrl)) {
          fs.unlinkSync(job.originalAudioUrl);
        }
      }

      // Clean up track files if they're local files
      if (job.tracks) {
        for (const track of job.tracks) {
          if (track.audioUrl && track.audioUrl.includes(this.TEMP_DIR)) {
            if (fs.existsSync(track.audioUrl)) {
              fs.unlinkSync(track.audioUrl);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Failed to cleanup files for job ${job.id}:`, error);
    }
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    averageProcessingTime?: number;
  } {
    const jobs = Array.from(this.jobs.values());
    const stats = {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      averageProcessingTime: undefined as number | undefined
    };

    // Calculate average processing time for completed jobs
    const completedJobs = jobs.filter(j => j.status === 'completed' && j.completedAt);
    if (completedJobs.length > 0) {
      const totalTime = completedJobs.reduce((sum, job) => {
        const processingTime = job.completedAt!.getTime() - job.createdAt.getTime();
        return sum + processingTime;
      }, 0);
      stats.averageProcessingTime = Math.round(totalTime / completedJobs.length / 1000); // in seconds
    }

    return stats;
  }
}

// Export singleton instance
export const audioProcessingService = new AudioProcessingService();