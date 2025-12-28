import React from 'react';
import './GitHubBanner.css';

interface GitHubBannerProps {
  className?: string;
  repoUrl: string; // Make it required, no default
}

const GitHubBanner: React.FC<GitHubBannerProps> = ({ 
  className, 
  repoUrl
}) => {
  const handleViewRepo = () => {
    window.open(repoUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`github-banner ${className || ''}`}>
      <button 
        className="github-banner__button"
        onClick={handleViewRepo}
        title="View source code on GitHub"
      >
        ⭐ GitHub
      </button>
    </div>
  );
};

export default GitHubBanner;