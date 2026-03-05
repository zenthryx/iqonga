import toast from 'react-hot-toast';

/**
 * Centralized error handling utility
 */

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

/**
 * Handle API errors with user-friendly messages
 */
export const handleApiError = (error: any, context?: string): ApiError => {
  console.error(`API Error ${context ? `in ${context}` : ''}:`, error);

  let apiError: ApiError = {
    message: 'An unexpected error occurred',
    status: 500
  };

  if (error.response) {
    // Server responded with error
    const { status, data } = error.response;
    apiError.status = status;
    apiError.message = data?.message || data?.error || getStatusMessage(status);
    apiError.code = data?.code;
    apiError.details = data?.details;
  } else if (error.request) {
    // Request made but no response
    apiError.message = 'Network error. Please check your internet connection.';
    apiError.status = 0;
  } else {
    // Something else happened
    apiError.message = error.message || 'An unexpected error occurred';
  }

  return apiError;
};

/**
 * Get user-friendly message for HTTP status codes
 */
const getStatusMessage = (status: number): string => {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'You are not authorized. Please login again.';
    case 403:
      return 'Access denied. You do not have permission.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'A conflict occurred. The resource may already exist.';
    case 422:
      return 'Validation failed. Please check your input.';
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
      return 'Server error. Please try again later.';
    case 502:
      return 'Bad gateway. The server is temporarily unavailable.';
    case 503:
      return 'Service unavailable. Please try again later.';
    default:
      return `An error occurred (${status})`;
  }
};

/**
 * Display error toast notification
 */
export const showErrorToast = (error: ApiError | string, duration: number = 4000) => {
  const message = typeof error === 'string' ? error : error.message;
  toast.error(message, { duration });
};

/**
 * Display success toast notification
 */
export const showSuccessToast = (message: string, duration: number = 3000) => {
  toast.success(message, { duration });
};

/**
 * Display info toast notification
 */
export const showInfoToast = (message: string, duration: number = 3000) => {
  toast(message, { duration, icon: 'ℹ️' });
};

/**
 * Display warning toast notification
 */
export const showWarningToast = (message: string, duration: number = 4000) => {
  toast(message, {
    duration,
    icon: '⚠️',
    style: {
      background: '#FFA500',
      color: '#fff',
    },
  });
};

/**
 * Retry async operation with exponential backoff
 */
export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

/**
 * Validate form data and return errors
 */
export const validateFormData = (
  data: Record<string, any>,
  rules: Record<string, (value: any) => string | null>
): Record<string, string> => {
  const errors: Record<string, string> = {};

  for (const [field, rule] of Object.entries(rules)) {
    const error = rule(data[field]);
    if (error) {
      errors[field] = error;
    }
  }

  return errors;
};

/**
 * Common validation rules
 */
export const validationRules = {
  required: (value: any) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return 'This field is required';
    }
    return null;
  },

  email: (value: string) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Invalid email address';
    }
    return null;
  },

  minLength: (min: number) => (value: string) => {
    if (value && value.length < min) {
      return `Must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (max: number) => (value: string) => {
    if (value && value.length > max) {
      return `Must be no more than ${max} characters`;
    }
    return null;
  },

  minValue: (min: number) => (value: number) => {
    if (value !== undefined && value < min) {
      return `Must be at least ${min}`;
    }
    return null;
  },

  maxValue: (max: number) => (value: number) => {
    if (value !== undefined && value > max) {
      return `Must be no more than ${max}`;
    }
    return null;
  },

  pattern: (regex: RegExp, message: string) => (value: string) => {
    if (value && !regex.test(value)) {
      return message;
    }
    return null;
  },

  url: (value: string) => {
    if (value) {
      try {
        new URL(value);
      } catch {
        return 'Invalid URL';
      }
    }
    return null;
  },

  phone: (value: string) => {
    if (value && !/^[\d\s\-\+\(\)]+$/.test(value)) {
      return 'Invalid phone number';
    }
    return null;
  }
};

/**
 * Format error for display
 */
export const formatError = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }

  if (error.message) {
    return error.message;
  }

  if (error.error) {
    return error.error;
  }

  return 'An unknown error occurred';
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: any): boolean => {
  return !error.response && error.request;
};

/**
 * Check if error is a validation error
 */
export const isValidationError = (error: any): boolean => {
  return error.response?.status === 400 || error.response?.status === 422;
};

/**
 * Check if error is an auth error
 */
export const isAuthError = (error: any): boolean => {
  return error.response?.status === 401;
};

/**
 * Check if error is a permission error
 */
export const isPermissionError = (error: any): boolean => {
  return error.response?.status === 403;
};

/**
 * Global error handler for unhandled promise rejections
 */
export const setupGlobalErrorHandlers = () => {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    if (process.env.NODE_ENV === 'production') {
      // Log to error tracking service
      // Example: Sentry.captureException(event.reason);
    } else {
      showErrorToast('An unexpected error occurred. Check console for details.');
    }
  });

  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    if (process.env.NODE_ENV === 'production') {
      // Log to error tracking service
      // Example: Sentry.captureException(event.error);
    }
  });
};

