/**
 * Simple test component to verify error boundaries work
 * This file can be deleted after testing
 */
import React, { useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AudioErrorBoundary } from './components/AudioErrorBoundary';

const ErrorTestComponent: React.FC = () => {
  const [shouldThrow, setShouldThrow] = useState(false);
  const [errorType, setErrorType] = useState<'general' | 'audio'>('general');

  if (shouldThrow) {
    if (errorType === 'audio') {
      throw new Error('AudioContext initialization failed: Web Audio API not supported');
    } else {
      throw new Error('Test error for error boundary');
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Error Handling Test</h2>
      <div style={{ marginBottom: '20px' }}>
        <label>
          <input
            type="radio"
            name="errorType"
            value="general"
            checked={errorType === 'general'}
            onChange={(e) => setErrorType(e.target.value as 'general')}
          />
          General Error
        </label>
        <label style={{ marginLeft: '20px' }}>
          <input
            type="radio"
            name="errorType"
            value="audio"
            checked={errorType === 'audio'}
            onChange={(e) => setErrorType(e.target.value as 'audio')}
          />
          Audio Error
        </label>
      </div>
      <button
        onClick={() => setShouldThrow(true)}
        style={{
          padding: '10px 20px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Trigger {errorType} Error
      </button>
    </div>
  );
};

const ErrorHandlingTest: React.FC = () => {
  return (
    <div>
      <h1>Error Boundary Testing</h1>
      
      <div style={{ marginBottom: '40px' }}>
        <h3>General Error Boundary Test</h3>
        <ErrorBoundary>
          <ErrorTestComponent />
        </ErrorBoundary>
      </div>
      
      <div>
        <h3>Audio Error Boundary Test</h3>
        <AudioErrorBoundary>
          <ErrorTestComponent />
        </AudioErrorBoundary>
      </div>
    </div>
  );
};

export default ErrorHandlingTest;