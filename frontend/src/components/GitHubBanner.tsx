import React, { useState } from 'react';
import InteractiveButton from './InteractiveButton';
import './GitHubBanner.css';

interface GitHubBannerProps {
  onClose?: () => void;
  className?: string;
  repoUrl?: string;
}

const GitHubBanner: React.FC<GitHubBannerProps> = ({ 
  onClose, 
  className, 
  repoUrl = 'https://github.com/atelier-ritz/Youtube-Music-Splitter' // Replace with your actual repo URL
}) => {
  const [isMinimized, setIsMinimized] = useState(true); // Start collapsed by default

  const handleViewRepo = () => {
    window.open(repoUrl, '_blank', 'noopener,noreferrer');
  };

  const handleStar = () => {
    window.open(`${repoUrl}/stargazers`, '_blank', 'noopener,noreferrer');
  };

  const handleFork = () => {
    window.open(`${repoUrl}/fork`, '_blank', 'noopener,noreferrer');
  };

  const handleIssues = () => {
    window.open(`${repoUrl}/issues`, '_blank', 'noopener,noreferrer');
  };

  if (isMinimized) {
    return (
      <div className={`github-banner github-banner--minimized ${className || ''}`}>
        <button 
          className="github-banner__expand"
          onClick={() => setIsMinimized(false)}
          title="View source code"
        >
          ⭐ GitHub
        </button>
      </div>
    );
  }

  return (
    <div className={`github-banner ${className || ''}`}>
      <div className="github-banner__content">
        <div className="github-banner__header">
          <div className="github-banner__icon">⭐</div>
          <div className="github-banner__text">
            <h3 className="github-banner__title">Open Source Project</h3>
            <p className="github-banner__subtitle">
              Check out the code, contribute, or report issues
            </p>
          </div>
          <div className="github-banner__controls">
            <button 
              className="github-banner__minimize"
              onClick={() => setIsMinimized(true)}
              title="Minimize"
            >
              −
            </button>
            {onClose && (
              <button 
                className="github-banner__close"
                onClick={onClose}
                title="Close"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="github-banner__actions">
          <div className="github-banner__buttons">
            <InteractiveButton
              variant="secondary"
              size="small"
              onClick={handleViewRepo}
              className="github-banner__action-btn"
              title="View repository"
            >
              📂 View Code
            </InteractiveButton>
            
            <InteractiveButton
              variant="secondary"
              size="small"
              onClick={handleStar}
              className="github-banner__action-btn"
              title="Star this repository"
            >
              ⭐ Star
            </InteractiveButton>
            
            <InteractiveButton
              variant="secondary"
              size="small"
              onClick={handleFork}
              className="github-banner__action-btn"
              title="Fork this repository"
            >
              🍴 Fork
            </InteractiveButton>
            
            <InteractiveButton
              variant="secondary"
              size="small"
              onClick={handleIssues}
              className="github-banner__action-btn"
              title="Report issues or request features"
            >
              🐛 Issues
            </InteractiveButton>
          </div>
        </div>

        <div className="github-banner__footer">
          <span className="github-banner__info">🔓 MIT License</span>
          <span className="github-banner__optional">• Contributions welcome • Free & Open Source</span>
        </div>
      </div>
    </div>
  );
};

export default GitHubBanner;