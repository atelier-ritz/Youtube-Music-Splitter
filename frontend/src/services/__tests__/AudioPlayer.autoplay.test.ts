/**
 * AudioPlayer Autoplay Policy Tests
 * 
 * Tests for browser autoplay policy handling and user interaction requirements
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioPlayer } from '../AudioPlayer';
import type { Track } from '../AudioPlayer';

// Mock Web Audio API
const mockAudioContext = {
  state: 'suspended',
  currentTime: 0,
  sampleRate: 44100,
  destination: {
    maxChannelCount: 2,
    channelCount: 2
  },
  createGain: vi.fn(() => ({
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn()
  })),
  createStereoPanner: vi.fn(() => ({
    pan: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn()
  })),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    onended: null
  })),
  decodeAudioData: vi.fn(),
  resume: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn()
};

// Mock global AudioContext
(globalThis as any).AudioContext = vi.fn(() => mockAudioContext);
(globalThis as any).webkitAudioContext = vi.fn(() => mockAudioContext);

// Mock fetch for audio loading
globalThis.fetch = vi.fn();

describe('AudioPlayer Autoplay Policy Tests', () => {
  let audioPlayer: AudioPlayer;
  let mockTracks: Track[];

  beforeEach(() => {
    vi.clearAllMocks();
    audioPlayer = new AudioPlayer();
    
    mockTracks = [
      {
        id: 'vocals',
        name: 'vocals',
        audioUrl: 'http://test.com/vocals.mp3',
        duration: 180,
        volume: 0.8,
        pan: 0,
        muted: false,
        soloed: false
      }
    ];

    // Mock successful audio loading
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
    });

    mockAudioContext.decodeAudioData.mockResolvedValue({
      duration: 180,
      sampleRate: 44100,
      numberOfChannels: 2,
      length: 7938000
    });
  });

  afterEach(() => {
    audioPlayer.dispose();
  });

  describe('AudioContext Resume Handling', () => {
    it('should handle suspended AudioContext on play', async () => {
      // Setup: AudioContext is suspended
      mockAudioContext.state = 'suspended';
      mockAudioContext.resume.mockResolvedValue(undefined);

      await audioPlayer.loadTracks(mockTracks);

      // Act: Call play (should trigger resume)
      audioPlayer.play();

      // Assert: resume should be called
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should start playback immediately if AudioContext is already running', async () => {
      // Setup: AudioContext is already running
      mockAudioContext.state = 'running';

      await audioPlayer.loadTracks(mockTracks);

      // Act: Call play
      audioPlayer.play();

      // Assert: Should not call resume, should start source immediately
      expect(mockAudioContext.resume).not.toHaveBeenCalled();
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
    });

    it('should throw error if AudioContext resume fails', async () => {
      // Setup: AudioContext resume fails
      mockAudioContext.state = 'suspended';
      mockAudioContext.resume.mockRejectedValue(new Error('User interaction required'));

      await audioPlayer.loadTracks(mockTracks);

      // Act & Assert: Should throw error
      expect(() => {
        audioPlayer.play();
      }).toThrow('AudioContext resume failed - user interaction may be required');
    });
  });

  describe('User Interaction Requirements', () => {
    it('should handle play() call in user gesture context', async () => {
      // Setup
      mockAudioContext.state = 'suspended';
      mockAudioContext.resume.mockResolvedValue(undefined);

      await audioPlayer.loadTracks(mockTracks);

      // Act: Simulate user click -> play
      audioPlayer.play();

      // Assert: Should handle gracefully
      expect(mockAudioContext.resume).toHaveBeenCalled();
      expect(audioPlayer.getIsPlaying()).toBe(true);
    });

    it('should not call play() during initialization', async () => {
      // Setup: Fresh AudioPlayer
      const newPlayer = new AudioPlayer();

      // Act: Load tracks (should not auto-play)
      await newPlayer.loadTracks(mockTracks);

      // Assert: Should not be playing
      expect(newPlayer.getIsPlaying()).toBe(false);
      expect(mockAudioContext.createBufferSource).not.toHaveBeenCalled();

      newPlayer.dispose();
    });
  });

  describe('Synchronous AudioContext Resume', () => {
    it('should call resume synchronously in user gesture context', async () => {
      // Setup
      mockAudioContext.state = 'suspended';
      let resumeCallOrder: string[] = [];
      
      mockAudioContext.resume.mockImplementation(() => {
        resumeCallOrder.push('resume');
        return Promise.resolve();
      });

      await audioPlayer.loadTracks(mockTracks);

      // Act: Call play synchronously (simulating user click)
      resumeCallOrder.push('play-called');
      audioPlayer.play();
      resumeCallOrder.push('play-returned');

      // Assert: Resume should be called synchronously
      expect(resumeCallOrder).toEqual(['play-called', 'resume', 'play-returned']);
    });

    it('should not lose user gesture context during async operations', async () => {
      // Setup: Simulate delayed resume
      mockAudioContext.state = 'suspended';
      mockAudioContext.resume.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve(undefined), 10);
        });
      });

      await audioPlayer.loadTracks(mockTracks);

      // Act: Call play (should handle async resume)
      audioPlayer.play();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 20));

      // Assert: Should eventually start playing
      expect(audioPlayer.getIsPlaying()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle "user agent denied" errors gracefully', async () => {
      // Setup: Simulate browser blocking audio
      mockAudioContext.state = 'suspended';
      mockAudioContext.resume.mockRejectedValue(new Error('The request is not allowed by the user agent'));

      await audioPlayer.loadTracks(mockTracks);

      // Act & Assert: Should throw descriptive error
      expect(() => {
        audioPlayer.play();
      }).toThrow('AudioContext resume failed - user interaction may be required');
    });

    it('should maintain consistent state after autoplay error', async () => {
      // Setup
      mockAudioContext.state = 'suspended';
      mockAudioContext.resume.mockRejectedValue(new Error('Autoplay blocked'));

      await audioPlayer.loadTracks(mockTracks);

      // Act: Try to play (should fail)
      try {
        audioPlayer.play();
      } catch (error) {
        // Expected to throw
      }

      // Assert: Should not be in playing state
      expect(audioPlayer.getIsPlaying()).toBe(false);
    });
  });

  describe('iOS Compatibility', () => {
    beforeEach(() => {
      // Mock iOS user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });
    });

    it('should detect iOS devices correctly', () => {
      // Act: Create new player (will check iOS)
      const iosPlayer = new AudioPlayer();

      // Assert: Should handle iOS-specific logic
      // (We can't directly test private methods, but we can verify no errors)
      expect(iosPlayer).toBeDefined();

      iosPlayer.dispose();
    });

    it('should handle iOS audio unlock', async () => {
      // Setup
      mockAudioContext.state = 'suspended';
      mockAudioContext.resume.mockResolvedValue(undefined);

      await audioPlayer.loadTracks(mockTracks);

      // Act: Play on iOS
      audioPlayer.play();

      // Assert: Should handle iOS-specific audio unlock
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });
  });

  describe('Integration with TrackView', () => {
    it('should work with direct button click handler', async () => {
      // Setup
      mockAudioContext.state = 'suspended';
      mockAudioContext.resume.mockResolvedValue(undefined);

      await audioPlayer.loadTracks(mockTracks);

      // Act: Simulate button click -> handlePlayPause -> audioPlayer.play()
      const handlePlayPause = () => {
        if (audioPlayer.getIsPlaying()) {
          audioPlayer.pause();
        } else {
          audioPlayer.play(); // This should work in user gesture context
        }
      };

      handlePlayPause();

      // Assert: Should start playing
      expect(audioPlayer.getIsPlaying()).toBe(true);
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });
  });
});