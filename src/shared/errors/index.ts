// Centralized error types for the application

export enum ErrorCode {
  // Database errors
  DATABASE_INSERT_FAILED = 'DATABASE_INSERT_FAILED',
  DATABASE_UPDATE_FAILED = 'DATABASE_UPDATE_FAILED',
  DATABASE_DELETE_FAILED = 'DATABASE_DELETE_FAILED',
  DATABASE_QUERY_FAILED = 'DATABASE_QUERY_FAILED',

  // Storage errors
  STORAGE_UPLOAD_FAILED = 'STORAGE_UPLOAD_FAILED',
  STORAGE_DELETE_FAILED = 'STORAGE_DELETE_FAILED',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',

  // Speech recognition errors
  SPEECH_NOT_SUPPORTED = 'SPEECH_NOT_SUPPORTED',
  SPEECH_PERMISSION_DENIED = 'SPEECH_PERMISSION_DENIED',
  SPEECH_NO_SPEECH = 'SPEECH_NO_SPEECH',
  SPEECH_ABORTED = 'SPEECH_ABORTED',
  SPEECH_NETWORK_ERROR = 'SPEECH_NETWORK_ERROR',
  SPEECH_AUDIO_CAPTURE = 'SPEECH_AUDIO_CAPTURE',
  SPEECH_SERVICE_NOT_ALLOWED = 'SPEECH_SERVICE_NOT_ALLOWED',
  SPEECH_BAD_GRAMMAR = 'SPEECH_BAD_GRAMMAR',
  SPEECH_LANGUAGE_NOT_SUPPORTED = 'SPEECH_LANGUAGE_NOT_SUPPORTED',
  SPEECH_PROVIDER_ERROR = 'SPEECH_PROVIDER_ERROR',

  // Whisper API errors
  WHISPER_API_KEY_MISSING = 'WHISPER_API_KEY_MISSING',
  WHISPER_API_ERROR = 'WHISPER_API_ERROR',
  WHISPER_FILE_TOO_LARGE = 'WHISPER_FILE_TOO_LARGE',

  // Network errors
  NETWORK_OFFLINE = 'NETWORK_OFFLINE',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_UNKNOWN = 'NETWORK_UNKNOWN',

  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  AUTH_REQUIRED = 'AUTH_REQUIRED',

  // Unknown
  UNKNOWN = 'UNKNOWN',
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public retryable: boolean = false,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class DatabaseError extends AppError {
  constructor(code: ErrorCode, message: string, originalError?: unknown) {
    super(code, message, false, originalError);
    this.name = 'DatabaseError';
  }
}

export class StorageError extends AppError {
  constructor(code: ErrorCode, message: string, retryable: boolean = true, originalError?: unknown) {
    super(code, message, retryable, originalError);
    this.name = 'StorageError';
  }
}

export class SpeechError extends AppError {
  constructor(code: ErrorCode, message: string, retryable: boolean = false, originalError?: unknown) {
    super(code, message, retryable, originalError);
    this.name = 'SpeechError';
  }
}

export class NetworkError extends AppError {
  constructor(code: ErrorCode, message: string, retryable: boolean = true, originalError?: unknown) {
    super(code, message, retryable, originalError);
    this.name = 'NetworkError';
  }
}

// Helper function to parse errors
export function parseError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return new NetworkError(ErrorCode.NETWORK_UNKNOWN, error.message, true, error);
    }

    return new AppError(ErrorCode.UNKNOWN, error.message, false, error);
  }

  return new AppError(ErrorCode.UNKNOWN, 'خطای ناشناخته رخ داد', false, error);
}

// User-friendly error messages in Persian
export function getErrorMessage(error: AppError): string {
  switch (error.code) {
    // Database
    case ErrorCode.DATABASE_INSERT_FAILED:
      return 'ذخیره‌سازی اطلاعات ناموفق بود';
    case ErrorCode.DATABASE_UPDATE_FAILED:
      return 'به‌روزرسانی اطلاعات ناموفق بود';
    case ErrorCode.DATABASE_DELETE_FAILED:
      return 'حذف اطلاعات ناموفق بود';
    case ErrorCode.DATABASE_QUERY_FAILED:
      return 'دریافت اطلاعات ناموفق بود';

    // Storage
    case ErrorCode.STORAGE_UPLOAD_FAILED:
      return 'آپلود فایل صوتی ناموفق بود';
    case ErrorCode.STORAGE_DELETE_FAILED:
      return 'حذف فایل صوتی ناموفق بود';
    case ErrorCode.STORAGE_QUOTA_EXCEEDED:
      return 'فضای ذخیره‌سازی پر شده است';

    // Speech
    case ErrorCode.SPEECH_NOT_SUPPORTED:
      return 'مرورگر شما از تشخیص گفتار پشتیبانی نمی‌کند';
    case ErrorCode.SPEECH_PERMISSION_DENIED:
      return 'دسترسی به میکروفون رد شد';
    case ErrorCode.SPEECH_NO_SPEECH:
      return 'هیچ گفتاری تشخیص داده نشد';
    case ErrorCode.SPEECH_ABORTED:
      return 'تشخیص گفتار لغو شد';
    case ErrorCode.SPEECH_NETWORK_ERROR:
      return 'خطای شبکه در تشخیص گفتار';
    case ErrorCode.SPEECH_AUDIO_CAPTURE:
      return 'خطا در ضبط صدا';
    case ErrorCode.SPEECH_PROVIDER_ERROR:
      return 'سرویس تشخیص گفتار در دسترس نیست';

    // Whisper
    case ErrorCode.WHISPER_API_KEY_MISSING:
      return 'کلید API تنظیم نشده است';
    case ErrorCode.WHISPER_API_ERROR:
      return 'خطا در سرویس Whisper';
    case ErrorCode.WHISPER_FILE_TOO_LARGE:
      return 'فایل صوتی خیلی بزرگ است';

    // Network
    case ErrorCode.NETWORK_OFFLINE:
      return 'اتصال اینترنت قطع است';
    case ErrorCode.NETWORK_TIMEOUT:
      return 'زمان انتظار به پایان رسید';
    case ErrorCode.NETWORK_UNKNOWN:
      return 'خطای شبکه رخ داد';

    // Validation
    case ErrorCode.VALIDATION_FAILED:
      return 'اطلاعات نامعتبر است';
    case ErrorCode.AUTH_REQUIRED:
      return 'لطفا وارد شوید';

    default:
      return 'خطای ناشناخته رخ داد';
  }
}
