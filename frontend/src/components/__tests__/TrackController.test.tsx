import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TrackController from '../TrackController'
import { Track } from '../../services/AudioPlayer'

describe('TrackController', () => {
  const mockTrack: Track = {
    id: 'vocals',
    name: 'vocals',
    audioUrl: 'http://localhost:8000/tracks/vocals.mp3',
    duration: 180,
    volume: 1,
    pan: 0,
    muted: false
  }

  const mockCallbacks = {
    onMuteToggle: vi.fn(),
    onVolumeChange: vi.fn(),
    onPanChange: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders track information correctly', () => {
    render(<TrackController track={mockTrack} {...mockCallbacks} />)
    
    expect(screen.getByText('Vocals')).toBeInTheDocument() // Capitalized
    expect(screen.getByText('3:00')).toBeInTheDocument() // Duration formatted
  })

  it('displays mute button with correct initial state', () => {
    render(<TrackController track={mockTrack} {...mockCallbacks} />)
    
    const muteButton = document.querySelector('.track-controller__mute-button')
    expect(muteButton).toBeInTheDocument()
    expect(muteButton).toHaveTextContent('🔊') // Unmuted icon
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('displays muted state correctly', () => {
    const mutedTrack = { ...mockTrack, muted: true }
    render(<TrackController track={mutedTrack} {...mockCallbacks} />)
    
    const muteButton = document.querySelector('.track-controller__mute-button')
    expect(muteButton).toHaveTextContent('🔇') // Muted icon
    expect(screen.getByText('Muted')).toBeInTheDocument()
  })

  it('calls onMuteToggle when mute button is clicked', async () => {
    const user = userEvent.setup()
    render(<TrackController track={mockTrack} {...mockCallbacks} />)
    
    const muteButton = document.querySelector('.track-controller__mute-button')
    await user.click(muteButton!)
    
    expect(mockCallbacks.onMuteToggle).toHaveBeenCalledWith('vocals', true)
  })

  it('displays volume slider with correct initial value', () => {
    render(<TrackController track={mockTrack} {...mockCallbacks} />)
    
    const volumeSlider = screen.getByDisplayValue('1') // Volume slider
    expect(volumeSlider).toBeInTheDocument()
    expect(volumeSlider).toHaveAttribute('min', '0')
    expect(volumeSlider).toHaveAttribute('max', '1')
    expect(screen.getByText('100%')).toBeInTheDocument() // Volume percentage
  })

  it('calls onVolumeChange when volume slider is moved', async () => {
    render(<TrackController track={mockTrack} {...mockCallbacks} />)
    
    const volumeSlider = screen.getByDisplayValue('1')
    fireEvent.change(volumeSlider, { target: { value: '0.5' } })
    
    expect(mockCallbacks.onVolumeChange).toHaveBeenCalledWith('vocals', 0.5)
  })

  it('displays pan slider with correct initial value', () => {
    render(<TrackController track={mockTrack} {...mockCallbacks} />)
    
    const panSlider = screen.getByDisplayValue('0') // Pan slider
    expect(panSlider).toBeInTheDocument()
    expect(panSlider).toHaveAttribute('min', '-1')
    expect(panSlider).toHaveAttribute('max', '1')
    expect(screen.getByText('Center')).toBeInTheDocument() // Pan position
  })

  it('calls onPanChange when pan slider is moved', async () => {
    render(<TrackController track={mockTrack} {...mockCallbacks} />)
    
    const panSlider = screen.getByDisplayValue('0')
    fireEvent.change(panSlider, { target: { value: '-0.5' } })
    
    expect(mockCallbacks.onPanChange).toHaveBeenCalledWith('vocals', -0.5)
  })

  it('formats pan position correctly', () => {
    const leftPanTrack = { ...mockTrack, pan: -0.75 }
    render(<TrackController track={leftPanTrack} {...mockCallbacks} />)
    
    expect(screen.getByText('L75')).toBeInTheDocument()
  })

  it('formats pan position correctly for right pan', () => {
    const rightPanTrack = { ...mockTrack, pan: 0.5 }
    render(<TrackController track={rightPanTrack} {...mockCallbacks} />)
    
    expect(screen.getByText('R50')).toBeInTheDocument()
  })

  it('disables volume slider when track is muted', () => {
    const mutedTrack = { ...mockTrack, muted: true }
    render(<TrackController track={mutedTrack} {...mockCallbacks} />)
    
    const volumeSlider = screen.getByDisplayValue('1')
    expect(volumeSlider).toBeDisabled()
  })

  it('displays activity indicator with correct width based on volume', () => {
    const halfVolumeTrack = { ...mockTrack, volume: 0.5 }
    render(<TrackController track={halfVolumeTrack} {...mockCallbacks} />)
    
    const activityBar = document.querySelector('.track-controller__activity-bar')
    expect(activityBar).toHaveStyle({ width: '50%' })
  })

  it('shows inactive activity indicator when muted', () => {
    const mutedTrack = { ...mockTrack, muted: true }
    render(<TrackController track={mutedTrack} {...mockCallbacks} />)
    
    const activityIndicator = document.querySelector('.track-controller__activity-indicator')
    expect(activityIndicator).not.toHaveClass('track-controller__activity-indicator--active')
  })
})