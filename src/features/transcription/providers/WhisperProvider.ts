// Whisper Speech Provider - OpenAI Whisper API implementation

import type {
  SpeechProvider,
  SpeechProviderConfig,
  SpeechProviderState,
  TranscriptResult,
  SpeechRecognitionState,
} from './types';
import {
  AppError,
  SpeechError,
  ErrorCode,
} from '../../shared/errors';

export class WhisperProvider implements SpeechProvider {
  readonly name = 'whisper';

  private config: SpeechProviderConfig | null = null;
  private state: SpeechProviderState = {
    status: 'idle',
    isSupported: true,
    error: null,
    duration: 0,
    retryCount: 0,
  };

  // Callbacks
  private resultCallback: ((result: TranscriptResult) => void) | null = null;
  private errorCallback: ((error: AppError) => void) | null = null;
  private stateCallback: ((state: SpeechRecognitionState) => void) | null = null;

  // Whisper does not support real-time streaming, so we use batch transcription
  private apiKey: string | null = null;
  private apiEndpoint = 'https://api.openai.com/v1/audio/transcriptions';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
  }

  getState(): SpeechProviderState {
    return { ...this.state };
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  async initialize(config: SpeechProviderConfig): Promise<void> {
    this.config = config;

    if (!this.apiKey) {
      const error = new SpeechError(
        ErrorCode.WHISPER_API_KEY_MISSING,
        'OpenAI API key is required for Whisper provider',
        false
      );
      this.handleError(error);
      throw error;
    }

    this.state.error = null;
    this.state.retryCount = 0;
  }

  async start(): Promise<void> {
    // Whisper does not support real-time streaming
    // This method is not compatible with Whisper's architecture
    throw new SpeechError(
      ErrorCode.SPEECH_PROVIDER_ERROR,
      'Whisper provider does not support real-time transcription. Use transcribe() method instead.',
      false
    );
  }

  async stop(): Promise<string> {
    this.updateState('completed');
    return '';
  }

  destroy(): void {
    this.updateState('idle');
  }

  async transcribe(audio: Blob): Promise<string> {
    if (!this.apiKey) {
      throw new SpeechError(
        ErrorCode.WHISPER_API_KEY_MISSING,
        'OpenAI API key is required',
        false
      );
    }

    if (!this.config) {
      throw new SpeechError(
        ErrorCode.SPEECH_PROVIDER_ERROR,
        'Provider not initialized',
        false
      );
    }

    this.updateState('processing');

    try {
      // Check file size (Whisper has 25MB limit)
      const maxSize = 25 * 1024 * 1024; // 25MB
      if (audio.size > maxSize) {
        throw new SpeechError(
          ErrorCode.WHISPER_FILE_TOO_LARGE,
          'Audio file exceeds 25MB limit',
          false
        );
      }

      const formData = new FormData();
      formData.append('file', audio, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', this.config.language.split('-')[0]); // Whisper uses 2-letter codes
      formData.append('response_format', 'json');

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `API error: ${response.status}`;

        if (response.status === 401) {
          throw new SpeechError(
            ErrorCode.WHISPER_API_KEY_MISSING,
            'Invalid API key',
            false
          );
        }

        if (response.status === 413) {
          throw new SpeechError(
            ErrorCode.WHISPER_FILE_TOO_LARGE,
            'File too large',
            false
          );
        }

        throw new SpeechError(
          ErrorCode.WHISPER_API_ERROR,
          errorMessage,
          true
        );
      }

      const data = await response.json();

      if (this.resultCallback) {
        this.resultCallback({
          text: data.text,
          isFinal: true,
          confidence: 1.0,
        });
      }

      this.updateState('completed');
      return data.text;
    } catch (error: any) {
      if (error instanceof AppError) {
        this.handleError(error);
        throw error;
      }

      const appError = new SpeechError(
        ErrorCode.WHISPER_API_ERROR,
        error.message || 'Whisper transcription failed',
        true,
        error
      );
      this.handleError(appError);
      throw appError;
    }
  }

  onResult(callback: (result: TranscriptResult) => void): void {
    this.resultCallback = callback;
  }

  onError(callback: (error: AppError) => void): void {
    this.errorCallback = callback;
  }

  onStateChange(callback: (state: SpeechRecognitionState) => void): void {
    this.stateCallback = callback;
  }

  supportsLanguage(language: string): boolean {
    const langCode = language.split('-')[0];
    return this.getSupportedLanguages().some(
      (supported) => supported.split('-')[0] === langCode
    );
  }

  getSupportedLanguages(): string[] {
    // Whisper supports 99+ languages
    return [
      'fa', 'en', 'ar', 'tr', 'de', 'fr', 'es', 'it', 'pt', 'ru',
      'zh', 'ja', 'ko', 'hi', 'nl', 'pl', 'sv', 'uk', 'vi', 'th',
      'id', 'cs', 'el', 'he', 'hu', 'ro', 'da', 'fi', 'no', 'bg',
      'ca', 'hr', 'ms', 'sk', 'ta', 'bn', 'ml', 'te', 'ur', 'mr',
    ];
  }

  private updateState(status: SpeechRecognitionState): void {
    this.state.status = status;
    if (this.stateCallback) {
      this.stateCallback(status);
    }
  }

  private handleError(error: AppError): void {
    this.state.error = error;
    this.updateState('error');
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }
}
