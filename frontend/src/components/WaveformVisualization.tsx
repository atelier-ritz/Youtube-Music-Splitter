/**
 * WaveformVisualization Component - Optimized real waveform visualization with Canvas rendering
 * 
 * Displays accurate waveform visualization using amplitude data extracted from audio buffers.
 * Uses Canvas for efficient rendering and includes caching for optimal performance.
 * Shows silent sections, audio patterns, and provides visual feedback for track content.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { measureRenderTime, WaveformPerformanceMonitor } from '../utils/performanceUtils';
import './WaveformVisualization.css';

export interface WaveformVisualizationProps {
  /** Array of bar heights and opacities for visualization */
  bars: Array<{ height: number; opacity: number }>;
  /** Track name for styling purposes */
  trackName: string;
  /** Whether the track is currently playing (affects opacity) */
  isPlaying: boolean;
  /** Current playback progress (0-1) */
  progress?: number;
  /** Width of the waveform container */
  width?: number;
  /** Height of the waveform container */
  height?: number;
  /** Whether to show silent sections with different styling */
  showSilentSections?: boolean;
  /** Silent sections data */
  silentSections?: Array<{ start: number; end: number; duration: number }>;
  /** Total duration for calculating silent section positions */
  totalDuration?: number;
  /** Click handler for seeking */
  onClick?: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  /** Enable high DPI rendering for crisp visuals */
  enableHighDPI?: boolean;
  /** Use cached rendering when possible */
  enableCaching?: boolean;
}

// Cache for rendered waveforms to avoid re-rendering identical data
interface WaveformCache {
  key: string;
  imageData: ImageData;
  width: number;
  height: number;
}

const waveformCache = new Map<string, WaveformCache>();

// Track-specific colors for consistent styling
const TRACK_COLORS: Record<string, string> = {
  vocals: '#d75757ff',
  drums: '#8a8a8a',
  bass: '#3f88adff',
  guitar: '#d0ab25',
  piano: '#3dc77d',
  other: '#b640a7'
};

const WaveformVisualization: React.FC<WaveformVisualizationProps> = ({
  bars,
  trackName,
  isPlaying,
  progress = 0,
  width,
  height,
  showSilentSections = true,
  silentSections = [],
  totalDuration = 0,
  onClick,
  enableHighDPI = true,
  enableCaching = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  
  // Use container dimensions if width/height not provided
  const [containerDimensions, setContainerDimensions] = React.useState({ width: 800, height: 80 });
  
  // Track container size changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width: containerWidth, height: containerHeight } = entry.contentRect;
        setContainerDimensions({ 
          width: containerWidth || 800, 
          height: containerHeight || 80 
        });
      }
    });
    
    resizeObserver.observe(container);
    
    // Initial size
    const rect = container.getBoundingClientRect();
    setContainerDimensions({ 
      width: rect.width || 800, 
      height: rect.height || 80 
    });
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // Use provided dimensions or container dimensions
  const actualWidth = width || containerDimensions.width;
  const actualHeight = height || containerDimensions.height;

  // Generate cache key for this waveform configuration
  const cacheKey = useMemo(() => {
    const barsHash = bars.length > 0 ? 
      `${bars.length}-${bars[0]?.height}-${bars[bars.length - 1]?.height}` : 
      'empty';
    return `${trackName}-${actualWidth}-${actualHeight}-${barsHash}-${showSilentSections}-${silentSections.length}`;
  }, [bars, trackName, actualWidth, actualHeight, showSilentSections, silentSections.length]);

  // Get device pixel ratio for high DPI rendering
  const devicePixelRatio = useMemo(() => {
    return enableHighDPI ? (window.devicePixelRatio || 1) : 1;
  }, [enableHighDPI]);

  // Render waveform to canvas with optimizations
  const renderWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Measure rendering performance
    measureRenderTime(() => {

    // Set up high DPI rendering
    const displayWidth = actualWidth;
    const displayHeight = actualHeight;
    const canvasWidth = displayWidth * devicePixelRatio;
    const canvasHeight = displayHeight * devicePixelRatio;

    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    // Scale context for high DPI
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Check cache first (after scaling context)
    if (enableCaching && waveformCache.has(cacheKey)) {
      const cached = waveformCache.get(cacheKey)!;
      if (cached.width === displayWidth && cached.height === displayHeight) {
        measureRenderTime(() => {
          // Temporarily reset scale to put image data at correct size
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.putImageData(cached.imageData, 0, 0);
        }, trackName, true); // Cache hit
        return;
      }
    }

    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Set up rendering context
    const trackColor = TRACK_COLORS[trackName] || TRACK_COLORS.other;
    const containerOpacity = isPlaying ? 1 : 0.6;

    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Draw silent sections if enabled
    if (showSilentSections && totalDuration > 0 && silentSections.length > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      silentSections.forEach(section => {
        const startX = (section.start / totalDuration) * displayWidth;
        const sectionWidth = (section.duration / totalDuration) * displayWidth;
        ctx.fillRect(startX, 0, sectionWidth, displayHeight);
        
        // Add silent section indicator dot
        const centerX = startX + sectionWidth / 2;
        const centerY = displayHeight / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
      });
    }

    // Draw waveform bars efficiently with proper audio waveform appearance
    if (bars.length > 0) {
      const barWidth = Math.max(0.5, displayWidth / bars.length);
      const centerY = displayHeight / 2;

      // Use batch rendering for better performance
      ctx.fillStyle = trackColor;
      ctx.globalAlpha = containerOpacity;

      // Always use waveform-style rendering for better visual appearance
      if (barWidth < 2) {
        // For very dense waveforms, use continuous line rendering
        ctx.beginPath();
        ctx.strokeStyle = trackColor;
        ctx.lineWidth = Math.max(1, barWidth);
        
        // Create a smooth waveform path
        let firstPoint = true;
        bars.forEach((bar, index) => {
          const x = (index / bars.length) * displayWidth;
          const amplitude = Math.min(bar.height * displayHeight / 300, centerY - 5); // Scale to use 2/3 of half height, leave 5px margin
          const y1 = centerY - amplitude;
          
          if (firstPoint) {
            ctx.moveTo(x, y1);
            firstPoint = false;
          } else {
            ctx.lineTo(x, y1);
          }
        });
        
        // Draw the bottom half
        for (let i = bars.length - 1; i >= 0; i--) {
          const x = (i / bars.length) * displayWidth;
          const amplitude = Math.min(bars[i].height * displayHeight / 300, centerY - 5); // Match the scaling above
          const y2 = centerY + amplitude;
          ctx.lineTo(x, y2);
        }
        
        ctx.closePath();
        ctx.fill();
      } else {
        // For normal density, use waveform-style bars
        bars.forEach((bar, index) => {
          const x = index * barWidth;
          const amplitude = Math.max(Math.min(bar.height * displayHeight / 300, centerY - 5), 1); // Scale to use 2/3 of half height, leave 5px margin
          
          // Draw symmetric waveform bar (top and bottom from center)
          ctx.globalAlpha = containerOpacity * Math.max(bar.opacity, 0.3);
          
          // Top half
          ctx.fillRect(x, centerY - amplitude, Math.ceil(barWidth), amplitude);
          // Bottom half
          ctx.fillRect(x, centerY, Math.ceil(barWidth), amplitude);
        });
      }

      ctx.globalAlpha = 1; // Reset alpha
    }

    // Cache the rendered waveform if caching is enabled
    if (enableCaching && bars.length > 0) {
      try {
        // Reset scale temporarily to get image data at actual canvas resolution
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        waveformCache.set(cacheKey, {
          key: cacheKey,
          imageData,
          width: displayWidth,
          height: displayHeight
        });

        // Limit cache size to prevent memory issues
        if (waveformCache.size > 50) {
          const firstKey = waveformCache.keys().next().value;
          if (firstKey) {
            waveformCache.delete(firstKey);
          }
        }
      } catch (error) {
        console.warn('Failed to cache waveform:', error);
      }
    }
    }, trackName, false); // Cache miss - new render
  }, [bars, trackName, isPlaying, actualWidth, actualHeight, showSilentSections, silentSections, totalDuration, devicePixelRatio, cacheKey, enableCaching]);

  // Render progress cursor only (no overlay fill)
  const renderProgress = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      renderWaveform();
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and redraw the entire waveform
    renderWaveform();
    
    // Add progress cursor line only (no overlay fill)
    if (progress > 0) {
      const progressWidth = progress * actualWidth - ctx.lineWidth / 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressWidth, 0);
      ctx.lineTo(progressWidth, actualHeight);
      ctx.stroke();
    }
  }, [progress, actualWidth, actualHeight, renderWaveform]);

  // Handle canvas click for seeking
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (onClick) {
      onClick(event);
    }
  }, [onClick]);

  // Initial render and re-render when dependencies change
  useEffect(() => {
    renderWaveform();
  }, [renderWaveform]);

  // Animate progress updates efficiently
  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      renderProgress();
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderProgress]);

  // Cleanup on unmount and log performance in development
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Log performance summary in development mode
      if (import.meta.env.DEV) {
        const monitor = WaveformPerformanceMonitor.getInstance();
        const efficiency = monitor.getCacheEfficiency(trackName);
        if (efficiency > 0) {
          console.log(`🎵 ${trackName} waveform cache efficiency: ${efficiency.toFixed(1)}%`);
        }
      }
    };
  }, [trackName]);

  return (
    <div 
      ref={containerRef}
      className={`waveform-visualization waveform-visualization--${trackName}`}
      style={{ 
        width: width ? `${width}px` : '100%', 
        height: height ? `${height}px` : '100%' 
      }}
    >
      <canvas
        ref={canvasRef}
        className="waveform-canvas"
        onClick={handleCanvasClick}
        style={{ 
          width: '100%', 
          height: '100%',
          cursor: onClick ? 'pointer' : 'default'
        }}
      />
      
      {/* Fallback content indicator for empty tracks */}
      {bars.length === 0 && (
        <div className="waveform-empty">
          <span>No audio content</span>
        </div>
      )}
    </div>
  );
};

export default WaveformVisualization;