/**
 * AudioPlayer Service - Web Audio API abstraction for multi-track playback
 * 
 * Provides synchronized playback control for multiple audio tracks with
 * individual volume, pan, and mute controls per track.
 * 
 * Includes comprehensive error handling for audio-related failures.
 * Requirements: 2.4, 7.4
 */

import { retryWithBackoff, withTimeout } from '../utils/retryUtils';
import { AudioAnalysisService } from './AudioAnalysisService';
import type { WaveformData } from './AudioAnalysisService';

export interface Track {
  id: string;
  name: string; // e.g., "vocals", "drums", "bass", "other"
  audioUrl: string;
  duration: number; // in seconds
  volume: number; // 0-1 range
  pan: number; // -1 to 1 range (-1 = full left, 1 = full right)
  muted: boolean;
  soloed: boolean;
}

interface AudioTrack {
  buffer: AudioBuffer;
  source?: AudioBufferSourceNode;
  gainNode: GainNode;
  panNode: StereoPannerNode;
  track: Track;
  waveformData?: WaveformData;
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioTracks: Map<string, AudioTrack> = new Map();
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private currentPosition: number = 0;
  private animationFrameId: number | null = null;
  private positionUpdateCallback?: (position: number) => void;
  private analysisService: AudioAnalysisService;

  constructor() {
    // Don't initialize AudioContext in constructor - wait for user interaction
    this.analysisService = new AudioAnalysisService();
    console.log('AudioPlayer constructor called');
  }

  /**
   * Initialize Web Audio API context (requires user interaction in modern browsers)
   */
  private initializeAudioContext(): void {
    if (this.audioContext) {
      console.log('AudioContext already initialized');
      return;
    }
    
    try {
      // Check for Web Audio API support
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web Audio API is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
      }
      
      this.audioContext = new AudioContextClass();
      console.log('AudioContext initialized successfully:', this.audioContext.state);
      
      // Initialize analysis service with the audio context
      this.analysisService.initialize(this.audioContext);
      
      // Add error event listener
      this.audioContext.addEventListener('statechange', () => {
        console.log('AudioContext state changed to:', this.audioContext?.state);
      });
      
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      throw new Error(`Web Audio API initialization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Resume audio context if suspended (required for user interaction)
   */
  private async resumeAudioContext(): Promise<void> {
    if (!this.audioContext) {
      console.error('Cannot resume AudioContext: context is null');
      return;
    }
    
    console.log('AudioContext state before resume attempt:', this.audioContext.state);
    
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('AudioContext resumed successfully, new state:', this.audioContext.state);
      } catch (error) {
        console.error('Failed to resume AudioContext:', error);
        throw new Error('Failed to resume audio context. User interaction may be required.');
      }
    }
  }

  /**
   * Load audio tracks from URLs and prepare for playback
   */
  async loadTracks(tracks: Track[]): Promise<void> {
    console.log('Loading tracks:', tracks.length, 'tracks');
    
    // Initialize AudioContext if not already done (requires user interaction)
    if (!this.audioContext) {
      console.log('Initializing AudioContext on user interaction');
      this.initializeAudioContext();
    }
    
    if (!this.audioContext) {
      console.error('AudioContext is null after initialization attempt');
      throw new Error('AudioContext not initialized');
    }

    console.log('AudioContext state before resume:', this.audioContext.state);
    await this.resumeAudioContext();
    console.log('AudioContext state after resume:', this.audioContext.state);

    // Clear existing tracks and cache
    this.clearCache();

    // Load each track with retry and timeout
    const loadPromises = tracks.map(async (track) => {
      return retryWithBackoff(async () => {
        try {
          console.log(`Loading track: ${track.name} from ${track.audioUrl}`);
          
          // Fetch with timeout
          const response = await withTimeout(
            () => fetch(track.audioUrl),
            30000, // 30 second timeout
            `Timeout loading track ${track.name}`
          );
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Failed to fetch audio for ${track.name}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          console.log(`Fetched ${arrayBuffer.byteLength} bytes for track ${track.name}`);
          
          if (arrayBuffer.byteLength === 0) {
            throw new Error(`Empty audio file received for track ${track.name}`);
          }
          
          // Double-check AudioContext before decoding
          if (!this.audioContext) {
            throw new Error('AudioContext became null during track loading');
          }
          
          console.log(`Decoding audio data for track ${track.name}, AudioContext state:`, this.audioContext.state);
          
          // Decode with timeout
          const audioBuffer = await withTimeout(
            () => this.audioContext!.decodeAudioData(arrayBuffer.slice(0)), // slice to avoid detached buffer
            15000, // 15 second timeout for decoding
            `Timeout decoding audio for track ${track.name}`
          );

          if (!audioBuffer || audioBuffer.length === 0) {
            throw new Error(`Invalid audio data for track ${track.name}`);
          }

          // Create audio nodes for this track
          const gainNode = this.audioContext!.createGain();
          const panNode = this.audioContext!.createStereoPanner();

          // Connect nodes: source -> gain -> pan -> destination
          gainNode.connect(panNode);
          panNode.connect(this.audioContext!.destination);

          // Set initial values
          gainNode.gain.value = track.muted ? 0 : track.volume;
          panNode.pan.value = track.pan;

          // Generate waveform data for visualization
          console.log(`Generating waveform data for track ${track.name}...`);
          const waveformData = this.analysisService.extractWaveformData(audioBuffer, 1000);
          
          // Debug: Check amplitude characteristics for each track
          const maxAmp = Math.max(...waveformData.amplitudes);
          const avgAmp = waveformData.amplitudes.reduce((sum, amp) => sum + amp, 0) / waveformData.amplitudes.length;
          const nonZeroCount = waveformData.amplitudes.filter(amp => amp > 0.001).length;
          console.log(`Track ${track.name} waveform: max=${maxAmp.toFixed(4)}, avg=${avgAmp.toFixed(4)}, nonZero=${nonZeroCount}/${waveformData.amplitudes.length}`);

          const audioTrack: AudioTrack = {
            buffer: audioBuffer,
            gainNode,
            panNode,
            track: { ...track },
            waveformData
          };

          this.audioTracks.set(track.id, audioTrack);
          console.log(`Successfully loaded track ${track.name} (${audioBuffer.duration.toFixed(2)}s)`);
          
        } catch (error) {
          console.error(`Failed to load track ${track.name}:`, error);
          
          // Enhance error message based on error type
          let errorMessage = `Failed to load track ${track.name}`;
          if ((error as Error).message.includes('timeout')) {
            errorMessage += ': Connection timeout. Please check your internet connection.';
          } else if ((error as Error).message.includes('HTTP')) {
            errorMessage += ': Server error. The audio file may not be available.';
          } else if ((error as Error).message.includes('decode')) {
            errorMessage += ': Invalid audio format or corrupted file.';
          } else {
            errorMessage += `: ${(error as Error).message}`;
          }
          
          throw new Error(errorMessage);
        }
      }, {
        maxAttempts: 3,
        baseDelay: 1000,
        retryCondition: (error: Error) => {
          // Retry on network errors and timeouts, but not on decode errors
          return error.message.includes('timeout') || 
                 error.message.includes('HTTP 5') ||
                 error.message.includes('fetch');
        },
        onRetry: (attempt, error) => {
          console.log(`Retrying track ${track.name} load (attempt ${attempt}):`, error.message);
        }
      });
    });

    await Promise.all(loadPromises);
  }

  /**
   * Start playback from current position
   */
  play(): void {
    if (!this.audioContext || this.audioTracks.size === 0) {
      throw new Error('No tracks loaded');
    }

    if (this.isPlaying) {
      return; // Already playing
    }

    this.resumeAudioContext().then(() => {
      this.isPlaying = true;
      this.startTime = this.audioContext!.currentTime - this.currentPosition;

      // Create and start source nodes for all tracks
      this.audioTracks.forEach((audioTrack) => {
        const source = this.audioContext!.createBufferSource();
        source.buffer = audioTrack.buffer;
        source.connect(audioTrack.gainNode);
        
        // Start from current position
        source.start(0, this.currentPosition);
        audioTrack.source = source;

        // Handle track end
        source.onended = () => {
          if (this.isPlaying) {
            this.handleTrackEnd();
          }
        };
      });

      // Start position updates
      this.startPositionUpdates();
    });
  }

  /**
   * Pause playback and maintain current position
   */
  pause(): void {
    if (!this.isPlaying) {
      return; // Already paused
    }

    this.isPlaying = false;
    this.currentPosition = this.audioContext!.currentTime - this.startTime;

    // Stop all source nodes
    this.audioTracks.forEach((audioTrack) => {
      if (audioTrack.source) {
        audioTrack.source.stop();
        audioTrack.source = undefined;
      }
    });

    // Stop position updates
    this.stopPositionUpdates();
  }

  /**
   * Seek to specific position in seconds
   */
  seek(position: number): void {
    const wasPlaying = this.isPlaying;
    
    if (this.isPlaying) {
      this.pause();
    }

    this.currentPosition = Math.max(0, position);

    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * Set volume for specific track (0-1 range)
   */
  setTrackVolume(trackId: string, volume: number): void {
    const audioTrack = this.audioTracks.get(trackId);
    if (!audioTrack) {
      throw new Error(`Track not found: ${trackId}`);
    }

    const clampedVolume = Math.max(0, Math.min(1, volume));
    audioTrack.track.volume = clampedVolume;
    
    // Apply volume only if track is not muted
    if (!audioTrack.track.muted) {
      audioTrack.gainNode.gain.value = clampedVolume;
    }
  }

  /**
   * Set pan for specific track (-1 to 1 range)
   */
  setTrackPan(trackId: string, pan: number): void {
    const audioTrack = this.audioTracks.get(trackId);
    if (!audioTrack) {
      throw new Error(`Track not found: ${trackId}`);
    }

    const clampedPan = Math.max(-1, Math.min(1, pan));
    audioTrack.track.pan = clampedPan;
    audioTrack.panNode.pan.value = clampedPan;
  }

  /**
   * Mute or unmute specific track
   */
  muteTrack(trackId: string, muted: boolean): void {
    const audioTrack = this.audioTracks.get(trackId);
    if (!audioTrack) {
      throw new Error(`Track not found: ${trackId}`);
    }

    audioTrack.track.muted = muted;
    
    // Update all tracks based on mute and solo states
    this.updateTrackAudioLevels();
  }

  /**
   * Solo or unsolo specific track
   * When a track is soloed, all other tracks are muted
   */
  soloTrack(trackId: string, soloed: boolean): void {
    const audioTrack = this.audioTracks.get(trackId);
    if (!audioTrack) {
      throw new Error(`Track not found: ${trackId}`);
    }

    audioTrack.track.soloed = soloed;
    
    // Update all tracks based on solo state
    this.updateTrackAudioLevels();
  }

  /**
   * Update audio levels for all tracks based on mute and solo states
   */
  private updateTrackAudioLevels(): void {
    const hasSoloedTracks = Array.from(this.audioTracks.values()).some(track => track.track.soloed);
    
    this.audioTracks.forEach((audioTrack) => {
      let shouldPlay = true;
      
      if (hasSoloedTracks) {
        // If any track is soloed, only play soloed tracks
        shouldPlay = audioTrack.track.soloed;
      } else {
        // If no tracks are soloed, respect individual mute states
        shouldPlay = !audioTrack.track.muted;
      }
      
      audioTrack.gainNode.gain.value = shouldPlay ? audioTrack.track.volume : 0;
    });
  }

  /**
   * Get current playback position in seconds
   */
  getCurrentPosition(): number {
    if (this.isPlaying && this.audioContext) {
      return this.audioContext.currentTime - this.startTime;
    }
    return this.currentPosition;
  }

  /**
   * Get total duration of loaded tracks (assumes all tracks have same duration)
   */
  getDuration(): number {
    const firstTrack = Array.from(this.audioTracks.values())[0];
    return firstTrack ? firstTrack.buffer.duration : 0;
  }

  /**
   * Check if audio is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get track information
   */
  getTrack(trackId: string): Track | undefined {
    const audioTrack = this.audioTracks.get(trackId);
    return audioTrack ? { ...audioTrack.track } : undefined;
  }

  /**
   * Get all loaded tracks
   */
  getAllTracks(): Track[] {
    return Array.from(this.audioTracks.values()).map(audioTrack => ({ ...audioTrack.track }));
  }

  /**
   * Set callback for position updates during playback
   */
  setPositionUpdateCallback(callback: (position: number) => void): void {
    this.positionUpdateCallback = callback;
  }

  /**
   * Get waveform data for a specific track
   */
  getTrackWaveformData(trackId: string): WaveformData | undefined {
    const audioTrack = this.audioTracks.get(trackId);
    return audioTrack?.waveformData;
  }

  /**
   * Get waveform data for all loaded tracks
   */
  getAllWaveformData(): Map<string, WaveformData> {
    const waveformMap = new Map<string, WaveformData>();
    this.audioTracks.forEach((audioTrack, trackId) => {
      if (audioTrack.waveformData) {
        waveformMap.set(trackId, audioTrack.waveformData);
      }
    });
    return waveformMap;
  }

  /**
   * Create analyser nodes for real-time audio analysis
   * Call this after loading tracks and before starting playback for real-time visualization
   */
  createAnalysers(): void {
    this.audioTracks.forEach((audioTrack, trackId) => {
      // Create analyser connected to the gain node (after volume control)
      this.analysisService.createAnalyserForTrack(trackId, audioTrack.gainNode);
    });
  }

  /**
   * Start real-time audio analysis
   */
  startRealtimeAnalysis(callback: (trackId: string, data: any) => void): void {
    this.analysisService.startRealtimeAnalysis(callback);
  }

  /**
   * Stop real-time audio analysis
   */
  stopRealtimeAnalysis(): void {
    this.analysisService.stopRealtimeAnalysis();
  }

  /**
   * Clear all audio caches and reset player state
   * This frees up memory by removing all loaded audio buffers and disconnecting audio nodes
   */
  clearCache(): void {
    // Stop playback if currently playing
    if (this.isPlaying) {
      this.pause();
    }

    // Disconnect and clean up all audio nodes
    this.audioTracks.forEach((audioTrack) => {
      // Stop any active source nodes
      if (audioTrack.source) {
        audioTrack.source.stop();
        audioTrack.source.disconnect();
        audioTrack.source = undefined;
      }

      // Disconnect gain and pan nodes
      audioTrack.gainNode.disconnect();
      audioTrack.panNode.disconnect();
    });

    // Clear all tracks from memory
    this.audioTracks.clear();

    // Reset playback state
    this.currentPosition = 0;
    this.startTime = 0;
    this.isPlaying = false;

    // Stop position updates
    this.stopPositionUpdates();

    console.log('Audio cache cleared - all tracks and buffers removed from memory');
  }

  /**
   * Start position update loop
   */
  private startPositionUpdates(): void {
    const updatePosition = () => {
      if (this.isPlaying) {
        const position = this.getCurrentPosition();
        if (this.positionUpdateCallback) {
          this.positionUpdateCallback(position);
        }
        this.animationFrameId = requestAnimationFrame(updatePosition);
      }
    };
    updatePosition();
  }

  /**
   * Stop position update loop
   */
  private stopPositionUpdates(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Handle when a track reaches its end
   */
  private handleTrackEnd(): void {
    const duration = this.getDuration();
    if (this.getCurrentPosition() >= duration) {
      this.pause();
      this.currentPosition = 0;
      if (this.positionUpdateCallback) {
        this.positionUpdateCallback(0);
      }
    }
  }

  /**
   * Clean up resources and close audio context
   */
  dispose(): void {
    // Clear all caches and stop playback
    this.clearCache();
    
    // Dispose analysis service
    this.analysisService.dispose();
    
    // Close the audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}