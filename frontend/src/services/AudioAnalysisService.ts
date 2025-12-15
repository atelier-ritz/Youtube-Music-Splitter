/**
 * AudioAnalysisService - Web Audio API service for waveform generation and audio analysis
 * 
 * Provides real-time audio analysis using AnalyserNode and efficient waveform data extraction
 * from audio buffers for visualization purposes.
 * 
 * Requirements: 11.1, 11.5
 */

export interface WaveformData {
  /** Array of amplitude values (0-1 range) representing the waveform */
  amplitudes: number[];
  /** Duration of the audio in seconds */
  duration: number;
  /** Sample rate used for analysis */
  sampleRate: number;
  /** Number of samples per amplitude point */
  samplesPerPoint: number;
}

export interface RealTimeAnalysisData {
  /** Current frequency domain data (0-255 range) */
  frequencyData: Uint8Array;
  /** Current time domain data (-128 to 127 range) */
  timeData: Uint8Array;
  /** Current RMS (Root Mean Square) amplitude (0-1 range) */
  rmsAmplitude: number;
  /** Peak amplitude in current frame (0-1 range) */
  peakAmplitude: number;
}

// Cache for waveform data to avoid expensive re-computation
interface WaveformDataCache {
  key: string;
  data: WaveformData;
  timestamp: number;
}

export class AudioAnalysisService {
  private audioContext: AudioContext | null = null;
  private analyserNodes: Map<string, AnalyserNode> = new Map();
  private animationFrameId: number | null = null;
  private analysisCallback?: (trackId: string, data: RealTimeAnalysisData) => void;
  private waveformCache: Map<string, WaveformDataCache> = new Map();
  private readonly CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 20; // Maximum cached waveforms

  constructor() {
    console.log('AudioAnalysisService constructor called');
    
    // Clean up expired cache entries periodically
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60000); // Check every minute
  }

  /**
   * Initialize the audio analysis service with an existing AudioContext
   */
  initialize(audioContext: AudioContext): void {
    this.audioContext = audioContext;
    console.log('AudioAnalysisService initialized with AudioContext');
  }

  /**
   * Generate cache key for waveform data
   */
  private generateWaveformCacheKey(audioBuffer: AudioBuffer, targetPoints: number): string {
    // Use buffer properties to create a unique key
    return `${audioBuffer.length}-${audioBuffer.sampleRate}-${audioBuffer.duration}-${targetPoints}`;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.waveformCache.forEach((cache, key) => {
      if (now - cache.timestamp > this.CACHE_EXPIRY_MS) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      this.waveformCache.delete(key);
    });

    // Also enforce max cache size
    if (this.waveformCache.size > this.MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(this.waveformCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const entriesToRemove = sortedEntries.slice(0, this.waveformCache.size - this.MAX_CACHE_SIZE);
      entriesToRemove.forEach(([key]) => {
        this.waveformCache.delete(key);
      });
    }

    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired waveform cache entries`);
    }
  }

  /**
   * Extract waveform data from an audio buffer for visualization
   * Uses efficient amplitude sampling and caching to create visualization-ready data
   */
  extractWaveformData(audioBuffer: AudioBuffer, targetPoints: number = 1000): WaveformData {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Invalid audio buffer provided');
    }

    // Check cache first
    const cacheKey = this.generateWaveformCacheKey(audioBuffer, targetPoints);
    const cached = this.waveformCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_EXPIRY_MS) {
      console.log('Using cached waveform data');
      return cached.data;
    }

    console.log('Generating new waveform data');
    const startTime = performance.now();

    const channelData = audioBuffer.getChannelData(0); // Use first channel (mono or left channel)
    const totalSamples = channelData.length;
    const samplesPerPoint = Math.floor(totalSamples / targetPoints);
    const amplitudes: number[] = [];

    // Optimize for different sampling strategies based on data density
    if (samplesPerPoint > 100) {
      // For high compression ratios, use more sophisticated sampling
      this.extractWaveformDataHighCompression(channelData, totalSamples, targetPoints, amplitudes);
    } else {
      // For lower compression ratios, use standard sampling
      this.extractWaveformDataStandard(channelData, totalSamples, targetPoints, samplesPerPoint, amplitudes);
    }

    const waveformData: WaveformData = {
      amplitudes,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      samplesPerPoint
    };

    // Cache the result
    this.waveformCache.set(cacheKey, {
      key: cacheKey,
      data: waveformData,
      timestamp: Date.now()
    });

    const endTime = performance.now();
    console.log(`Waveform extraction took ${(endTime - startTime).toFixed(2)}ms for ${targetPoints} points`);

    return waveformData;
  }

  /**
   * Standard waveform extraction for moderate compression ratios
   */
  private extractWaveformDataStandard(
    channelData: Float32Array, 
    totalSamples: number, 
    targetPoints: number, 
    samplesPerPoint: number, 
    amplitudes: number[]
  ): void {
    for (let i = 0; i < targetPoints; i++) {
      const startSample = i * samplesPerPoint;
      const endSample = Math.min(startSample + samplesPerPoint, totalSamples);
      
      let sum = 0;
      let maxAmplitude = 0;
      
      // Calculate RMS (Root Mean Square) for this segment
      for (let j = startSample; j < endSample; j++) {
        const sample = Math.abs(channelData[j]);
        sum += sample * sample;
        maxAmplitude = Math.max(maxAmplitude, sample);
      }
      
      // Use RMS for smoother visualization, but ensure we don't lose peaks
      const rms = Math.sqrt(sum / (endSample - startSample));
      const amplitude = Math.max(rms, maxAmplitude * 0.3); // Blend RMS with peak detection
      
      amplitudes.push(Math.min(amplitude, 1.0)); // Clamp to 0-1 range
    }
  }

  /**
   * High compression waveform extraction for very dense audio data
   */
  private extractWaveformDataHighCompression(
    channelData: Float32Array, 
    totalSamples: number, 
    targetPoints: number, 
    amplitudes: number[]
  ): void {
    const samplesPerPoint = totalSamples / targetPoints;
    
    for (let i = 0; i < targetPoints; i++) {
      const startSample = Math.floor(i * samplesPerPoint);
      const endSample = Math.min(Math.floor((i + 1) * samplesPerPoint), totalSamples);
      
      // Use more sophisticated peak detection for high compression
      let rmsSum = 0;
      let peakSum = 0;
      let peakCount = 0;
      const segmentSize = Math.max(1, Math.floor((endSample - startSample) / 10));
      
      // Sample in segments to capture both RMS and peaks efficiently
      for (let segStart = startSample; segStart < endSample; segStart += segmentSize) {
        const segEnd = Math.min(segStart + segmentSize, endSample);
        let segMax = 0;
        let segRms = 0;
        
        for (let j = segStart; j < segEnd; j++) {
          const sample = Math.abs(channelData[j]);
          segRms += sample * sample;
          segMax = Math.max(segMax, sample);
        }
        
        segRms = Math.sqrt(segRms / (segEnd - segStart));
        rmsSum += segRms;
        peakSum += segMax;
        peakCount++;
      }
      
      const avgRms = rmsSum / peakCount;
      const avgPeak = peakSum / peakCount;
      
      // Combine RMS and peak information for better representation
      const amplitude = Math.max(avgRms, avgPeak * 0.4);
      amplitudes.push(Math.min(amplitude, 1.0));
    }
  }

  /**
   * Create an AnalyserNode for real-time audio analysis of a specific track
   */
  createAnalyserForTrack(trackId: string, sourceNode: AudioNode): AnalyserNode {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized. Call initialize() first.');
    }

    // Create analyser node with optimized settings for waveform visualization
    const analyser = this.audioContext.createAnalyser();
    
    // Configure analyser for efficient real-time analysis
    analyser.fftSize = 2048; // Good balance between frequency resolution and performance
    analyser.smoothingTimeConstant = 0.8; // Smooth out rapid changes
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;

    // Connect the source to the analyser (this doesn't affect audio output)
    sourceNode.connect(analyser);

    // Store the analyser for this track
    this.analyserNodes.set(trackId, analyser);

    console.log(`Created analyser for track ${trackId}`);
    return analyser;
  }

  /**
   * Get current real-time analysis data for a specific track
   */
  getRealtimeAnalysis(trackId: string): RealTimeAnalysisData | null {
    const analyser = this.analyserNodes.get(trackId);
    if (!analyser) {
      return null;
    }

    // Get frequency domain data
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(frequencyData);

    // Get time domain data
    const timeData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(timeData);

    // Calculate RMS amplitude from time domain data
    let sum = 0;
    let peak = 0;
    
    for (let i = 0; i < timeData.length; i++) {
      const sample = (timeData[i] - 128) / 128; // Convert to -1 to 1 range
      const amplitude = Math.abs(sample);
      sum += amplitude * amplitude;
      peak = Math.max(peak, amplitude);
    }
    
    const rmsAmplitude = Math.sqrt(sum / timeData.length);

    return {
      frequencyData,
      timeData,
      rmsAmplitude,
      peakAmplitude: peak
    };
  }

  /**
   * Start real-time analysis monitoring for all connected tracks
   */
  startRealtimeAnalysis(callback: (trackId: string, data: RealTimeAnalysisData) => void): void {
    this.analysisCallback = callback;
    
    const analyze = () => {
      if (this.analysisCallback) {
        // Analyze each connected track
        this.analyserNodes.forEach((_analyser, trackId) => {
          const analysisData = this.getRealtimeAnalysis(trackId);
          if (analysisData) {
            this.analysisCallback!(trackId, analysisData);
          }
        });
      }
      
      // Continue analysis loop
      this.animationFrameId = requestAnimationFrame(analyze);
    };

    // Start the analysis loop
    analyze();
    console.log('Started real-time audio analysis');
  }

  /**
   * Stop real-time analysis monitoring
   */
  stopRealtimeAnalysis(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.analysisCallback = undefined;
    console.log('Stopped real-time audio analysis');
  }

  /**
   * Remove analyser for a specific track
   */
  removeAnalyser(trackId: string): void {
    const analyser = this.analyserNodes.get(trackId);
    if (analyser) {
      analyser.disconnect();
      this.analyserNodes.delete(trackId);
      console.log(`Removed analyser for track ${trackId}`);
    }
  }

  /**
   * Generate waveform visualization data with configurable density
   * Optimized for different screen sizes and performance requirements
   */
  generateVisualizationData(
    waveformData: WaveformData, 
    targetWidth: number = 800,
    heightScale: number = 100
  ): { bars: Array<{ height: number; opacity: number }> } {
    const { amplitudes } = waveformData;
    const bars: Array<{ height: number; opacity: number }> = [];
    
    // Resample amplitudes to match target width
    const samplesPerBar = amplitudes.length / targetWidth;
    
    for (let i = 0; i < targetWidth; i++) {
      const startIndex = Math.floor(i * samplesPerBar);
      const endIndex = Math.min(Math.floor((i + 1) * samplesPerBar), amplitudes.length);
      
      // Find the maximum amplitude in this range for better visual representation
      let maxAmplitude = 0;
      for (let j = startIndex; j < endIndex; j++) {
        maxAmplitude = Math.max(maxAmplitude, amplitudes[j]);
      }
      
      // Calculate height and opacity based on amplitude
      const height = Math.max(maxAmplitude * heightScale, 2); // Minimum height of 2px
      const opacity = Math.max(maxAmplitude, 0.1); // Minimum opacity for visibility
      
      bars.push({ height, opacity });
    }
    
    return { bars };
  }

  /**
   * Detect silent sections in the waveform data
   * Useful for identifying breaks, intros, and outros
   */
  detectSilentSections(
    waveformData: WaveformData, 
    silenceThreshold: number = 0.01,
    minSilenceDuration: number = 0.5
  ): Array<{ start: number; end: number; duration: number }> {
    const { amplitudes, duration } = waveformData;
    const timePerPoint = duration / amplitudes.length;
    const minSilencePoints = Math.floor(minSilenceDuration / timePerPoint);
    
    const silentSections: Array<{ start: number; end: number; duration: number }> = [];
    let silenceStart: number | null = null;
    let silenceLength = 0;
    
    for (let i = 0; i < amplitudes.length; i++) {
      const isSilent = amplitudes[i] < silenceThreshold;
      
      if (isSilent) {
        if (silenceStart === null) {
          silenceStart = i * timePerPoint;
          silenceLength = 1;
        } else {
          silenceLength++;
        }
      } else {
        // End of silence
        if (silenceStart !== null && silenceLength >= minSilencePoints) {
          const silenceEnd = i * timePerPoint;
          silentSections.push({
            start: silenceStart,
            end: silenceEnd,
            duration: silenceEnd - silenceStart
          });
        }
        silenceStart = null;
        silenceLength = 0;
      }
    }
    
    // Handle silence at the end of the track
    if (silenceStart !== null && silenceLength >= minSilencePoints) {
      silentSections.push({
        start: silenceStart,
        end: duration,
        duration: duration - silenceStart
      });
    }
    
    return silentSections;
  }

  /**
   * Clean up all analysers and stop analysis
   */
  dispose(): void {
    this.stopRealtimeAnalysis();
    
    // Disconnect and remove all analysers
    this.analyserNodes.forEach((analyser) => {
      analyser.disconnect();
    });
    this.analyserNodes.clear();
    
    this.audioContext = null;
    console.log('AudioAnalysisService disposed');
  }
}