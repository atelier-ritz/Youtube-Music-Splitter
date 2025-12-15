/**
 * Retry Utilities
 * 
 * Provides retry mechanisms for failed operations with exponential backoff,
 * circuit breaker pattern, and configurable retry strategies.
 * 
 * Requirements: 1.5, 2.4, 7.4
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffFactor: number;
  jitter: boolean;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number; // milliseconds
  monitoringPeriod: number; // milliseconds
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  jitter: true,
  retryCondition: (error: Error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED', 
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN'
    ];
    
    return retryableErrors.some(code => error.message.includes(code)) ||
           error.message.includes('timeout') ||
           error.message.includes('network') ||
           (error as any).status >= 500;
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
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
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
      
      console.log(`Retry attempt ${attempt}/${config.maxAttempts} after ${delay}ms delay. Error: ${lastError.message}`);
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        console.log('Circuit breaker transitioning to HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN - operation not allowed');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) { // Require 3 successes to close
        this.state = 'CLOSED';
        console.log('Circuit breaker transitioning to CLOSED');
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      console.log('Circuit breaker transitioning to OPEN');
    }
  }

  getState(): string {
    return this.state;
  }

  getStats(): { state: string; failureCount: number; successCount: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount
    };
  }
}

/**
 * Retry with circuit breaker
 */
export async function retryWithCircuitBreaker<T>(
  operation: () => Promise<T>,
  circuitBreaker: CircuitBreaker,
  retryOptions: Partial<RetryOptions> = {}
): Promise<T> {
  return circuitBreaker.execute(() => 
    retryWithBackoff(operation, retryOptions)
  );
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
 * Batch retry for multiple operations
 */
export async function retryBatch<T>(
  operations: (() => Promise<T>)[],
  options: Partial<RetryOptions> = {}
): Promise<(T | Error)[]> {
  const results = await Promise.allSettled(
    operations.map(op => retryWithBackoff(op, options))
  );
  
  return results.map(result => 
    result.status === 'fulfilled' ? result.value : result.reason
  );
}

/**
 * Exponential backoff for polling operations
 */
export async function pollWithBackoff<T>(
  operation: () => Promise<T>,
  condition: (result: T) => boolean,
  options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {}
): Promise<T> {
  const config = {
    maxAttempts: 10,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 1.5,
    ...options
  };

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const result = await operation();
    
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
  }
  
  throw new Error(`Polling failed after ${config.maxAttempts} attempts`);
}

/**
 * Create a retry-enabled HTTP client
 */
export function createRetryableHttpClient(
  httpClient: any,
  retryOptions: Partial<RetryOptions> = {}
) {
  return {
    async get(url: string, config?: any) {
      return retryWithBackoff(() => httpClient.get(url, config), retryOptions);
    },
    
    async post(url: string, data?: any, config?: any) {
      return retryWithBackoff(() => httpClient.post(url, data, config), retryOptions);
    },
    
    async put(url: string, data?: any, config?: any) {
      return retryWithBackoff(() => httpClient.put(url, data, config), retryOptions);
    },
    
    async delete(url: string, config?: any) {
      return retryWithBackoff(() => httpClient.delete(url, config), retryOptions);
    }
  };
}