/**
 * Types for YouTube download functionality
 */

export interface DownloadJob {
  id: string;
  youtubeUrl: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string; // Progress message for user feedback
  audioFilePath?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface DownloadRequest {
  youtubeUrl: string;
}

export interface DownloadResponse {
  jobId: string;
  status: string;
  message: string;
}

export interface DownloadStatusResponse {
  jobId: string;
  status: string;
  progress: number;
  message?: string;
  audioFilePath?: string;
  error?: string;
}