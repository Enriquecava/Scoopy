import { useEffect } from 'react';
import { logger, LOG_EVENT } from '../shared/logger';

/**
 * Hook to set up global error handlers for the React application.
 * Captures unhandled errors and promise rejections.
 */
export function useErrorHandler(): void {
  useEffect(() => {
    // Handle uncaught errors
    const handleError = (event: ErrorEvent): void => {
      logger.error('Uncaught error', {
        event: LOG_EVENT.APP_ERROR,
        error: event.error,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      logger.error('Unhandled promise rejection', {
        event: LOG_EVENT.APP_ERROR,
        error: event.reason,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
}
