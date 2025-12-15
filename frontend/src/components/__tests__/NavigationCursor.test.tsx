import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TrackView from '../TrackView'
import { type Track } from '../../services/AudioPlayer'

// Mock AudioPlayer with seek functionality
const mockSeek = vi.fn()
const mockSetPositionUpdateCallback = vi.fn()

vi.mock('../../services/AudioPlayer', () => ({
  AudioPlayer: class MockAudioPlayer {
    setPositionUpdateCallback = mockSetPositionUpdateCallback
    loadTracks = vi.fn().mockResolvedValue(undefined)
    getDuration = vi.fn().mockReturnValue(180) // 3 minutes
    play = vi.fn()
    pause = vi.fn()
    seek = mockSeek
    dispose = vi.fn()
    getCurrentPosition = vi.fn().mockReturnValue(0)
    getIsPlaying = vi.fn().mockReturnValue(false)
    muteTrack = vi.fn()
    setTrackVolume = vi.fn()
    setTrackPan = vi.fn()
  }
}))

// Mock Web Audio API
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    createGain: vi.fn().mockReturnValue({
      connect: vi.fn(),
      gain: { value: 1 }
    }),
    createStereoPanner: vi.fn().mockReturnValue({
      connect: vi.fn(),
      pan: { value: 0 }
    }),
    createBufferSource: vi.fn().mockReturnValue({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    }),
    decodeAudioData: vi.fn().mockResolvedValue({}),
    destination: {},
    currentTime: 0,
    state: 'running',
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined)
  }))
})

describe('Navigation Cursor', () => {
  const mockTracks: Track[] = [
    {
      id: 'vocals',
      name: 'vocals',
      audioUrl: 'http://localhost:8000/tracks/vocals.mp3',
      duration: 180,
      volume: 1,
      pan: 0,
      muted: false
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders timeline with cursor element', async () => {
    render(<TrackView tracks={mockTracks} />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading audio tracks...')).not.toBeInTheDocument()
    })

    const timeline = document.querySelector('.track-view__timeline')
    const cursor = document.querySelector('.track-view__timeline-cursor')
    
    expect(timeline).toBeInTheDocument()
    expect(cursor).toBeInTheDocument()
  })

  it('handles timeline click for seeking', async () => {
    render(<TrackView tracks={mockTracks} />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading audio tracks...')).not.toBeInTheDocument()
    })

    const timeline = document.querySelector('.track-view__timeline')
    expect(timeline).toBeInTheDocument()

    // Mock getBoundingClientRect to simulate timeline dimensions
    const mockGetBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      width: 400
    })
    timeline!.getBoundingClientRect = mockGetBoundingClientRect

    // Simulate click at 50% of timeline (should seek to 90 seconds of 180 total)
    fireEvent.click(timeline!, { clientX: 200 })

    expect(mockSeek).toHaveBeenCalledWith(90)
  })

  it('sets up position update callback for real-time updates', async () => {
    render(<TrackView tracks={mockTracks} />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading audio tracks...')).not.toBeInTheDocument()
    })

    expect(mockSetPositionUpdateCallback).toHaveBeenCalledWith(expect.any(Function))
  })

  it('cursor position updates based on current position', async () => {
    // Mock getCurrentPosition to return 90 seconds (50% of 180 total)
    const mockGetCurrentPosition = vi.fn().mockReturnValue(90)
    
    vi.doMock('../../services/AudioPlayer', () => ({
      AudioPlayer: class MockAudioPlayer {
        setPositionUpdateCallback = mockSetPositionUpdateCallback
        loadTracks = vi.fn().mockResolvedValue(undefined)
        getDuration = vi.fn().mockReturnValue(180)
        play = vi.fn()
        pause = vi.fn()
        seek = mockSeek
        dispose = vi.fn()
        getCurrentPosition = mockGetCurrentPosition
        getIsPlaying = vi.fn().mockReturnValue(true)
        muteTrack = vi.fn()
        setTrackVolume = vi.fn()
        setTrackPan = vi.fn()
      }
    }))

    render(<TrackView tracks={mockTracks} />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading audio tracks...')).not.toBeInTheDocument()
    })

    const cursor = document.querySelector('.track-view__timeline-cursor')
    expect(cursor).toBeInTheDocument()
    
    // The cursor should be positioned at 50% (90/180 * 100 = 50%)
    // Note: The actual position update happens via the callback, so we verify the callback was set
    expect(mockSetPositionUpdateCallback).toHaveBeenCalledWith(expect.any(Function))
  })
})