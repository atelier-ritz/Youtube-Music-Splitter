/**
 * AudioPlayer Service - Web Audio API abstraction for multi-track playback
 * 
 * Provides synchronized playback control for multiple audio tracks with
 * individual volume, pan, and mute controls per track.
 * 
 * Uses SoundTouchJS for pitch-preserving speed control.
 * 
 * Includes comprehensive error handling for audio-related failures.
 * Requirements: 2.4, 7.4
 */

import { retryWithBackoff, withTimeout } from '../utils/retryUtils';
import { AudioAnalysisService } from './AudioAnalysisService';
import type { WaveformData } from './AudioAnalysisService';
import * as SoundTouchJS from 'soundtouchjs';

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
  soundTouch?: any;
  filter?: any;
  soundTouchNode?: AudioNode;
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioTracks: Map<string, AudioTrack> = new Map();
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private currentPosition: number = 0;
  private lastPlayStartPosition: number = 0;
  private animationFrameId: number | null = null;
  private positionUpdateCallback?: (position: number) => void;
  private analysisService: AudioAnalysisService;
  private playbackRate: number = 1.0;
  private usingSoundTouch: boolean = false;
  private soundTouchStartTime: number = 0;
  private soundTouchStartPosition: number = 0;
  private lastSoundTouchPosition: number = 0;
  private lastSoundTouchUpdateTime: number = 0;

  constructor() {
    // Don't initialize AudioContext in constructor - wait for user interaction
    this.analysisService = new AudioAnalysisService();

  }

  /**
   * Initialize Web Audio API context (requires user interaction in modern browsers)
   */
  private initializeAudioContext(): void {
    if (this.audioContext) {

      return;
    }
    
    try {
      // Check for Web Audio API support
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web Audio API is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
      }
      
      this.audioContext = new AudioContextClass();

      
      // Initialize analysis service with the audio context
      this.analysisService.initialize(this.audioContext);
      
      // Clear any existing waveform cache to ensure fresh generation with track-specific keys
      this.analysisService.clearWaveformStorage();
      
      // Add error event listener
      this.audioContext.addEventListener('statechange', () => {

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
    
    if (this.audioContext.state === 'suspended') {
      try {
        console.log('AudioContext is suspended, attempting to resume...');
        await this.audioContext.resume();
        console.log('AudioContext resumed successfully, state:', this.audioContext.state);
        
        // iOS-specific: Create a silent buffer and play it to "unlock" audio
        if (this.isIOSDevice()) {
          await this.unlockIOSAudio();
        }
      } catch (error) {
        console.error('Failed to resume AudioContext:', error);
        throw new Error('AudioContext is suspended and requires user interaction to resume. Please click to initialize audio.');
      }
    }
    
    // Double-check the state after resume attempt
    if (this.audioContext.state === 'suspended') {
      throw new Error('AudioContext remains suspended after resume attempt. User interaction is required.');
    }
  }

  /**
   * Check if running on iOS device
   */
  private isIOSDevice(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  /**
   * iOS-specific audio unlock - play a silent buffer to enable audio
   */
  private async unlockIOSAudio(): Promise<void> {
    if (!this.audioContext) return;
    
    try {
      // Create a silent buffer
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      
      // Play the silent buffer
      source.start(0);
      
      console.log('iOS audio unlocked');
    } catch (error) {
      console.warn('Failed to unlock iOS audio:', error);
    }
  }

  /**
   * iOS-specific: Check if audio is actually playing
   */
  private checkIOSAudioPlayback(): void {
    if (!this.audioContext || !this.isPlaying) return;
    
    console.log('iOS Audio Playback Check:', {
      contextState: this.audioContext.state,
      isPlaying: this.isPlaying,
      currentPosition: this.currentPosition,
      tracksCount: this.audioTracks.size,
      contextCurrentTime: this.audioContext.currentTime
    });
    
    // Check if any tracks have gain > 0 (not muted)
    let hasAudibleTracks = false;
    this.audioTracks.forEach((audioTrack) => {
      if (audioTrack.gainNode.gain.value > 0) {
        hasAudibleTracks = true;
        console.log(`iOS Track ${audioTrack.track.name}:`, {
          gain: audioTrack.gainNode.gain.value,
          pan: audioTrack.panNode.pan.value,
          muted: audioTrack.track.muted,
          soloed: audioTrack.track.soloed
        });
      }
    });
    
    if (!hasAudibleTracks) {
      console.warn('iOS: No audible tracks found - all tracks may be muted');
    }
  }

  /**
   * iOS Debug: Test basic audio functionality
   * Call this from browser console: window.audioPlayer.testIOSAudio()
   */
  public testIOSAudio(): void {
    if (!this.isIOSDevice()) {
      console.log('Not an iOS device');
      return;
    }
    
    try {
      // Initialize if needed
      if (!this.audioContext) {
        this.initializeAudioContext();
      }
      
      if (!this.audioContext) {
        console.error('Failed to initialize AudioContext');
        return;
      }
      
      console.log('iOS Audio Test - AudioContext state:', this.audioContext.state);
      
      // Resume context
      this.audioContext.resume().then(() => {
        if (!this.audioContext) return;
        
        console.log('AudioContext resumed, state:', this.audioContext.state);
        
        // Create a test tone
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = 440; // A4 note
        gainNode.gain.value = 0.1; // Low volume
        
        oscillator.start();
        
        // Stop after 1 second
        setTimeout(() => {
          oscillator.stop();
          console.log('iOS Audio Test completed');
        }, 1000);
        
      }).catch(error => {
        console.error('iOS Audio Test failed:', error);
      });
      
    } catch (error) {
      console.error('iOS Audio Test error:', error);
    }
  }

  /**
   * Load audio tracks from URLs and prepare for playback
   */
  async loadTracks(tracks: Track[]): Promise<void> {

    
    // Initialize AudioContext if not already done (requires user interaction)
    if (!this.audioContext) {

      this.initializeAudioContext();
    }
    
    if (!this.audioContext) {
      console.error('AudioContext is null after initialization attempt');
      throw new Error('AudioContext not initialized');
    }


    await this.resumeAudioContext();


    // Store current positions before clearing cache
    const savedCurrentPosition = this.currentPosition;
    const savedLastPlayStartPosition = this.lastPlayStartPosition;
    
    // Clear existing tracks and cache
    this.clearCache();
    
    // Restore positions after cache clear
    this.currentPosition = savedCurrentPosition;
    this.lastPlayStartPosition = savedLastPlayStartPosition;
    


    // Load each track with retry and timeout
    const loadPromises = tracks.map(async (track) => {
      return retryWithBackoff(async () => {
        try {

          
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

          
          if (arrayBuffer.byteLength === 0) {
            throw new Error(`Empty audio file received for track ${track.name}`);
          }
          
          // Double-check AudioContext before decoding
          if (!this.audioContext) {
            throw new Error('AudioContext became null during track loading');
          }
          

          
          // Decode with timeout
          const audioBuffer = await withTimeout(
            () => this.audioContext!.decodeAudioData(arrayBuffer.slice(0)), // slice to avoid detached buffer
            15000, // 15 second timeout for decoding
            `Timeout decoding audio for track ${track.name}`
          );

          // iOS-specific: Log audio buffer details for debugging
          if (this.isIOSDevice()) {
            console.log(`iOS Audio Debug - ${track.name}:`, {
              duration: audioBuffer.duration,
              sampleRate: audioBuffer.sampleRate,
              numberOfChannels: audioBuffer.numberOfChannels,
              length: audioBuffer.length
            });
          }

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

          

          
          const waveformData = this.analysisService.extractWaveformData(audioBuffer, 1000, track.id);
          


          const audioTrack: AudioTrack = {
            buffer: audioBuffer,
            gainNode,
            panNode,
            track: { ...track },
            waveformData
          };

          this.audioTracks.set(track.id, audioTrack);

          
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

    // CRITICAL: Resume AudioContext synchronously in user gesture context
    // This prevents "user agent denied" errors from browser autoplay policies
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        this.startPlaybackInternal();
      }).catch(error => {
        console.error('Failed to resume AudioContext:', error);
        throw new Error('AudioContext resume failed - user interaction may be required');
      });
    } else {
      // AudioContext is already running, start playback immediately
      this.startPlaybackInternal();
    }
  }

  /**
   * Internal method to start playback (called after AudioContext is confirmed running)
   */
  private startPlaybackInternal(): void {
    this.isPlaying = true;
    this.startTime = this.audioContext!.currentTime;
    // Remember where we started playing from
    this.lastPlayStartPosition = this.currentPosition;

    // Set up timing for the playback method being used
    if (this.playbackRate === 1.0) {
      this.usingSoundTouch = false;
    } else {
      this.usingSoundTouch = true;
      this.soundTouchStartTime = this.audioContext!.currentTime;
      this.soundTouchStartPosition = this.currentPosition;
      this.lastSoundTouchPosition = 0; // Reset for new playback
      this.lastSoundTouchUpdateTime = 0; // Reset update time
    }

    // Create and start source nodes for all tracks
    this.audioTracks.forEach((audioTrack) => {
      if (this.playbackRate === 1.0) {
        // Use direct Web Audio API for normal speed (no processing needed)
        const source = this.audioContext!.createBufferSource();
        source.buffer = audioTrack.buffer;
        source.connect(audioTrack.gainNode);
        
        // iOS-specific: Log audio start details
        if (this.isIOSDevice()) {
          console.log(`iOS Audio Start - ${audioTrack.track.name}:`, {
            contextState: this.audioContext!.state,
            currentTime: this.audioContext!.currentTime,
            startPosition: this.currentPosition,
            gainValue: audioTrack.gainNode.gain.value,
            panValue: audioTrack.panNode.pan.value
          });
        }
        
        // Start from current position
        source.start(0, this.currentPosition);
        audioTrack.source = source;

        // Handle track end
        source.onended = () => {
          if (this.isPlaying) {
            this.handleTrackEnd();
          }
        };
      } else {
        // Use SoundTouchJS for pitch-preserving speed control
        this.setupSoundTouchPlayback(audioTrack);
      }
    });

    // Start position updates
    this.startPositionUpdates();
    
    // iOS-specific: Check if audio is actually playing after a short delay
    if (this.isIOSDevice()) {
      setTimeout(() => {
        this.checkIOSAudioPlayback();
      }, 500);
    }
  }

  /**
   * Pause playback and maintain current position
   */
  pause(): void {
    if (!this.isPlaying) {
      return; // Already paused
    }

    this.isPlaying = false;
    
    // Update current position based on the playback method used
    if (this.usingSoundTouch) {
      // Use the current interpolated position for accurate pause position
      this.currentPosition = this.getCurrentPosition();
    } else {
      this.currentPosition = this.currentPosition + (this.audioContext!.currentTime - this.startTime) * this.playbackRate;
    }
    
    // Reset SoundTouch tracking
    this.usingSoundTouch = false;
    this.lastSoundTouchPosition = 0;
    this.lastSoundTouchUpdateTime = 0;

    // Stop all source nodes and clean up SoundTouch resources
    this.audioTracks.forEach((audioTrack) => {
      if (audioTrack.source) {
        audioTrack.source.stop();
        audioTrack.source = undefined;
      }
      
      // Clean up SoundTouch resources
      if (audioTrack.soundTouchNode) {
        audioTrack.soundTouchNode.disconnect();
        audioTrack.soundTouchNode = undefined;
      }
      
      audioTrack.soundTouch = undefined;
      audioTrack.filter = undefined;
    });

    // Stop position updates
    this.stopPositionUpdates();
  }

  /**
   * Stop playback and revert to last play start position
   */
  stop(): void {
    if (this.isPlaying) {
      this.pause();
    }

    // Revert to the position where we last started playing
    this.currentPosition = this.lastPlayStartPosition;
    
    // Update position callback to reflect the revert
    if (this.positionUpdateCallback) {
      this.positionUpdateCallback(this.lastPlayStartPosition);
    }
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
    
    // If not playing, update the last play start position so stop will revert to this new position
    if (!wasPlaying) {
      this.lastPlayStartPosition = this.currentPosition;
    }

    // Update UI immediately with new position
    if (this.positionUpdateCallback) {
      this.positionUpdateCallback(this.currentPosition);
    }

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
      if (this.usingSoundTouch) {
        // For SoundTouch playback, use direct position from SoundTouch when available
        // with minimal interpolation to prevent time jumping
        if (this.lastSoundTouchPosition > 0) {
          // Use the last reported SoundTouch position as the authoritative source
          // Only add minimal interpolation for very recent updates to maintain smoothness
          if (this.lastSoundTouchUpdateTime > 0) {
            const timeSinceLastUpdate = this.audioContext.currentTime - this.lastSoundTouchUpdateTime;
            // Only interpolate for very recent updates (less than 100ms) to avoid jumping
            if (timeSinceLastUpdate < 0.1) {
              const interpolatedProgress = timeSinceLastUpdate * this.playbackRate;
              return this.lastSoundTouchPosition + interpolatedProgress;
            }
          }
          // For older updates, just return the last known position to prevent jumping
          return this.lastSoundTouchPosition;
        } else {
          // Fallback calculation for initial playback before SoundTouch reports position
          const elapsedRealTime = this.audioContext.currentTime - this.soundTouchStartTime;
          const elapsedAudioTime = elapsedRealTime * this.playbackRate;
          return this.soundTouchStartPosition + elapsedAudioTime;
        }
      } else {
        // For regular playback, use the standard calculation
        return this.currentPosition + (this.audioContext.currentTime - this.startTime) * this.playbackRate;
      }
    }
    return this.currentPosition;
  }

  /**
   * Set playback rate (speed multiplier) while maintaining pitch
   * Uses SoundTouchJS for pitch-preserving speed control
   * Valid range: 0.5 to 1.0
   */
  setPlaybackRate(rate: number): void {
    const clampedRate = Math.max(0.5, Math.min(1.0, rate));
    const wasPlaying = this.isPlaying;
    
    // Store the current position before stopping
    if (wasPlaying) {
      this.currentPosition = this.getCurrentPosition();
      this.pause();
    }
    
    this.playbackRate = clampedRate;
    
    // Update SoundTouch instances if they exist
    this.audioTracks.forEach((audioTrack) => {
      if (audioTrack.soundTouch) {
        audioTrack.soundTouch.tempo = clampedRate;
      }
    });
    
    // If was playing, restart with new rate
    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * Get current playback rate
   */
  getPlaybackRate(): number {
    return this.playbackRate;
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

      // Clean up SoundTouch resources
      if (audioTrack.soundTouchNode) {
        audioTrack.soundTouchNode.disconnect();
        audioTrack.soundTouchNode = undefined;
      }
      
      audioTrack.soundTouch = undefined;
      audioTrack.filter = undefined;

      // Disconnect gain and pan nodes
      audioTrack.gainNode.disconnect();
      audioTrack.panNode.disconnect();
    });

    // Clear all tracks from memory
    this.audioTracks.clear();

    // Reset playback state
    this.currentPosition = 0;
    this.lastPlayStartPosition = 0;
    this.startTime = 0;
    this.isPlaying = false;
    this.usingSoundTouch = false;
    this.soundTouchStartTime = 0;
    this.soundTouchStartPosition = 0;
    this.lastSoundTouchPosition = 0;
    this.lastSoundTouchUpdateTime = 0;
    


    // Stop position updates
    this.stopPositionUpdates();


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
   * Setup SoundTouchJS for pitch-preserving speed control
   */
  private setupSoundTouchPlayback(audioTrack: AudioTrack): void {
    if (!this.audioContext) return;

    try {
      // Create SoundTouch instance
      const soundTouch = new SoundTouchJS.SoundTouch();
      soundTouch.tempo = this.playbackRate;
      soundTouch.pitch = 1.0; // Keep original pitch
      
      // Create WebAudioBufferSource for SoundTouchJS
      const bufferSource = new SoundTouchJS.WebAudioBufferSource(audioTrack.buffer);
      
      // Create filter for processing
      const filter = new SoundTouchJS.SimpleFilter(bufferSource, soundTouch, () => {
        // Called when processing ends
        if (this.isPlaying) {
          this.handleTrackEnd();
        }
      });
      
      // Set the starting position in the filter
      if (this.currentPosition > 0) {
        const startPositionInSamples = Math.floor(this.currentPosition * audioTrack.buffer.sampleRate);
        (filter as any).sourcePosition = startPositionInSamples;

      }
      
      // Create the Web Audio node using SoundTouchJS
      const soundTouchNode = SoundTouchJS.getWebAudioNode(
        this.audioContext,
        filter,
        (sourcePosition: number) => {
          // Position callback - ensure position never goes backward to prevent jumping
          if (this.usingSoundTouch && this.audioContext) {
            const positionInSeconds = sourcePosition / audioTrack.buffer.sampleRate;
            
            // Only update if the new position is ahead of our last known position
            // This prevents backward jumps when SoundTouch reports positions out of order
            if (positionInSeconds >= this.lastSoundTouchPosition) {
              this.lastSoundTouchPosition = positionInSeconds;
              this.lastSoundTouchUpdateTime = this.audioContext.currentTime;
            }
          }
        },
        4096 // buffer size
      );
      
      // Connect to audio graph
      soundTouchNode.connect(audioTrack.gainNode);
      
      // Store references for cleanup
      audioTrack.soundTouch = soundTouch;
      audioTrack.filter = filter;
      audioTrack.soundTouchNode = soundTouchNode;
      
      // Create a dummy source to trigger the processing
      const source = this.audioContext.createBufferSource();
      const silentBuffer = this.audioContext.createBuffer(2, 1, this.audioContext.sampleRate);
      source.buffer = silentBuffer;
      source.loop = true;
      source.connect(soundTouchNode);
      source.start();
      audioTrack.source = source;
      

      
    } catch (error) {
      console.error('Failed to setup SoundTouch playback:', error);
      // Fallback to regular playback if SoundTouch fails
      this.setupRegularPlayback(audioTrack);
    }
  }

  /**
   * Setup regular Web Audio API playback (fallback)
   */
  private setupRegularPlayback(audioTrack: AudioTrack): void {
    if (!this.audioContext) return;
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioTrack.buffer;
    source.playbackRate.value = this.playbackRate;
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