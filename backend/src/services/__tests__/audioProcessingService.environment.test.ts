/**
 * AudioProcessingService Environment Configuration Tests
 * 
 * Tests for proper environment variable loading and service URL configuration
 */

import { jest } from '@jest/globals';

// Mock environment variables before importing the service
const mockEnv = {
  AUDIO_PROCESSING_SERVICE_URL: 'http://localhost:8080',
  NODE_ENV: 'test'
};

// Mock process.env
const originalEnv = process.env;
beforeAll(() => {
  process.env = { ...originalEnv, ...mockEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

// Mock axios
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock fs operations
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(() => '[]'),
  unlinkSync: jest.fn()
}));

// Mock path operations
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/'))
}));

describe('AudioProcessingService Environment Configuration', () => {
  let AudioProcessingService: any;
  let audioProcessingService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear module cache to ensure fresh import
    jest.resetModules();
    
    // Import after mocking
    const module = require('../audioProcessingService');
    AudioProcessingService = module.default || module.AudioProcessingService;
    audioProcessingService = module.audioProcessingService;
  });

  describe('Environment Variable Loading', () => {
    it('should use AUDIO_PROCESSING_SERVICE_URL from environment', () => {
      // Act: Create new service instance
      const service = new AudioProcessingService();

      // Assert: Should use environment URL
      expect(service['EXTERNAL_SERVICE_URL']).toBe('http://localhost:8080');
    });

    it('should fall back to default URL when environment variable is not set', () => {
      // Setup: Remove environment variable
      const originalUrl = process.env.AUDIO_PROCESSING_SERVICE_URL;
      delete process.env.AUDIO_PROCESSING_SERVICE_URL;

      // Act: Create new service instance
      const service = new AudioProcessingService();

      // Assert: Should use default URL
      expect(service['EXTERNAL_SERVICE_URL']).toBe('http://localhost:8000');

      // Cleanup
      if (originalUrl) {
        process.env.AUDIO_PROCESSING_SERVICE_URL = originalUrl;
      }
    });

    it('should handle empty environment variable', () => {
      // Setup: Set empty environment variable
      process.env.AUDIO_PROCESSING_SERVICE_URL = '';

      // Act: Create new service instance
      const service = new AudioProcessingService();

      // Assert: Should use default URL for empty string
      expect(service['EXTERNAL_SERVICE_URL']).toBe('http://localhost:8000');

      // Cleanup
      process.env.AUDIO_PROCESSING_SERVICE_URL = mockEnv.AUDIO_PROCESSING_SERVICE_URL;
    });
  });

  describe('Service URL Configuration', () => {
    it('should use correct URL for local development', () => {
      // Setup: Local development environment
      process.env.AUDIO_PROCESSING_SERVICE_URL = 'http://localhost:8080';
      process.env.NODE_ENV = 'development';

      // Act: Create service
      const service = new AudioProcessingService();

      // Assert: Should use local URL
      expect(service['EXTERNAL_SERVICE_URL']).toBe('http://localhost:8080');
    });

    it('should use correct URL for production', () => {
      // Setup: Production environment
      process.env.AUDIO_PROCESSING_SERVICE_URL = 'https://audio-service.railway.app';
      process.env.NODE_ENV = 'production';

      // Act: Create service
      const service = new AudioProcessingService();

      // Assert: Should use production URL
      expect(service['EXTERNAL_SERVICE_URL']).toBe('https://audio-service.railway.app');
    });

    it('should handle Railway internal networking', () => {
      // Setup: Railway internal URL
      process.env.AUDIO_PROCESSING_SERVICE_URL = 'http://audio-service.railway.internal:8080';

      // Act: Create service
      const service = new AudioProcessingService();

      // Assert: Should use internal URL
      expect(service['EXTERNAL_SERVICE_URL']).toBe('http://audio-service.railway.internal:8080');
    });
  });

  describe('Singleton Instance', () => {
    it('should create singleton with correct configuration', () => {
      // Act: Import singleton
      const { audioProcessingService } = require('../audioProcessingService');

      // Assert: Should be configured correctly
      expect(audioProcessingService).toBeDefined();
      expect(audioProcessingService['EXTERNAL_SERVICE_URL']).toBe('http://localhost:8080');
    });

    it('should maintain same instance across imports', () => {
      // Act: Import multiple times
      const { audioProcessingService: service1 } = require('../audioProcessingService');
      const { audioProcessingService: service2 } = require('../audioProcessingService');

      // Assert: Should be same instance
      expect(service1).toBe(service2);
    });
  });

  describe('HTTP Client Configuration', () => {
    beforeEach(() => {
      // Mock successful HTTP responses
      mockedAxios.post.mockResolvedValue({
        data: { jobId: 'test-job-id' }
      });

      mockedAxios.get.mockResolvedValue({
        data: { status: 'completed', progress: 100 }
      });
    });

    it('should make requests to configured URL', async () => {
      // Setup
      const service = new AudioProcessingService();
      const testAudioPath = '/test/audio.mp3';

      // Act: Start processing
      await service.startProcessing(testAudioPath);

      // Assert: Should make request to correct URL
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8080/api/process',
        expect.any(FormData),
        expect.any(Object)
      );
    });

    it('should handle URL changes dynamically', async () => {
      // Setup: Change environment variable
      process.env.AUDIO_PROCESSING_SERVICE_URL = 'http://localhost:9000';
      
      // Create new service instance
      const service = new AudioProcessingService();
      const testAudioPath = '/test/audio.mp3';

      // Act: Start processing
      await service.startProcessing(testAudioPath);

      // Assert: Should use new URL
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:9000/api/process',
        expect.any(FormData),
        expect.any(Object)
      );

      // Cleanup
      process.env.AUDIO_PROCESSING_SERVICE_URL = mockEnv.AUDIO_PROCESSING_SERVICE_URL;
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      // Setup: Mock connection error
      mockedAxios.post.mockRejectedValue(new Error('ECONNREFUSED'));

      const service = new AudioProcessingService();

      // Act & Assert: Should throw descriptive error
      await expect(service.startProcessing('/test/audio.mp3'))
        .rejects.toThrow('Failed to upload after 3 attempts');
    });

    it('should retry with correct URL on failure', async () => {
      // Setup: Mock first call failure, second success
      mockedAxios.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { jobId: 'test-job-id' } });

      const service = new AudioProcessingService();

      // Act: Start processing
      await service.startProcessing('/test/audio.mp3');

      // Assert: Should retry with same URL
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      expect(mockedAxios.post).toHaveBeenNthCalledWith(1,
        'http://localhost:8080/api/process',
        expect.any(FormData),
        expect.any(Object)
      );
      expect(mockedAxios.post).toHaveBeenNthCalledWith(2,
        'http://localhost:8080/api/process',
        expect.any(FormData),
        expect.any(Object)
      );
    });
  });

  describe('Integration with Backend Routes', () => {
    it('should work with process routes', async () => {
      // Setup
      mockedAxios.post.mockResolvedValue({
        data: { jobId: 'route-test-job' }
      });

      // Act: Use service through routes
      const jobId = await audioProcessingService.startProcessing('/test/route-audio.mp3');

      // Assert: Should work correctly
      expect(jobId).toBe('route-test-job');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8080/api/process',
        expect.any(FormData),
        expect.any(Object)
      );
    });
  });
});