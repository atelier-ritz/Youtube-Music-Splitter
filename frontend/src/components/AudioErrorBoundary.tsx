import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import './AudioErrorBoundary.css';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: 'audio' | 'network' | 'permission' | 'unknown';
}

/**
 * Audio-specific Error Boundary Component
 * 
 * Specialized error boundary for audio-related errors with specific
 * recovery suggestions and retry mechanisms.
 * 
 * Requirements: 2.4, 7.4
 */
export class AudioErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: 'unknown'
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorType: AudioErrorBoundary.categorizeError(error)
    };
  }

  static categorizeError(error: Error): 'audio' | 'network' | 'permission' | 'unknown' {
    const message = error.message.toLowerCase();
    
    if (message.includes('audiocontext') || 
        message.includes('web audio') || 
        message.includes('audio buffer') ||
        message.includes('decode')) {
      return 'audio';
    }
    
    if (message.includes('network') || 
        message.includes('fetch') || 
        message.includes('cors') ||
        message.includes('connection')) {
      return 'network';
    }
    
    if (message.includes('permission') || 
        message.includes('suspended') || 
        message.includes('user interaction')) {
      return 'permission';
    }
    
    return 'unknown';
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AudioErrorBoundary caught an error:', error, errorInfo);
    
    // Log audio-specific error details
    if (error.message.includes('AudioContext')) {
      console.error('Audio Context Error Details:', {
        userAgent: navigator.userAgent,
        audioContextSupported: !!(window.AudioContext || (window as any).webkitAudioContext),
        error: error.message
      });
    }
  }

  getErrorMessage(): { title: string; message: string; suggestions: string[] } {
    switch (this.state.errorType) {
      case 'audio':
        return {
          title: 'Audio System Error',
          message: 'There was a problem with the audio system. This might be due to browser compatibility or audio format issues.',
          suggestions: [
            'Try refreshing the page and clicking play again',
            'Check if your browser supports Web Audio API',
            'Try using a different browser (Chrome, Firefox, Safari)',
            'Make sure your audio drivers are up to date'
          ]
        };
      
      case 'network':
        return {
          title: 'Network Connection Error',
          message: 'Unable to load audio tracks. This might be due to network connectivity or server issues.',
          suggestions: [
            'Check your internet connection',
            'Try refreshing the page',
            'Wait a moment and try again',
            'Contact support if the problem persists'
          ]
        };
      
      case 'permission':
        return {
          title: 'Audio Permission Required',
          message: 'Audio playback requires user interaction. Modern browsers require a user gesture to start audio.',
          suggestions: [
            'Click the "Try Again" button below',
            'Make sure to click play after the page loads',
            'Check browser audio permissions',
            'Ensure audio is not muted in your browser'
          ]
        };
      
      default:
        return {
          title: 'Unexpected Error',
          message: 'An unexpected error occurred while handling audio. Please try again.',
          suggestions: [
            'Refresh the page and try again',
            'Clear your browser cache',
            'Try using a different browser',
            'Contact support if the issue continues'
          ]
        };
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorType: 'unknown'
    });
    
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorType: 'unknown'
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const errorDetails = this.getErrorMessage();
      
      return (
        <div className="audio-error-boundary">
          <div className="audio-error-boundary__container">
            <div className="audio-error-boundary__icon">
              {this.state.errorType === 'audio' && '🔊'}
              {this.state.errorType === 'network' && '🌐'}
              {this.state.errorType === 'permission' && '🔒'}
              {this.state.errorType === 'unknown' && '⚠️'}
            </div>
            
            <h3 className="audio-error-boundary__title">
              {errorDetails.title}
            </h3>
            
            <p className="audio-error-boundary__message">
              {errorDetails.message}
            </p>
            
            <div className="audio-error-boundary__suggestions">
              <h4>Try these solutions:</h4>
              <ul>
                {errorDetails.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="audio-error-boundary__details">
                <summary>Technical Details (Development)</summary>
                <pre className="audio-error-boundary__stack">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            
            <div className="audio-error-boundary__actions">
              <button 
                className="audio-error-boundary__retry"
                onClick={this.handleRetry}
              >
                Try Again
              </button>
              
              {this.props.onReset && (
                <button 
                  className="audio-error-boundary__reset"
                  onClick={this.handleReset}
                >
                  Start Over
                </button>
              )}
              
              <button 
                className="audio-error-boundary__reload"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for handling async audio errors
 */
export function useAudioErrorHandler() {
  const [, setState] = React.useState();
  
  return React.useCallback((error: Error) => {
    // Enhance error with audio context if available
    const enhancedError = new Error(error.message);
    enhancedError.name = 'AudioError';
    enhancedError.stack = error.stack;
    
    setState(() => {
      throw enhancedError;
    });
  }, []);
}