// Speech Provider Types - Common interface for all speech recognition providers

import type { AppError } from '../../shared/errors';

export type SpeechRecognitionState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'stopping'
  | 'completed'
  | 'error';

export interface TranscriptResult {
  text: string;
  isFinal: boolean;
  confidence?: number;
}

export interface SpeechProviderConfig {
  language: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxRetries?: number;
}

export interface SpeechProviderState {
  status: SpeechRecognitionState;
  isSupported: boolean;
  error: AppError | null;
  duration: number;
  retryCount: number;
}

export interface SpeechProvider {
  readonly name: string;

  // State
  getState(): SpeechProviderState;

  // Lifecycle
  initialize(config: SpeechProviderConfig): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<string>;
  destroy(): void;

  // Transcription
  transcribe(audio: Blob): Promise<string>;

  // Callbacks
  onResult(callback: (result: TranscriptResult) => void): void;
  onError(callback: (error: AppError) => void): void;
  onStateChange(callback: (state: SpeechRecognitionState) => void): void;

  // Capabilities
  supportsLanguage(language: string): boolean;
  getSupportedLanguages(): string[];
}

export type SpeechProviderType = 'browser' | 'whisper' | 'deepgram';

export interface SpeechProviderFactory {
  create(type: SpeechProviderType): SpeechProvider;
}
