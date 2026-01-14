# Implementation Plan

- [x] 1. Set up project structure and development environment
  - Create React TypeScript project with Vite
  - Set up Node.js Express backend with TypeScript
  - Configure development scripts and build processes
  - Install required dependencies (Web Audio API types, youtube-dl-exec, etc.)
  - _Requirements: 7.1_

- [x] 2. Implement YouTube URL validation and download functionality
  - [x] 2.1 Create YouTube URL validation utility
    - Write regex-based YouTube URL validator
    - Handle various YouTube URL formats (youtube.com, youtu.be, etc.)
    - _Requirements: 1.2_
  
  - [x] 2.2 Write property test for URL validation
    - **Property 1: YouTube URL validation consistency**
    - **Validates: Requirements 1.2**
  
  - [x] 2.3 Implement YouTube audio downloader service
    - Create backend endpoint for YouTube audio extraction
    - Integrate youtube-dl-exec for audio download
    - Implement progress tracking and status reporting
    - _Requirements: 1.1, 1.3_
  
  - [ ]* 2.4 Write property test for download workflow
    - **Property 2: Download workflow state management**
    - **Validates: Requirements 1.1, 1.3, 1.4, 1.5**

- [-] 3. Create main page UI with download interface
  - [x] 3.1 Build MainPage React component
    - Create YouTube URL input field with validation
    - Implement submit button with loading states
    - Add progress indicator for download status
    - Handle error display for failed downloads
    - _Requirements: 1.2, 1.3, 1.5, 7.1_
  
  - [x] 3.2 Write unit tests for MainPage component
    - Test URL input validation and error states
    - Test progress indicator behavior
    - Test error message display
    - _Requirements: 1.2, 1.3, 1.5_

- [ ] 4. Implement audio processing service integration
  - [x] 4.1 Create audio processing client service
    - Build HTTP client for external audio processing service
    - Implement file upload and job status polling
    - Handle processing errors and retries
    - _Requirements: 2.1, 2.2, 2.4_
  
  - [x] 4.2 Create processing job management
    - Implement job status tracking and persistence
    - Create endpoints for processing status queries
    - Handle processing completion and file management
    - _Requirements: 2.2, 2.4, 2.5_
  
  - [x] 4.3 Write property test for audio processing workflow
    - **Property 3: Audio processing workflow integrity**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
  
  - [x] 4.4 Create local Demucs audio processing service
    - Build Python Flask service using Facebook's Demucs for audio separation
    - Implement RESTful API compatible with existing backend client
    - Add BPM detection using librosa
    - Create file management and cleanup system
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 4.5 Set up service deployment and documentation
    - Create installation and setup scripts
    - Write comprehensive documentation for local deployment
    - Add health check and monitoring endpoints
    - Configure automatic file cleanup policies
    - _Requirements: 2.1, 2.5_
  
  - [x] 4.6 Test and validate local Demucs service functionality
    - Verify service startup and health check endpoints
    - Test audio file upload and processing workflow with real audio
    - Validate separated track generation and file serving
    - Confirm BPM detection and error handling capabilities
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 5. Build Web Audio API service for multi-track playback
  - [x] 5.1 Create AudioPlayer service class
    - Implement Web Audio API context management
    - Create individual track audio buffer loading
    - Build track synchronization and timing control
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 5.2 Implement track control functionality
    - Add mute/unmute capabilities per track
    - Implement volume control with real-time adjustment
    - Add pan control for stereo positioning
    - _Requirements: 3.2, 3.3, 6.2, 6.4_
  
  - [x] 5.3 Write property test for playback synchronization
    - **Property 5: Playback synchronization invariant**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5**
  
  - [x] 5.4 Write property test for track control consistency
    - **Property 4: Track control state consistency**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [ ] 6. Create track view interface components
  - [x] 6.1 Build TrackView main component
    - Create layout for track list and global controls
    - Implement BPM display area
    - Add navigation timeline with cursor
    - _Requirements: 3.1, 5.2, 4.4_
  
  - [x] 6.2 Implement TrackController component
    - Create individual track control interface
    - Add mute/unmute toggle buttons
    - Implement volume sliders with real-time feedback
    - Add pan control knobs or sliders
    - _Requirements: 3.1, 6.1, 6.3_
  
  - [x] 6.3 Build navigation cursor component
    - Create timeline visualization with seek functionality
    - Implement real-time position updates during playback
    - Add click-to-seek interaction
    - _Requirements: 4.3, 4.4_
  
  - [ ]* 6.4 Write property test for real-time audio controls
    - **Property 7: Real-time audio control responsiveness**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
  
  - [ ]* 6.5 Write property test for navigation cursor accuracy
    - **Property 6: Navigation cursor accuracy**
    - **Validates: Requirements 4.3, 4.4**

- [x] 7. Implement BPM detection and display
  - [x] 7.1 Integrate BPM detection in audio processing
    - Add BPM analysis to processing service calls
    - Handle BPM detection results and errors
    - Store BPM data with track information
    - _Requirements: 5.1, 5.3_
  
  - [x] 7.2 Create BPM display component
    - Build prominent BPM value display
    - Handle cases where BPM cannot be determined
    - Maintain BPM display throughout practice session
    - _Requirements: 5.2, 5.4_
  
  - [ ]* 7.3 Write property test for BPM analysis consistency
    - **Property 8: BPM analysis and display consistency**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [x] 8. Implement solo functionality and advanced track controls
  - [x] 8.1 Add solo control to Track interface and AudioPlayer
    - Extend Track data model with soloed boolean property
    - Implement soloTrack method in AudioPlayer service
    - Create updateTrackAudioLevels method for solo/mute interaction management
    - _Requirements: 7.1, 7.2, 7.5_
  
  - [x] 8.2 Build solo button UI and interaction
    - Add solo toggle button to track controls
    - Implement visual feedback for active solo state
    - Create handleTrackSoloToggle function in TrackView
    - _Requirements: 7.1, 7.3_
  
  - [x] 8.3 Implement visual feedback for track states
    - Create dimming effects for silenced tracks (due to solo)
    - Add subtle dimming for muted tracks (waveform only)
    - Implement smooth transitions for state changes
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ]* 8.4 Write property test for solo functionality
    - **Property 12: Solo functionality exclusivity**
    - **Validates: Requirements 7.1, 7.2**
  
  - [ ]* 8.5 Write property test for solo state independence
    - **Property 13: Solo state independence**
    - **Validates: Requirements 7.3, 7.5**

- [x] 9. Upgrade to 6-stem audio separation
  - [x] 9.1 Update Demucs service to use htdemucs_6s model
    - Configure audio processing service to use 6-stem model
    - Update track mapping to include guitar and piano
    - Fix file path resolution for new model directory structure
    - _Requirements: 2.3_
  
  - [x] 9.2 Update frontend to handle additional tracks
    - Add CSS styling for guitar and piano track waveforms
    - Update track processing to handle 6 tracks instead of 4
    - Ensure UI scales properly with additional tracks
    - _Requirements: 2.3_
  
  - [ ]* 9.3 Write property test for 6-stem separation completeness
    - **Property 11: Audio separation quality and completeness**
    - **Validates: Requirements 2.3**

- [x] 10. Improve user experience and interface polish
  - [x] 10.1 Implement granular progress reporting
    - Add time-based progress estimation for audio processing
    - Create descriptive progress messages for each processing stage
    - Update progress every 2 seconds during processing
    - _Requirements: 9.5_
  
  - [x] 10.2 Optimize UI for full-screen usage
    - Remove unnecessary transport controls (record, stop buttons)
    - Implement full-screen layout with proper viewport usage
    - Fix timeline label density for better readability
    - _Requirements: 9.1, 9.3_
  
  - [x] 10.3 Eliminate loading states for instant controls
    - Remove loading delays for mute/volume operations
    - Implement instant UI feedback with background audio updates
    - Fix white flash issues during track state changes
    - _Requirements: 9.2_
  
  - [ ]* 10.4 Write property test for visual feedback consistency
    - **Property 14: Visual feedback consistency for track states**
    - **Validates: Requirements 8.1, 8.2, 8.3**
  
  - [ ]* 10.5 Write property test for granular progress accuracy
    - **Property 15: Granular progress reporting accuracy**
    - **Validates: Requirements 9.5**

- [ ] 11. Add error handling and user feedback systems
  - [x] 11.1 Implement comprehensive error handling
    - Create error boundary components for React
    - Add backend error handling middleware
    - Implement retry mechanisms for failed operations
    - _Requirements: 1.5, 2.4, 7.4_
  
  - [x] 11.2 Build user feedback and loading states
    - Create loading spinners and progress indicators
    - Implement toast notifications for user actions
    - Add visual feedback for all interactive elements
    - _Requirements: 1.3, 2.2, 9.2_
  
  - [ ]* 11.3 Write property test for UI responsiveness
    - **Property 9: UI responsiveness and consistency**
    - **Validates: Requirements 9.2, 9.3, 9.4**

- [ ] 12. Implement responsive design and cross-device compatibility
  - [x] 12.1 Create responsive CSS layouts
    - Implement mobile-first responsive design
    - Add breakpoints for tablet and desktop layouts
    - Ensure touch-friendly controls on mobile devices
    - _Requirements: 9.3_
  
  - [x] 12.2 Optimize audio controls for different screen sizes
    - Adapt track controls for smaller screens
    - Implement collapsible or tabbed interfaces for mobile
    - Ensure accessibility across all device types
    - _Requirements: 9.3_

- [ ] 13. File management and cleanup systems
  - [ ] 13.1 Implement temporary file management
    - Create file cleanup policies for downloaded audio
    - Implement secure file serving for separated tracks
    - Add automatic cleanup for expired processing jobs
    - _Requirements: 2.1, 2.5_
  
  - [ ] 13.2 Add file security and access control
    - Implement secure file URLs with expiration
    - Add file type validation and size limits
    - Create cleanup routines for temporary storage
    - _Requirements: 2.1, 2.4_

- [x] 14. Integration and workflow testing
  - [x] 14.1 Test local Demucs service integration
    - Verify service startup and health check endpoints
    - Test audio file upload and processing workflow
    - Validate separated track download and playback
    - Test BPM detection accuracy and error handling
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 14.2 Fix Node.js backend integration with Demucs service
    - Resolve FormData upload compatibility issues between Node.js and Python Flask
    - Implement proper multipart form data handling for audio file uploads
    - Test automated workflow from YouTube download to audio separation
    - _Requirements: 2.1, 2.4_
  
  - [x] 14.3 Create end-to-end workflow integration
    - Connect all components from URL input to track playback
    - Implement proper state management across components
    - Add navigation between main page and track view
    - _Requirements: 1.4, 2.5_
  
  - [ ]* 14.4 Write integration tests for complete workflows
    - Test complete user journey from URL to playback
    - Test error recovery and retry scenarios
    - Test cross-component state synchronization
    - _Requirements: 1.4, 2.5, 9.4_

- [ ] 15. Implement real waveform visualization
  - [x] 15.1 Create audio analysis service for waveform generation
    - Implement Web Audio API AnalyserNode for real-time audio analysis
    - Create waveform data extraction from audio buffers
    - Build efficient amplitude sampling for visualization
    - _Requirements: 11.1, 11.5_
  
  - [x] 15.2 Replace mock waveform with real audio visualization
    - Remove random waveform bar generation
    - Implement actual amplitude-based waveform rendering
    - Add silent section detection and minimal amplitude display
    - _Requirements: 11.2, 11.3_
  
  - [x] 15.3 Optimize waveform rendering performance
    - Implement efficient canvas or SVG-based rendering
    - Add waveform caching for loaded tracks
    - Ensure smooth UI performance with real-time updates
    - _Requirements: 11.5_
  
  - [ ]* 15.4 Write property test for waveform accuracy
    - **Property 16: Waveform visualization accuracy**
    - **Validates: Requirements 11.1, 11.2, 11.3**

- [x] 16. Implement playback speed control for practice
  - [x] 16.1 Add playback speed control to TrackView interface
    - Create speed selection dropdown with practice-focused range (0.5x - 1.0x)
    - Implement AudioPlayer.setPlaybackRate() method with pitch compensation
    - Ensure speed changes work during both playing and paused states
    - _Requirements: Practice-focused speed control for learning difficult passages_
  
  - [x] 16.2 Fix playback speed synchronization issues
    - Resolve timing calculation issues when changing speed during playback
    - Ensure proper position tracking with variable playback rates
    - Fix source node recreation for speed changes to take effect immediately
    - _Requirements: Reliable speed control functionality_
  
  - [x] 16.3 Integrate SoundTouchJS for proper pitch-preserving speed control
    - Replace Web Audio API playbackRate/detune approach with SoundTouchJS library
    - Implement SoundTouch-based audio processing for speed changes without pitch shift
    - Create setupSoundTouchPlayback method using getWebAudioNode and SimpleFilter
    - Add fallback to regular playback if SoundTouch initialization fails
    - Use direct Web Audio API for normal speed (1.0x) to avoid unnecessary processing
    - Add proper cleanup for SoundTouch resources in pause and clearCache methods
    - Create TypeScript declarations for SoundTouchJS API compatibility
    - _Requirements: Professional-quality pitch-preserving speed control for practice_
  
  - [x] 16.4 Fix playhead synchronization with SoundTouch playback
    - Add separate position tracking for SoundTouch vs regular Web Audio playback
    - Implement usingSoundTouch flag and soundTouchStartTime/soundTouchStartPosition tracking
    - Update getCurrentPosition() method to handle tempo-adjusted time calculation
    - Improve SoundTouch position callback to sync with actual processed audio position
    - Ensure playhead remains accurate when switching between different playback speeds
    - _Requirements: Accurate visual feedback during speed-controlled practice sessions_
  
  - [x] 16.5 Fix SoundTouch playback starting position
    - Set filter.sourcePosition to start SoundTouch playback from current position instead of beginning
    - Convert current position from seconds to sample position for SoundTouch API
    - Add logging to track SoundTouch starting position for debugging
    - Ensure resume functionality works correctly with pitch-preserving speed control
    - _Requirements: Proper resume behavior when using speed control for practice_
  
  - [x] 16.6 Fix timestamp inspector behavior during SoundTouch playback
    - Simplify SoundTouch position tracking to use direct position reports from SoundTouch
    - Replace complex position adjustment logic with direct lastSoundTouchPosition tracking
    - Add fallback calculation for initial playback before SoundTouch reports position
    - Ensure smooth and consistent timestamp updates during pitch-preserving speed control
    - _Requirements: Accurate and stable timestamp display during practice sessions_
  
  - [x] 16.7 Fix UI refresh rate during slower playback speeds
    - Implement position interpolation between SoundTouch position updates
    - Add lastSoundTouchUpdateTime tracking to enable smooth interpolation
    - Maintain consistent 60fps UI updates regardless of SoundTouch processing rate
    - Calculate interpolated position based on time elapsed since last SoundTouch update
    - Ensure playhead and timestamp move smoothly at all playback speeds
    - _Requirements: Consistent UI responsiveness during practice at any speed_

- [x] 17. Improve progress bar granularity and real-time feedback
  - [x] 17.1 Add granular YouTube download progress simulation
    - Implement simulateDownloadProgress method with 2% increments every 1.5 seconds
    - Add realistic progress messages for different download stages
    - Increase progress reporting from 3 points (10%, 90%, 100%) to ~40 points (5%-85%)
    - Add message field to DownloadJob type for descriptive progress feedback
    - _Requirements: More responsive and informative download progress for users_
  
  - [x] 17.2 Improve frontend progress polling and display
    - Reduce polling interval from 5 seconds to 2 seconds for more responsive updates
    - Include backend progress percentage in frontend progress messages
    - Maintain existing 0-50% (download) and 50-100% (processing) mapping
    - Ensure progress messages are displayed to users during both phases
    - _Requirements: Real-time feedback that keeps users informed of progress_

- [x] 17. Add stop button functionality to transport controls
  - [x] 17.1 Implement stop method in AudioPlayer service
    - Create stop() method that pauses playback and reverts to last play start position
    - Track lastPlayStartPosition to remember where playback was initiated
    - Ensure stop functionality works independently from play/pause
    - Update position callback to reflect reverted position
    - _Requirements: Enhanced transport control for practice sessions_
  
  - [x] 17.2 Add stop button to TrackView interface
    - Add stop button after play/pause button in transport controls
    - Implement handleStop function to manage stop behavior
    - Add CSS styling for stop button with appropriate visual feedback
    - Update tooltip to reflect "return to last play start position" behavior
    - _Requirements: Complete transport control interface_

- [x] 18. Remove loop/refresh button from transport controls
  - [x] 18.1 Remove loop button from TrackView interface
    - Remove loop button from transport controls section
    - Clean up transport controls layout without loop functionality
    - _Requirements: Simplified transport interface focused on essential controls_
  
  - [x] 18.2 Update documentation to remove loop functionality references
    - Remove loop and repeat functionality from planned features
    - Update task documentation to reflect simplified transport controls
    - _Requirements: Accurate documentation reflecting current feature set_

- [x] 19. Fix cursor alignment between timeline and waveform tracks
  - [x] 19.1 Correct playhead cursor positioning
    - Move timeline click handler from track content to ruler content area
    - Ensure timeline ruler playhead and waveform progress cursors are synchronized
    - Fix click-to-seek functionality to work from both timeline ruler and waveforms
    - _Requirements: Accurate visual feedback for playback position and seeking_

- [x] 20. Fix stop button visual cursor behavior
  - [x] 20.1 Ensure visual cursor updates when stop button is pressed
    - Remove incorrect setCurrentPosition(0) override in handleStop function
    - Allow AudioPlayer's position callback to properly update visual cursor position
    - Ensure cursor moves to last play start position when stop is pressed
    - _Requirements: Visual feedback matches actual playback position after stop_

- [x] 21. Improve playhead visibility and navigation behavior
  - [x] 21.1 Fix back/previous button behavior
    - Remove incorrect setCurrentPosition(0) override in handleGoToBeginning function
    - Allow AudioPlayer's seek and position callback to properly handle navigation
    - Ensure playhead moves to beginning and updates last play start position
    - _Requirements: Consistent navigation behavior with proper position tracking_
  
  - [x] 21.2 Ensure playhead is visible at beginning on track view entry
    - Sync currentPosition with AudioPlayer position after tracks are loaded
    - Ensure playhead is visible at position 0 when entering track view
    - Add position sync after error recovery to maintain visual consistency
    - _Requirements: Clear visual feedback of playback position from the start_

- [ ] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Implement visitor counter backend service
  - [x] 22.1 Create visitor tracking middleware and API endpoint
    - Set up Express session middleware with cookie configuration
    - Create `GET /api/visitor-count` endpoint
    - Implement session-based visitor identification logic
    - Add increment logic for new visitors only
    - _Requirements: 12.2, 12.3_
  
  - [x] 22.2 Implement file-based persistence layer
    - Create visitor count storage file (`visitor-count.json`)
    - Implement atomic write operations using temp file + rename pattern
    - Add read operation with initialization to zero if file doesn't exist
    - Handle maximum count limit (999,999)
    - _Requirements: 13.1, 13.2, 13.3, 12.4_
  
  - [x] 22.3 Add error handling and logging
    - Implement try-catch for storage operations with fallback to in-memory counting
    - Add logging for storage failures and corrupted data
    - Add warning log when maximum count is reached
    - Implement data validation and reset for corrupted counts
    - _Requirements: 13.4, 15.2, 15.3, 15.4_
  
  - [ ]* 22.4 Write property test for visitor increment behavior
    - **Property 18: New visitor increment behavior**
    - **Validates: Requirements 12.2**
  
  - [ ]* 22.5 Write property test for session recognition
    - **Property 19: Returning visitor session recognition**
    - **Validates: Requirements 12.3**
  
  - [ ]* 22.6 Write property test for persistence round-trip
    - **Property 20: Visitor count persistence round-trip**
    - **Validates: Requirements 13.1, 13.2**
  
  - [ ]* 22.7 Write property test for storage failure resilience
    - **Property 21: Storage failure resilience**
    - **Validates: Requirements 13.4, 15.2**
  
  - [ ]* 22.8 Write property test for atomic write integrity
    - **Property 22: Atomic write data integrity**
    - **Validates: Requirements 13.5**

- [ ] 23. Create visitor counter frontend component
  - [x] 23.1 Build VisitorCounter React component
    - Create component with async fetch on mount using useEffect
    - Implement non-blocking loading strategy
    - Add error handling with graceful fallback
    - Format count as 6-digit string with leading zeros
    - _Requirements: 12.1, 15.1, 15.5_
  
  - [x] 23.2 Implement retro visual styling
    - Create CSS file with retro 1990s aesthetic
    - Style individual digit boxes with borders and backgrounds
    - Use monospace digital/LCD font (Courier New or custom web font)
    - Apply black background with green or red digit colors
    - Add decorative text "You are visitor number:"
    - Position in footer or bottom corner of main page
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [x] 23.3 Integrate counter into MainPage component
    - Import and render VisitorCounter in MainPage footer
    - Ensure counter doesn't interfere with main functionality
    - Test responsive behavior on different screen sizes
    - _Requirements: 14.5, 15.5_
  
  - [ ]* 23.4 Write property test for count formatting
    - **Property 17: Visitor count formatting consistency**
    - **Validates: Requirements 12.1**
  
  - [ ]* 23.5 Write property test for UI structure
    - **Property 23: Counter UI structure consistency**
    - **Validates: Requirements 14.2**
  
  - [ ]* 23.6 Write property test for API failure handling
    - **Property 24: API failure graceful degradation**
    - **Validates: Requirements 15.1**
  
  - [ ]* 23.7 Write property test for non-blocking load
    - **Property 26: Non-blocking counter load**
    - **Validates: Requirements 15.5**

- [ ] 24. Test and validate visitor counter functionality
  - [ ] 24.1 Test visitor tracking and persistence
    - Verify new visitor increments count
    - Verify returning visitor doesn't increment
    - Test count persistence across server restarts
    - Test maximum count limit behavior
    - _Requirements: 12.2, 12.3, 12.4, 13.1, 13.2_
  
  - [ ] 24.2 Test error handling and edge cases
    - Test behavior with corrupted storage file
    - Test behavior with storage write failures
    - Test graceful degradation when API is unavailable
    - Verify main page loads without counter blocking
    - _Requirements: 13.4, 15.1, 15.2, 15.4, 15.5_
  
  - [ ]* 24.3 Write unit tests for edge cases
    - Test initialization with missing storage file
    - Test maximum count boundary (999,999)
    - Test decorative text rendering
    - _Requirements: 13.3, 12.4, 14.4_

- [ ] 25. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.