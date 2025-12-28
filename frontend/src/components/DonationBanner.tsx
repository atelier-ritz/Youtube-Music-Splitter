import React, { useState } from 'react';
import InteractiveButton from './InteractiveButton';
import './DonationBanner.css';

interface DonationBannerProps {
  onClose?: () => void;
  className?: string;
  onExpandedChange?: (isExpanded: boolean) => void;
}

const DonationBanner: React.FC<DonationBannerProps> = ({ onClose, className, onExpandedChange }) => {
  const [isMinimized, setIsMinimized] = useState(true); // Start collapsed by default
  const [isLoading, setIsLoading] = useState(false);

  // Updated donation amounts
  const donationAmounts = [
    { amount: 1, label: '$1', description: 'Every bit helps! ☕' },
    { amount: 3, label: '$3', description: 'Buy me a coffee ☕' },
    { amount: 5, label: '$5', description: 'Support development 🚀' },
    { amount: 10, label: '$10', description: 'Sponsor a feature ⭐' }
  ];

  const handleDonate = async (amount: number) => {
    setIsLoading(true);
    
    try {
      // Call your backend to create a Stripe checkout session
      const response = await fetch('/api/donate/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount * 100, // Convert to cents
          currency: 'usd',
          successUrl: `${window.location.origin}?donation=success`,
          cancelUrl: `${window.location.origin}?donation=cancelled`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
      
    } catch (error) {
      console.error('Donation error:', error);
      alert('Sorry, there was an error processing your donation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomAmount = () => {
    const customAmount = prompt('Enter a custom donation amount (USD):');
    if (customAmount && !isNaN(Number(customAmount)) && Number(customAmount) > 0) {
      handleDonate(Number(customAmount));
    }
  };

  if (isMinimized) {
    return (
      <div className={`donation-banner donation-banner--minimized ${className || ''}`}>
        <button 
          className="donation-banner__expand"
          onClick={() => {
            setIsMinimized(false);
            onExpandedChange?.(true);
          }}
          title="Support this project"
        >
          💝 Support
        </button>
      </div>
    );
  }

  return (
    <div className={`donation-banner ${className || ''}`}>
      <div className="donation-banner__content">
        <div className="donation-banner__header">
          <div className="donation-banner__icon">💝</div>
          <div className="donation-banner__text">
            <h3 className="donation-banner__title">Enjoying Band Practice Partner?</h3>
            <p className="donation-banner__subtitle">
              Help keep this tool free and support future development
            </p>
          </div>
          <div className="donation-banner__controls">
            <button 
              className="donation-banner__minimize"
              onClick={() => {
                setIsMinimized(true);
                onExpandedChange?.(false);
              }}
              title="Minimize"
            >
              −
            </button>
            {onClose && (
              <button 
                className="donation-banner__close"
                onClick={onClose}
                title="Close"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="donation-banner__actions">
          <div className="donation-banner__amounts">
            {donationAmounts.map(({ amount, label, description }) => (
              <InteractiveButton
                key={amount}
                variant="secondary"
                size="small"
                onClick={() => handleDonate(amount)}
                disabled={isLoading}
                className="donation-banner__amount-btn"
                title={description}
              >
                {label}
              </InteractiveButton>
            ))}
          </div>
          
          <div className="donation-banner__custom">
            <InteractiveButton
              variant="secondary"
              size="small"
              onClick={handleCustomAmount}
              disabled={isLoading}
              className="donation-banner__custom-btn"
            >
              Custom Amount
            </InteractiveButton>
          </div>
        </div>

        <div className="donation-banner__footer">
          <span className="donation-banner__secure">🔒 Secure payment via Stripe</span>
          <span className="donation-banner__optional">• 100% optional • No account required</span>
        </div>
      </div>
    </div>
  );
};

export default DonationBanner;