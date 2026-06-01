// Whisper Speech Provider - Production Ready Implementation

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

import { WhisperTranscriptionService } from '../services/WhisperTranscriptionService';

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

  private resultCallback:
    ((result: TranscriptResult) => void) | null = null;

  private errorCallback:
    ((error: AppError) => void) | null = null;

  private stateCallback:
    ((state: SpeechRecognitionState) => void) | null = null;

  private whisperService =
    new WhisperTranscriptionService();

  getState(): SpeechProviderState {
    return { ...this.state };
  }

  async initialize(
    config: SpeechProviderConfig
  ): Promise<void> {
    this.config = config;

    this.state.error = null;
    this.state.retryCount = 0;
  }

  async start(): Promise<void> {
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

  async transcribe(
    audio: Blob
  ): Promise<string> {
    if (!this.config) {
      throw new SpeechError(
        ErrorCode.SPEECH_PROVIDER_ERROR,
        'Provider not initialized',
        false
      );
    }

    this.updateState('processing');

    try {
      // Current Whisper limit
      const maxSize =
        25 * 1024 * 1024;

      if (audio.size > maxSize) {
        throw new SpeechError(
          ErrorCode.WHISPER_FILE_TOO_LARGE,
          'Audio file exceeds 25MB limit',
          false
        );
      }

      const text =
        await this.whisperService.transcribe(
          audio,
          this.config.language
        );

      if (this.resultCallback) {
        this.resultCallback({
          text,
          isFinal: true,
          confidence: 1,
        });
      }

      this.updateState('completed');

      return text;
    } catch (error: any) {
      if (error instanceof AppError) {
        this.handleError(error);
        throw error;
      }

      const appError =
        new SpeechError(
          ErrorCode.WHISPER_API_ERROR,
          error?.message ||
            'Whisper transcription failed',
          true,
          error
        );

      this.handleError(appError);

      throw appError;
    }
  }

  onResult(
    callback: (
      result: TranscriptResult
    ) => void
  ): void {
    this.resultCallback = callback;
  }

  onError(
    callback: (
      error: AppError
    ) => void
  ): void {
    this.errorCallback = callback;
  }

  onStateChange(
    callback: (
      state: SpeechRecognitionState
    ) => void
  ): void {
    this.stateCallback = callback;
  }

  supportsLanguage(
    language: string
  ): boolean {
    const langCode =
      language.split('-')[0];

    return this
      .getSupportedLanguages()
      .some(
        (supported) =>
          supported.split('-')[0] ===
          langCode
      );
  }

  getSupportedLanguages(): string[] {
    return [
      'fa',
      'en',
      'ar',
      'tr',
      'de',
      'fr',
      'es',
      'it',
      'pt',
      'ru',
      'zh',
      'ja',
      'ko',
      'hi',
      'nl',
      'pl',
      'sv',
      'uk',
      'vi',
      'th',
      'id',
      'cs',
      'el',
      'he',
      'hu',
      'ro',
      'da',
      'fi',
      'no',
      'bg',
      'ca',
      'hr',
      'ms',
      'sk',
      'ta',
      'bn',
      'ml',
      'te',
      'ur',
      'mr',
    ];
  }

  private updateState(
    status: SpeechRecognitionState
  ): void {
    this.state.status = status;

    if (this.stateCallback) {
      this.stateCallback(status);
    }
  }

  private handleError(
    error: AppError
  ): void {
    this.state.error = error;

    this.updateState('error');

    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }
}