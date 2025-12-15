import React, { useState, useEffect, useRef } from 'react';
import { AudioPlayer, type Track } from '../services/AudioPlayer';
import { useWaveformData } from '../hooks/useWaveformData';
import WaveformVisualization from './WaveformVisualization';
import LoadingSpinner from './LoadingSpinner';
import InteractiveButton from './InteractiveButton';
import './TrackView.css';

interface TrackViewProps {
  tracks: Track[];
  bpm?: number;
  title?: string;
  onBack?: () => void;
  onShowToast?: {
    showSuccess: (title: string, message?: string) => void;
    showError: (title: string, message?: string) => void;
    showInfo: (title: string, message?: string) => void;
  };
}

const TrackView: React.FC<TrackViewProps> = ({ 
  tracks, 
  bpm, 
  onBack,
  onShowToast 
}) => {
  const [audioPlayer] = useState(() => new AudioPlayer());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [trackStates, setTrackStates] = useState<Track[]>(tracks);
  const [isEditingTimestamp, setIsEditingTimestamp] = useState(false);
  const [timestampInputValue, setTimestampInputValue] = useState('');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const timestampInputRef = useRef<HTMLInputElement>(null);

  // Use waveform data hook for real audio visualization with performance optimizations
  // Only pass audioPlayer when tracks are loaded (not loading and no error)
  const { waveformData, isGenerating: isGeneratingWaveforms, error: waveformError } = useWaveformData(
    !isLoading && !loadError ? audioPlayer : null, 
    { 
      targetWidth: 800, 
      heightScale: 100,
      enableRealtimeAnalysis: false,
      enableCaching: true,
      debounceMs: 150
    }
  );

  // Initialize track states when tracks prop changes
  useEffect(() => {
    setTrackStates([...tracks]);
  }, [tracks]);

  // Initialize audio player and load tracks
  useEffect(() => {
    const initializePlayer = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        // Set up position update callback
        audioPlayer.setPositionUpdateCallback((position: number) => {
          setCurrentPosition(position);
        });

        // Load tracks with retry mechanism
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
          try {
            await audioPlayer.loadTracks(trackStates);
            setDuration(audioPlayer.getDuration());
            setIsLoading(false);
            return; // Success, exit retry loop
          } catch (error) {
            retryCount++;
            console.error(`Audio loading attempt ${retryCount} failed:`, error);
            
            if (retryCount > maxRetries) {
              throw error; // Re-throw after max retries
            }
            
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } catch (error) {
        console.error('Failed to initialize audio player after retries:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load audio tracks';
        const fullErrorMessage = `${errorMessage}. Please try refreshing the page or check your browser's audio permissions.`;
        setLoadError(fullErrorMessage);
        setIsLoading(false);
        
        // Show error toast
        onShowToast?.showError('Audio Loading Failed', errorMessage);
      }
    };

    if (trackStates.length > 0) {
      initializePlayer();
    } else {
      // No tracks to load, skip loading state
      setIsLoading(false);
    }

    // Cleanup on unmount
    return () => {
      audioPlayer.dispose();
    };
  }, [tracks, audioPlayer]); // Use original tracks prop, not trackStates

  // Handle play/pause
  const handlePlayPause = async () => {
    try {
      // Ensure AudioContext is initialized on user interaction
      if (loadError && loadError.includes('AudioContext')) {
        // Try to reload tracks if there was an AudioContext error
        setLoadError(null);
        setIsLoading(true);
        await audioPlayer.loadTracks(trackStates);
        setDuration(audioPlayer.getDuration());
        setIsLoading(false);
      }
      
      if (isPlaying) {
        audioPlayer.pause();
        setIsPlaying(false);
      } else {
        audioPlayer.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
      setLoadError(error instanceof Error ? error.message : 'Playback failed');
    }
  };

  // Handle go to beginning
  const handleGoToBeginning = () => {
    try {
      audioPlayer.seek(0);
      setCurrentPosition(0);
    } catch (error) {
      console.error('Seek to beginning error:', error);
    }
  };

  // Handle timeline click for seeking
  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement | HTMLCanvasElement>) => {
    if (!timelineRef.current || duration === 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const timelineWidth = rect.width;
    const clickRatio = clickX / timelineWidth;
    const newPosition = clickRatio * duration;

    try {
      audioPlayer.seek(newPosition);
      setCurrentPosition(newPosition);
    } catch (error) {
      console.error('Seek error:', error);
    }
  };

  // Format time for display with milliseconds
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format time with milliseconds for timestamp inspector
  const formatTimeWithMs = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const wholeSecs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${wholeSecs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  // Parse time string (MM:SS.mmm) to seconds
  const parseTimeString = (timeStr: string): number => {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/);
    if (!match) return -1;
    
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    const ms = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
    
    if (mins < 0 || secs >= 60 || ms >= 1000) return -1;
    
    return mins * 60 + secs + ms / 1000;
  };

  // Calculate progress percentage for timeline
  const progressPercentage = duration > 0 ? (currentPosition / duration) * 100 : 0;

  // Handle track mute/unmute
  const handleTrackMuteToggle = (trackId: string, muted: boolean) => {
    // Update UI state immediately for instant feedback
    setTrackStates(prevStates => 
      prevStates.map(track => 
        track.id === trackId ? { ...track, muted } : track
      )
    );
    
    // Apply audio mute without error handling that could trigger re-renders
    try {
      audioPlayer.muteTrack(trackId, muted);
    } catch (error) {
      // Silently handle errors to prevent UI flashing
      console.warn('Audio mute failed (UI already updated):', error);
    }
  };



  // Handle track solo/unsolo
  const handleTrackSoloToggle = (trackId: string, soloed: boolean) => {
    // Update UI state immediately for instant feedback
    setTrackStates(prevStates => 
      prevStates.map(track => 
        track.id === trackId 
          ? { 
              ...track, 
              soloed,
              // When soloing a track, automatically unmute it
              muted: soloed ? false : track.muted
            } 
          : track
      )
    );
    
    // Apply audio solo without error handling that could trigger re-renders
    try {
      audioPlayer.soloTrack(trackId, soloed);
      
      // If soloing, also unmute the track in the audio player
      if (soloed) {
        audioPlayer.muteTrack(trackId, false);
      }
    } catch (error) {
      // Silently handle errors to prevent UI flashing
      console.warn('Audio solo failed (UI already updated):', error);
    }
  };

  // Helper function to determine if a track should be playing (for visual feedback)
  const isTrackPlaying = (track: Track) => {
    const hasSoloedTracks = trackStates.some(t => t.soloed);
    
    if (hasSoloedTracks) {
      // If any track is soloed, only soloed tracks are playing
      return track.soloed;
    } else {
      // If no tracks are soloed, playing depends on mute state
      return !track.muted;
    }
  };

  // Helper function to determine dimming type
  const getTrackDimmingClass = (track: Track) => {
    const hasSoloedTracks = trackStates.some(t => t.soloed);
    
    if (hasSoloedTracks && !track.soloed) {
      // Track is silenced due to solo - full dimming (controls + waveform)
      return 'daw-track--silenced';
    } else if (!hasSoloedTracks && track.muted) {
      // Track is just muted - only dim waveform
      return 'daw-track--muted-only';
    }
    
    return '';
  };

  // Handle timestamp inspector click to enter edit mode
  const handleTimestampClick = () => {
    setIsEditingTimestamp(true);
    setTimestampInputValue(formatTimeWithMs(currentPosition));
    // Focus the input after state update
    setTimeout(() => {
      timestampInputRef.current?.focus();
      timestampInputRef.current?.select();
    }, 0);
  };

  // Handle timestamp input change
  const handleTimestampInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTimestampInputValue(event.target.value);
  };

  // Handle timestamp input submission
  const handleTimestampSubmit = () => {
    const newTime = parseTimeString(timestampInputValue);
    if (newTime >= 0 && newTime <= duration) {
      try {
        audioPlayer.seek(newTime);
        setCurrentPosition(newTime);
      } catch (error) {
        console.error('Seek error:', error);
        onShowToast?.showError('Seek Failed', 'Could not jump to the specified time');
      }
    } else {
      onShowToast?.showError('Invalid Time', 'Please enter a valid time in MM:SS.mmm format');
    }
    setIsEditingTimestamp(false);
  };

  // Handle timestamp input key events
  const handleTimestampKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleTimestampSubmit();
    } else if (event.key === 'Escape') {
      setIsEditingTimestamp(false);
    }
  };

  // Handle timestamp input blur
  const handleTimestampBlur = () => {
    handleTimestampSubmit();
  };

  // Handle playback speed change from dropdown
  const handleSpeedChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSpeed = parseFloat(event.target.value);
    try {
      setPlaybackSpeed(newSpeed);
      audioPlayer.setPlaybackRate(newSpeed);
    } catch (error) {
      console.error('Speed change error:', error);
      onShowToast?.showError('Speed Change Failed', 'Could not change playback speed');
    }
  };

  if (isLoading) {
    return (
      <div className="track-view">
        <div className="track-view__loading">
          <LoadingSpinner
            size="large"
            variant="accent"
            message="Loading audio tracks..."
          />
        </div>
      </div>
    );
  }

  if (loadError) {
    const handleRetry = () => {
      setLoadError(null);
      setIsLoading(true);
      // Trigger re-initialization by updating trackStates
      setTrackStates([...trackStates]);
    };

    return (
      <div className="track-view">
        <div className="track-view__error">
          <h2>Failed to Load Tracks</h2>
          <p>{loadError}</p>
          <div className="track-view__error-actions">
            <InteractiveButton 
              variant="success" 
              size="medium"
              onClick={handleRetry}
              className="track-view__retry-button"
            >
              Retry Loading
            </InteractiveButton>
            {onBack && (
              <InteractiveButton 
                variant="secondary" 
                size="medium"
                onClick={onBack}
                className="track-view__back-button"
              >
                Back to Main Page
              </InteractiveButton>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="daw-interface">
      {/* Top toolbar */}
      <div className="daw-toolbar">
        <div className="daw-toolbar__left">
          {onBack && (
            <button className="daw-back-button" onClick={onBack}>
              ← Back
            </button>
          )}
        </div>
        
        <div className="daw-toolbar__center">
          <div className="daw-timestamp-inspector">
            {isEditingTimestamp ? (
              <input
                ref={timestampInputRef}
                type="text"
                value={timestampInputValue}
                onChange={handleTimestampInputChange}
                onKeyDown={handleTimestampKeyDown}
                onBlur={handleTimestampBlur}
                className="daw-timestamp-input"
                placeholder="MM:SS.mmm"
                maxLength={10}
              />
            ) : (
              <div 
                className="daw-time-display daw-time-display--clickable" 
                onClick={handleTimestampClick}
                title="Click to jump to specific time"
              >
                {formatTimeWithMs(currentPosition)}
              </div>
            )}
          </div>
          <div className="daw-transport-controls">
            <button 
              className="daw-transport-btn daw-transport-btn--prev"
              onClick={handleGoToBeginning}
              disabled={trackStates.length === 0}
              title="Go to beginning"
            >
              ⏮
            </button>
            <button className="daw-transport-btn daw-transport-btn--loop">🔄</button>
            <button 
              className={`daw-transport-btn daw-transport-btn--play ${isPlaying ? 'daw-transport-btn--playing' : ''}`}
              onClick={handlePlayPause}
              disabled={trackStates.length === 0}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
          </div>
        </div>
        
        <div className="daw-toolbar__right">
          <div className="daw-speed-window">
            <select 
              value={playbackSpeed}
              onChange={handleSpeedChange}
              className="daw-speed-select"
              title="Select playback speed"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.6}>0.6x</option>
              <option value={0.7}>0.7x</option>
              <option value={0.8}>0.8x</option>
              <option value={0.9}>0.9x</option>
              <option value={1.0}>1.0x</option>
            </select>
            <span className="daw-speed-label">SPEED</span>
          </div>
          <div className="daw-bpm-window">
            <span className="daw-bpm-value">{bpm || '---'}</span>
            <span className="daw-bpm-label">BPM</span>
          </div>
          <div className="daw-signature-window">
            <span className="daw-signature-value">4/4</span>
            <span className="daw-signature-label">TIME SIG.</span>
          </div>
        </div>
      </div>

      {/* Main DAW area */}
      <div className="daw-main">
        {/* Timeline ruler */}
        <div className="daw-timeline-ruler">
          <div className="daw-ruler-track-header"></div>
          <div className="daw-ruler-content">
            {Array.from({ length: Math.ceil(duration / 10) }, (_, i) => (
              <div key={i} className="daw-ruler-marker" style={{ left: `${(i * 10 / duration) * 100}%` }}>
                <span className="daw-ruler-number">{formatTime(i * 10)}</span>
              </div>
            ))}
            {/* Playhead cursor */}
            <div 
              className="daw-playhead"
              style={{ left: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Track area */}
        <div className="daw-track-area">
          {trackStates.map((track, index) => (
            <div key={track.id} className={`daw-track ${getTrackDimmingClass(track)}`}>
              {/* Track header */}
              <div className="daw-track-header">
                <div className="daw-track-number">{index + 1}</div>
                <div className="daw-track-info">
                  <div className="daw-track-name">{track.name.charAt(0).toUpperCase() + track.name.slice(1)}</div>
                  <div className="daw-track-controls">
                    <button 
                      className={`daw-track-btn daw-track-btn--mute ${track.muted ? 'daw-track-btn--active' : ''}`}
                      onClick={() => handleTrackMuteToggle(track.id, !track.muted)}
                      title={track.muted ? 'Unmute track' : 'Mute track'}
                    >
                      M
                    </button>
                    <button 
                      className={`daw-track-btn daw-track-btn--solo ${track.soloed ? 'daw-track-btn--active' : ''}`}
                      onClick={() => handleTrackSoloToggle(track.id, !track.soloed)}
                      title={track.soloed ? 'Unsolo track' : 'Solo track'}
                    >
                      S
                    </button>
                  </div>
                </div>

              </div>
              
              {/* Track content area with waveform */}
              <div 
                className="daw-track-content"
                onClick={handleTimelineClick}
                ref={index === 0 ? timelineRef : undefined}
              >
                <div className="daw-waveform-container">
                  {/* Real waveform visualization */}
                  {(() => {
                    const trackWaveformData = waveformData.get(track.id);
                    
                    if (isGeneratingWaveforms) {
                      return (
                        <div className="daw-waveform-loading">
                          <span>Generating waveform...</span>
                        </div>
                      );
                    }
                    
                    if (waveformError) {
                      return (
                        <div className="daw-waveform-error">
                          <span>Waveform unavailable</span>
                        </div>
                      );
                    }
                    
                    if (!trackWaveformData) {
                      return (
                        <div className="daw-waveform-placeholder">
                          <span>No waveform data</span>
                        </div>
                      );
                    }
                    
                    return (
                      <WaveformVisualization
                        bars={trackWaveformData.bars}
                        trackName={track.name}
                        isPlaying={isTrackPlaying(track)}
                        progress={progressPercentage / 100}
                        showSilentSections={false}
                        silentSections={[]}
                        totalDuration={trackWaveformData.duration}
                        onClick={handleTimelineClick}
                        enableHighDPI={true}
                        enableCaching={true}
                      />
                    );
                  })()}
                  
                  {/* Track progress overlay */}
                  <div 
                    className="daw-track-progress"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrackView;