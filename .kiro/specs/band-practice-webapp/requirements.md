# Requirements Document

## Introduction

The Band Practice Webapp is a web-based application designed to help musicians practice with their band by providing audio track separation and playback control features. The system allows users to download audio from YouTube videos, separate the audio into individual instrument tracks, and provide interactive playback controls for focused practice sessions.

## Glossary

- **Audio_Processing_Service**: Local Python service that processes audio files using Facebook's Demucs AI model, separates them into individual instrument tracks, and performs audio analysis including BPM detection
- **Track_Player**: Web-based audio player component that handles playback of separated audio tracks
- **YouTube_Downloader**: Component responsible for extracting audio from YouTube URLs
- **Track_Controller**: Interface component that allows users to mute/unmute individual tracks, solo tracks, and adjust volume and pan settings
- **Navigation_Cursor**: Visual indicator showing current playback position with seek functionality
- **Volume_Control**: Interface element that allows adjustment of individual track volume levels
- **Pan_Control**: Interface element that allows adjustment of stereo positioning for individual tracks
- **Solo_Control**: Interface element that allows isolation of specific tracks by muting all other tracks
- **Six_Stem_Separation**: Advanced audio separation that provides vocals, drums, bass, guitar, piano, and other instrument tracks
- **Waveform_Visualization**: Real-time visual representation of audio amplitude over time that shows actual audio content, silent sections, and signal patterns for each track

## Requirements

### Requirement 1

**User Story:** As a musician, I want to input a YouTube URL and download its audio, so that I can practice with songs from YouTube.

#### Acceptance Criteria

1. WHEN a user enters a valid YouTube URL in the input field, THE YouTube_Downloader SHALL extract and download the audio content
2. WHEN a user submits an invalid or malformed YouTube URL, THE YouTube_Downloader SHALL reject the input and display an appropriate error message
3. WHEN the audio download is in progress, THE system SHALL display a progress indicator to inform the user of the download status
4. WHEN the audio download completes successfully, THE system SHALL automatically proceed to the audio separation process
5. WHEN the audio download fails, THE system SHALL display an error message and allow the user to retry with a different URL

### Requirement 2

**User Story:** As a musician, I want the downloaded audio to be separated into individual instrument tracks, so that I can isolate specific instruments for practice.

#### Acceptance Criteria

1. WHEN audio is successfully downloaded, THE Audio_Processing_Service SHALL process the audio file and separate it into distinct instrument tracks
2. WHEN the processing begins, THE system SHALL display a processing indicator showing the current separation status
3. WHEN processing completes successfully, THE system SHALL provide access to individual tracks including vocals, drums, bass, guitar, piano, and other instruments using Six_Stem_Separation
4. WHEN the Audio_Processing_Service encounters an error during processing, THE system SHALL display an error message and provide options to retry or return to the main page
5. WHEN processing is complete, THE system SHALL automatically navigate to the track view page

### Requirement 3

**User Story:** As a musician, I want to view and control individual audio tracks, so that I can practice by muting specific instruments.

#### Acceptance Criteria

1. WHEN the track view page loads, THE Track_Controller SHALL display all available separated tracks with individual mute/unmute controls
2. WHEN a user clicks a mute button for a specific track, THE Track_Player SHALL silence that track while continuing playback of other tracks
3. WHEN a user clicks an unmute button for a muted track, THE Track_Player SHALL restore audio playback for that track
4. WHEN multiple tracks are muted simultaneously, THE Track_Player SHALL maintain independent control over each track's audio state
5. WHEN all tracks are muted, THE Track_Player SHALL continue playback with no audible output while maintaining timing synchronization

### Requirement 4

**User Story:** As a musician, I want basic playback controls and navigation, so that I can control the audio playback during practice sessions.

#### Acceptance Criteria

1. WHEN a user clicks the play button, THE Track_Player SHALL begin audio playback from the current cursor position
2. WHEN a user clicks the pause button during playback, THE Track_Player SHALL pause all tracks while maintaining the current position
3. WHEN a user interacts with the Navigation_Cursor, THE Track_Player SHALL seek to the selected position and update playback accordingly
4. WHEN audio is playing, THE Navigation_Cursor SHALL continuously update to reflect the current playback position
5. WHEN the audio reaches the end, THE Track_Player SHALL stop playback and reset the Navigation_Cursor to the beginning

### Requirement 5

**User Story:** As a musician, I want BPM detection and display, so that I can understand the tempo of the song for better practice coordination.

#### Acceptance Criteria

1. WHEN the Audio_Processing_Service processes audio tracks, THE service SHALL analyze the audio and determine the beats per minute
2. WHEN BPM detection completes, THE system SHALL display the detected BPM value prominently in the track view interface
3. WHEN BPM detection fails or produces unreliable results, THE system SHALL display a default message indicating BPM could not be determined
4. WHEN the detected BPM is available, THE system SHALL maintain the BPM display throughout the practice session
5. WHEN multiple tracks have different tempo signatures, THE Audio_Processing_Service SHALL provide the most representative BPM for the overall composition

### Requirement 6

**User Story:** As a musician, I want to adjust the volume and stereo positioning of individual tracks, so that I can create a custom mix for optimal practice conditions.

#### Acceptance Criteria

1. WHEN the track view page loads, THE Track_Controller SHALL display Volume_Control sliders for each separated track
2. WHEN a user adjusts a Volume_Control slider, THE Track_Player SHALL immediately apply the volume change to that specific track during playback
3. WHEN the track view page loads, THE Track_Controller SHALL display Pan_Control knobs or sliders for each separated track
4. WHEN a user adjusts a Pan_Control, THE Track_Player SHALL immediately apply the stereo positioning change to that specific track during playback
5. WHEN volume is set to zero using the Volume_Control, THE track SHALL be effectively muted while maintaining the ability to restore previous volume levels

### Requirement 7

**User Story:** As a musician, I want to solo individual tracks, so that I can isolate and focus on specific instruments during practice.

#### Acceptance Criteria

1. WHEN a user clicks the solo button for a specific track, THE Solo_Control SHALL mute all other tracks while keeping the selected track audible
2. WHEN multiple tracks are soloed simultaneously, THE Track_Player SHALL play only the soloed tracks while muting all others
3. WHEN a user clicks the solo button again on a soloed track, THE Solo_Control SHALL unsolo that track and restore normal mute/unmute behavior
4. WHEN tracks are soloed, THE system SHALL provide visual feedback by dimming non-playing tracks to clearly indicate which audio is active
5. WHEN solo mode is active, THE system SHALL prioritize solo state over individual mute states for audio playback decisions

### Requirement 8

**User Story:** As a musician, I want clear visual feedback about track states, so that I can easily understand which tracks are currently playing.

#### Acceptance Criteria

1. WHEN tracks are silenced due to solo operations, THE system SHALL dim the entire track interface including controls and waveform visualization
2. WHEN tracks are individually muted without solo active, THE system SHALL only dim the waveform while keeping track controls fully visible
3. WHEN track states change, THE system SHALL apply smooth visual transitions to provide clear feedback about the state changes
4. WHEN solo buttons are active, THE system SHALL highlight them with distinct visual styling to indicate their active state
5. WHEN mute buttons are active, THE system SHALL highlight them with distinct visual styling to indicate their active state

### Requirement 9

**User Story:** As a musician, I want a responsive and intuitive user interface, so that I can focus on practicing rather than struggling with the application.

#### Acceptance Criteria

1. WHEN the application loads, THE system SHALL display a clean main page with a prominent YouTube URL input field
2. WHEN users interact with any control element, THE system SHALL provide immediate visual feedback to confirm the action without loading delays
3. WHEN the application is accessed on different screen sizes, THE system SHALL use full-screen layout and adapt controls to maintain usability across devices
4. WHEN errors occur, THE system SHALL display clear, actionable error messages that help users understand and resolve issues
5. WHEN processing audio, THE system SHALL provide granular progress updates with descriptive messages to keep users informed of the current operation
5. WHEN transitioning between pages, THE system SHALL maintain consistent navigation and visual design elements

### Requirement 10

**User Story:** As a developer, I want a local audio processing service that provides unlimited, cost-free audio separation, so that I can offer the service without ongoing operational costs.

#### Acceptance Criteria

1. ✅ WHEN the local audio processing service starts, THE system SHALL initialize the Demucs AI model and be ready to accept processing requests
2. ✅ WHEN an audio file is submitted for processing, THE Audio_Processing_Service SHALL separate it into vocals, drums, bass, and other instrument tracks using the Demucs model
3. ✅ WHEN processing is complete, THE Audio_Processing_Service SHALL provide downloadable URLs for each separated track and detected BPM information
4. ✅ WHEN processing jobs are older than 24 hours, THE Audio_Processing_Service SHALL automatically clean up associated files to manage disk space
5. ✅ WHEN the service encounters errors during processing, THE Audio_Processing_Service SHALL provide detailed error messages and maintain system stability

#### Implementation Validation

**Service Status**: ✅ **OPERATIONAL**
- **Deployment**: Successfully deployed with Python 3.12 + virtual environment
- **Model Loading**: Demucs htdemucs model loaded and ready
- **Processing Verified**: Real audio file successfully separated into 4 tracks
- **Performance**: 2 minutes 27 seconds audio processed in ~3 minutes
- **File Serving**: HTTP endpoints serving separated tracks at localhost:8000
- **Quality**: High-quality AI-based separation using state-of-the-art Demucs model
- **Cost**: $0 ongoing operational costs, unlimited usage

### Requirement 11

**User Story:** As a musician, I want to see real waveform visualizations for each track, so that I can identify audio content, silent sections, and instrument patterns for better practice planning.

#### Acceptance Criteria

1. WHEN tracks are loaded in the track view, THE system SHALL generate and display actual waveform visualizations based on the audio content of each separated track
2. WHEN audio contains sound, THE waveform SHALL show amplitude variations that accurately represent the audio signal strength over time
3. WHEN audio is silent or nearly silent, THE waveform SHALL show minimal or no amplitude bars to clearly indicate absence of audio content
4. WHEN users examine the waveform, THE visualization SHALL help identify instrument entry points, breaks, and audio patterns within each track
5. WHEN the waveform is displayed, THE system SHALL maintain performance by using efficient audio analysis and rendering techniques