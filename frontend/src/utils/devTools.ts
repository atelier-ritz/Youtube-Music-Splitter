/**
 * Development Tools Utilities
 * 
 * Provides safe development-only debugging tools that are automatically
 * excluded from production builds.
 */

/**
 * Check if running in development mode
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV;
};

/**
 * Check if running in production mode
 */
export const isProduction = (): boolean => {
  return import.meta.env.PROD;
};

/**
 * Log development-only messages
 */
export const devLog = (message: string, ...args: any[]): void => {
  if (isDevelopment()) {
    console.log(`🔧 [DEV] ${message}`, ...args);
  }
};

/**
 * Warn about development-only features
 */
export const devWarn = (message: string, ...args: any[]): void => {
  if (isDevelopment()) {
    console.warn(`⚠️ [DEV] ${message}`, ...args);
  }
};

/**
 * Expose object globally for debugging (development only)
 */
export const exposeForDebugging = (name: string, object: any): (() => void) => {
  if (!isDevelopment()) {
    return () => {}; // No-op in production
  }
  
  (window as any)[name] = object;
  devLog(`Exposed ${name} globally for debugging`);
  
  // Return cleanup function
  return () => {
    if (isDevelopment() && (window as any)[name] === object) {
      delete (window as any)[name];
      devLog(`Removed ${name} from global scope`);
    }
  };
};