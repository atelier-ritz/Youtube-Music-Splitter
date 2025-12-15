/**
 * Types for audio processing functionality
 */

export interface Track {
  id: string;
  name: string; // e.g., "vocals", "drums", "bass", "other"
  audioUrl: string;
  duration: number; // in seconds
  volume: number; // 0-1 range
  pan: number; // -1 to 1 range (-1 = full left, 1 = full right)
  muted: boolean;
  soloed: boolean;
}

export interface ProcessingJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100 percentage
  originalAudioUrl: string;
  tracks?: Track[];
  bpm?: number;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface ProcessingRequest {
  audioFilePath: string;
}

export interface ProcessingResponse {
  jobId: string;
  status: string;
  message: string;
}

export interface ProcessingStatusResponse {
  jobId: string;
  status: string;
  progress: number;
  tracks?: Track[];
  bpm?: number;
  error?: string;
}

export interface ProcessingStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  averageProcessingTime?: number;
}

export interface JobCancellationResponse {
  message: string;
  jobId: string;
}

export interface CleanupResponse {
  message: string;
  cleanedCount: number;
}

export interface ExternalProcessingServiceRequest {
  audioFile: Buffer;
  filename: string;
}

export interface ExternalProcessingServiceResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  tracks?: {
    vocals: string;
    drums: string;
    bass: string;
    guitar: string;
    piano: string;
    other: string;
  };
  bpm?: number;
  error?: string;
}