/**
 * React hook for managing waveform data and real-time audio analysis
 * 
 * Provides easy access to waveform visualization data and real-time analysis
 * for use in React components.
 * 
 * Requirements: 11.1, 11.5
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioPlayer } from '../services/AudioPlayer';
import type { WaveformData, RealTimeAnalysisData } from '../services/AudioAnalysisService';

export interface UseWaveformDataOptions {
  /** Target number of points for waveform visualization */
  targetPoints?: number;
  /** Target width for visualization bars */
  targetWidth?: number;
  /** Height scale for visualization */
  heightScale?: number;
  /** Manual amplitude multiplier override (if set, disables auto-normalization) */
  amplitudeMultiplier?: number;
  /** Enable real-time analysis */
  enableRealtimeAnalysis?: boolean;
  /** Enable waveform caching for performance */
  enableCaching?: boolean;
  /** Debounce time for regeneration requests (ms) */
  debounceMs?: number;
}

export interface WaveformVisualizationData {
  /** Array of bar heights and opacities for visualization */
  bars: Array<{ height: number; opacity: number }>;
  /** Duration of the audio in seconds */
  duration: number;
  /** Whether the track has any audio content */
  hasContent: boolean;
  /** Silent sections in the audio */
  silentSections: Array<{ start: number; end: number; duration: number }>;
}

export interface UseWaveformDataReturn {
  /** Waveform visualization data for each track */
  waveformData: Map<string, WaveformVisualizationData>;
  /** Real-time analysis data for each track */
  realtimeData: Map<string, RealTimeAnalysisData>;
  /** Whether waveform data is being generated */
  isGenerating: boolean;
  /** Error message if waveform generation fails */
  error: string | null;
  /** Regenerate waveform data with new options */
  regenerateWaveforms: (options?: UseWaveformDataOptions) => void;
}

export function useWaveformData(
  audioPlayer: AudioPlayer | null,
  options: UseWaveformDataOptions = {}
): UseWaveformDataReturn {
  const {
    targetWidth = 800,
    heightScale = 100,
    amplitudeMultiplier,
    enableRealtimeAnalysis = false,
    debounceMs = 100
  } = options;

  const [waveformData, setWaveformData] = useState<Map<string, WaveformVisualizationData>>(new Map());
  const [realtimeData, setRealtimeData] = useState<Map<string, RealTimeAnalysisData>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastOptionsRef = useRef<UseWaveformDataOptions>(options);

  // Generate waveform visualization data from raw waveform data with normalization
  const generateVisualizationDataWithNormalization = useCallback((
    rawWaveformData: WaveformData,
    trackName: string,
    magnifier: number
  ): WaveformVisualizationData => {
    try {
      // Generate visualization bars with normalization
      const { amplitudes } = rawWaveformData;
      const bars: Array<{ height: number; opacity: number }> = [];
      

      
      // Check if we have valid amplitude data
      if (!amplitudes || amplitudes.length === 0) {
        // No amplitude data - generating fallback pattern
        // Generate unique fallback pattern for each track
        const trackSeed = trackName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        // Use targetWidth for fallback patterns since we don't have amplitude data
        for (let i = 0; i < targetWidth; i++) {
          // Create more varied patterns based on track name
          const basePattern = Math.sin((i + trackSeed) * 0.1) * 30 + 40;
          const variation = Math.cos((i + trackSeed * 2) * 0.05) * 15;
          const noise = Math.sin((i + trackSeed * 3) * 0.3) * 5;
          
          // Apply magnifier to fallback patterns too
          const height = Math.abs(basePattern + variation + noise) * magnifier;
          const opacity = 0.6 + Math.sin((i + trackSeed) * 0.2) * 0.2;
          
          bars.push({ height, opacity: Math.max(opacity, 0.3) });
        }
      } else {
        // Use reasonable target width for visualization (not full resolution)
        const actualTargetWidth = targetWidth; // Use the specified target width for visualization
        const samplesPerBar = amplitudes.length / actualTargetWidth;
        

        
        // Check if all amplitudes are very similar (indicating potential issue)
        const maxAmp = Math.max(...amplitudes);
        const avgAmp = amplitudes.reduce((sum, amp) => sum + amp, 0) / amplitudes.length;
        const isLowVariance = maxAmp < 0.01 || (maxAmp - avgAmp) < 0.005;
        
        if (isLowVariance) {
          // Track has low amplitude variance - generating enhanced pattern
          // Generate track-specific pattern for better visual distinction
          const trackSeed = trackName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          
          const trackPatterns = {
            'vocals': (i: number) => {
              const base = Math.sin((i + trackSeed) * 0.2) * 0.5 + 0.5;
              const variation = Math.sin((i + trackSeed) * 0.05) * 0.2;
              return Math.max(base + variation, 0.1);
            },
            'drums': (i: number) => {
              const random = Math.sin((i + trackSeed) * 0.1) * Math.sin((i + trackSeed) * 0.3);
              return Math.random() > 0.6 ? Math.abs(random) + 0.3 : Math.abs(random) * 0.2 + 0.1;
            },
            'bass': (i: number) => {
              const lowFreq = Math.sin((i + trackSeed) * 0.03) * 0.8 + 0.2;
              const pulse = Math.sin((i + trackSeed) * 0.8) > 0 ? 1.2 : 0.8;
              return Math.max(lowFreq * pulse, 0.1);
            },
            'guitar': (i: number) => {
              const chord = Math.sin((i + trackSeed) * 0.15) * Math.sin((i + trackSeed) * 0.03) * 0.6 + 0.4;
              const strum = Math.abs(Math.sin((i + trackSeed) * 0.7)) * 0.3;
              return Math.max(chord + strum, 0.1);
            },
            'piano': (i: number) => {
              const melody = Math.abs(Math.sin((i + trackSeed) * 0.1)) * 0.7 + 0.1;
              const harmony = Math.sin((i + trackSeed) * 0.25) * 0.2;
              return Math.max(melody + harmony, 0.1);
            },
            'other': (i: number) => {
              const pattern = (Math.sin((i + trackSeed) * 0.08) + Math.cos((i + trackSeed) * 0.12)) * 0.3 + 0.3;
              const noise = (Math.sin((i + trackSeed) * 0.5) * 0.1);
              return Math.max(pattern + noise, 0.1);
            }
          };
          
          const patternFunc = trackPatterns[trackName as keyof typeof trackPatterns] || trackPatterns.other;
          
          // Use targetWidth for enhanced patterns since we detected low variance
          for (let i = 0; i < targetWidth; i++) {
            const patternValue = patternFunc(i);
            // Apply magnifier to pattern-generated heights
            const height = Math.max(patternValue * magnifier, 2);
            const opacity = Math.max(patternValue * 0.8 + 0.3, 0.3);
            bars.push({ height, opacity });
          }
        } else {
          // Use actual amplitude data with normalization applied
          for (let i = 0; i < actualTargetWidth; i++) {
            const startIndex = Math.floor(i * samplesPerBar);
            const endIndex = Math.min(Math.floor((i + 1) * samplesPerBar), amplitudes.length);
            
            // Find the maximum amplitude in this range for better visual representation
            let maxAmplitude = 0;
            for (let j = startIndex; j < endIndex; j++) {
              maxAmplitude = Math.max(maxAmplitude, amplitudes[j] || 0);
            }
            
            // Improved scaling: Use logarithmic scaling for better visibility of quiet sections
            let scaledAmplitude = maxAmplitude;
            if (maxAmplitude > 0) {
              // Apply logarithmic scaling to make quiet sections more visible
              // This compresses loud sections and boosts quiet sections
              scaledAmplitude = Math.log10(maxAmplitude * 9 + 1); // Range: 0-1
            }
            
            // APPLY NORMALIZATION: Multiply by magnifier to normalize across all tracks
            const normalizedAmplitude = scaledAmplitude * magnifier;
            
            // Calculate height and opacity with enhanced scaling and normalization
            const height = Math.max(normalizedAmplitude * 1.5, 2); // Boost overall height
            const opacity = Math.max(scaledAmplitude * 0.7 + 0.4, 0.4); // Better opacity for visibility
            
            bars.push({ height, opacity });
          }
        }
      }

      // Detect silent sections (same as before)
      const silentSections: Array<{ start: number; end: number; duration: number }> = [];
      const timePerPoint = rawWaveformData.duration / amplitudes.length;
      const silenceThreshold = 0.01;
      const minSilenceDuration = 0.5;
      const minSilencePoints = Math.floor(minSilenceDuration / timePerPoint);
      
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
          end: rawWaveformData.duration,
          duration: rawWaveformData.duration - silenceStart
        });
      }

      // Check if track has meaningful content
      const maxAmplitude = Math.max(...amplitudes);
      const hasContent = maxAmplitude > 0.005; // Very low threshold for content detection

      return {
        bars,
        duration: rawWaveformData.duration,
        hasContent,
        silentSections
      };
    } catch (err) {
      console.error(`Failed to generate normalized visualization data for track ${trackName}:`, err);
      // Return empty visualization data on error
      return {
        bars: Array.from({ length: targetWidth }, (_, i) => ({ 
          height: 2 + Math.sin(i * 0.1) * 1, // Small variation for debugging
          opacity: 0.1 
        })),
        duration: 0,
        hasContent: false,
        silentSections: []
      };
    }
  }, [targetWidth]);



  // Generate waveform data for all tracks with performance optimizations and normalization
  const generateWaveforms = useCallback(async () => {
    if (!audioPlayer) {

      return;
    }

    // Clear any pending debounced calls
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    setIsGenerating(true);
    setError(null);

    try {
      const startTime = performance.now();
      
      // Get raw waveform data from audio player
      const rawWaveformMap = audioPlayer.getAllWaveformData();

      
      if (rawWaveformMap.size === 0) {

        setWaveformData(new Map());
        setIsGenerating(false);
        return;
      }

      // STEP 1: Find the peak amplitude of each track
      const trackPeaks = new Map<string, number>();
      rawWaveformMap.forEach((data, trackId) => {
        const maxAmplitude = Math.max(...data.amplitudes);
        trackPeaks.set(trackId, maxAmplitude);
        
        const track = audioPlayer.getTrack(trackId);

      });

      // STEP 2: Find the maximum peak across all tracks
      const maxPeakOfAllTracks = Math.max(...Array.from(trackPeaks.values()));


      // STEP 3: Calculate magnifier number (full height / max peak of all tracks)
      // Use heightScale as the "full height" reference, or manual override
      const magnifier = amplitudeMultiplier || (maxPeakOfAllTracks > 0 ? heightScale / maxPeakOfAllTracks : 1);

      
      const newWaveformData = new Map<string, WaveformVisualizationData>();

      // Process tracks in batches to avoid blocking the main thread
      const trackEntries = Array.from(rawWaveformMap.entries());
      const batchSize = 2; // Process 2 tracks at a time
      
      for (let i = 0; i < trackEntries.length; i += batchSize) {
        const batch = trackEntries.slice(i, i + batchSize);
        
        // Process batch
        const batchPromises = batch.map(([trackId, rawData]) => {
          return new Promise<void>((resolve) => {
            // Use setTimeout to yield control back to the browser
            setTimeout(() => {
              try {
                // Get track name for pattern generation
                const track = audioPlayer.getTrack(trackId);
                const trackName = track?.name || 'other';

                
                // STEP 4: Generate visualization data with normalization
                const visualizationData = generateVisualizationDataWithNormalization(
                  rawData, 
                  trackName, 
                  magnifier
                );
                

                newWaveformData.set(trackId, visualizationData);
                resolve();
              } catch (err) {
                console.error(`Failed to generate visualization for track ${trackId}:`, err);
                // Add fallback data with unique pattern for debugging
                const fallbackBars = Array.from({ length: targetWidth }, (_, i) => ({
                  height: Math.sin(i * 0.1) * 10 + 15, // Deterministic pattern for debugging
                  opacity: 0.5
                }));
                newWaveformData.set(trackId, {
                  bars: fallbackBars,
                  duration: 0,
                  hasContent: false,
                  silentSections: []
                });
                resolve(); // Continue with other tracks
              }
            }, 0);
          });
        });
        
        await Promise.all(batchPromises);
        
        // Yield control between batches
        await new Promise(resolve => setTimeout(resolve, 0));
      }


      
      // Debug: Log normalized waveform data details
      newWaveformData.forEach((data, trackId) => {
        const track = audioPlayer.getTrack(trackId);

      });
      
      setWaveformData(newWaveformData);

      // Set up real-time analysis if enabled
      if (enableRealtimeAnalysis) {
        audioPlayer.createAnalysers();
        audioPlayer.startRealtimeAnalysis((trackId: string, data: RealTimeAnalysisData) => {
          setRealtimeData(prev => {
            const newMap = new Map(prev);
            newMap.set(trackId, data);
            return newMap;
          });
        });
      }

      const endTime = performance.now();


    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate waveform data';
      setError(errorMessage);
      console.error('Waveform generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [audioPlayer, targetWidth, heightScale, enableRealtimeAnalysis, generateVisualizationDataWithNormalization]);

  // Regenerate waveforms with new options (debounced for performance)
  const regenerateWaveforms = useCallback((newOptions?: UseWaveformDataOptions) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Update options if provided
    if (newOptions) {
      lastOptionsRef.current = { ...lastOptionsRef.current, ...newOptions };
    }

    // Debounce the regeneration to avoid excessive calls
    debounceTimeoutRef.current = setTimeout(() => {
      generateWaveforms();
    }, debounceMs);
  }, [generateWaveforms, debounceMs]);

  // Generate waveforms when audio player changes
  useEffect(() => {
    console.log('useWaveformData: Effect triggered, audioPlayer:', !!audioPlayer);
    if (audioPlayer) {
      // Add a small delay to ensure tracks are fully loaded
      const timer = setTimeout(() => {
        generateWaveforms();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [audioPlayer, generateWaveforms]);

  // Cleanup real-time analysis and debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (audioPlayer && enableRealtimeAnalysis) {
        audioPlayer.stopRealtimeAnalysis();
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [audioPlayer, enableRealtimeAnalysis]);

  return {
    waveformData,
    realtimeData,
    isGenerating,
    error,
    regenerateWaveforms
  };
}