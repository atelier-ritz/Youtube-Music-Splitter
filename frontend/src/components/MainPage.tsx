import React, { useState } from 'react';
import axios from 'axios';
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
}

const MainPage: React.FC<MainPageProps> = ({ onProcessingComplete }) => {
  const [url, setUrl] = useState('');
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const [validationError, setValidationError] = useState('');

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
      setValidationError(validation.error || 'Invalid YouTube URL');
      return;
    }

    try {
      // Start download process
      setDownloadStatus({
        status: 'downloading',
        progress: 0,
        message: 'Starting download...'
      });

      // Call backend API to start download
      const response = await axios.post('/api/download', { youtubeUrl: url });
      const { jobId } = response.data;

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
      setDownloadStatus({
        status: 'error',
        progress: 0,
        message: axios.isAxiosError(error) && error.response?.data?.error 
          ? error.response.data.error 
          : 'Failed to start download. Please try again.'
      });
    }
  };

  const startAudioProcessing = async (audioFilePath: string) => {
    try {
      // Start audio processing
      const response = await axios.post('/api/process', { audioFilePath });
      const { jobId } = response.data;

      setDownloadStatus(prev => ({
        ...prev,
        jobId,
        message: 'Audio processing started...'
      }));

      // Poll for processing status
      await pollProcessingStatus(jobId);

    } catch (error) {
      console.error('Processing failed:', error);
      setDownloadStatus({
        status: 'error',
        progress: 0,
        message: axios.isAxiosError(error) && error.response?.data?.error 
          ? error.response.data.error 
          : 'Failed to start audio processing. Please try again.'
      });
    }
  };

  const pollProcessingStatus = async (jobId: string) => {
    const maxAttempts = 120; // 10 minutes with 5-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await axios.get(`/api/process/${jobId}`);
        const { status, progress, message, error, tracks, bpm } = response.data;

        // Map processing progress to 50-100% range
        const mappedProgress = 50 + (progress * 0.5); // 50% + (0-100% * 0.5) = 50-100%

        setDownloadStatus(prev => ({
          ...prev,
          status,
          progress: Math.round(mappedProgress),
          message: message || `Audio processing... ${progress}%`,
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
            setTimeout(poll, 5000); // Poll every 5 seconds
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
    setTimeout(poll, 2000); // Initial delay of 2 seconds
  };

  const pollDownloadStatus = async (jobId: string) => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await axios.get(`/api/download/${jobId}`);
        const { status, progress, message, error } = response.data;

        // Map download progress to 0-50% range
        const mappedProgress = Math.round((progress || 0) * 0.5); // 0-100% * 0.5 = 0-50%

        setDownloadStatus({
          status,
          progress: mappedProgress,
          message: message || 'Downloading...',
          jobId
        });

        if (status === 'completed') {
          // Start audio processing
          setDownloadStatus({
            status: 'processing',
            progress: 50, // Download is 50% of total progress
            message: 'Download complete! Starting audio processing...'
          });
          
          // Start processing with the downloaded audio file
          const { audioFilePath } = response.data;
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
            setTimeout(poll, 5000); // Poll every 5 seconds
          } else {
            setDownloadStatus({
              status: 'error',
              progress: 0,
              message: 'Download timeout. Please try again.'
            });
          }
        }
      } catch (error) {
        console.error('Status polling failed:', error);
        setDownloadStatus({
          status: 'error',
          progress: 0,
          message: 'Failed to check download status. Please try again.'
        });
      }
    };

    // Start polling
    setTimeout(poll, 2000); // Initial delay of 2 seconds
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
          <h1>Band Practice Webapp</h1>
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
            <button
              type="submit"
              className="main-page__submit"
              disabled={isLoading || !url.trim()}
            >
              {isLoading ? 'Processing...' : 'Start Practice'}
            </button>
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
                <div className="main-page__progress-bar">
                  <div 
                    className="main-page__progress-fill"
                    style={{ width: `${downloadStatus.progress}%` }}
                  />
                </div>
                <p className="main-page__progress-text">
                  {downloadStatus.message} ({downloadStatus.progress}%)
                </p>
              </div>
            ) : downloadStatus.status === 'error' ? (
              <div className="main-page__error-status">
                <p className="main-page__error-message">
                  {downloadStatus.message}
                </p>
                <button 
                  className="main-page__retry"
                  onClick={handleRetry}
                >
                  Try Again
                </button>
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