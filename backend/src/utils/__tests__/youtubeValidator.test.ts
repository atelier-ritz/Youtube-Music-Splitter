/**
 * Property-based tests for YouTube URL validation
 * **Feature: band-practice-webapp, Property 1: YouTube URL validation consistency**
 */

import * as fc from 'fast-check';
import { validateYouTubeUrl, isValidYouTubeUrl } from '../youtubeValidator';

describe('YouTube URL Validation', () => {
  // **Feature: band-practice-webapp, Property 1: YouTube URL validation consistency**
  // **Validates: Requirements 1.2**
  describe('Property 1: YouTube URL validation consistency', () => {
    test('should consistently validate valid YouTube URLs', () => {
      fc.assert(
        fc.property(
          // Generate valid YouTube video IDs (11 characters, alphanumeric + _ -)
          fc.string({ minLength: 11, maxLength: 11 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
          (videoId) => {
            // Test various valid YouTube URL formats
            const validUrls = [
              `https://www.youtube.com/watch?v=${videoId}`,
              `https://youtube.com/watch?v=${videoId}`,
              `https://youtu.be/${videoId}`,
              `https://m.youtube.com/watch?v=${videoId}`,
              `https://www.youtube.com/embed/${videoId}`,
              `https://www.youtube.com/v/${videoId}`,
              `http://www.youtube.com/watch?v=${videoId}`,
              `http://youtu.be/${videoId}`,
              `https://www.youtube.com/watch?v=${videoId}&t=123`,
              `https://youtu.be/${videoId}?t=123`
            ];

            // All valid URLs should be consistently validated as valid
            for (const url of validUrls) {
              const result = validateYouTubeUrl(url);
              expect(result.isValid).toBe(true);
              expect(result.videoId).toBe(videoId);
              expect(result.error).toBeUndefined();
              
              // Boolean helper should also return true
              expect(isValidYouTubeUrl(url)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should consistently reject invalid URLs', () => {
      fc.assert(
        fc.property(
          // Generate various invalid URL patterns
          fc.oneof(
            fc.constant(''), // empty string
            fc.constant('   '), // whitespace only
            fc.string().filter(s => !s.includes('youtube') && !s.includes('youtu.be')), // non-YouTube URLs
            fc.constant('https://www.google.com'),
            fc.constant('not-a-url'),
            fc.constant('https://youtube.com/watch'), // missing video ID
            fc.constant('https://youtu.be/'), // missing video ID
            fc.string({ minLength: 1, maxLength: 50 }).map((s: string) => `https://youtube.com/watch?v=${s}`).filter((url: string) => {
              // Only include URLs with invalid video IDs (not 11 chars of valid chars)
              const match = url.match(/v=([^&]*)/);
              if (!match) return true;
              const videoId = match[1];
              return videoId.length !== 11 || !/^[a-zA-Z0-9_-]+$/.test(videoId);
            })
          ),
          (invalidUrl) => {
            const result = validateYouTubeUrl(invalidUrl);
            expect(result.isValid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.videoId).toBeUndefined();
            
            // Boolean helper should also return false
            expect(isValidYouTubeUrl(invalidUrl)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle edge cases consistently', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.integer(), // non-string types
            fc.boolean(),
            fc.array(fc.string()) // array instead of string
          ),
          (invalidInput) => {
            // @ts-ignore - intentionally testing with invalid types
            const result = validateYouTubeUrl(invalidInput);
            expect(result.isValid).toBe(false);
            expect(result.error).toBeDefined();
            
            // @ts-ignore - intentionally testing with invalid types
            expect(isValidYouTubeUrl(invalidInput)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional unit tests for specific examples
  describe('Unit tests for specific cases', () => {
    test('should validate common YouTube URL formats', () => {
      const validUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'http://youtube.com/watch?v=dQw4w9WgXcQ'
      ];

      validUrls.forEach(url => {
        const result = validateYouTubeUrl(url);
        expect(result.isValid).toBe(true);
        expect(result.videoId).toBe('dQw4w9WgXcQ');
      });
    });

    test('should reject invalid URLs', () => {
      const invalidUrls = [
        '',
        '   ',
        'https://www.google.com',
        'https://youtube.com/watch',
        'https://youtu.be/',
        'not-a-url',
        'https://youtube.com/watch?v=short', // too short video ID
        'https://youtube.com/watch?v=toolongvideoid123' // too long video ID
      ];

      invalidUrls.forEach(url => {
        const result = validateYouTubeUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });
});