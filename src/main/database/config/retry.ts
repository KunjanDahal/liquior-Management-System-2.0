/**
 * Connection Retry Strategy
 * 
 * Professional retry mechanism following industry best practices:
 * - Exponential backoff with jitter
 * - Configurable retry attempts and delays
 * - Proper error classification (retryable vs non-retryable)
 * - Connection health tracking
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  jitter: boolean;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  exponentialBase: 2,
  jitter: true,
};

/**
 * Check if an error is retryable
 * Some errors should not be retried (e.g., authentication failures)
 */
export function isRetryableError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();
  const errorCode = (error as any).code;

  // Authentication/authorization errors should not be retried
  if (
    errorMessage.includes('login failed') ||
    errorMessage.includes('authentication') ||
    errorMessage.includes('authorization') ||
    errorCode === 'ELOGIN'
  ) {
    return false;
  }

  // Network/timeout errors are retryable
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('network') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('etimedout') ||
    errorCode === 'ETIMEOUT' ||
    errorCode === 'ECONNREFUSED'
  ) {
    return true;
  }

  // SQL Server specific retryable errors
  if (
    errorCode === 'ETIMEOUT' ||
    errorCode === 'ESOCKET' ||
    errorMessage.includes('transport') ||
    errorMessage.includes('broken pipe')
  ) {
    return true;
  }

  // Unknown errors: retry by default (conservative approach)
  // But log them for investigation
  return true;
}

/**
 * Calculate delay with exponential backoff and optional jitter
 * Formula: delay = min(baseDelay * (exponentialBase ^ attempt), maxDelay)
 * Jitter adds randomness to prevent thundering herd problem
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const exponentialDelay = options.baseDelayMs * Math.pow(options.exponentialBase, attempt);
  const delay = Math.min(exponentialDelay, options.maxDelayMs);

  if (options.jitter) {
    // Add random jitter: ±20% of delay
    const jitterAmount = delay * 0.2 * (Math.random() * 2 - 1);
    return Math.max(0, delay + jitterAmount);
  }

  return delay;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Function to retry (should return a Promise)
 * @param options - Retry configuration options
 * @returns Result of the function call
 * @throws Last error if all retry attempts fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retryOptions.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if error is not retryable
      if (!isRetryableError(lastError)) {
        throw lastError;
      }

      // Don't wait after last attempt
      if (attempt < retryOptions.maxAttempts - 1) {
        const delay = calculateDelay(attempt, retryOptions);
        await sleep(delay);
      }
    }
  }

  // All attempts failed
  if (lastError) {
    throw lastError;
  }

  throw new Error('Retry failed: no error captured');
}

/**
 * Retry connection initialization with detailed logging
 */
export async function retryConnection<T>(
  fn: () => Promise<T>,
  operationName: string,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retryOptions.maxAttempts; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Retry] ${operationName} - Attempt ${attempt + 1}/${retryOptions.maxAttempts}`);
      }
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (!isRetryableError(lastError)) {
        console.error(`[Retry] ${operationName} - Non-retryable error: ${lastError.message}`);
        throw lastError;
      }

      if (attempt < retryOptions.maxAttempts - 1) {
        const delay = calculateDelay(attempt, retryOptions);
        console.warn(
          `[Retry] ${operationName} - Attempt ${attempt + 1} failed: ${lastError.message}. ` +
          `Retrying in ${Math.round(delay)}ms...`
        );
        await sleep(delay);
      }
    }
  }

  if (lastError) {
    console.error(
      `[Retry] ${operationName} - All ${retryOptions.maxAttempts} attempts failed. ` +
      `Last error: ${lastError.message}`
    );
    throw lastError;
  }

  throw new Error(`Retry failed for ${operationName}: no error captured`);
}

