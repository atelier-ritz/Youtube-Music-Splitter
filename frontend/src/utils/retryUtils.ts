/**
 * Frontend Retry Utilities
 * 
 * Provides retry mechanisms for API calls and async operations in the frontend
 * with exponential backoff and error categorization.
 * 
 * Requirements: 1.5, 2.4, 7.4
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffFactor: number;
  jitter: boolean;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

/**
 * Default retry configuration for frontend operations
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 8000,
  backoffFactor: 2,
  jitter: true,
  retryCondition: (error: any) => {
    // Retry on network errors and 5xx server errors
    if (error?.code === 'NETWORK_ERROR' || error?.name === 'NetworkError') {
      return true;
    }
    
    // Retry on specific HTTP status codes
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    if (error?.response?.status && retryableStatuses.includes(error.response.status)) {
      return true;
    }
    
    // Retry on timeout errors
    if (error?.message?.includes('timeout') || error?.code === 'ECONNABORTED') {
      return true;
    }
    
    return false;
  }
};

/**
 * Sleep utility function
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Calculate delay with exponential backoff and optional jitter
 */
const calculateDelay = (
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  backoffFactor: number,
  jitter: boolean
): number => {
  let delay = baseDelay * Math.pow(backoffFactor, attempt - 1);
  
  if (jitter) {
    // Add random jitter (±25%)
    const jitterAmount = delay * 0.25;
    delay += (Math.random() - 0.5) * 2 * jitterAmount;
  }
  
  return Math.min(delay, maxDelay);
};

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      if (!config.retryCondition!(lastError)) {
        throw lastError;
      }
      
      // Don't wait after the last attempt
      if (attempt === config.maxAttempts) {
        break;
      }
      
      // Call retry callback if provided
      if (config.onRetry) {
        config.onRetry(attempt, lastError);
      }
      
      // Calculate and wait for delay
      const delay = calculateDelay(
        attempt,
        config.baseDelay,
        config.maxDelay,
        config.backoffFactor,
        config.jitter
      );
      
      console.log(`Retry attempt ${attempt}/${config.maxAttempts} after ${delay}ms delay. Error:`, lastError.message || lastError);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Retry-enabled fetch wrapper
 */
export async function retryableFetch(
  url: string,
  options: RequestInit = {},
  retryOptions: Partial<RetryOptions> = {}
): Promise<Response> {
  return retryWithBackoff(async () => {
    const response = await fetch(url, options);
    
    // Throw error for non-ok responses to trigger retry logic
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as any).response = response;
      throw error;
    }
    
    return response;
  }, retryOptions);
}

/**
 * Retry-enabled axios wrapper
 */
export function createRetryableAxios(axiosInstance: any, retryOptions: Partial<RetryOptions> = {}) {
  return {
    async get(url: string, config?: any) {
      return retryWithBackoff(() => axiosInstance.get(url, config), retryOptions);
    },
    
    async post(url: string, data?: any, config?: any) {
      return retryWithBackoff(() => axiosInstance.post(url, data, config), retryOptions);
    },
    
    async put(url: string, data?: any, config?: any) {
      return retryWithBackoff(() => axiosInstance.put(url, data, config), retryOptions);
    },
    
    async delete(url: string, config?: any) {
      return retryWithBackoff(() => axiosInstance.delete(url, config), retryOptions);
    }
  };
}

/**
 * Polling with exponential backoff
 */
export async function pollWithBackoff<T>(
  operation: () => Promise<T>,
  condition: (result: T) => boolean,
  options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    onPoll?: (attempt: number, result: T) => void;
  } = {}
): Promise<T> {
  const config = {
    maxAttempts: 20,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffFactor: 1.2,
    ...options
  };

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await operation();
      
      if (config.onPoll) {
        config.onPoll(attempt, result);
      }
      
      if (condition(result)) {
        return result;
      }
      
      if (attempt < config.maxAttempts) {
        const delay = calculateDelay(
          attempt,
          config.baseDelay,
          config.maxDelay,
          config.backoffFactor,
          true
        );
        
        await sleep(delay);
      }
    } catch (error) {
      console.error(`Polling attempt ${attempt} failed:`, error);
      
      if (attempt === config.maxAttempts) {
        throw error;
      }
      
      // Wait before retrying on error
      const delay = calculateDelay(
        attempt,
        config.baseDelay,
        config.maxDelay,
        config.backoffFactor,
        true
      );
      
      await sleep(delay);
    }
  }
  
  throw new Error(`Polling failed after ${config.maxAttempts} attempts`);
}

/**
 * Timeout wrapper for operations
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    )
  ]);
}

/**
 * Error categorization utility
 */
export function categorizeError(error: any): {
  type: 'network' | 'timeout' | 'server' | 'client' | 'unknown';
  isRetryable: boolean;
  message: string;
} {
  // Network errors
  if (error?.code === 'NETWORK_ERROR' || 
      error?.name === 'NetworkError' ||
      error?.message?.includes('fetch')) {
    return {
      type: 'network',
      isRetryable: true,
      message: 'Network connection error. Please check your internet connection.'
    };
  }
  
  // Timeout errors
  if (error?.code === 'ECONNABORTED' || 
      error?.message?.includes('timeout')) {
    return {
      type: 'timeout',
      isRetryable: true,
      message: 'Request timed out. The server may be busy.'
    };
  }
  
  // HTTP errors
  if (error?.response?.status) {
    const status = error.response.status;
    
    if (status >= 500) {
      return {
        type: 'server',
        isRetryable: true,
        message: 'Server error. Please try again in a moment.'
      };
    }
    
    if (status >= 400) {
      return {
        type: 'client',
        isRetryable: false,
        message: error.response.data?.error || 'Invalid request. Please check your input.'
      };
    }
  }
  
  return {
    type: 'unknown',
    isRetryable: false,
    message: error?.message || 'An unexpected error occurred.'
  };
}

/**
 * Create a resilient API client with retry and error handling
 */
export function createResilientApiClient(baseURL: string, defaultRetryOptions: Partial<RetryOptions> = {}) {
  const retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...defaultRetryOptions };
  
  return {
    async request<T>(
      endpoint: string,
      options: RequestInit = {},
      customRetryOptions?: Partial<RetryOptions>
    ): Promise<T> {
      const finalRetryOptions = { ...retryOptions, ...customRetryOptions };
      
      return retryWithBackoff(async () => {
        const response = await fetch(`${baseURL}${endpoint}`, {
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          },
          ...options
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.error || `HTTP ${response.status}`);
          (error as any).response = response;
          (error as any).data = errorData;
          throw error;
        }
        
        return response.json();
      }, finalRetryOptions);
    },
    
    async get<T>(endpoint: string, retryOptions?: Partial<RetryOptions>): Promise<T> {
      return this.request<T>(endpoint, { method: 'GET' }, retryOptions);
    },
    
    async post<T>(endpoint: string, data?: any, retryOptions?: Partial<RetryOptions>): Promise<T> {
      return this.request<T>(endpoint, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined
      }, retryOptions);
    },
    
    async put<T>(endpoint: string, data?: any, retryOptions?: Partial<RetryOptions>): Promise<T> {
      return this.request<T>(endpoint, {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined
      }, retryOptions);
    },
    
    async delete<T>(endpoint: string, retryOptions?: Partial<RetryOptions>): Promise<T> {
      return this.request<T>(endpoint, { method: 'DELETE' }, retryOptions);
    }
  };
}