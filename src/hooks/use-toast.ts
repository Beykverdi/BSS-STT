import { useState, useCallback } from 'react';
import type { ToastMessage } from '../types';

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (
      type: ToastMessage['type'],
      title: string,
      description?: string,
      duration = 5000
    ) => {
      const id = crypto.randomUUID();
      const toast: ToastMessage = { id, type, title, description };

      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }

      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (title: string, description?: string) => addToast('success', title, description),
    [addToast]
  );

  const error = useCallback(
    (title: string, description?: string) => addToast('error', title, description),
    [addToast]
  );

  const warning = useCallback(
    (title: string, description?: string) => addToast('warning', title, description),
    [addToast]
  );

  const info = useCallback(
    (title: string, description?: string) => addToast('info', title, description),
    [addToast]
  );

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}
