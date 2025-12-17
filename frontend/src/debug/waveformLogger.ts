/**
 * Waveform Debug Logger - Centralized logging for waveform debugging
 */

export class WaveformLogger {
  private static enabled = true;
  
  static enable() {
    this.enabled = true;
  }
  
  static disable() {
    this.enabled = false;
  }
  
  static isEnabled() {
    return this.enabled;
  }
  
  static log(component: string, message: string, data?: any) {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`🎵 [${timestamp}] ${component}: ${message}`, data || '');
  }
  
  static error(component: string, message: string, error?: any) {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.error(`❌ [${timestamp}] ${component}: ${message}`, error || '');
  }
  
  static warn(component: string, message: string, data?: any) {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.warn(`⚠️ [${timestamp}] ${component}: ${message}`, data || '');
  }
  
  static group(component: string, title: string) {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.group(`🎵 [${timestamp}] ${component}: ${title}`);
  }
  
  static groupEnd() {
    if (!this.enabled) return;
    console.groupEnd();
  }
  
  static table(component: string, title: string, data: any) {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`🎵 [${timestamp}] ${component}: ${title}`);
    console.table(data);
  }
}

// Global debug functions for easy access in browser console
(window as any).waveformDebug = {
  enable: () => WaveformLogger.enable(),
  disable: () => WaveformLogger.disable(),
  isEnabled: () => WaveformLogger.isEnabled()
};