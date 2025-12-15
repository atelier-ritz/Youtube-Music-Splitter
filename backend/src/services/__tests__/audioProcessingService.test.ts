/**
 * Unit tests for Audio Processing Service
 */

import fs from 'fs';
import path from 'path';

// Mock uuid module
let mockUuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => `mock-uuid-${++mockUuidCounter}`)
}));

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  }
}));

// Mock fetch globally
global.fetch = jest.fn();

// Import after mocking
import { audioProcessingService } from '../audioProcessingService';

describe('AudioProcessingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUuidCounter = 0;
    // Clear any existing jobs by creating a new service instance
    // Since we can't access private members, we'll work with the existing jobs
  });

  describe('startProcessing', () => {
    it('should create a new processing job and return job ID', async () => {
      const mockAudioPath = '/path/to/audio.mp3';

      const jobId = await audioProcessingService.startProcessing(mockAudioPath);

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      expect(jobId.length).toBeGreaterThan(0);

      // Verify job was created - it should be pending initially but may start processing immediately
      const job = audioProcessingService.getJobStatus(jobId);
      expect(job).toBeDefined();
      expect(job?.originalAudioUrl).toBe(mockAudioPath);
      expect(job?.progress).toBeGreaterThanOrEqual(0);
      // Status might be pending, processing, or failed depending on async processing
      expect(['pending', 'processing', 'failed']).toContain(job?.status);
    });

    it('should handle multiple concurrent processing jobs', async () => {
      const mockAudioPath1 = '/path/to/audio1.mp3';
      const mockAudioPath2 = '/path/to/audio2.mp3';

      const jobId1 = await audioProcessingService.startProcessing(mockAudioPath1);
      const jobId2 = await audioProcessingService.startProcessing(mockAudioPath2);

      expect(jobId1).not.toBe(jobId2);

      const job1 = audioProcessingService.getJobStatus(jobId1);
      const job2 = audioProcessingService.getJobStatus(jobId2);

      expect(job1?.originalAudioUrl).toBe(mockAudioPath1);
      expect(job2?.originalAudioUrl).toBe(mockAudioPath2);
    });
  });

  describe('getJobStatus', () => {
    it('should return job status for existing job', async () => {
      const mockAudioPath = '/path/to/audio.mp3';

      const jobId = await audioProcessingService.startProcessing(mockAudioPath);
      const job = audioProcessingService.getJobStatus(jobId);

      expect(job).toBeDefined();
      expect(job?.id).toBe(jobId);
      expect(['pending', 'processing', 'failed']).toContain(job?.status);
    });

    it('should return undefined for non-existent job', () => {
      const job = audioProcessingService.getJobStatus('non-existent-id');
      expect(job).toBeUndefined();
    });
  });

  describe('getAllJobs', () => {
    it('should return all created jobs', async () => {
      const mockAudioPath1 = '/path/to/audio1.mp3';
      const mockAudioPath2 = '/path/to/audio2.mp3';

      const jobId1 = await audioProcessingService.startProcessing(mockAudioPath1);
      const jobId2 = await audioProcessingService.startProcessing(mockAudioPath2);

      const jobs = audioProcessingService.getAllJobs();
      expect(jobs.length).toBeGreaterThanOrEqual(2);
      expect(jobs.map(job => job.id)).toContain(jobId1);
      expect(jobs.map(job => job.id)).toContain(jobId2);
    });
  });

  describe('cleanupOldJobs', () => {
    it('should not remove recent jobs', async () => {
      const mockAudioPath = '/path/to/audio.mp3';

      const jobId = await audioProcessingService.startProcessing(mockAudioPath);
      
      // Run cleanup with 1 hour max age
      audioProcessingService.cleanupOldJobs(1);

      // Job should still exist since it's recent
      const job = audioProcessingService.getJobStatus(jobId);
      expect(job).toBeDefined();
    });
  });
});