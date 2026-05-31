import { useState, useRef, useCallback, useEffect } from 'react';

export type RecognitionState = 'idle' | 'recording' | 'paused' | 'processing';

interface UseSpeechRecognitionProps {
  language: string;
  onTranscriptUpdate: (finalText: string, interimText: string) => void;
}

export function useSpeechRecognition({ language, onTranscriptUpdate }: UseSpeechRecognitionProps) {
  const [state, setState] = useState<RecognitionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecordingRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Accumulated final text for this session
  const finalTextRef = useRef<string>('');
  // Current interim text
  const interimTextRef = useRef<string>('');

  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const createRecognition = useCallback(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    return recognition;
  }, [language]);

  const startRecognition = useCallback(() => {
    if (!isRecordingRef.current) return;

    const recognition = createRecognition();
    if (!recognition) return;

    recognition.onstart = () => {
      setState('recording');
      if (!timerRef.current) {
        startTimer();
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Get the last result (most recent)
      const lastResultIndex = event.results.length - 1;
      const lastResult = event.results[lastResultIndex];

      if (lastResult.isFinal) {
        // Add to final text immediately
        const transcript = lastResult[0].transcript.trim();
        if (transcript) {
          finalTextRef.current = finalTextRef.current
            ? finalTextRef.current + ' ' + transcript
            : transcript;
        }
        interimTextRef.current = '';
      } else {
        // Update interim text
        interimTextRef.current = lastResult[0].transcript;
      }

      // Notify parent with both final and interim
      onTranscriptUpdate(finalTextRef.current, interimTextRef.current);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setError('دسترسی به میکروفون رد شد.');
        isRecordingRef.current = false;
        setState('idle');
        stopTimer();
        return;
      }

      // Restart on error
      if (isRecordingRef.current && event.error !== 'aborted') {
        setTimeout(() => startRecognition(), 5);
      }
    };

    recognition.onend = () => {
      // Restart if still recording
      if (isRecordingRef.current) {
        setTimeout(() => startRecognition(), 5);
      } else {
        setState('idle');
        stopTimer();
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      try {
        recognition.stop();
      } catch (e2) {
        // Ignore
      }
      setTimeout(() => {
        if (isRecordingRef.current) {
          startRecognition();
        }
      }, 5);
    }
  }, [createRecognition, onTranscriptUpdate, startTimer, stopTimer]);

  const start = useCallback(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError('مرورگر شما از تشخیص گفتار پشتیبانی نمی‌کند.');
      return;
    }

    setError(null);
    setDuration(0);
    finalTextRef.current = '';
    interimTextRef.current = '';
    isRecordingRef.current = true;
    setState('recording');

    startRecognition();
  }, [startRecognition]);

  const stop = useCallback(() => {
    // Save the final text before stopping
    const savedFinalText = finalTextRef.current;

    isRecordingRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
      recognitionRef.current = null;
    }
    setState('idle');
    stopTimer();

    // Clear refs for next session
    finalTextRef.current = '';
    interimTextRef.current = '';

    // Return the saved text
    return savedFinalText;
  }, [stopTimer]);

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
      stopTimer();
    };
  }, [stopTimer]);

  return { state, error, isSupported, duration, start, stop };
}
