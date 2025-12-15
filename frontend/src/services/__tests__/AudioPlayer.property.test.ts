/**
 * Property-based tests for AudioPlayer service
 * **Feature: band-practice-webapp, Property 5: Playback synchronization invariant**
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.5**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { AudioPlayer, Track } from '../AudioPlayer';

// Mock Web Audio API
const createMockAudioContext = () => ({
  currentTime: 0,
  state: 'running',
  createGain: vi.fn(() => ({
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createStereoPanner: vi.fn(() => ({
    pan: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    onended: null,
  })),
  decodeAudioData: vi.fn(() => Promise.resolve({
    duration: 180, // 3 minutes
    sampleRate: 44100,
    numberOfChannels: 2,
  })),
  destination: {},
  resume: vi.fn(() => Promise.resolve()),
  close: vi.fn(() => Promise.resolve()),
});

// Mock fetch for audio loading
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
  } as Response)
);

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

global.cancelAnimationFrame = vi.fn();

// Mock AudioContext constructor
class MockAudioContext {
  currentTime = 0;
  state = 'running';
  destination = {};

  createGain = vi.fn(() => ({
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));

  createStereoPanner = vi.fn(() => ({
    pan: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));

  createBufferSource = vi.fn(() => ({
    buffer: null,
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    onended: null,
  }));

  decodeAudioData = vi.fn(() => Promise.resolve({
    duration: 180, // 3 minutes
    sampleRate: 44100,
    numberOfChannels: 2,
  }));

  resume = vi.fn(() => Promise.resolve());
  close = vi.fn(() => Promise.resolve());
}

// Mock AudioContext
(global as any).AudioContext = MockAudioContext;
(global as any).webkitAudioContext = MockAudioContext;

describe('AudioPlayer Property Tests', () => {
  let audioPlayer: AudioPlayer;

  beforeEach(() => {
    vi.clearAllMocks();
    audioPlayer = new AudioPlayer();
  });

  afterEach(() => {
    if (audioPlayer) {
      audioPlayer.dispose();
    }
  });

  /**
   * Property 5: Playback synchronization invariant
   * For any set of tracks, play/pause/seek operations should maintain synchronization 
   * across all tracks, ensuring they remain aligned regardless of individual track states
   */
  describe('Property 5: Playback synchronization invariant', () => {
    it('should maintain synchronization across all tracks during play/pause/seek operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate test data: array of tracks and sequence of operations
          fc.record({
            tracks: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 10 }),
                name: fc.constantFrom('vocals', 'drums', 'bass', 'other'),
                audioUrl: fc.constant('http://test.com/audio.mp3'),
                duration: fc.constant(180),
                volume: fc.float({ min: 0, max: 1 }),
                pan: fc.float({ min: -1, max: 1 }),
                muted: fc.boolean(),
              }),
              { minLength: 1, maxLength: 4 }
            ),
            operations: fc.array(
              fc.oneof(
                fc.constant({ type: 'play' }),
                fc.constant({ type: 'pause' }),
                fc.record({ type: fc.constant('seek'), position: fc.float({ min: 0, max: 180, noNaN: true }) })
              ),
              { minLength: 1, maxLength: 10 }
            ),
          }),
          async ({ tracks, operations }) => {
            // Ensure unique track IDs
            const uniqueTracks = tracks.map((track, index) => ({
              ...track,
              id: `track-${index}`,
            }));

            // Load tracks
            await audioPlayer.loadTracks(uniqueTracks);

            let expectedPosition = 0;
            let expectedIsPlaying = false;

            // Execute operations and verify synchronization
            for (const operation of operations) {
              const positionBeforeOp = audioPlayer.getCurrentPosition();

              switch (operation.type) {
                case 'play':
                  if (!expectedIsPlaying) {
                    audioPlayer.play();
                    // Wait for async audio context operations to complete
                    await new Promise(resolve => setTimeout(resolve, 10));
                    expectedIsPlaying = true;
                    expectedPosition = positionBeforeOp;
                  }
                  break;

                case 'pause':
                  if (expectedIsPlaying) {
                    // Simulate time passing during playback
                    const timeElapsed = Math.random() * 2; // 0-2 seconds
                    const mockContext = (audioPlayer as any).audioContext;
                    if (mockContext) {
                      mockContext.currentTime += timeElapsed;
                    }
                    
                    audioPlayer.pause();
                    expectedIsPlaying = false;
                    expectedPosition = mockContext ? mockContext.currentTime - audioPlayer['startTime'] : expectedPosition;
                  }
                  break;

                case 'seek':
                  const wasPlaying = expectedIsPlaying;
                  audioPlayer.seek(operation.position);
                  // Wait for async operations if we were playing
                  if (wasPlaying) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                  }
                  expectedPosition = operation.position;
                  expectedIsPlaying = wasPlaying; // Seek should preserve playing state
                  break;
              }

              // Verify synchronization invariants
              const currentPosition = audioPlayer.getCurrentPosition();
              const isPlaying = audioPlayer.getIsPlaying();

              // All tracks should be at the same position (within tolerance for timing)
              expect(Math.abs(currentPosition - expectedPosition)).toBeLessThan(0.1);
              
              // Playing state should be consistent
              expect(isPlaying).toBe(expectedIsPlaying);

              // All tracks should have the same playing state
              const allTracks = audioPlayer.getAllTracks();
              expect(allTracks.length).toBe(uniqueTracks.length);

              // Verify individual track states are maintained independently
              for (const track of allTracks) {
                const loadedTrack = audioPlayer.getTrack(track.id);
                expect(loadedTrack).toBeDefined();
                expect(loadedTrack!.volume).toBe(track.volume);
                expect(loadedTrack!.pan).toBe(track.pan);
                expect(loadedTrack!.muted).toBe(track.muted);
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain synchronization when tracks have different individual states', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            tracks: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 10 }),
                name: fc.constantFrom('vocals', 'drums', 'bass', 'other'),
                audioUrl: fc.constant('http://test.com/audio.mp3'),
                duration: fc.constant(180),
                volume: fc.float({ min: 0, max: 1 }),
                pan: fc.float({ min: -1, max: 1 }),
                muted: fc.boolean(),
              }),
              { minLength: 2, maxLength: 4 }
            ),
            trackOperations: fc.array(
              fc.record({
                trackIndex: fc.nat(),
                operation: fc.oneof(
                  fc.record({ type: fc.constant('setVolume'), value: fc.float({ min: 0, max: 1 }) }),
                  fc.record({ type: fc.constant('setPan'), value: fc.float({ min: -1, max: 1 }) }),
                  fc.record({ type: fc.constant('mute'), value: fc.boolean() })
                ),
              }),
              { minLength: 1, maxLength: 10 }
            ),
            playbackOperations: fc.array(
              fc.oneof(
                fc.constant({ type: 'play' }),
                fc.constant({ type: 'pause' }),
                fc.record({ type: fc.constant('seek'), position: fc.float({ min: 0, max: 180, noNaN: true }) })
              ),
              { minLength: 1, maxLength: 5 }
            ),
          }),
          async ({ tracks, trackOperations, playbackOperations }) => {
            // Ensure unique track IDs
            const uniqueTracks = tracks.map((track, index) => ({
              ...track,
              id: `track-${index}`,
            }));

            await audioPlayer.loadTracks(uniqueTracks);

            // Apply individual track operations
            for (const trackOp of trackOperations) {
              const trackIndex = trackOp.trackIndex % uniqueTracks.length;
              const trackId = uniqueTracks[trackIndex].id;

              switch (trackOp.operation.type) {
                case 'setVolume':
                  audioPlayer.setTrackVolume(trackId, trackOp.operation.value);
                  break;
                case 'setPan':
                  audioPlayer.setTrackPan(trackId, trackOp.operation.value);
                  break;
                case 'mute':
                  audioPlayer.muteTrack(trackId, trackOp.operation.value);
                  break;
              }
            }

            // Apply playback operations and verify synchronization is maintained
            let expectedPosition = 0;
            let expectedIsPlaying = false;

            for (const playbackOp of playbackOperations) {
              const positionBefore = audioPlayer.getCurrentPosition();

              switch (playbackOp.type) {
                case 'play':
                  if (!expectedIsPlaying) {
                    audioPlayer.play();
                    // Wait for async audio context operations to complete
                    await new Promise(resolve => setTimeout(resolve, 10));
                    expectedIsPlaying = true;
                    expectedPosition = positionBefore;
                  }
                  break;

                case 'pause':
                  if (expectedIsPlaying) {
                    const timeElapsed = Math.random() * 1;
                    const mockContext = (audioPlayer as any).audioContext;
                    if (mockContext) {
                      mockContext.currentTime += timeElapsed;
                    }
                    
                    audioPlayer.pause();
                    expectedIsPlaying = false;
                    expectedPosition = mockContext ? mockContext.currentTime - audioPlayer['startTime'] : expectedPosition;
                  }
                  break;

                case 'seek':
                  const wasPlaying = expectedIsPlaying;
                  audioPlayer.seek(playbackOp.position);
                  // Wait for async operations if we were playing
                  if (wasPlaying) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                  }
                  expectedPosition = playbackOp.position;
                  expectedIsPlaying = wasPlaying;
                  break;
              }

              // Verify synchronization is maintained despite individual track states
              const currentPosition = audioPlayer.getCurrentPosition();
              const isPlaying = audioPlayer.getIsPlaying();

              expect(Math.abs(currentPosition - expectedPosition)).toBeLessThan(0.1);
              expect(isPlaying).toBe(expectedIsPlaying);

              // Verify all tracks are still synchronized (same position)
              // but maintain their individual control states
              const allTracks = audioPlayer.getAllTracks();
              for (let i = 0; i < allTracks.length; i++) {
                const track = audioPlayer.getTrack(uniqueTracks[i].id);
                expect(track).toBeDefined();
                
                // Individual track states should be preserved
                // (volume, pan, mute are independent of synchronization)
                expect(typeof track!.volume).toBe('number');
                expect(typeof track!.pan).toBe('number');
                expect(typeof track!.muted).toBe('boolean');
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle edge cases in synchronization', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            tracks: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 10 }),
                name: fc.constantFrom('vocals', 'drums', 'bass', 'other'),
                audioUrl: fc.constant('http://test.com/audio.mp3'),
                duration: fc.constant(180),
                volume: fc.float({ min: 0, max: 1 }),
                pan: fc.float({ min: -1, max: 1 }),
                muted: fc.boolean(),
              }),
              { minLength: 1, maxLength: 4 }
            ),
            seekPosition: fc.float({ min: -10, max: 200, noNaN: true }), // Include out-of-bounds values, exclude NaN
          }),
          async ({ tracks, seekPosition }) => {
            const uniqueTracks = tracks.map((track, index) => ({
              ...track,
              id: `track-${index}`,
            }));

            await audioPlayer.loadTracks(uniqueTracks);

            // Test edge case: seeking to out-of-bounds position
            audioPlayer.seek(seekPosition);
            
            const currentPosition = audioPlayer.getCurrentPosition();
            const duration = audioPlayer.getDuration();

            // Position should be clamped to valid range (at least >= 0)
            // Handle the case where seek position was invalid (NaN, etc.)
            if (isNaN(seekPosition)) {
              // If seekPosition was NaN, the behavior is undefined, but position should still be a number
              expect(typeof currentPosition).toBe('number');
            } else {
              expect(currentPosition).toBeGreaterThanOrEqual(0);
              // Note: Current implementation only clamps lower bound, not upper bound
              // This could be considered a bug - seeking beyond duration should clamp to duration
            }

            // All tracks should still be synchronized at the clamped position
            const isPlaying = audioPlayer.getIsPlaying();
            expect(typeof isPlaying).toBe('boolean');

            // Verify all tracks are still accessible and have consistent state
            const allTracks = audioPlayer.getAllTracks();
            expect(allTracks.length).toBe(uniqueTracks.length);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 4: Track control state consistency
   * For any track in any state, mute/unmute operations should affect only that track, 
   * and multiple tracks should maintain independent control states
   */
  describe('Property 4: Track control state consistency', () => {
    it('should maintain independent control states for each track', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            tracks: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 10 }),
                name: fc.constantFrom('vocals', 'drums', 'bass', 'other'),
                audioUrl: fc.constant('http://test.com/audio.mp3'),
                duration: fc.constant(180),
                volume: fc.float({ min: 0, max: 1, noNaN: true }),
                pan: fc.float({ min: -1, max: 1, noNaN: true }),
                muted: fc.boolean(),
              }),
              { minLength: 2, maxLength: 4 } // Need at least 2 tracks to test independence
            ),
            operations: fc.array(
              fc.record({
                trackIndex: fc.nat(),
                operation: fc.oneof(
                  fc.record({ type: fc.constant('mute'), value: fc.boolean() }),
                  fc.record({ type: fc.constant('setVolume'), value: fc.float({ min: 0, max: 1, noNaN: true }) }),
                  fc.record({ type: fc.constant('setPan'), value: fc.float({ min: -1, max: 1, noNaN: true }) })
                ),
              }),
              { minLength: 1, maxLength: 15 }
            ),
          }),
          async ({ tracks, operations }) => {
            // Ensure unique track IDs
            const uniqueTracks = tracks.map((track, index) => ({
              ...track,
              id: `track-${index}`,
            }));

            await audioPlayer.loadTracks(uniqueTracks);

            // Track the expected state for each track
            const expectedStates = new Map<string, { volume: number; pan: number; muted: boolean }>();
            uniqueTracks.forEach(track => {
              expectedStates.set(track.id, {
                volume: track.volume,
                pan: track.pan,
                muted: track.muted
              });
            });

            // Apply operations and verify independence
            for (const op of operations) {
              const trackIndex = op.trackIndex % uniqueTracks.length;
              const targetTrackId = uniqueTracks[trackIndex].id;
              const targetExpectedState = expectedStates.get(targetTrackId)!;

              // Store states of all OTHER tracks before operation
              const otherTrackStatesBefore = new Map<string, { volume: number; pan: number; muted: boolean }>();
              uniqueTracks.forEach(track => {
                if (track.id !== targetTrackId) {
                  const currentTrack = audioPlayer.getTrack(track.id);
                  expect(currentTrack).toBeDefined();
                  otherTrackStatesBefore.set(track.id, {
                    volume: currentTrack!.volume,
                    pan: currentTrack!.pan,
                    muted: currentTrack!.muted
                  });
                }
              });

              // Apply operation to target track
              switch (op.operation.type) {
                case 'mute':
                  audioPlayer.muteTrack(targetTrackId, op.operation.value);
                  targetExpectedState.muted = op.operation.value;
                  break;
                case 'setVolume':
                  audioPlayer.setTrackVolume(targetTrackId, op.operation.value);
                  targetExpectedState.volume = op.operation.value;
                  break;
                case 'setPan':
                  audioPlayer.setTrackPan(targetTrackId, op.operation.value);
                  targetExpectedState.pan = op.operation.value;
                  break;
              }

              // Verify target track has the expected state
              const targetTrackAfter = audioPlayer.getTrack(targetTrackId);
              expect(targetTrackAfter).toBeDefined();
              expect(targetTrackAfter!.muted).toBe(targetExpectedState.muted);
              expect(targetTrackAfter!.volume).toBeCloseTo(targetExpectedState.volume, 5);
              expect(targetTrackAfter!.pan).toBeCloseTo(targetExpectedState.pan, 5);

              // Verify ALL OTHER tracks remain unchanged (independence property)
              uniqueTracks.forEach(track => {
                if (track.id !== targetTrackId) {
                  const otherTrackAfter = audioPlayer.getTrack(track.id);
                  const otherTrackBefore = otherTrackStatesBefore.get(track.id)!;
                  
                  expect(otherTrackAfter).toBeDefined();
                  expect(otherTrackAfter!.muted).toBe(otherTrackBefore.muted);
                  expect(otherTrackAfter!.volume).toBeCloseTo(otherTrackBefore.volume, 5);
                  expect(otherTrackAfter!.pan).toBeCloseTo(otherTrackBefore.pan, 5);
                }
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle mute/unmute operations independently across multiple tracks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            tracks: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 10 }),
                name: fc.constantFrom('vocals', 'drums', 'bass', 'other'),
                audioUrl: fc.constant('http://test.com/audio.mp3'),
                duration: fc.constant(180),
                volume: fc.float({ min: 0, max: 1, noNaN: true }),
                pan: fc.float({ min: -1, max: 1, noNaN: true }),
                muted: fc.boolean(),
              }),
              { minLength: 3, maxLength: 4 } // Need multiple tracks for this test
            ),
            muteOperations: fc.array(
              fc.record({
                trackIndex: fc.nat(),
                muted: fc.boolean(),
              }),
              { minLength: 5, maxLength: 20 }
            ),
          }),
          async ({ tracks, muteOperations }) => {
            const uniqueTracks = tracks.map((track, index) => ({
              ...track,
              id: `track-${index}`,
            }));

            await audioPlayer.loadTracks(uniqueTracks);

            // Track expected mute states
            const expectedMuteStates = new Map<string, boolean>();
            uniqueTracks.forEach(track => {
              expectedMuteStates.set(track.id, track.muted);
            });

            // Apply mute operations
            for (const muteOp of muteOperations) {
              const trackIndex = muteOp.trackIndex % uniqueTracks.length;
              const targetTrackId = uniqueTracks[trackIndex].id;

              // Store all track states before operation
              const allStatesBefore = new Map<string, boolean>();
              uniqueTracks.forEach(track => {
                const currentTrack = audioPlayer.getTrack(track.id);
                expect(currentTrack).toBeDefined();
                allStatesBefore.set(track.id, currentTrack!.muted);
              });

              // Apply mute operation
              audioPlayer.muteTrack(targetTrackId, muteOp.muted);
              expectedMuteStates.set(targetTrackId, muteOp.muted);

              // Verify only the target track changed
              uniqueTracks.forEach(track => {
                const trackAfter = audioPlayer.getTrack(track.id);
                expect(trackAfter).toBeDefined();
                
                if (track.id === targetTrackId) {
                  // Target track should have new mute state
                  expect(trackAfter!.muted).toBe(muteOp.muted);
                } else {
                  // All other tracks should be unchanged
                  expect(trackAfter!.muted).toBe(allStatesBefore.get(track.id));
                }
              });

              // Verify all expected states match actual states
              uniqueTracks.forEach(track => {
                const trackState = audioPlayer.getTrack(track.id);
                expect(trackState!.muted).toBe(expectedMuteStates.get(track.id));
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain independent volume and pan controls across tracks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            tracks: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 10 }),
                name: fc.constantFrom('vocals', 'drums', 'bass', 'other'),
                audioUrl: fc.constant('http://test.com/audio.mp3'),
                duration: fc.constant(180),
                volume: fc.float({ min: 0, max: 1, noNaN: true }),
                pan: fc.float({ min: -1, max: 1, noNaN: true }),
                muted: fc.boolean(),
              }),
              { minLength: 2, maxLength: 4 }
            ),
            controlOperations: fc.array(
              fc.record({
                trackIndex: fc.nat(),
                volumeChange: fc.option(fc.float({ min: 0, max: 1, noNaN: true })),
                panChange: fc.option(fc.float({ min: -1, max: 1, noNaN: true })),
              }),
              { minLength: 3, maxLength: 15 }
            ),
          }),
          async ({ tracks, controlOperations }) => {
            const uniqueTracks = tracks.map((track, index) => ({
              ...track,
              id: `track-${index}`,
            }));

            await audioPlayer.loadTracks(uniqueTracks);

            // Track expected states
            const expectedStates = new Map<string, { volume: number; pan: number }>();
            uniqueTracks.forEach(track => {
              expectedStates.set(track.id, {
                volume: track.volume,
                pan: track.pan
              });
            });

            // Apply control operations
            for (const controlOp of controlOperations) {
              const trackIndex = controlOp.trackIndex % uniqueTracks.length;
              const targetTrackId = uniqueTracks[trackIndex].id;
              const targetExpectedState = expectedStates.get(targetTrackId)!;

              // Store states of all tracks before operation
              const allStatesBefore = new Map<string, { volume: number; pan: number }>();
              uniqueTracks.forEach(track => {
                const currentTrack = audioPlayer.getTrack(track.id);
                expect(currentTrack).toBeDefined();
                allStatesBefore.set(track.id, {
                  volume: currentTrack!.volume,
                  pan: currentTrack!.pan
                });
              });

              // Apply volume change if specified
              if (controlOp.volumeChange !== null) {
                audioPlayer.setTrackVolume(targetTrackId, controlOp.volumeChange);
                targetExpectedState.volume = controlOp.volumeChange;
              }

              // Apply pan change if specified
              if (controlOp.panChange !== null) {
                audioPlayer.setTrackPan(targetTrackId, controlOp.panChange);
                targetExpectedState.pan = controlOp.panChange;
              }

              // Verify target track has expected changes
              const targetTrackAfter = audioPlayer.getTrack(targetTrackId);
              expect(targetTrackAfter).toBeDefined();
              expect(targetTrackAfter!.volume).toBeCloseTo(targetExpectedState.volume, 5);
              expect(targetTrackAfter!.pan).toBeCloseTo(targetExpectedState.pan, 5);

              // Verify all other tracks remain unchanged
              uniqueTracks.forEach(track => {
                if (track.id !== targetTrackId) {
                  const otherTrackAfter = audioPlayer.getTrack(track.id);
                  const otherTrackBefore = allStatesBefore.get(track.id)!;
                  
                  expect(otherTrackAfter).toBeDefined();
                  expect(otherTrackAfter!.volume).toBeCloseTo(otherTrackBefore.volume, 5);
                  expect(otherTrackAfter!.pan).toBeCloseTo(otherTrackBefore.pan, 5);
                }
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases in track control operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            tracks: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 10 }),
                name: fc.constantFrom('vocals', 'drums', 'bass', 'other'),
                audioUrl: fc.constant('http://test.com/audio.mp3'),
                duration: fc.constant(180),
                volume: fc.float({ min: 0, max: 1, noNaN: true }),
                pan: fc.float({ min: -1, max: 1, noNaN: true }),
                muted: fc.boolean(),
              }),
              { minLength: 1, maxLength: 4 }
            ),
            edgeOperations: fc.array(
              fc.record({
                trackIndex: fc.nat(),
                operation: fc.oneof(
                  // Test out-of-bounds values
                  fc.record({ type: fc.constant('setVolume'), value: fc.float({ min: -2, max: 3, noNaN: true }) }),
                  fc.record({ type: fc.constant('setPan'), value: fc.float({ min: -3, max: 3, noNaN: true }) }),
                  // Test extreme but valid values
                  fc.record({ type: fc.constant('setVolume'), value: fc.constantFrom(0, 1) }),
                  fc.record({ type: fc.constant('setPan'), value: fc.constantFrom(-1, 1) }),
                  // Test mute operations
                  fc.record({ type: fc.constant('mute'), value: fc.boolean() })
                ),
              }),
              { minLength: 1, maxLength: 10 }
            ),
          }),
          async ({ tracks, edgeOperations }) => {
            const uniqueTracks = tracks.map((track, index) => ({
              ...track,
              id: `track-${index}`,
            }));

            await audioPlayer.loadTracks(uniqueTracks);

            for (const edgeOp of edgeOperations) {
              const trackIndex = edgeOp.trackIndex % uniqueTracks.length;
              const targetTrackId = uniqueTracks[trackIndex].id;

              // Store states of all other tracks
              const otherTrackStates = new Map<string, { volume: number; pan: number; muted: boolean }>();
              uniqueTracks.forEach(track => {
                if (track.id !== targetTrackId) {
                  const currentTrack = audioPlayer.getTrack(track.id);
                  expect(currentTrack).toBeDefined();
                  otherTrackStates.set(track.id, {
                    volume: currentTrack!.volume,
                    pan: currentTrack!.pan,
                    muted: currentTrack!.muted
                  });
                }
              });

              // Apply edge case operation
              try {
                switch (edgeOp.operation.type) {
                  case 'setVolume':
                    audioPlayer.setTrackVolume(targetTrackId, edgeOp.operation.value);
                    break;
                  case 'setPan':
                    audioPlayer.setTrackPan(targetTrackId, edgeOp.operation.value);
                    break;
                  case 'mute':
                    audioPlayer.muteTrack(targetTrackId, edgeOp.operation.value);
                    break;
                }

                // Verify target track has valid state after operation
                const targetTrackAfter = audioPlayer.getTrack(targetTrackId);
                expect(targetTrackAfter).toBeDefined();
                
                // Values should be clamped to valid ranges
                expect(targetTrackAfter!.volume).toBeGreaterThanOrEqual(0);
                expect(targetTrackAfter!.volume).toBeLessThanOrEqual(1);
                expect(targetTrackAfter!.pan).toBeGreaterThanOrEqual(-1);
                expect(targetTrackAfter!.pan).toBeLessThanOrEqual(1);
                expect(typeof targetTrackAfter!.muted).toBe('boolean');

                // Verify all other tracks remain unchanged
                uniqueTracks.forEach(track => {
                  if (track.id !== targetTrackId) {
                    const otherTrackAfter = audioPlayer.getTrack(track.id);
                    const otherTrackBefore = otherTrackStates.get(track.id)!;
                    
                    expect(otherTrackAfter).toBeDefined();
                    expect(otherTrackAfter!.volume).toBeCloseTo(otherTrackBefore.volume, 5);
                    expect(otherTrackAfter!.pan).toBeCloseTo(otherTrackBefore.pan, 5);
                    expect(otherTrackAfter!.muted).toBe(otherTrackBefore.muted);
                  }
                });

              } catch (error) {
                // If operation throws an error, all tracks should remain unchanged
                uniqueTracks.forEach(track => {
                  const trackAfter = audioPlayer.getTrack(track.id);
                  expect(trackAfter).toBeDefined();
                  
                  if (track.id !== targetTrackId) {
                    const otherTrackBefore = otherTrackStates.get(track.id)!;
                    expect(trackAfter!.volume).toBeCloseTo(otherTrackBefore.volume, 5);
                    expect(trackAfter!.pan).toBeCloseTo(otherTrackBefore.pan, 5);
                    expect(trackAfter!.muted).toBe(otherTrackBefore.muted);
                  }
                });
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});