/**
 * AudioPlayer Service - Web Audio API abstraction for multi-track playback
 * 
 * Provides synchronized playback control for multiple audio tracks with
 * individual volume, pan, and mute controls per track.
 */

export interface Track {
  id: string;
  name: string; // e.g., "vocals", "drums", "bass", "other"
  audioUrl: string;
  duration: number; // in seconds
  volume: number; // 0-1 range
  pan: number; // -1 to 1 range (-1 = full left, 1 = full right)
  muted: boolean;
}

interface AudioTrack {
  buffer: AudioBuffer;
  source?: AudioBufferSourceNode;
  gainNode: GainNode;
  panNode: StereoPannerNode;
  track: Track;
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioTracks: Map<string, AudioTrack> = new Map();
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private currentPosition: number = 0;
  private animationFrameId: number | null = null;
  private positionUpdateCallback?: (position: number) => void;

  constructor() {
    // Don't initialize AudioContext in constructor - wait for user interaction
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
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('AudioContext initialized successfully:', this.audioContext.state);
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      throw new Error('Web Audio API not supported in this browser');
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

    // Load each track
    const loadPromises = tracks.map(async (track) => {
      try {
        console.log(`Loading track: ${track.name} from ${track.audioUrl}`);
        
        const response = await fetch(track.audioUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        console.log(`Fetched ${arrayBuffer.byteLength} bytes for track ${track.name}`);
        
        // Double-check AudioContext before decoding
        if (!this.audioContext) {
          throw new Error('AudioContext became null during track loading');
        }
        
        console.log(`Decoding audio data for track ${track.name}, AudioContext state:`, this.audioContext.state);
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

        // Create audio nodes for this track
        const gainNode = this.audioContext!.createGain();
        const panNode = this.audioContext!.createStereoPanner();

        // Connect nodes: source -> gain -> pan -> destination
        gainNode.connect(panNode);
        panNode.connect(this.audioContext!.destination);

        // Set initial values
        gainNode.gain.value = track.muted ? 0 : track.volume;
        panNode.pan.value = track.pan;

        const audioTrack: AudioTrack = {
          buffer: audioBuffer,
          gainNode,
          panNode,
          track: { ...track }
        };

        this.audioTracks.set(track.id, audioTrack);
      } catch (error) {
        console.error(`Failed to load track ${track.name}:`, error);
        throw new Error(`Failed to load track ${track.name}: ${error}`);
      }
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
    audioTrack.gainNode.gain.value = muted ? 0 : audioTrack.track.volume;
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
    
    // Close the audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}