import { useState } from 'react';
import { withRetry, handleError, showSuccessMessage } from '@/lib/error-utils';

interface UseAsyncOperationOptions {
  onSuccess?: (result?: any) => void;
  onError?: (error: any) => void;
  successMessage?: string;
  errorMessage?: string;
  enableRetry?: boolean;
  maxRetries?: number;
}

export function useAsyncOperation<T = any>(options: UseAsyncOperationOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const execute = async (
    operation: () => Promise<T>,
    customOptions?: Partial<UseAsyncOperationOptions>
  ): Promise<T | null> => {
    const opts = { ...options, ...customOptions };
    
    try {
      setIsLoading(true);
      setError(null);

      const result = opts.enableRetry 
        ? await withRetry(operation, opts.maxRetries)
        : await operation();

      if (opts.successMessage) {
        showSuccessMessage(opts.successMessage);
      }

      opts.onSuccess?.(result);
      return result;
    } catch (err) {
      setError(err);
      
      if (opts.errorMessage) {
        handleError(err, opts.errorMessage);
      } else {
        handleError(err);
      }
      
      opts.onError?.(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    execute,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}