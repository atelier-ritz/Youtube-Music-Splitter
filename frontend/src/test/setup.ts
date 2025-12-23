import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Web Audio API for tests
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    state: 'suspended',
    currentTime: 0,
    sampleRate: 44100,
    destination: { maxChannelCount: 2, channelCount: 2 },
    createGain: vi.fn(() => ({
      gain: { value: 1 },
      connect: vi.fn(),
      disconnect: vi.fn()
    })),
    createStereoPanner: vi.fn(() => ({
      pan: { value: 0 },
      connect: vi.fn(),
      disconnect: vi.fn()
    })),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      start: vi.fn(),
      stop: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      onended: null
    })),
    decodeAudioData: vi.fn(),
    resume: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn()
  }))
})

Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: window.AudioContext
})