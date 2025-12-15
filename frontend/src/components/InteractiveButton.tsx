import React, { useState, useRef, useEffect } from 'react';
import './InteractiveButton.css';

interface InteractiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  loadingText?: string;
  ripple?: boolean;
  children: React.ReactNode;
}

const InteractiveButton: React.FC<InteractiveButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  loading = false,
  loadingText,
  ripple = true,
  className = '',
  onClick,
  disabled,
  children,
  ...props
}) => {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleIdRef = useRef(0);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) return;

    // Create ripple effect
    if (ripple && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const id = ++rippleIdRef.current;

      setRipples(prev => [...prev, { id, x, y }]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
      }, 600);
    }

    // Call original onClick
    if (onClick) {
      onClick(event);
    }
  };

  // Clean up ripples on unmount
  useEffect(() => {
    return () => {
      setRipples([]);
    };
  }, []);

  const isDisabled = disabled || loading;

  return (
    <button
      ref={buttonRef}
      className={`
        interactive-button 
        interactive-button--${variant} 
        interactive-button--${size}
        ${loading ? 'interactive-button--loading' : ''}
        ${isDisabled ? 'interactive-button--disabled' : ''}
        ${className}
      `.trim()}
      onClick={handleClick}
      disabled={isDisabled}
      {...props}
    >
      <span className="interactive-button__content">
        {loading && (
          <span className="interactive-button__spinner">
            <div className="interactive-button__spinner-dot"></div>
            <div className="interactive-button__spinner-dot"></div>
            <div className="interactive-button__spinner-dot"></div>
          </span>
        )}
        <span className={`interactive-button__text ${loading ? 'interactive-button__text--loading' : ''}`}>
          {loading && loadingText ? loadingText : children}
        </span>
      </span>

      {/* Ripple effects */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="interactive-button__ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
        />
      ))}
    </button>
  );
};

export default InteractiveButton;