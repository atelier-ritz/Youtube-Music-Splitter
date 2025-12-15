/**
 * YouTube URL validation utility
 * Handles various YouTube URL formats including youtube.com, youtu.be, etc.
 */

export interface YouTubeValidationResult {
  isValid: boolean;
  videoId?: string;
  error?: string;
}

/**
 * Validates YouTube URLs and extracts video ID
 * Supports formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 */
export function validateYouTubeUrl(url: string): YouTubeValidationResult {
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      error: 'URL must be a non-empty string'
    };
  }

  // Trim whitespace
  const trimmedUrl = url.trim();
  
  if (!trimmedUrl) {
    return {
      isValid: false,
      error: 'URL cannot be empty or only whitespace'
    };
  }

  // YouTube URL patterns with video ID capture group mapping
  const patterns = [
    // Standard youtube.com watch URLs - (www.)? is group 1, video ID is group 2
    { regex: /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(&.*)?$/, videoIdGroup: 2 },
    // youtu.be short URLs - video ID is group 1
    { regex: /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})(\?.*)?$/, videoIdGroup: 1 },
    // Mobile youtube URLs - video ID is group 1 (no www group)
    { regex: /^https?:\/\/m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(&.*)?$/, videoIdGroup: 1 },
    // Embed URLs - (www.)? is group 1, video ID is group 2
    { regex: /^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(\?.*)?$/, videoIdGroup: 2 },
    // Old-style v URLs - (www.)? is group 1, video ID is group 2
    { regex: /^https?:\/\/(www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})(\?.*)?$/, videoIdGroup: 2 }
  ];

  for (const pattern of patterns) {
    const match = trimmedUrl.match(pattern.regex);
    if (match) {
      const videoId = match[pattern.videoIdGroup];
      return {
        isValid: true,
        videoId
      };
    }
  }

  return {
    isValid: false,
    error: 'Invalid YouTube URL format'
  };
}

/**
 * Simple boolean check for YouTube URL validity
 */
export function isValidYouTubeUrl(url: string): boolean {
  return validateYouTubeUrl(url).isValid;
}