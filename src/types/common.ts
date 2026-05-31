// Common application types

export type SpeechProvider = 'browser' | 'openai' | 'deepgram';

export type RecognitionState = 'idle' | 'recording' | 'processing' | 'paused';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export interface TranscriptionSearchParams {
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  language?: string;
  folderId?: string;
}

export interface ExportFormat {
  type: 'txt' | 'pdf' | 'docx' | 'srt' | 'vtt';
  includeTimestamps?: boolean;
}

export interface AudioRecording {
  blob: Blob;
  url: string;
  duration: number;
  size: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
}

export interface DashboardStats {
  totalRecordings: number;
  totalTranscripts: number;
  totalWords: number;
  totalDuration: number;
}
