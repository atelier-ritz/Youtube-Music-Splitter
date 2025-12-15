/**
 * AudioAnalysisService Tests
 * 
 * Tests for the audio analysis service that provides waveform generation
 * and real-time audio analysis capabilities.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioAnalysisService } from '../AudioAnalysisService';

// Mock AudioContext and related APIs
const mockAudioContext = {
  createAnalyser: vi.fn(() => ({
    fftSize: 2048,
    smoothingTimeConstant: 0.8,
    minDecibels: -90,
    maxDecibels: -10,
    frequencyBinCount: 1024,
    connect: vi.fn(),
    disconnect: vi.fn(),
    getByteFrequencyData: vi.fn((array) => {
      // Fill with mock frequency data
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 255);
      }
    }),
    getByteTimeDomainData: vi.fn((array) => {
      // Fill with mock time domain data
      for (let i = 0; i < array.length; i++) {
        array[i] = 128 + Math.floor(Math.random() * 50 - 25); // Around 128 with some variation
      }
    })
  }))
};

// Mock AudioBuffer
const createMockAudioBuffer = (duration: number = 3.0, sampleRate: number = 44100) => {
  const length = Math.floor(duration * sampleRate);
  const channelData = new Float32Array(length);
  
  // Generate mock audio data with some variation
  for (let i = 0; i < length; i++) {
    // Create a simple sine wave with some noise
    const time = i / sampleRate;
    channelData[i] = Math.sin(2 * Math.PI * 440 * time) * 0.5 + (Math.random() - 0.5) * 0.1;
  }
  
  return {
    duration,
    sampleRate,
    length,
    numberOfChannels: 1,
    getChannelData: vi.fn(() => channelData)
  };
};

describe('AudioAnalysisService', () => {
  let analysisService: AudioAnalysisService;

  beforeEach(() => {
    analysisService = new AudioAnalysisService();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize without errors', () => {
      expect(analysisService).toBeInstanceOf(AudioAnalysisService);
    });

    it('should initialize with AudioContext', () => {
      expect(() => {
        analysisService.initialize(mockAudioContext as any);
      }).not.toThrow();
    });
  });

  describe('waveform data extraction', () => {
    it('should extract waveform data from audio buffer', () => {
      const mockBuffer = createMockAudioBuffer(3.0, 44100);
      const targetPoints = 100;

      const waveformData = analysisService.extractWaveformData(mockBuffer as any, targetPoints);

      expect(waveformData).toBeDefined();
      expect(waveformData.amplitudes).toHaveLength(targetPoints);
      expect(waveformData.duration).toBe(3.0);
      expect(waveformData.sampleRate).toBe(44100);
      expect(waveformData.samplesPerPoint).toBeGreaterThan(0);

      // Check that amplitudes are in valid range (0-1)
      waveformData.amplitudes.forEach(amplitude => {
        expect(amplitude).toBeGreaterThanOrEqual(0);
        expect(amplitude).toBeLessThanOrEqual(1);
      });
    });

    it('should handle different target point counts', () => {
      const mockBuffer = createMockAudioBuffer(2.0, 44100);

      const waveform50 = analysisService.extractWaveformData(mockBuffer as any, 50);
      const waveform200 = analysisService.extractWaveformData(mockBuffer as any, 200);

      expect(waveform50.amplitudes).toHaveLength(50);
      expect(waveform200.amplitudes).toHaveLength(200);
    });

    it('should throw error for invalid audio buffer', () => {
      expect(() => {
        analysisService.extractWaveformData(null as any);
      }).toThrow('Invalid audio buffer provided');

      expect(() => {
        analysisService.extractWaveformData({ length: 0 } as any);
      }).toThrow('Invalid audio buffer provided');
    });
  });

  describe('analyser node creation', () => {
    beforeEach(() => {
      analysisService.initialize(mockAudioContext as any);
    });

    it('should create analyser for track', () => {
      const mockSourceNode = { connect: vi.fn() };
      const trackId = 'test-track';

      const analyser = analysisService.createAnalyserForTrack(trackId, mockSourceNode as any);

      expect(analyser).toBeDefined();
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
      expect(mockSourceNode.connect).toHaveBeenCalledWith(analyser);
    });

    it('should throw error if not initialized', () => {
      const uninitializedService = new AudioAnalysisService();
      const mockSourceNode = { connect: vi.fn() };

      expect(() => {
        uninitializedService.createAnalyserForTrack('test', mockSourceNode as any);
      }).toThrow('AudioContext not initialized');
    });
  });

  describe('real-time analysis', () => {
    beforeEach(() => {
      analysisService.initialize(mockAudioContext as any);
    });

    it('should get real-time analysis data', () => {
      const mockSourceNode = { connect: vi.fn() };
      const trackId = 'test-track';

      analysisService.createAnalyserForTrack(trackId, mockSourceNode as any);
      const analysisData = analysisService.getRealtimeAnalysis(trackId);

      expect(analysisData).toBeDefined();
      expect(analysisData!.frequencyData).toBeInstanceOf(Uint8Array);
      expect(analysisData!.timeData).toBeInstanceOf(Uint8Array);
      expect(analysisData!.rmsAmplitude).toBeGreaterThanOrEqual(0);
      expect(analysisData!.rmsAmplitude).toBeLessThanOrEqual(1);
      expect(analysisData!.peakAmplitude).toBeGreaterThanOrEqual(0);
      expect(analysisData!.peakAmplitude).toBeLessThanOrEqual(1);
    });

    it('should return null for non-existent track', () => {
      const analysisData = analysisService.getRealtimeAnalysis('non-existent');
      expect(analysisData).toBeNull();
    });
  });

  describe('visualization data generation', () => {
    it('should generate visualization data', () => {
      const mockBuffer = createMockAudioBuffer(2.0, 44100);
      const waveformData = analysisService.extractWaveformData(mockBuffer as any, 100);

      const visualizationData = analysisService.generateVisualizationData(waveformData, 50, 80);

      expect(visualizationData.bars).toHaveLength(50);
      visualizationData.bars.forEach(bar => {
        expect(bar.height).toBeGreaterThanOrEqual(2); // Minimum height
        expect(bar.opacity).toBeGreaterThanOrEqual(0.1); // Minimum opacity
        expect(bar.opacity).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('silent section detection', () => {
    it('should detect silent sections', () => {
      // Create a buffer with some silent sections
      const mockBuffer = createMockAudioBuffer(4.0, 44100);
      const channelData = mockBuffer.getChannelData();
      
      // Make first second silent
      for (let i = 0; i < 44100; i++) {
        channelData[i] = 0.001; // Very quiet
      }
      
      // Make third second silent
      for (let i = 88200; i < 132300; i++) {
        channelData[i] = 0.001; // Very quiet
      }

      const waveformData = analysisService.extractWaveformData(mockBuffer as any, 400);
      const silentSections = analysisService.detectSilentSections(waveformData, 0.01, 0.5);

      expect(silentSections.length).toBeGreaterThan(0);
      silentSections.forEach(section => {
        expect(section.start).toBeGreaterThanOrEqual(0);
        expect(section.end).toBeGreaterThan(section.start);
        expect(section.duration).toBe(section.end - section.start);
      });
    });
  });

  describe('cleanup', () => {
    it('should dispose properly', () => {
      analysisService.initialize(mockAudioContext as any);
      const mockSourceNode = { connect: vi.fn() };
      
      analysisService.createAnalyserForTrack('test', mockSourceNode as any);
      
      expect(() => {
        analysisService.dispose();
      }).not.toThrow();
    });
  });
});