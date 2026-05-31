// Browser Speech Provider - Web Speech API implementation with finite state machine

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
  parseError,
} from '../../shared/errors';

export class BrowserSpeechProvider implements SpeechProvider {
  readonly name = 'browser';

  private recognition: SpeechRecognition | null = null;
  private config: SpeechProviderConfig | null = null;
  private state: SpeechProviderState = {
    status: 'idle',
    isSupported: true,
    error: null,
    duration: 0,
    retryCount: 0,
  };

  private finalText = '';
  private interimText = '';
  private startTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRecording = false;

  // Callbacks
  private resultCallback: ((result: TranscriptResult) => void) | null = null;
  private errorCallback: ((error: AppError) => void) | null = null;
  private stateCallback: ((state: SpeechRecognitionState) => void) | null = null;

  constructor() {
    this.checkSupport();
  }

  private checkSupport(): void {
    const SpeechAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.state.isSupported = !!SpeechAPI;
  }

  getState(): SpeechProviderState {
    return { ...this.state };
  }

  async initialize(config: SpeechProviderConfig): Promise<void> {
    this.config = config;
    this.finalText = '';
    this.interimText = '';
    this.state.retryCount = 0;
    this.state.error = null;

    const SpeechAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechAPI) {
      const error = new SpeechError(
        ErrorCode.SPEECH_NOT_SUPPORTED,
        'Browser does not support Web Speech API',
        false
      );
      this.handleError(error);
      throw error;
    }

    this.recognition = new SpeechAPI();
    this.setupRecognition();
  }

  private setupRecognition(): void {
    if (!this.recognition || !this.config) return;

    this.recognition.lang = this.config.language;
    this.recognition.continuous = this.config.continuous ?? true;
    this.recognition.interimResults = this.config.interimResults ?? true;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.updateState('listening');
      if (!this.timer) {
        this.startTime = Date.now();
        this.timer = setInterval(() => {
          this.state.duration = Math.floor((Date.now() - this.startTime) / 1000);
        }, 1000);
      }
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const lastResultIndex = event.results.length - 1;
      const lastResult = event.results[lastResultIndex];

      const transcript = lastResult[0].transcript;

      if (lastResult.isFinal) {
        this.finalText = this.finalText
          ? this.finalText + ' ' + transcript.trim()
          : transcript.trim();
        this.interimText = '';

        if (this.resultCallback) {
          this.resultCallback({
            text: this.finalText,
            isFinal: true,
            confidence: lastResult[0].confidence,
          });
        }
      } else {
        this.interimText = transcript;

        if (this.resultCallback) {
          this.resultCallback({
            text: this.finalText + ' ' + this.interimText,
            isFinal: false,
            confidence: lastResult[0].confidence,
          });
        }
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const error = this.mapSpeechError(event.error, event.message);
      this.handleError(error);
    };

    this.recognition.onend = () => {
      if (this.isRecording && this.state.status === 'listening') {
        // Auto-restart with retry logic
        const maxRetries = this.config?.maxRetries ?? 5;
        const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 16000);

        if (this.state.retryCount < maxRetries) {
          this.state.retryCount++;
          setTimeout(() => this.startRecognition(), delay);
        } else {
          this.handleError(
            new SpeechError(
              ErrorCode.SPEECH_NETWORK_ERROR,
              'Maximum retries exceeded',
              true
            )
          );
        }
      } else {
        this.updateState('completed');
        this.cleanup();
      }
    };
  }

  async start(): Promise<void> {
    if (this.state.status !== 'idle') {
      throw new SpeechError(
        ErrorCode.SPEECH_PROVIDER_ERROR,
        'Recognition already in progress',
        false
      );
    }

    this.isRecording = true;
    this.finalText = '';
    this.interimText = '';
    this.state.retryCount = 0;

    await this.startRecognition();
  }

  private async startRecognition(): Promise<void> {
    if (!this.recognition) {
      await this.initialize(this.config!);
    }

    try {
      this.recognition?.start();
    } catch (error: any) {
      if (error.message?.includes('already started')) {
        // Recognition already running, ignore
        return;
      }

      // Wait and retry once
      await new Promise((resolve) => setTimeout(resolve, 100));
      try {
        this.recognition?.start();
      } catch (retryError) {
        throw parseError(retryError);
      }
    }
  }

  async stop(): Promise<string> {
    if (this.state.status !== 'listening') {
      return this.finalText;
    }

    this.updateState('stopping');
    this.isRecording = false;

    return new Promise((resolve) => {
      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch (error) {
          // Ignore errors on stop
        }
      }

      // Give it a moment to finalize
      setTimeout(() => {
        this.updateState('completed');
        this.cleanup();
        resolve(this.finalText);
      }, 100);
    });
  }

  destroy(): void {
    this.isRecording = false;
    this.cleanup();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        // Ignore
      }
      this.recognition = null;
    }
  }

  async transcribe(audio: Blob): Promise<string> {
    // Browser provider cannot transcribe from audio file
    throw new SpeechError(
      ErrorCode.SPEECH_PROVIDER_ERROR,
      'Browser provider does not support audio file transcription',
      false
    );
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
    // Web Speech API supports many languages
    const supportedLanguages = this.getSupportedLanguages();
    return supportedLanguages.includes(language);
  }

  getSupportedLanguages(): string[] {
    return [
      'fa-IR', 'fa-AF',
      'en-US', 'en-GB', 'en-AU', 'en-IN',
      'ar-SA', 'ar-EG', 'ar-AE',
      'tr-TR',
      'de-DE', 'de-AT',
      'fr-FR', 'fr-CA',
      'es-ES', 'es-MX',
      'it-IT', 'pt-BR', 'pt-PT',
      'ru-RU', 'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR',
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

  private cleanup(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private mapSpeechError(error: string, message?: string): AppError {
    switch (error) {
      case 'not-allowed':
      case 'permission-denied':
        return new SpeechError(
          ErrorCode.SPEECH_PERMISSION_DENIED,
          'Microphone access denied',
          false
        );
      case 'no-speech':
        return new SpeechError(
          ErrorCode.SPEECH_NO_SPEECH,
          'No speech detected',
          true
        );
      case 'aborted':
        return new SpeechError(
          ErrorCode.SPEECH_ABORTED,
          'Speech recognition aborted',
          false
        );
      case 'network':
        return new SpeechError(
          ErrorCode.SPEECH_NETWORK_ERROR,
          'Network error during speech recognition',
          true
        );
      case 'audio-capture':
        return new SpeechError(
          ErrorCode.SPEECH_AUDIO_CAPTURE,
          'Audio capture failed',
          false
        );
      case 'service-not-allowed':
        return new SpeechError(
          ErrorCode.SPEECH_SERVICE_NOT_ALLOWED,
          'Speech service not allowed',
          false
        );
      case 'language-not-supported':
        return new SpeechError(
          ErrorCode.SPEECH_LANGUAGE_NOT_SUPPORTED,
          'Language not supported',
          false
        );
      default:
        return new SpeechError(
          ErrorCode.SPEECH_PROVIDER_ERROR,
          message || error,
          true
        );
    }
  }
}
