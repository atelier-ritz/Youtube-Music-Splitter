import React, { useState } from 'react';
import axios from 'axios';
import { categorizeError, createRetryableAxios } from '../utils/retryUtils';
import { useErrorHandler } from './ErrorBoundary';
import LoadingSpinner from './LoadingSpinner';
import InteractiveButton from './InteractiveButton';
import './MainPage.css';

interface DownloadStatus {
  status: 'idle' | 'downloading' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
  jobId?: string;
}

interface YouTubeValidationResult {
  isValid: boolean;
  videoId?: string;
  error?: string;
}

interface MainPageProps {
  onProcessingComplete: (tracks: any[], bpm?: number, title?: string) => void;
  onShowToast?: {
    showSuccess: (title: string, message?: string) => void;
    showError: (title: string, message?: string) => void;
    showInfo: (title: string, message?: string) => void;
  };
}

const MainPage: React.FC<MainPageProps> = ({ onProcessingComplete, onShowToast }) => {
  const [url, setUrl] = useState('');
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const [validationError, setValidationError] = useState('');
  const handleError = useErrorHandler();
  
  // Create retry-enabled axios client
  const retryableAxios = createRetryableAxios(axios, {
    maxAttempts: 3,
    baseDelay: 2000,
    onRetry: (attempt, error) => {
      console.log(`Retrying API call (attempt ${attempt}):`, error.message);
      setDownloadStatus(prev => ({
        ...prev,
        message: `Connection issue, retrying... (attempt ${attempt}/3)`
      }));
    }
  });

  // Client-side YouTube URL validation (mirrors backend logic)
  const validateYouTubeUrl = (url: string): YouTubeValidationResult => {
    if (!url || typeof url !== 'string') {
      return {
        isValid: false,
        error: 'URL must be a non-empty string'
      };
    }

    const trimmedUrl = url.trim();
    
    if (!trimmedUrl) {
      return {
        isValid: false,
        error: 'URL cannot be empty or only whitespace'
      };
    }

    // YouTube URL patterns with video ID capture group mapping
    const patterns = [
      { regex: /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(&.*)?$/, videoIdGroup: 2 },
      { regex: /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})(\?.*)?$/, videoIdGroup: 1 },
      { regex: /^https?:\/\/m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(&.*)?$/, videoIdGroup: 1 },
      { regex: /^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(\?.*)?$/, videoIdGroup: 2 },
      { regex: /^https?:\/\/(www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})(\?.*)?$/, videoIdGroup: 2 }
    ];

    for (const pattern of patterns) {
      const match = trimmedUrl.match(pattern.regex);
      if (match) {
        const videoId = match[pattern.videoIdGroup];
        return {
          isValid: true,
          videoId
        };
      }
    }

    return {
      isValid: false,
      error: 'Invalid YouTube URL format'
    };
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset previous errors
    setValidationError('');
    setDownloadStatus({
      status: 'idle',
      progress: 0,
      message: ''
    });
    
    // Validate URL
    const validation = validateYouTubeUrl(url);
    if (!validation.isValid) {
      const errorMsg = validation.error || 'Invalid YouTube URL';
      setValidationError(errorMsg);
      onShowToast?.showError('Invalid URL', errorMsg);
      return;
    }

    try {
      // Start download process
      setDownloadStatus({
        status: 'downloading',
        progress: 0,
        message: 'Starting download...'
      });

      // Show info toast
      onShowToast?.showInfo('Download Started', 'Extracting audio from YouTube video...');

      // Call backend API to start download with retry
      const response = await retryableAxios.post('/api/download', { youtubeUrl: url });
      const { jobId } = (response as any).data;

      setDownloadStatus({
        status: 'downloading',
        progress: 5, // 10% of download = 5% of total
        message: 'Download in progress...',
        jobId
      });

      // Poll for download status
      await pollDownloadStatus(jobId);

    } catch (error) {
      console.error('Download failed:', error);
      
      // Categorize error for better user messaging
      const errorInfo = categorizeError(error);
      
      setDownloadStatus({
        status: 'error',
        progress: 0,
        message: errorInfo.message
      });

      // Show error toast
      onShowToast?.showError('Download Failed', errorInfo.message);

      // If it's an unexpected error, trigger error boundary
      if (errorInfo.type === 'unknown' && !errorInfo.isRetryable) {
        handleError(error as Error);
      }
    }
  };

  const startAudioProcessing = async (audioFilePath: string) => {
    try {
      // Start audio processing with retry
      const response = await retryableAxios.post('/api/process', { audioFilePath });
      const { jobId } = (response as any).data;

      setDownloadStatus(prev => ({
        ...prev,
        jobId,
        message: 'Audio processing started...'
      }));

      // Poll for processing status
      await pollProcessingStatus(jobId);

    } catch (error) {
      console.error('Processing failed:', error);
      
      // Categorize error for better user messaging
      const errorInfo = categorizeError(error);
      
      setDownloadStatus({
        status: 'error',
        progress: 0,
        message: errorInfo.message
      });

      // If it's an unexpected error, trigger error boundary
      if (errorInfo.type === 'unknown' && !errorInfo.isRetryable) {
        handleError(error as Error);
      }
    }
  };

  const pollProcessingStatus = async (jobId: string) => {
    const maxAttempts = 120; // 10 minutes with 5-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await retryableAxios.get(`/api/process/${jobId}`);
        const { status, progress, message, error, tracks, bpm } = (response as any).data;

        // Map processing progress to 50-100% range with more granular updates
        const mappedProgress = 50 + (progress * 0.5); // 50% + (0-100% * 0.5) = 50-100%

        setDownloadStatus(prev => ({
          ...prev,
          status,
          progress: Math.round(mappedProgress),
          message: message || `Audio processing... ${Math.round(progress)}%`,
          jobId
        }));

        if (status === 'completed') {
          setDownloadStatus(prev => ({
            ...prev,
            progress: 100,
            message: `Processing complete! Redirecting to track view...`
          }));
          
          // Navigate to track view with tracks and BPM data
          console.log('Processing completed:', { tracks, bpm });
          
          // Give user a moment to see the completion message, then navigate
          setTimeout(() => {
            onProcessingComplete(tracks || [], bpm, 'Practice Session');
          }, 1500);
          
          return;
        }

        if (status === 'failed') {
          setDownloadStatus({
            status: 'error',
            progress: 0,
            message: error || 'Audio processing failed. Please try again.'
          });
          return;
        }

        // Continue polling if still in progress
        if (status === 'processing') {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 2000); // Poll every 2 seconds for more responsive updates
          } else {
            setDownloadStatus({
              status: 'error',
              progress: 0,
              message: 'Processing timeout. Please try again.'
            });
          }
        }
      } catch (error) {
        console.error('Processing status polling failed:', error);
        setDownloadStatus({
          status: 'error',
          progress: 0,
          message: 'Failed to check processing status. Please try again.'
        });
      }
    };

    // Start polling immediately
    setTimeout(poll, 3000); // Initial delay of 3 seconds
  };

  const pollDownloadStatus = async (jobId: string) => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await retryableAxios.get(`/api/download/${jobId}`);
        const { status, progress, message, error } = (response as any).data;

        // Map download progress to 0-50% range with more granular updates
        const mappedProgress = Math.round((progress || 0) * 0.5); // 0-100% * 0.5 = 0-50%

        setDownloadStatus({
          status,
          progress: mappedProgress,
          message: message || `Downloading... ${Math.round(progress || 0)}%`,
          jobId
        });

        if (status === 'completed') {
          // Start audio processing
          setDownloadStatus({
            status: 'processing',
            progress: 50, // Download is 50% of total progress
            message: 'Download complete! Starting audio processing...'
          });
          
          // Show success toast for download completion
          onShowToast?.showSuccess('Download Complete', 'Starting audio separation...');
          
          // Start processing with the downloaded audio file
          const { audioFilePath } = (response as any).data;
          if (audioFilePath) {
            await startAudioProcessing(audioFilePath);
          } else {
            setDownloadStatus({
              status: 'error',
              progress: 0,
              message: 'Download completed but audio file path not found.'
            });
          }
          return;
        }

        if (status === 'error') {
          setDownloadStatus({
            status: 'error',
            progress: 0,
            message: error || 'Download failed. Please try again.'
          });
          return;
        }

        // Continue polling if still in progress
        if (status === 'downloading' || status === 'processing') {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000); // Poll every 5 seconds to avoid rate limiting
          } else {
            setDownloadStatus({
              status: 'error',
              progress: 0,
              message: 'Download timeout. Please try again.'
            });
          }
        }
      } catch (error: any) {
        console.error('Status polling failed:', error);
        
        // Handle rate limiting specifically
        if (error?.response?.status === 429) {
          // Wait longer before retrying on rate limit
          attempts++;
          if (attempts < maxAttempts) {
            console.log('Rate limited, waiting 10 seconds before retry...');
            setTimeout(poll, 10000); // Wait 10 seconds on rate limit
            return;
          }
        }
        
        setDownloadStatus({
          status: 'error',
          progress: 0,
          message: error?.response?.status === 429 
            ? 'Server is busy. Please wait a moment and try again.'
            : 'Failed to check download status. Please try again.'
        });
      }
    };

    // Start polling
    setTimeout(poll, 3000); // Initial delay of 3 seconds
  };

  const handleRetry = () => {
    setDownloadStatus({
      status: 'idle',
      progress: 0,
      message: ''
    });
    setValidationError('');
  };

  const isLoading = downloadStatus.status === 'downloading' || downloadStatus.status === 'processing';
  const hasError = downloadStatus.status === 'error' || validationError;

  return (
    <div className="main-page">
      <div className="main-page__container">
        <header className="main-page__header">
          <h1>Band Practice Partner</h1>
          <p>Enter a YouTube URL to separate tracks and start practicing</p>
        </header>

        <form className="main-page__form" onSubmit={handleSubmit}>
          <div className="main-page__input-group">
            <input
              type="url"
              className={`main-page__input ${hasError ? 'main-page__input--error' : ''}`}
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={handleUrlChange}
              disabled={isLoading}
              required
            />
            <InteractiveButton
              type="submit"
              variant="primary"
              size="medium"
              loading={isLoading}
              loadingText="Processing..."
              disabled={!url.trim()}
              className="main-page__submit"
            >
              Start Practice
            </InteractiveButton>
          </div>

          {validationError && (
            <div className="main-page__error">
              {validationError}
            </div>
          )}
        </form>

        {downloadStatus.status !== 'idle' && (
          <div className="main-page__status">
            {downloadStatus.status === 'downloading' || downloadStatus.status === 'processing' ? (
              <div className="main-page__progress">
                <LoadingSpinner
                  size="large"
                  variant="primary"
                  progress={downloadStatus.progress}
                  message={downloadStatus.message}
                />
              </div>
            ) : downloadStatus.status === 'error' ? (
              <div className="main-page__error-status">
                <p className="main-page__error-message">
                  {downloadStatus.message}
                </p>
                <InteractiveButton 
                  variant="danger"
                  size="medium"
                  onClick={handleRetry}
                  className="main-page__retry"
                >
                  Try Again
                </InteractiveButton>
              </div>
            ) : downloadStatus.status === 'completed' ? (
              <div className="main-page__success">
                <div className="main-page__success-icon">✓</div>
                <p>Processing complete! Redirecting to track view...</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default MainPage;