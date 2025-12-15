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

- [ ] 7. Implement BPM detection and display
  - [ ] 7.1 Integrate BPM detection in audio processing
    - Add BPM analysis to processing service calls
    - Handle BPM detection results and errors
    - Store BPM data with track information
    - _Requirements: 5.1, 5.3_
  
  - [ ] 7.2 Create BPM display component
    - Build prominent BPM value display
    - Handle cases where BPM cannot be determined
    - Maintain BPM display throughout practice session
    - _Requirements: 5.2, 5.4_
  
  - [ ]* 7.3 Write property test for BPM analysis consistency
    - **Property 8: BPM analysis and display consistency**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [ ] 8. Add error handling and user feedback systems
  - [ ] 8.1 Implement comprehensive error handling
    - Create error boundary components for React
    - Add backend error handling middleware
    - Implement retry mechanisms for failed operations
    - _Requirements: 1.5, 2.4, 7.4_
  
  - [ ] 8.2 Build user feedback and loading states
    - Create loading spinners and progress indicators
    - Implement toast notifications for user actions
    - Add visual feedback for all interactive elements
    - _Requirements: 1.3, 2.2, 7.2_
  
  - [ ]* 8.3 Write property test for UI responsiveness
    - **Property 9: UI responsiveness and consistency**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5**

- [ ] 9. Implement responsive design and cross-device compatibility
  - [ ] 9.1 Create responsive CSS layouts
    - Implement mobile-first responsive design
    - Add breakpoints for tablet and desktop layouts
    - Ensure touch-friendly controls on mobile devices
    - _Requirements: 7.3_
  
  - [ ] 9.2 Optimize audio controls for different screen sizes
    - Adapt track controls for smaller screens
    - Implement collapsible or tabbed interfaces for mobile
    - Ensure accessibility across all device types
    - _Requirements: 7.3, 7.5_

- [ ] 10. File management and cleanup systems
  - [ ] 10.1 Implement temporary file management
    - Create file cleanup policies for downloaded audio
    - Implement secure file serving for separated tracks
    - Add automatic cleanup for expired processing jobs
    - _Requirements: 2.1, 2.5_
  
  - [ ] 10.2 Add file security and access control
    - Implement secure file URLs with expiration
    - Add file type validation and size limits
    - Create cleanup routines for temporary storage
    - _Requirements: 2.1, 2.4_

- [ ] 11. Integration and workflow testing
  - [x] 11.1 Test local Demucs service integration
    - Verify service startup and health check endpoints
    - Test audio file upload and processing workflow
    - Validate separated track download and playback
    - Test BPM detection accuracy and error handling
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 11.2 Fix Node.js backend integration with Demucs service
    - Resolve FormData upload compatibility issues between Node.js and Python Flask
    - Implement proper multipart form data handling for audio file uploads
    - Test automated workflow from YouTube download to audio separation
    - _Requirements: 2.1, 2.4, 8.2_
  
  - [x] 11.3 Create end-to-end workflow integration
    - Connect all components from URL input to track playback
    - Implement proper state management across components
    - Add navigation between main page and track view
    - _Requirements: 1.4, 2.5_
  
  - [ ]* 11.4 Write integration tests for complete workflows
    - Test complete user journey from URL to playback
    - Test error recovery and retry scenarios
    - Test cross-component state synchronization
    - _Requirements: 1.4, 2.5, 7.5_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.