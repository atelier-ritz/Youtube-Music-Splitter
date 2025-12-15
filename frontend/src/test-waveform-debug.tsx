/**
 * Debug component to test waveform data generation
 * This can be temporarily added to test waveform functionality
 */

import React, { useState, useEffect } from 'react';
import { AudioPlayer } from './services/AudioPlayer';
import { useWaveformData } from './hooks/useWaveformData';

const TestWaveformDebug: React.FC = () => {
  const [audioPlayer] = useState(() => new AudioPlayer());
  const [isLoaded, setIsLoaded] = useState(false);

  // Test tracks
  const testTracks = [
    {
      id: 'vocals',
      name: 'vocals',
      audioUrl: 'http://localhost:8000/api/tracks/test/vocals.mp3',
      duration: 180,
      volume: 1,
      pan: 0,
      muted: false,
      soloed: false
    }
  ];

  const { waveformData, isGenerating, error } = useWaveformData(
    isLoaded ? audioPlayer : null,
    {
      targetWidth: 400,
      heightScale: 100,
      enableCaching: true
    }
  );

  useEffect(() => {
    const loadTestTracks = async () => {
      try {
        console.log('Loading test tracks...');
        await audioPlayer.loadTracks(testTracks);
        console.log('Test tracks loaded successfully');
        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to load test tracks:', err);
      }
    };

    loadTestTracks();
  }, [audioPlayer]);

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>Waveform Debug Test</h3>
      <div>
        <p>Audio Player Loaded: {isLoaded ? 'Yes' : 'No'}</p>
        <p>Generating Waveforms: {isGenerating ? 'Yes' : 'No'}</p>
        <p>Waveform Data Count: {waveformData.size}</p>
        <p>Error: {error || 'None'}</p>
      </div>
      
      {waveformData.size > 0 && (
        <div>
          <h4>Waveform Data:</h4>
          {Array.from(waveformData.entries()).map(([trackId, data]) => (
            <div key={trackId}>
              <p><strong>{trackId}:</strong></p>
              <p>Bars: {data.bars.length}</p>
              <p>Duration: {data.duration.toFixed(2)}s</p>
              <p>Has Content: {data.hasContent ? 'Yes' : 'No'}</p>
              <p>Silent Sections: {data.silentSections.length}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestWaveformDebug;