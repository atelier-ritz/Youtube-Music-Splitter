import React, { useState, useEffect, useRef } from 'react';
import { AudioPlayer, type Track } from '../services/AudioPlayer';
import './TrackView.css';

interface TrackViewProps {
  tracks: Track[];
  bpm?: number;
  title?: string;
  onBack?: () => void;
}

const TrackView: React.FC<TrackViewProps> = ({ 
  tracks, 
  bpm, 
  onBack 
}) => {
  const [audioPlayer] = useState(() => new AudioPlayer());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [trackStates, setTrackStates] = useState<Track[]>(tracks);
  const timelineRef = useRef<HTMLDivElement>(null);

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
        setLoadError(`${errorMessage}. Please try refreshing the page or check your browser's audio permissions.`);
        setIsLoading(false);
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
  }, [trackStates, audioPlayer]);

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

  // Handle timeline click for seeking
  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || duration === 0) return;

    const rect = timelineRef.current.getBoundingClientRect();
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

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage for timeline
  const progressPercentage = duration > 0 ? (currentPosition / duration) * 100 : 0;

  // Handle track mute/unmute
  const handleTrackMuteToggle = (trackId: string, muted: boolean) => {
    try {
      audioPlayer.muteTrack(trackId, muted);
      setTrackStates(prevStates => 
        prevStates.map(track => 
          track.id === trackId ? { ...track, muted } : track
        )
      );
    } catch (error) {
      console.error('Failed to toggle track mute:', error);
    }
  };

  // Handle track volume change
  const handleTrackVolumeChange = (trackId: string, volume: number) => {
    try {
      audioPlayer.setTrackVolume(trackId, volume);
      setTrackStates(prevStates => 
        prevStates.map(track => 
          track.id === trackId ? { ...track, volume } : track
        )
      );
    } catch (error) {
      console.error('Failed to change track volume:', error);
    }
  };



  if (isLoading) {
    return (
      <div className="track-view">
        <div className="track-view__loading">
          <div className="track-view__loading-spinner"></div>
          <p>Loading audio tracks...</p>
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
            <button className="track-view__retry-button" onClick={handleRetry}>
              Retry Loading
            </button>
            {onBack && (
              <button className="track-view__back-button" onClick={onBack}>
                Back to Main Page
              </button>
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
          <div className="daw-time-display">{formatTime(currentPosition)}</div>
          {onBack && (
            <button className="daw-back-button" onClick={onBack}>
              ← Back
            </button>
          )}
        </div>
        
        <div className="daw-toolbar__center">
          <div className="daw-transport-controls">
            <button className="daw-transport-btn daw-transport-btn--prev">⏮</button>
            <button className="daw-transport-btn daw-transport-btn--stop">⏹</button>
            <button className="daw-transport-btn daw-transport-btn--loop">🔄</button>
            <button 
              className={`daw-transport-btn daw-transport-btn--play ${isPlaying ? 'daw-transport-btn--playing' : ''}`}
              onClick={handlePlayPause}
              disabled={trackStates.length === 0}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button className="daw-transport-btn daw-transport-btn--record">⏺</button>
            <button className="daw-transport-btn daw-transport-btn--next">⏭</button>
          </div>
        </div>
        
        <div className="daw-toolbar__right">
          {bpm && (
            <div className="daw-bpm-display">
              <span className="daw-bpm-value">{bpm}</span>
              <span className="daw-bpm-label">BPM</span>
            </div>
          )}
          <div className="daw-time-signature">4/4</div>
        </div>
      </div>

      {/* Main DAW area */}
      <div className="daw-main">
        {/* Timeline ruler */}
        <div className="daw-timeline-ruler">
          <div className="daw-ruler-track-header"></div>
          <div className="daw-ruler-content">
            {Array.from({ length: Math.ceil(duration / 4) }, (_, i) => (
              <div key={i} className="daw-ruler-marker" style={{ left: `${(i * 4 / duration) * 100}%` }}>
                <span className="daw-ruler-number">{i * 4}</span>
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
            <div key={track.id} className="daw-track">
              {/* Track header */}
              <div className="daw-track-header">
                <div className="daw-track-number">{index + 1}</div>
                <div className="daw-track-info">
                  <div className="daw-track-name">{track.name.charAt(0).toUpperCase() + track.name.slice(1)}</div>
                  <div className="daw-track-controls">
                    <button 
                      className={`daw-track-btn daw-track-btn--mute ${track.muted ? 'daw-track-btn--active' : ''}`}
                      onClick={() => handleTrackMuteToggle(track.id, !track.muted)}
                    >
                      M
                    </button>
                    <button className="daw-track-btn daw-track-btn--solo">S</button>
                  </div>
                </div>
                <div className="daw-track-volume">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={track.volume}
                    onChange={(e) => handleTrackVolumeChange(track.id, parseFloat(e.target.value))}
                    className="daw-volume-slider"
                  />
                  <div className="daw-volume-value">{Math.round(track.volume * 100)}</div>
                </div>
              </div>
              
              {/* Track content area with waveform */}
              <div 
                className="daw-track-content"
                onClick={handleTimelineClick}
                ref={index === 0 ? timelineRef : undefined}
              >
                <div className="daw-waveform-container">
                  {/* Simulated waveform */}
                  <div className={`daw-waveform daw-waveform--${track.name}`}>
                    {Array.from({ length: 200 }, (_, i) => (
                      <div 
                        key={i} 
                        className="daw-waveform-bar"
                        style={{ 
                          height: `${Math.random() * 60 + 20}%`,
                          opacity: track.muted ? 0.3 : 1
                        }}
                      />
                    ))}
                  </div>
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