/**
 * WaveformDebugger - Debug component to visualize waveform data at each processing step
 * 
 * This component helps debug waveform rendering issues by showing:
 * 1. Raw amplitude data from AudioAnalysisService
 * 2. Processed visualization bars from useWaveformData
 * 3. Canvas rendering output from WaveformVisualization
 * 4. Performance metrics and data statistics
 */

import React, { useState, useEffect } from 'react';
import { AudioPlayer } from '../services/AudioPlayer';
import { useWaveformData } from '../hooks/useWaveformData';

interface WaveformDebuggerProps {
  audioPlayer: AudioPlayer | null;
  trackId: string;
  trackName: string;
}

const WaveformDebugger: React.FC<WaveformDebuggerProps> = ({
  audioPlayer,
  trackId,
  trackName
}) => {
  const [debugData, setDebugData] = useState<any>(null);
  const [showRawData, setShowRawData] = useState(false);
  const [showProcessedData, setShowProcessedData] = useState(false);
  
  const { waveformData, isGenerating, error } = useWaveformData(audioPlayer, {
    targetWidth: 100, // Smaller for debugging
    heightScale: 50,
    enableCaching: false // Disable caching for debugging
  });

  useEffect(() => {
    if (!audioPlayer) return;

    // Get raw waveform data
    const rawWaveformMap = audioPlayer.getAllWaveformData();
    const rawData = rawWaveformMap.get(trackId);
    
    // Get processed visualization data
    const processedData = waveformData.get(trackId);
    
    if (rawData || processedData) {
      setDebugData({
        raw: rawData,
        processed: processedData,
        timestamp: Date.now()
      });
    }
  }, [audioPlayer, trackId, waveformData]);

  if (!debugData) {
    return (
      <div style={{ padding: '10px', border: '1px solid #ccc', margin: '10px' }}>
        <h3>Waveform Debug: {trackName}</h3>
        <p>No debug data available</p>
      </div>
    );
  }

  const { raw, processed } = debugData;

  return (
    <div style={{ 
      padding: '10px', 
      border: '1px solid #ccc', 
      margin: '10px',
      backgroundColor: '#f5f5f5',
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      <h3>🔍 Waveform Debug: {trackName}</h3>
      
      {/* Track Info */}
      <div style={{ marginBottom: '10px', fontSize: '11px' }}>
        <strong>Track ID:</strong> {trackId}<br/>
        <strong>Audio URL:</strong> {audioPlayer?.getTrack(trackId)?.audioUrl || 'N/A'}
      </div>
      
      {/* Status */}
      <div style={{ marginBottom: '10px' }}>
        <strong>Status:</strong> {isGenerating ? '⏳ Generating...' : '✅ Ready'}
        {error && <div style={{ color: 'red' }}>❌ Error: {error}</div>}
      </div>

      {/* Raw Data Analysis */}
      <div style={{ marginBottom: '15px' }}>
        <h4>📊 Raw Amplitude Data</h4>
        {raw ? (
          <div>
            <div><strong>Samples:</strong> {raw.amplitudes.length}</div>
            <div><strong>Duration:</strong> {raw.duration.toFixed(2)}s</div>
            <div><strong>Sample Rate:</strong> {raw.sampleRate}Hz</div>
            <div><strong>Max Amplitude:</strong> {Math.max(...raw.amplitudes).toFixed(4)}</div>
            <div><strong>Avg Amplitude:</strong> {(raw.amplitudes.reduce((a: number, b: number) => a + b, 0) / raw.amplitudes.length).toFixed(4)}</div>
            <div><strong>Non-zero Samples:</strong> {raw.amplitudes.filter((a: number) => a > 0.001).length}</div>
            
            <button 
              onClick={() => setShowRawData(!showRawData)}
              style={{ marginTop: '5px', padding: '2px 8px' }}
            >
              {showRawData ? 'Hide' : 'Show'} Raw Data
            </button>
            
            {showRawData && (
              <div style={{ 
                maxHeight: '200px', 
                overflow: 'auto', 
                backgroundColor: 'white', 
                padding: '5px',
                marginTop: '5px'
              }}>
                <strong>First 50 samples:</strong><br/>
                {raw.amplitudes.slice(0, 50).map((amp: number, i: number) => (
                  <span key={i} style={{ 
                    color: amp > 0.01 ? 'green' : amp > 0.001 ? 'orange' : 'red' 
                  }}>
                    {amp.toFixed(4)}{i < 49 ? ', ' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: 'red' }}>❌ No raw data available</div>
        )}
      </div>

      {/* Processed Data Analysis */}
      <div style={{ marginBottom: '15px' }}>
        <h4>🎨 Processed Visualization Data</h4>
        {processed ? (
          <div>
            <div><strong>Bars:</strong> {processed.bars.length}</div>
            <div><strong>Duration:</strong> {processed.duration.toFixed(2)}s</div>
            <div><strong>Has Content:</strong> {processed.hasContent ? '✅' : '❌'}</div>
            <div><strong>Silent Sections:</strong> {processed.silentSections.length}</div>
            <div><strong>Max Bar Height:</strong> {Math.max(...processed.bars.map((b: any) => b.height)).toFixed(2)}</div>
            <div><strong>Avg Bar Height:</strong> {(processed.bars.reduce((a: number, b: any) => a + b.height, 0) / processed.bars.length).toFixed(2)}</div>
            
            <button 
              onClick={() => setShowProcessedData(!showProcessedData)}
              style={{ marginTop: '5px', padding: '2px 8px' }}
            >
              {showProcessedData ? 'Hide' : 'Show'} Processed Data
            </button>
            
            {showProcessedData && (
              <div style={{ 
                maxHeight: '200px', 
                overflow: 'auto', 
                backgroundColor: 'white', 
                padding: '5px',
                marginTop: '5px'
              }}>
                <strong>First 20 bars:</strong><br/>
                {processed.bars.slice(0, 20).map((bar: any, i: number) => (
                  <div key={i} style={{ 
                    color: bar.height > 10 ? 'green' : bar.height > 5 ? 'orange' : 'red' 
                  }}>
                    Bar {i}: height={bar.height.toFixed(2)}, opacity={bar.opacity.toFixed(2)}
                  </div>
                ))}
              </div>
            )}
            
            {/* Visual representation */}
            <div style={{ marginTop: '10px' }}>
              <strong>Visual Preview:</strong>
              <div style={{ 
                display: 'flex', 
                alignItems: 'end', 
                height: '50px', 
                backgroundColor: 'white',
                padding: '5px',
                marginTop: '5px'
              }}>
                {processed.bars.slice(0, 50).map((bar: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      width: '2px',
                      height: `${Math.max(bar.height / 2, 1)}px`,
                      backgroundColor: `rgba(255, 100, 100, ${bar.opacity})`,
                      marginRight: '1px'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: 'red' }}>❌ No processed data available</div>
        )}
      </div>

      {/* Data Comparison */}
      {raw && processed && (
        <div>
          <h4>🔄 Data Flow Analysis</h4>
          <div><strong>Compression Ratio:</strong> {(raw.amplitudes.length / processed.bars.length).toFixed(2)}:1</div>
          <div><strong>Data Loss:</strong> {raw.amplitudes.length > 0 && processed.bars.length === 0 ? '❌ Complete loss' : '✅ Data preserved'}</div>
          <div><strong>Amplitude Scaling:</strong> {raw.amplitudes.length > 0 ? 
            `${Math.max(...raw.amplitudes).toFixed(4)} → ${Math.max(...processed.bars.map((b: any) => b.height)).toFixed(2)}` : 
            'N/A'
          }</div>
        </div>
      )}
    </div>
  );
};

export default WaveformDebugger;