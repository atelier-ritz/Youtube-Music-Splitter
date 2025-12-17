/**
 * Global type declarations for development debugging
 */

declare global {
  interface Window {
    // Development-only debugging tools
    audioPlayer?: import('../services/AudioPlayer').AudioPlayer;
  }
}

export {};