// Audio Upload Service - Handles audio file upload to Supabase Storage with retry logic

import { supabase } from '../../../lib/supabase';
import { StorageError, ErrorCode, parseError } from '../../../shared/errors';

export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface AudioUploadResult {
  url: string;
  path: string;
  size: number;
  duration: number;
  mimeType: string;
}

export interface AudioUploadOptions {
  file: Blob;
  fileName?: string;
  mimeType?: string;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
  maxRetries?: number;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

export class AudioUploadService {
  private static instance: AudioUploadService;
  private bucketName = 'recordings';

  private constructor() {}

  static getInstance(): AudioUploadService {
    if (!AudioUploadService.instance) {
      AudioUploadService.instance = new AudioUploadService();
    }
    return AudioUploadService.instance;
  }

  async upload(userId: string, options: AudioUploadOptions): Promise<AudioUploadResult> {
    const {
      file,
      fileName,
      mimeType = 'audio/webm',
      onProgress,
      signal,
      maxRetries = DEFAULT_MAX_RETRIES,
    } = options;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new StorageError(
        ErrorCode.STORAGE_QUOTA_EXCEEDED,
        'File size exceeds 50MB limit',
        false
      );
    }

    // Generate storage path: user_id/year/month/filename
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now();
    const extension = this.getExtension(mimeType);
    const name = fileName || `recording_${timestamp}${extension}`;
    const path = `${userId}/${year}/${month}/${name}`;

    let lastError: Error | null = null;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      // Check if aborted
      if (signal?.aborted) {
        throw new StorageError(
          ErrorCode.STORAGE_UPLOAD_FAILED,
          'Upload cancelled',
          false
        );
      }

      try {
        // Upload with progress tracking
        const { data, error } = await supabase.storage
          .from(this.bucketName)
          .upload(path, file, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          throw error;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(this.bucketName)
          .getPublicUrl(data.path);

        // Report completion
        if (onProgress) {
          onProgress({ loaded: file.size, total: file.size, percentage: 100 });
        }

        // Calculate duration from audio blob
        const duration = await this.getAudioDuration(file);

        return {
          url: urlData.publicUrl,
          path: data.path,
          size: file.size,
          duration,
          mimeType,
        };
      } catch (error: any) {
        lastError = parseError(error);

        // Don't retry on non-retryable errors
        if (error instanceof StorageError && !error.retryable) {
          throw error;
        }

        // Don't retry if aborted
        if (signal?.aborted) {
          throw new StorageError(
            ErrorCode.STORAGE_UPLOAD_FAILED,
            'Upload cancelled',
            false
          );
        }

        retryCount++;

        // Wait before retry (exponential backoff)
        if (retryCount <= maxRetries) {
          const delay = RETRY_DELAYS[Math.min(retryCount - 1, RETRY_DELAYS.length - 1)];
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw new StorageError(
      ErrorCode.STORAGE_UPLOAD_FAILED,
      `Upload failed after ${maxRetries} retries: ${lastError?.message}`,
      false,
      lastError
    );
  }

  async delete(path: string): Promise<void> {
    const { error } = await supabase.storage.from(this.bucketName).remove([path]);

    if (error) {
      throw new StorageError(
        ErrorCode.STORAGE_DELETE_FAILED,
        `Failed to delete audio file: ${error.message}`,
        false,
        error
      );
    }
  }

  async deleteMultiple(paths: string[]): Promise<void> {
    const { error } = await supabase.storage.from(this.bucketName).remove(paths);

    if (error) {
      throw new StorageError(
        ErrorCode.STORAGE_DELETE_FAILED,
        `Failed to delete audio files: ${error.message}`,
        false,
        error
      );
    }
  }

  async cleanupOrphanFiles(userId: string, validPaths: string[]): Promise<void> {
    // List all files for user
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .list(userId, {
        recursive: true,
      });

    if (error) {
      console.error('Failed to list files for cleanup:', error);
      return;
    }

    // Find orphan files
    const allPaths = data?.map((file) => `${userId}/${file.name}`) || [];
    const orphanPaths = allPaths.filter((path) => !validPaths.includes(path));

    // Delete orphan files
    if (orphanPaths.length > 0) {
      await this.deleteMultiple(orphanPaths);
      console.log(`Cleaned up ${orphanPaths.length} orphan files`);
    }
  }

  private getExtension(mimeType: string): string {
    switch (mimeType) {
      case 'audio/webm':
        return '.webm';
      case 'audio/mp3':
      case 'audio/mpeg':
        return '.mp3';
      case 'audio/wav':
        case 'audio/wave':
        return '.wav';
      case 'audio/mp4':
      case 'audio/m4a':
        return '.m4a';
      case 'audio/ogg':
        return '.ogg';
      default:
        return '.webm';
    }
  }

  private async getAudioDuration(blob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(Math.floor(audio.duration));
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0); // Return 0 if unable to determine duration
      };
    });
  }
}

export const audioUploadService = AudioUploadService.getInstance();
