/**
 * Error capture utility for HeyDev widget
 * Captures JavaScript errors, unhandled rejections, and network failures
 */

/**
 * Captured error structure for exceptions
 */
export interface CapturedErrorEvent {
  /** Type of error: 'exception' or 'network' */
  error_type: 'exception' | 'network';
  /** Error message */
  message: string;
  /** Stack trace (if available) */
  stack?: string;
  /** Source filename */
  filename?: string;
  /** Line number */
  lineno?: number;
  /** Column number */
  colno?: number;
  /** For network errors: request URL */
  url?: string;
  /** For network errors: HTTP status code */
  status?: number;
  /** For network errors: HTTP method */
  method?: string;
}

/**
 * Callback type for captured errors
 */
export type ErrorCaptureCallback = (error: CapturedErrorEvent) => void;

/** Original window.onerror handler */
let originalOnError: OnErrorEventHandler | null = null;

/** Whether error capture is currently installed */
let isErrorCaptureInstalled = false;

/** Callback for captured errors */
let errorCallback: ErrorCaptureCallback | null = null;

/**
 * Check if an error originated from HeyDev widget code
 * This prevents infinite loops from capturing our own errors
 */
function isHeyDevError(filename?: string, stack?: string): boolean {
  const heydevPatterns = [
    'heydev',
    'HeyDev',
    // Add the widget script patterns
    '/widget.js',
    '/widget.ts',
  ];

  const textToCheck = `${filename || ''} ${stack || ''}`;
  return heydevPatterns.some((pattern) => textToCheck.includes(pattern));
}

/**
 * Install the window.onerror handler to capture JavaScript exceptions
 *
 * @param callback - Function called when an error is captured
 */
export function installErrorCapture(callback: ErrorCaptureCallback): void {
  if (isErrorCaptureInstalled) {
    return;
  }

  errorCallback = callback;

  // Store original handler
  originalOnError = window.onerror;

  // Install our error handler
  window.onerror = function (
    message: string | Event,
    filename?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ): boolean {
    // Get message as string
    const errorMessage = typeof message === 'string' ? message : 'Unknown error';

    // Get stack trace from error object
    const stack = error?.stack;

    // Skip HeyDev's own errors to prevent infinite loops
    if (isHeyDevError(filename, stack)) {
      // Still call original handler
      if (originalOnError && typeof originalOnError === 'function') {
        return originalOnError.call(window, message, filename, lineno, colno, error);
      }
      return false;
    }

    // Capture the error
    const capturedError: CapturedErrorEvent = {
      error_type: 'exception',
      message: errorMessage,
      stack,
      filename,
      lineno,
      colno,
    };

    // Call callback with captured error
    if (errorCallback) {
      try {
        errorCallback(capturedError);
      } catch {
        // Silently ignore errors in callback to prevent infinite loops
      }
    }

    // Call original handler if it exists
    if (originalOnError && typeof originalOnError === 'function') {
      return originalOnError.call(window, message, filename, lineno, colno, error);
    }

    // Return false to allow default browser error handling
    return false;
  };

  isErrorCaptureInstalled = true;
}

/**
 * Uninstall the window.onerror handler and restore original behavior
 */
export function uninstallErrorCapture(): void {
  if (!isErrorCaptureInstalled) {
    return;
  }

  // Restore original handler
  window.onerror = originalOnError;
  originalOnError = null;
  errorCallback = null;
  isErrorCaptureInstalled = false;
}

/**
 * Check if error capture is currently installed
 */
export function isErrorCaptureActive(): boolean {
  return isErrorCaptureInstalled;
}
