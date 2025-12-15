/**
 * Test file to verify the user feedback improvements
 * This file can be used to manually test the new components
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import LoadingSpinner from './components/LoadingSpinner';
import InteractiveButton from './components/InteractiveButton';
import { useToast } from './hooks/useToast';
import ToastContainer from './components/ToastContainer';

const TestFeedbackComponents: React.FC = () => {
  const { toasts, removeToast, showSuccess, showError, showWarning, showInfo } = useToast();

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
      <h1>User Feedback Components Test</h1>
      
      <section style={{ marginBottom: '40px' }}>
        <h2>Loading Spinners</h2>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
          <LoadingSpinner size="small" variant="primary" message="Small spinner" />
          <LoadingSpinner size="medium" variant="secondary" message="Medium spinner" />
          <LoadingSpinner size="large" variant="accent" message="Large spinner" />
        </div>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <LoadingSpinner size="medium" variant="primary" progress={25} message="25% complete" />
          <LoadingSpinner size="medium" variant="accent" progress={75} message="75% complete" />
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Interactive Buttons</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <InteractiveButton variant="primary" size="small">Primary Small</InteractiveButton>
          <InteractiveButton variant="secondary" size="medium">Secondary Medium</InteractiveButton>
          <InteractiveButton variant="success" size="large">Success Large</InteractiveButton>
          <InteractiveButton variant="danger">Danger</InteractiveButton>
          <InteractiveButton variant="warning">Warning</InteractiveButton>
          <InteractiveButton variant="info">Info</InteractiveButton>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <InteractiveButton variant="primary" loading loadingText="Processing...">
            Loading Button
          </InteractiveButton>
          <InteractiveButton variant="secondary" disabled>
            Disabled Button
          </InteractiveButton>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Toast Notifications</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <InteractiveButton 
            variant="success" 
            onClick={() => showSuccess('Success!', 'Operation completed successfully')}
          >
            Show Success
          </InteractiveButton>
          <InteractiveButton 
            variant="danger" 
            onClick={() => showError('Error!', 'Something went wrong')}
          >
            Show Error
          </InteractiveButton>
          <InteractiveButton 
            variant="warning" 
            onClick={() => showWarning('Warning!', 'Please check your input')}
          >
            Show Warning
          </InteractiveButton>
          <InteractiveButton 
            variant="info" 
            onClick={() => showInfo('Info', 'Here is some information')}
          >
            Show Info
          </InteractiveButton>
        </div>
      </section>

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

// Only render if this file is being run directly
if (import.meta.url.includes('test-feedback-improvements')) {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<TestFeedbackComponents />);
  }
}