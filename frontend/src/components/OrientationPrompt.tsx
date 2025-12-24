import React, { useState, useEffect } from 'react';
import './OrientationPrompt.css';

interface OrientationPromptProps {
  children: React.ReactNode;
}

const OrientationPrompt: React.FC<OrientationPromptProps> = ({ children }) => {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isPortraitMode = window.innerHeight > window.innerWidth;
      const isMobileDevice = window.innerWidth <= 1024; // Tablets and phones
      
      setIsPortrait(isPortraitMode);
      setIsMobile(isMobileDevice);
    };

    // Check on mount
    checkOrientation();

    // Listen for orientation changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleRotateClick = async () => {
    // Try to use Screen Orientation API if available
    if ('screen' in window && 'orientation' in window.screen) {
      try {
        // @ts-ignore - Screen Orientation API might not be in types
        await window.screen.orientation.lock('landscape');
      } catch (error) {
        console.log('Screen orientation lock not supported or failed:', error);
        // Fallback: just show instructions
      }
    }
  };

  // Show orientation prompt only on mobile devices in portrait mode
  if (isMobile && isPortrait) {
    return (
      <div className="orientation-prompt">
        <div className="orientation-prompt__content">
          <div className="orientation-prompt__icon">
            📱 ↻
          </div>
          <h2>Rotate Your Device</h2>
          <p>
            This app works best in landscape mode.<br />
            Please rotate your device horizontally for the optimal experience.
          </p>
          <button 
            className="orientation-prompt__button"
            onClick={handleRotateClick}
          >
            Lock Landscape Mode
          </button>
          <div className="orientation-prompt__instruction">
            <small>
              Or manually rotate your device and disable rotation lock
            </small>
          </div>
        </div>
      </div>
    );
  }

  // Normal app content
  return <>{children}</>;
};

export default OrientationPrompt;