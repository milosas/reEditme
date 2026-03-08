import type { ErrorType } from '../../types/generation';
import { useLanguage } from '../../contexts/LanguageContext';

interface ErrorMessageProps {
  errorType: ErrorType;
  onDismiss: () => void;
  onRetry?: () => void;
}

export function ErrorMessage({ errorType, onDismiss, onRetry }: ErrorMessageProps) {
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
      case 'BAD_IMAGE':
        return t.errors.badImage;
      case 'RATE_LIMIT':
        return t.errors.rateLimit;
      default:
        return t.errors.default;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
        {/* Error header */}
        <div className="flex items-center gap-3 mb-4">
          {/* Error icon */}
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900">Klaida</h2>
        </div>

        {/* Error message */}
        <p className="text-gray-700">
          {getErrorMessage()}
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {t.errors.retry}
            </button>
          )}
          <button
            onClick={onDismiss}
            className={`${onRetry ? 'flex-1' : 'w-full'} bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors`}
          >
            {t.errors.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
