import { useState, useCallback, useEffect, useRef } from 'react';
import { NotificationType } from '../components/common/NotificationBanner';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  isVisible: boolean;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export const useNotification = () => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const showNotification = useCallback((
    message: string, 
    type: NotificationType = 'info',
    autoClose: boolean = true,
    autoCloseDelay: number = 3000
  ) => {
    const id = Date.now().toString();
    setNotification({
      id,
      message,
      type,
      isVisible: true,
      autoClose,
      autoCloseDelay,
    });
  }, []);

  // Auto-close effect
  useEffect(() => {
    if (notification?.autoClose && notification.isVisible) {
      timeoutRef.current = setTimeout(() => {
        hideNotification();
      }, notification.autoCloseDelay || 3000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [notification]);

  const hideNotification = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (notification) {
      setNotification(prev => prev ? { ...prev, isVisible: false } : null);
      // Remove from state after animation completes
      setTimeout(() => setNotification(null), 300);
    }
  }, [notification]);

  const showSuccess = useCallback((message: string, autoCloseDelay: number = 2000) => {
    showNotification(message, 'success', true, autoCloseDelay);
  }, [showNotification]);

  const showError = useCallback((message: string, autoClose: boolean = false) => {
    showNotification(message, 'error', autoClose, 5000);
  }, [showNotification]);

  const showWarning = useCallback((message: string, autoCloseDelay: number = 4000) => {
    showNotification(message, 'warning', true, autoCloseDelay);
  }, [showNotification]);

  const showInfo = useCallback((message: string, autoClose: boolean = false) => {
    showNotification(message, 'info', autoClose, 3000);
  }, [showNotification]);

  return {
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};
