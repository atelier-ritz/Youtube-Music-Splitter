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
  - [ ] 12.1 Create responsive CSS layouts
    - Implement mobile-first responsive design
    - Add breakpoints for tablet and desktop layouts
    - Ensure touch-friendly controls on mobile devices
    - _Requirements: 9.3_
  
  - [ ] 12.2 Optimize audio controls for different screen sizes
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

- [ ] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.