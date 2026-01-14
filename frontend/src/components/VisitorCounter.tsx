import React, { useState, useEffect } from 'react';
import './VisitorCounter.css';

interface VisitorCounterProps {
  className?: string;
}

const VisitorCounter: React.FC<VisitorCounterProps> = ({ className }) => {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    // Non-blocking async fetch on mount
    const fetchVisitorCount = async () => {
      try {
        const response = await fetch('/api/visitor-count');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setCount(data.count);
      } catch (err) {
        console.error('Failed to fetch visitor count:', err);
        setError(true);
      }
    };

    fetchVisitorCount();
  }, []); // Empty dependency array - fetch only on mount

  // Graceful fallback: hide component on error
  if (error) {
    return null;
  }

  // Format count as 6-digit string with leading zeros
  const formatCount = (num: number): string => {
    return num.toString().padStart(6, '0');
  };

  // Show loading state while fetching (non-blocking)
  const displayCount = count !== null ? formatCount(count) : '------';
  const digits = displayCount.split('');

  return (
    <div className={`visitor-counter ${className || ''}`}>
      <div className="visitor-counter__label">
        You are visitor number:
      </div>
      <div className="visitor-counter__display">
        {digits.map((digit, index) => (
          <span key={index} className="visitor-counter__digit">
            {digit}
          </span>
        ))}
      </div>
    </div>
  );
};

export default VisitorCounter;
