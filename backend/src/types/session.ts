// This file ensures the session type augmentation is loaded
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    hasVisited?: boolean;
  }
}

// Export empty object to make this a module
export {};
