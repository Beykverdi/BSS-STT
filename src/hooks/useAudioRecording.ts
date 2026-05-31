import { useState, useRef, useCallback, useEffect } from 'react';
import type { AudioRecording } from '../types';

interface UseAudioRecordingReturn {
  isRecording: boolean;
  audioData: AudioRecording | null;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<AudioRecording | null>;
  cancelRecording: () => void;
  error: string | null;
}

export function useAudioRecording(): UseAudioRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<AudioRecording | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;

      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);

      setIsRecording(true);
    } catch (err) {
      setError('دسترسی به میکروفون رد شد.');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<AudioRecording | null> => {
    if (!mediaRecorderRef.current || !isRecording) return null;

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const durationMs = Date.now() - startTimeRef.current;

        const recording: AudioRecording = {
          blob,
          url,
          duration: Math.floor(durationMs / 1000),
          size: blob.size,
        };

        setAudioData(recording);
        setIsRecording(false);

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        resolve(recording);
      };

      mediaRecorder.stop();
    });
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
    setDuration(0);
    chunksRef.current = [];
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    isRecording,
    audioData,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
    error,
  };
}
