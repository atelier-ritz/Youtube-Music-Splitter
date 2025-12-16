/**
 * Waveform Data Export Utilities
 * 
 * Provides functionality to export waveform data to CSV files for analysis,
 * debugging, or external processing.
 */

import type { WaveformVisualizationData } from '../hooks/useWaveformData';
import type { WaveformData } from '../services/AudioAnalysisService';

export interface WaveformExportData {
  trackId: string;
  trackName: string;
  rawAmplitudes: number[];
  visualizationBars: Array<{ height: number; opacity: number }>;
  duration: number;
  sampleRate?: number;
  samplesPerPoint?: number;
  hasContent: boolean;
  silentSections: Array<{ start: number; end: number; duration: number }>;
}

/**
 * Export waveform data to CSV format
 */
export function exportWaveformToCSV(
  trackId: string,
  trackName: string,
  rawWaveformData: WaveformData,
  visualizationData: WaveformVisualizationData
): void {
  const csvContent = generateWaveformCSV(trackId, trackName, rawWaveformData, visualizationData);
  downloadCSV(csvContent, `waveform_${trackName}_${trackId}.csv`);
}

/**
 * Export all tracks' waveform data to a single CSV file
 */
export function exportAllWaveformsToCSV(
  waveformDataMap: Map<string, WaveformVisualizationData>,
  rawWaveformDataMap: Map<string, WaveformData>,
  getTrackName: (trackId: string) => string
): void {
  const allData: WaveformExportData[] = [];
  
  waveformDataMap.forEach((visualizationData, trackId) => {
    const rawData = rawWaveformDataMap.get(trackId);
    if (rawData) {
      allData.push({
        trackId,
        trackName: getTrackName(trackId),
        rawAmplitudes: rawData.amplitudes,
        visualizationBars: visualizationData.bars,
        duration: visualizationData.duration,
        sampleRate: rawData.sampleRate,
        samplesPerPoint: rawData.samplesPerPoint,
        hasContent: visualizationData.hasContent,
        silentSections: visualizationData.silentSections
      });
    }
  });
  
  const csvContent = generateAllTracksCSV(allData);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadCSV(csvContent, `all_waveforms_${timestamp}.csv`);
}

/**
 * Generate CSV content for a single track
 */
function generateWaveformCSV(
  trackId: string,
  trackName: string,
  rawWaveformData: WaveformData,
  visualizationData: WaveformVisualizationData
): string {
  const lines: string[] = [];
  
  // Header with metadata
  lines.push('# Waveform Data Export');
  lines.push(`# Track ID: ${trackId}`);
  lines.push(`# Track Name: ${trackName}`);
  lines.push(`# Duration: ${visualizationData.duration.toFixed(3)} seconds`);
  lines.push(`# Sample Rate: ${rawWaveformData.sampleRate} Hz`);
  lines.push(`# Samples Per Point: ${rawWaveformData.samplesPerPoint}`);
  lines.push(`# Has Content: ${visualizationData.hasContent}`);
  lines.push(`# Raw Amplitudes Count: ${rawWaveformData.amplitudes.length}`);
  lines.push(`# Visualization Bars Count: ${visualizationData.bars.length}`);
  lines.push(`# Export Time: ${new Date().toISOString()}`);
  lines.push('');
  
  // Silent sections
  if (visualizationData.silentSections.length > 0) {
    lines.push('# Silent Sections:');
    visualizationData.silentSections.forEach((section, index) => {
      lines.push(`# Section ${index + 1}: ${section.start.toFixed(3)}s - ${section.end.toFixed(3)}s (${section.duration.toFixed(3)}s)`);
    });
    lines.push('');
  }
  
  // CSV headers
  lines.push('Index,Time_Seconds,Raw_Amplitude,Visualization_Height,Visualization_Opacity');
  
  // Data rows - align raw amplitudes with visualization bars
  const maxLength = Math.max(rawWaveformData.amplitudes.length, visualizationData.bars.length);
  const timePerRawSample = visualizationData.duration / rawWaveformData.amplitudes.length;
  
  for (let i = 0; i < maxLength; i++) {
    const rawAmplitude = i < rawWaveformData.amplitudes.length ? rawWaveformData.amplitudes[i] : '';
    const rawTime = i * timePerRawSample;
    
    // Find corresponding visualization bar
    const barIndex = Math.floor(i * visualizationData.bars.length / maxLength);
    const bar = visualizationData.bars[barIndex];
    const barHeight = bar ? bar.height : '';
    const barOpacity = bar ? bar.opacity : '';
    
    lines.push(`${i},${rawTime.toFixed(6)},${rawAmplitude},${barHeight},${barOpacity}`);
  }
  
  return lines.join('\n');
}

/**
 * Generate CSV content for all tracks in a comparative format
 */
function generateAllTracksCSV(allData: WaveformExportData[]): string {
  const lines: string[] = [];
  
  // Header with metadata
  lines.push('# All Tracks Waveform Data Export');
  lines.push(`# Export Time: ${new Date().toISOString()}`);
  lines.push(`# Number of Tracks: ${allData.length}`);
  lines.push('');
  
  // Track metadata
  allData.forEach((data, index) => {
    lines.push(`# Track ${index + 1}: ${data.trackName} (${data.trackId})`);
    lines.push(`#   Duration: ${data.duration.toFixed(3)}s, Sample Rate: ${data.sampleRate}Hz, Has Content: ${data.hasContent}`);
    lines.push(`#   Raw Samples: ${data.rawAmplitudes.length}, Visualization Bars: ${data.visualizationBars.length}`);
  });
  lines.push('');
  
  // Dynamic CSV headers based on available tracks
  const headers = ['Index', 'Time_Seconds'];
  allData.forEach(data => {
    const safeName = data.trackName.replace(/[^a-zA-Z0-9]/g, '_');
    headers.push(`${safeName}_Raw_Amplitude`);
    headers.push(`${safeName}_Vis_Height`);
    headers.push(`${safeName}_Vis_Opacity`);
  });
  lines.push(headers.join(','));
  
  // Find the maximum length across all tracks
  const maxRawLength = Math.max(...allData.map(data => data.rawAmplitudes.length));
  const maxVisLength = Math.max(...allData.map(data => data.visualizationBars.length));
  const maxLength = Math.max(maxRawLength, maxVisLength);
  
  // Data rows
  for (let i = 0; i < maxLength; i++) {
    const row: string[] = [];
    
    // Common columns
    const avgDuration = allData.reduce((sum, data) => sum + data.duration, 0) / allData.length;
    const timeSeconds = (i / maxLength) * avgDuration;
    row.push(i.toString());
    row.push(timeSeconds.toFixed(6));
    
    // Track-specific columns
    allData.forEach(data => {
      // Raw amplitude
      const rawIndex = Math.floor(i * data.rawAmplitudes.length / maxLength);
      const rawAmplitude = rawIndex < data.rawAmplitudes.length ? data.rawAmplitudes[rawIndex] : '';
      row.push(rawAmplitude.toString());
      
      // Visualization data
      const visIndex = Math.floor(i * data.visualizationBars.length / maxLength);
      const bar = visIndex < data.visualizationBars.length ? data.visualizationBars[visIndex] : null;
      row.push(bar ? bar.height.toString() : '');
      row.push(bar ? bar.opacity.toString() : '');
    });
    
    lines.push(row.join(','));
  }
  
  return lines.join('\n');
}

/**
 * Download CSV content as a file
 */
function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    // Fallback for browsers that don't support download attribute
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    URL.revokeObjectURL(url);
  }
}

/**
 * Export waveform data in JSON format (alternative to CSV)
 */
export function exportWaveformToJSON(
  trackId: string,
  trackName: string,
  rawWaveformData: WaveformData,
  visualizationData: WaveformVisualizationData
): void {
  const exportData: WaveformExportData = {
    trackId,
    trackName,
    rawAmplitudes: rawWaveformData.amplitudes,
    visualizationBars: visualizationData.bars,
    duration: visualizationData.duration,
    sampleRate: rawWaveformData.sampleRate,
    samplesPerPoint: rawWaveformData.samplesPerPoint,
    hasContent: visualizationData.hasContent,
    silentSections: visualizationData.silentSections
  };
  
  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `waveform_${trackName}_${trackId}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}