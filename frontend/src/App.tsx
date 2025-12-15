import { useState } from 'react'
import MainPage from './components/MainPage'
import TrackView from './components/TrackView'
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

  const handleProcessingComplete = (tracks: Track[], bpm?: number, title?: string) => {
    setAppState({
      currentView: 'tracks',
      tracks,
      bpm,
      title
    });
  };

  const handleBackToMain = () => {
    setAppState({
      currentView: 'main',
      tracks: [],
      bpm: undefined,
      title: undefined
    });
  };

  if (appState.currentView === 'tracks') {
    return (
      <TrackView
        tracks={appState.tracks}
        bpm={appState.bpm}
        title={appState.title}
        onBack={handleBackToMain}
      />
    );
  }

  return (
    <MainPage onProcessingComplete={handleProcessingComplete} />
  );
}

export default App
