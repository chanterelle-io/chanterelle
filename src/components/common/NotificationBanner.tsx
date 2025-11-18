import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationBannerProps {
  message: string;
  type: NotificationType;
  isVisible: boolean;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  message,
  type,
  isVisible,
  onClose,
  autoClose = true,
  autoCloseDelay = 3000,
}) => {
  useEffect(() => {
    if (isVisible && autoClose) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoClose, autoCloseDelay, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-600 dark:text-green-400" />;
      case 'error':
        return <AlertCircle size={20} className="text-red-600 dark:text-red-400" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400" />;
      case 'info':
        return <Info size={20} className="text-blue-600 dark:text-blue-400" />;
      default:
        return <Info size={20} className="text-blue-600 dark:text-blue-400" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700';
      default:
        return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800 dark:text-green-200';
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'text-blue-800 dark:text-blue-200';
      default:
        return 'text-blue-800 dark:text-blue-200';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md w-full mx-4 p-4 rounded-lg border ${getBackgroundColor()} shadow-lg transform transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          {getIcon()}
        </div>
        <div className={`flex-1 ${getTextColor()}`}>
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className={`flex-shrink-0 ml-3 ${getTextColor()} hover:opacity-70 transition-opacity duration-200`}
          aria-label="Close notification"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
