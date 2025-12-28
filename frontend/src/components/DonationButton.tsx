import React, { useState } from 'react';
import './DonationButton.css';

interface DonationButtonProps {
  className?: string;
}

const DonationButton: React.FC<DonationButtonProps> = ({ className }) => {
  const [isLoading, setIsLoading] = useState(false);

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

  const handleQuickDonate = () => {
    // Default to $5 donation for quick action
    handleDonate(5);
  };

  return (
    <div className={`donation-button ${className || ''}`}>
      <button 
        className="donation-button__btn"
        onClick={handleQuickDonate}
        disabled={isLoading}
        title="Support this project"
      >
        💝 Support
      </button>
    </div>
  );
};

export default DonationButton;