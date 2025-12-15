import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'accent';
  message?: string;
  progress?: number; // 0-100 for progress indicator
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  variant = 'primary',
  message,
  progress,
  className = ''
}) => {
  const showProgress = typeof progress === 'number' && progress >= 0 && progress <= 100;

  return (
    <div className={`loading-spinner loading-spinner--${size} loading-spinner--${variant} ${className}`}>
      {showProgress ? (
        <div className="loading-spinner__progress">
          <svg className="loading-spinner__progress-circle" viewBox="0 0 50 50">
            <circle
              className="loading-spinner__progress-bg"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              strokeWidth="4"
            />
            <circle
              className="loading-spinner__progress-fill"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
            />
          </svg>
          <div className="loading-spinner__progress-text">
            {Math.round(progress)}%
          </div>
        </div>
      ) : (
        <div className="loading-spinner__circle">
          <div className="loading-spinner__dot loading-spinner__dot--1"></div>
          <div className="loading-spinner__dot loading-spinner__dot--2"></div>
          <div className="loading-spinner__dot loading-spinner__dot--3"></div>
        </div>
      )}
      
      {message && (
        <div className="loading-spinner__message">
          {message}
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;