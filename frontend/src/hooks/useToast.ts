import { useState, useCallback } from 'react';
import { type ToastMessage } from '../components/Toast';

let toastIdCounter = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((
    type: ToastMessage['type'],
    title: string,
    message?: string,
    options?: {
      duration?: number;
      action?: ToastMessage['action'];
    }
  ) => {
    const id = `toast-${++toastIdCounter}`;
    const newToast: ToastMessage = {
      id,
      type,
      title,
      message,
      duration: options?.duration,
      action: options?.action,
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((title: string, message?: string, options?: { duration?: number; action?: ToastMessage['action'] }) => {
    return addToast('success', title, message, options);
  }, [addToast]);

  const showError = useCallback((title: string, message?: string, options?: { duration?: number; action?: ToastMessage['action'] }) => {
    return addToast('error', title, message, options);
  }, [addToast]);

  const showWarning = useCallback((title: string, message?: string, options?: { duration?: number; action?: ToastMessage['action'] }) => {
    return addToast('warning', title, message, options);
  }, [addToast]);

  const showInfo = useCallback((title: string, message?: string, options?: { duration?: number; action?: ToastMessage['action'] }) => {
    return addToast('info', title, message, options);
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};