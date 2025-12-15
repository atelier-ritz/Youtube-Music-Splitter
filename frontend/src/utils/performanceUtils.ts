/**
 * Performance monitoring utilities for waveform rendering optimization
 * 
 * Provides tools to measure and track rendering performance improvements.
 */

export interface PerformanceMetrics {
  renderTime: number;
  cacheHits: number;
  cacheMisses: number;
  memoryUsage?: number;
}

export class WaveformPerformanceMonitor {
  private static instance: WaveformPerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private readonly MAX_METRICS_HISTORY = 100;

  static getInstance(): WaveformPerformanceMonitor {
    if (!WaveformPerformanceMonitor.instance) {
      WaveformPerformanceMonitor.instance = new WaveformPerformanceMonitor();
    }
    return WaveformPerformanceMonitor.instance;
  }

  /**
   * Record a performance measurement
   */
  recordMetric(trackId: string, metric: PerformanceMetrics): void {
    if (!this.metrics.has(trackId)) {
      this.metrics.set(trackId, []);
    }

    const trackMetrics = this.metrics.get(trackId)!;
    trackMetrics.push({
      ...metric,
      memoryUsage: this.getMemoryUsage()
    });

    // Limit history size
    if (trackMetrics.length > this.MAX_METRICS_HISTORY) {
      trackMetrics.shift();
    }
  }

  /**
   * Get average performance metrics for a track
   */
  getAverageMetrics(trackId: string): PerformanceMetrics | null {
    const trackMetrics = this.metrics.get(trackId);
    if (!trackMetrics || trackMetrics.length === 0) {
      return null;
    }

    const totals = trackMetrics.reduce(
      (acc, metric) => ({
        renderTime: acc.renderTime + metric.renderTime,
        cacheHits: acc.cacheHits + metric.cacheHits,
        cacheMisses: acc.cacheMisses + metric.cacheMisses,
        memoryUsage: (acc.memoryUsage || 0) + (metric.memoryUsage || 0)
      }),
      { renderTime: 0, cacheHits: 0, cacheMisses: 0, memoryUsage: 0 }
    );

    const count = trackMetrics.length;
    return {
      renderTime: totals.renderTime / count,
      cacheHits: totals.cacheHits / count,
      cacheMisses: totals.cacheMisses / count,
      memoryUsage: (totals.memoryUsage || 0) / count
    };
  }

  /**
   * Get performance summary for all tracks
   */
  getPerformanceSummary(): Record<string, PerformanceMetrics> {
    const summary: Record<string, PerformanceMetrics> = {};
    
    this.metrics.forEach((_, trackId) => {
      const avgMetrics = this.getAverageMetrics(trackId);
      if (avgMetrics) {
        summary[trackId] = avgMetrics;
      }
    });

    return summary;
  }

  /**
   * Get cache efficiency percentage
   */
  getCacheEfficiency(trackId?: string): number {
    if (trackId) {
      const metrics = this.getAverageMetrics(trackId);
      if (!metrics) return 0;
      
      const total = metrics.cacheHits + metrics.cacheMisses;
      return total > 0 ? (metrics.cacheHits / total) * 100 : 0;
    }

    // Overall cache efficiency
    let totalHits = 0;
    let totalMisses = 0;

    this.metrics.forEach((trackMetrics) => {
      trackMetrics.forEach(metric => {
        totalHits += metric.cacheHits;
        totalMisses += metric.cacheMisses;
      });
    });

    const total = totalHits + totalMisses;
    return total > 0 ? (totalHits / total) * 100 : 0;
  }

  /**
   * Clear metrics for a specific track or all tracks
   */
  clearMetrics(trackId?: string): void {
    if (trackId) {
      this.metrics.delete(trackId);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Get current memory usage (if available)
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Log performance summary to console
   */
  logPerformanceSummary(): void {
    const summary = this.getPerformanceSummary();
    const cacheEfficiency = this.getCacheEfficiency();

    console.group('🎵 Waveform Performance Summary');
    console.log(`Overall Cache Efficiency: ${cacheEfficiency.toFixed(1)}%`);
    
    Object.entries(summary).forEach(([trackId, metrics]) => {
      console.log(`${trackId}:`, {
        'Avg Render Time': `${metrics.renderTime.toFixed(2)}ms`,
        'Cache Hits': metrics.cacheHits.toFixed(1),
        'Cache Misses': metrics.cacheMisses.toFixed(1),
        'Memory Usage': metrics.memoryUsage ? `${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB` : 'N/A'
      });
    });
    
    console.groupEnd();
  }
}

/**
 * Utility function to measure rendering performance
 */
export function measureRenderTime<T>(
  operation: () => T,
  trackId: string,
  cacheHit: boolean = false
): T {
  const startTime = performance.now();
  const result = operation();
  const endTime = performance.now();

  const monitor = WaveformPerformanceMonitor.getInstance();
  monitor.recordMetric(trackId, {
    renderTime: endTime - startTime,
    cacheHits: cacheHit ? 1 : 0,
    cacheMisses: cacheHit ? 0 : 1
  });

  return result;
}

/**
 * Debounce utility for performance-sensitive operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle utility for high-frequency operations
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}