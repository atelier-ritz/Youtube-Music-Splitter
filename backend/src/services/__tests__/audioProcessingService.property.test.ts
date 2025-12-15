/**
 * Property-based tests for Audio Processing Service
 * **Feature: band-practice-webapp, Property 3: Audio processing workflow integrity**
 */

import * as fc from 'fast-check';
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
  },
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn()
}));

// Mock fetch globally
global.fetch = jest.fn();

// Import after mocking
import { audioProcessingService } from '../audioProcessingService';
import { ProcessingJob } from '../../types/processingTypes';

describe('AudioProcessingService Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUuidCounter = 0;
    
    // Setup default mocks
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.promises.readFile as jest.Mock).mockResolvedValue(Buffer.from('mock audio data'));
  });

  afterEach(() => {
    // Stop any periodic cleanup to prevent hanging
    audioProcessingService.stopPeriodicCleanup();
  });

  /**
   * **Feature: band-practice-webapp, Property 3: Audio processing workflow integrity**
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
   * 
   * Property: For any successfully downloaded audio file, the processing workflow should 
   * separate tracks, detect BPM, and transition to track view while maintaining data integrity throughout
   */
  test('Property 3: Audio processing workflow integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary audio file paths
        fc.string({ minLength: 1, maxLength: 100 }).map(name => `/temp/${name}.mp3`),
        // Generate mock external service responses
        fc.record({
          jobId: fc.string({ minLength: 1, maxLength: 50 }),
          status: fc.constantFrom('completed' as const),
          progress: fc.constant(100),
          tracks: fc.record({
            vocals: fc.webUrl(),
            drums: fc.webUrl(), 
            bass: fc.webUrl(),
            other: fc.webUrl()
          }),
          bpm: fc.integer({ min: 60, max: 200 })
        }),
        async (audioFilePath, mockExternalResponse) => {
          // Mock successful external service interaction
          (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
              ok: true,
              json: async () => ({ jobId: mockExternalResponse.jobId })
            })
            .mockResolvedValue({
              ok: true,
              json: async () => mockExternalResponse
            });

          // Start processing
          const jobId = await audioProcessingService.startProcessing(audioFilePath);

          // Verify job was created with correct initial state
          expect(jobId).toBeDefined();
          expect(typeof jobId).toBe('string');
          expect(jobId.length).toBeGreaterThan(0);

          // Get initial job status
          const initialJob = audioProcessingService.getJobStatus(jobId);
          expect(initialJob).toBeDefined();
          expect(initialJob!.originalAudioUrl).toBe(audioFilePath);
          expect(initialJob!.status).toMatch(/^(pending|processing|completed|failed)$/);
          expect(initialJob!.progress).toBeGreaterThanOrEqual(0);
          expect(initialJob!.progress).toBeLessThanOrEqual(100);
          expect(initialJob!.createdAt).toBeInstanceOf(Date);

          // Wait for processing to complete (with timeout)
          let finalJob: ProcessingJob | undefined;
          let attempts = 0;
          const maxAttempts = 50; // 5 seconds max wait
          
          while (attempts < maxAttempts) {
            finalJob = audioProcessingService.getJobStatus(jobId);
            if (finalJob && (finalJob.status === 'completed' || finalJob.status === 'failed')) {
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }

          // Verify final job state
          expect(finalJob).toBeDefined();
          
          if (finalJob!.status === 'completed') {
            // Requirement 2.1: Audio should be processed and separated into tracks
            expect(finalJob!.tracks).toBeDefined();
            expect(Array.isArray(finalJob!.tracks)).toBe(true);
            expect(finalJob!.tracks!.length).toBeGreaterThan(0);

            // Requirement 2.3: Should provide access to individual tracks
            const trackNames = finalJob!.tracks!.map(track => track.name);
            const expectedTrackTypes = ['vocals', 'drums', 'bass', 'other'];
            
            // At least some expected track types should be present
            const hasExpectedTracks = expectedTrackTypes.some(expectedType => 
              trackNames.includes(expectedType)
            );
            expect(hasExpectedTracks).toBe(true);

            // Each track should have valid structure
            for (const track of finalJob!.tracks!) {
              expect(track.id).toBeDefined();
              expect(typeof track.id).toBe('string');
              expect(track.name).toBeDefined();
              expect(typeof track.name).toBe('string');
              expect(track.audioUrl).toBeDefined();
              expect(typeof track.audioUrl).toBe('string');
              expect(typeof track.volume).toBe('number');
              expect(track.volume).toBeGreaterThanOrEqual(0);
              expect(track.volume).toBeLessThanOrEqual(1);
              expect(typeof track.pan).toBe('number');
              expect(track.pan).toBeGreaterThanOrEqual(-1);
              expect(track.pan).toBeLessThanOrEqual(1);
              expect(typeof track.muted).toBe('boolean');
            }

            // BPM should be detected if provided by external service
            if (mockExternalResponse.bpm) {
              expect(finalJob!.bpm).toBeDefined();
              expect(typeof finalJob!.bpm).toBe('number');
              expect(finalJob!.bpm).toBeGreaterThan(0);
            }

            // Requirement 2.2: Progress should reach 100% for completed jobs
            expect(finalJob!.progress).toBe(100);
            
            // Should have completion timestamp
            expect(finalJob!.completedAt).toBeDefined();
            expect(finalJob!.completedAt).toBeInstanceOf(Date);
            expect(finalJob!.completedAt!.getTime()).toBeGreaterThanOrEqual(finalJob!.createdAt.getTime());
          } else if (finalJob!.status === 'failed') {
            // Requirement 2.4: Error handling should provide error message
            expect(finalJob!.error).toBeDefined();
            expect(typeof finalJob!.error).toBe('string');
            expect(finalJob!.error!.length).toBeGreaterThan(0);
            
            // Should have completion timestamp even for failed jobs
            expect(finalJob!.completedAt).toBeDefined();
            expect(finalJob!.completedAt).toBeInstanceOf(Date);
          }

          // Data integrity: Job should maintain consistent state throughout
          expect(finalJob!.id).toBe(jobId);
          expect(finalJob!.originalAudioUrl).toBe(audioFilePath);
          expect(finalJob!.createdAt).toEqual(initialJob!.createdAt);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design document
    );
  }, 30000); // 30 second timeout for property test
});