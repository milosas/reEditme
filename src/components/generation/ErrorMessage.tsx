import { useEffect } from 'react';
import type { ErrorType } from '../../types/generation';
import { useLanguage } from '../../contexts/LanguageContext';

interface ErrorMessageProps {
  errorType: ErrorType;
  onDismiss: () => void;
}

export function ErrorMessage({ errorType, onDismiss }: ErrorMessageProps) {
  const { t } = useLanguage();

  // Map error type to message
  const getErrorMessage = () => {
    switch (errorType) {
      case 'TIMEOUT':
        return t.errors.timeout;
      case 'NETWORK':
        return t.errors.network;
      case 'API_ERROR':
        return t.errors.api;
      case 'AVATAR_LOAD_FAILED':
        return t.errors.avatarLoad || t.errors.default;
      case 'INSUFFICIENT_CREDITS':
        return t.errors.insufficientCredits || 'Nepakanka kreditų. Papildykite kreditų balansą.';
      default:
        return t.errors.default;
    }
  };

  const dismissDelay = 3000;
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, dismissDelay);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
        {/* Error header */}
        <div className="flex items-center gap-3 mb-4">
          {/* Error icon */}
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900">Error</h2>
        </div>

        {/* Error message */}
        <p className="text-gray-700">
          {getErrorMessage()}
        </p>
      </div>
    </div>
  );
}
