import { toast } from "@/hooks/use-toast";

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
  isRetryable: boolean;
  userMessage: string;
}

export function parseSupabaseError(error: any): ApiError {
  const message = error?.message || 'An unexpected error occurred';
  const code = error?.code || error?.error_code;
  
  // Common Supabase error patterns
  if (message.includes('JWT') || message.includes('token')) {
    return {
      message,
      code,
      isRetryable: false,
      userMessage: 'Your session has expired. Please log in again.',
    };
  }
  
  if (message.includes('duplicate key')) {
    return {
      message,
      code,
      isRetryable: false,
      userMessage: 'This item already exists. Please use a different name.',
    };
  }
  
  if (message.includes('foreign key') || message.includes('violates')) {
    return {
      message,
      code,
      isRetryable: false,
      userMessage: 'This action conflicts with existing data. Please check your inputs.',
    };
  }
  
  if (message.includes('timeout') || message.includes('network')) {
    return {
      message,
      code,
      isRetryable: true,
      userMessage: 'Connection problem. Please check your internet and try again.',
    };
  }
  
  if (message.includes('row-level security')) {
    return {
      message,
      code,
      isRetryable: false,
      userMessage: 'Access denied. You may need to log in or check your permissions.',
    };
  }
  
  // Default case
  return {
    message,
    code,
    isRetryable: code !== 'PGRST301', // Not retryable for permission errors
    userMessage: 'Something went wrong. Please try again.',
    details: error,
  };
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const parsedError = parseSupabaseError(error);
      
      // Don't retry if error is not retryable
      if (!parsedError.isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
}

export function handleError(error: any, customMessage?: string) {
  const parsedError = parseSupabaseError(error);
  
  toast({
    title: "Error",
    description: customMessage || parsedError.userMessage,
    variant: "destructive",
  });
  
  // Log detailed error for debugging
  console.error('Error details:', {
    message: parsedError.message,
    code: parsedError.code,
    details: parsedError.details,
    isRetryable: parsedError.isRetryable,
  });
}

export function showSuccessMessage(message: string) {
  toast({
    title: "Success",
    description: message,
  });
}

export function showInfoMessage(message: string) {
  toast({
    title: "Info",
    description: message,
  });
}