/**
 * Unit tests for YouTube downloader service
 */

import { YouTubeDownloaderService } from '../youtubeDownloader';

describe('YouTubeDownloaderService', () => {
  let service: YouTubeDownloaderService;

  beforeEach(() => {
    service = new YouTubeDownloaderService();
  });

  test('should create a download job with valid YouTube URL', async () => {
    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    
    const jobId = await service.startDownload(youtubeUrl);
    
    expect(jobId).toBeDefined();
    expect(typeof jobId).toBe('string');
    expect(jobId.length).toBeGreaterThan(0);
    
    // Check job immediately after creation
    const job = service.getJobStatus(jobId);
    expect(job).toBeDefined();
    expect(job?.youtubeUrl).toBe(youtubeUrl);
    // Status can be 'pending' or 'downloading' depending on timing
    expect(['pending', 'downloading'].includes(job?.status || '')).toBe(true);
    expect(job?.progress).toBeGreaterThanOrEqual(0);
    expect(job?.createdAt).toBeInstanceOf(Date);
  });

  test('should return null for non-existent job ID', () => {
    const job = service.getJobStatus('non-existent-id');
    expect(job).toBeNull();
  });

  test('should return all jobs', async () => {
    const url1 = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const url2 = 'https://youtu.be/dQw4w9WgXcQ';
    
    const jobId1 = await service.startDownload(url1);
    const jobId2 = await service.startDownload(url2);
    
    const allJobs = service.getAllJobs();
    expect(allJobs.length).toBeGreaterThanOrEqual(2);
    expect(allJobs.map(job => job.id)).toContain(jobId1);
    expect(allJobs.map(job => job.id)).toContain(jobId2);
  });

  test('should handle job status updates', async () => {
    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    
    const jobId = await service.startDownload(youtubeUrl);
    const initialJob = service.getJobStatus(jobId);
    
    // Status can be 'pending' or 'downloading' depending on timing
    expect(['pending', 'downloading'].includes(initialJob?.status || '')).toBe(true);
    
    // Wait a bit to see if status changes
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const updatedJob = service.getJobStatus(jobId);
    // Status should be downloading or failed (since we don't have yt-dlp installed)
    expect(['pending', 'downloading', 'failed'].includes(updatedJob?.status || '')).toBe(true);
  });
});