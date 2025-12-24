import { useState } from 'react'
import MainPage from './components/MainPage'
import TrackView from './components/TrackView'
import OrientationPrompt from './components/OrientationPrompt'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AudioErrorBoundary } from './components/AudioErrorBoundary'
import ToastContainer from './components/ToastContainer'
import { useToast } from './hooks/useToast'
import { type Track } from './services/AudioPlayer'
import './App.css'

interface AppState {
  currentView: 'main' | 'tracks';
  tracks: Track[];
  bpm?: number;
  title?: string;
}

function App() {
  const [appState, setAppState] = useState<AppState>({
    currentView: 'main',
    tracks: [],
    bpm: undefined,
    title: undefined
  });

  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast();

  const handleProcessingComplete = (tracks: Track[], bpm?: number, title?: string) => {
    setAppState({
      currentView: 'tracks',
      tracks,
      bpm,
      title
    });
    
    // Show success toast with BPM info
    const bpmInfo = bpm ? 
      ` • ${bpm} BPM detected (${bpm < 60 ? 'Very Slow' : bpm < 90 ? 'Slow' : bpm < 120 ? 'Moderate' : bpm < 140 ? 'Fast' : 'Very Fast'})` : 
      ' • BPM detection unavailable';
    
    showSuccess(
      'Processing Complete!', 
      `Successfully separated ${tracks.length} tracks${bpmInfo}`
    );
  };

  const handleBackToMain = () => {
    setAppState({
      currentView: 'main',
      tracks: [],
      bpm: undefined,
      title: undefined
    });
    
    // Show info toast
    showInfo('Returned to Main Page', 'Ready to process a new track');
  };

  if (appState.currentView === 'tracks') {
    return (
      <OrientationPrompt>
        <ErrorBoundary>
          <AudioErrorBoundary 
            onReset={handleBackToMain}
            onRetry={() => {
              // Clear tracks and retry loading
              setAppState(prev => ({ ...prev, tracks: [] }));
              showInfo('Retrying...', 'Attempting to reload audio tracks');
            }}
          >
            <TrackView
              tracks={appState.tracks}
              bpm={appState.bpm}
              title={appState.title}
              onBack={handleBackToMain}
              onShowToast={{ showSuccess, showError, showInfo }}
            />
          </AudioErrorBoundary>
          <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
        </ErrorBoundary>
      </OrientationPrompt>
    );
  }

  return (
    <OrientationPrompt>
      <ErrorBoundary>
        <MainPage 
          onProcessingComplete={handleProcessingComplete}
          onShowToast={{ showSuccess, showError, showInfo }}
        />
        <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      </ErrorBoundary>
    </OrientationPrompt>
  );
}

export default App
