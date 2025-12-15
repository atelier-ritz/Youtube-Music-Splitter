import React, { useState, useEffect } from 'react';
import { type Track } from '../services/AudioPlayer';
import './TrackController.css';

interface TrackControllerProps {
  track: Track;
  onMuteToggle: (trackId: string, muted: boolean) => void;
  onPanChange: (trackId: string, pan: number) => void;
}

const TrackController: React.FC<TrackControllerProps> = ({
  track,
  onMuteToggle,
  onPanChange
}) => {
  const [localPan, setLocalPan] = useState(track.pan);
  const [localMuted, setLocalMuted] = useState(track.muted);

  // Update local state when track prop changes
  useEffect(() => {
    setLocalPan(track.pan);
    setLocalMuted(track.muted);
  }, [track.pan, track.muted]);

  // Handle mute/unmute toggle
  const handleMuteToggle = () => {
    const newMuted = !localMuted;
    setLocalMuted(newMuted);
    onMuteToggle(track.id, newMuted);
  };

  // Handle pan change with real-time feedback
  const handlePanChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPan = parseFloat(event.target.value);
    setLocalPan(newPan);
    onPanChange(track.id, newPan);
  };

  // Format pan position for display
  const formatPanPosition = (pan: number): string => {
    if (pan === 0) return 'Center';
    if (pan < 0) return `L${Math.round(Math.abs(pan) * 100)}`;
    return `R${Math.round(pan * 100)}`;
  };

  // Get track name display with proper capitalization
  const getTrackDisplayName = (name: string): string => {
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <div className="track-controller">
      {/* Track name and info */}
      <div className="track-controller__header">
        <h3 className="track-controller__name">
          {getTrackDisplayName(track.name)}
        </h3>
        <span className="track-controller__duration">
          {Math.floor(track.duration / 60)}:{Math.floor(track.duration % 60).toString().padStart(2, '0')}
        </span>
      </div>

      {/* Control section */}
      <div className="track-controller__controls">
        {/* Mute/Unmute toggle button */}
        <div className="track-controller__mute-section">
          <button
            className={`track-controller__mute-button ${localMuted ? 'track-controller__mute-button--muted' : ''}`}
            onClick={handleMuteToggle}
            title={localMuted ? 'Unmute track' : 'Mute track'}
          >
            {localMuted ? '🔇' : '🔊'}
          </button>
          <span className="track-controller__mute-label">
            {localMuted ? 'Muted' : 'Active'}
          </span>
        </div>



        {/* Pan control slider */}
        <div className="track-controller__pan-section">
          <label className="track-controller__control-label">
            Pan
          </label>
          <div className="track-controller__slider-container">
            <span className="track-controller__pan-label track-controller__pan-label--left">L</span>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={localPan}
              onChange={handlePanChange}
              className="track-controller__pan-slider"
              title={`Pan: ${formatPanPosition(localPan)}`}
            />
            <span className="track-controller__pan-label track-controller__pan-label--right">R</span>
            <span className="track-controller__pan-value">
              {formatPanPosition(localPan)}
            </span>
          </div>
        </div>
      </div>

      {/* Visual feedback indicators */}
      <div className="track-controller__indicators">
        <div className={`track-controller__activity-indicator ${!localMuted ? 'track-controller__activity-indicator--active' : ''}`}>
          <div className="track-controller__activity-bar" style={{ width: `${!localMuted ? 100 : 0}%` }}></div>
        </div>
      </div>
    </div>
  );
};

export default TrackController;