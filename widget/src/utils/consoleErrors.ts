/**
 * Console error capture utility for HeyDev widget
 * Intercepts console.error calls and stores recent errors for context
 */

/**
 * Captured error structure
 */
export interface CapturedError {
  /** Error message */
  message: string;
  /** ISO 8601 timestamp when the error occurred */
  timestamp: string;
}

/** Maximum number of errors to store */
const MAX_ERRORS = 5;

/** Maximum age of errors in milliseconds (5 minutes) */
const MAX_ERROR_AGE_MS = 5 * 60 * 1000;

/** Storage for captured errors */
let capturedErrors: CapturedError[] = [];

/** Original console.error function */
let originalConsoleError: typeof console.error | null = null;

/** Whether the interceptor has been installed */
let isInstalled = false;

/**
 * Convert various error argument types to a string message
 */
function formatErrorArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return arg.message;
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');
}

/**
 * Prune errors older than MAX_ERROR_AGE_MS
 */
function pruneOldErrors(): void {
  const cutoff = Date.now() - MAX_ERROR_AGE_MS;
  capturedErrors = capturedErrors.filter((error) => {
    const errorTime = new Date(error.timestamp).getTime();
    return errorTime >= cutoff;
  });
}

/**
 * Install the console.error interceptor
 * Call this once when the widget initializes
 */
export function installErrorInterceptor(): void {
  if (isInstalled) {
    return;
  }

  // Store original console.error
  originalConsoleError = console.error;

  // Replace console.error with our interceptor
  console.error = function (...args: unknown[]): void {
    // Prune old errors first
    pruneOldErrors();

    // Capture the error
    const error: CapturedError = {
      message: formatErrorArgs(args),
      timestamp: new Date().toISOString(),
    };

    // Add to captured errors, keeping only the last MAX_ERRORS
    capturedErrors.push(error);
    if (capturedErrors.length > MAX_ERRORS) {
      capturedErrors = capturedErrors.slice(-MAX_ERRORS);
    }

    // Call original console.error to preserve normal behavior
    if (originalConsoleError) {
      originalConsoleError.apply(console, args);
    }
  };

  isInstalled = true;
}

/**
 * Uninstall the console.error interceptor
 * Restores original console.error behavior
 */
export function uninstallErrorInterceptor(): void {
  if (!isInstalled || !originalConsoleError) {
    return;
  }

  console.error = originalConsoleError;
  originalConsoleError = null;
  isInstalled = false;
}

/**
 * Get the array of captured console errors
 * Prunes old errors before returning
 * @returns Array of captured errors (up to 5, within last 5 minutes)
 */
export function getConsoleErrors(): CapturedError[] {
  pruneOldErrors();
  return [...capturedErrors];
}

/**
 * Clear all captured errors
 * Useful for testing or resetting state
 */
export function clearCapturedErrors(): void {
  capturedErrors = [];
}
