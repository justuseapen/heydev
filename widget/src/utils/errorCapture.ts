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

/** Original window.onunhandledrejection handler */
let originalOnUnhandledRejection: ((ev: PromiseRejectionEvent) => void) | null = null;

/** Original fetch function */
let originalFetch: typeof fetch | null = null;

/** Whether error capture is currently installed */
let isErrorCaptureInstalled = false;

/** Whether network capture is currently installed */
let isNetworkCaptureInstalled = false;

/** Callback for captured errors */
let errorCallback: ErrorCaptureCallback | null = null;

/** Callback for captured network errors */
let networkCallback: ErrorCaptureCallback | null = null;

/** HeyDev endpoint URL for filtering */
let heydevEndpoint: string | null = null;

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

  // Store original unhandled rejection handler
  originalOnUnhandledRejection = window.onunhandledrejection;

  // Install unhandled promise rejection handler
  window.onunhandledrejection = function (event: PromiseRejectionEvent): void {
    const reason = event.reason;

    // Convert rejection reason to error format
    let errorMessage: string;
    let stack: string | undefined;

    if (reason instanceof Error) {
      errorMessage = reason.message || 'Unhandled promise rejection';
      stack = reason.stack;
    } else if (typeof reason === 'string') {
      errorMessage = reason;
    } else {
      errorMessage = 'Unhandled promise rejection';
      try {
        // Try to stringify the rejection reason for more context
        errorMessage += ': ' + JSON.stringify(reason);
      } catch {
        // Ignore serialization errors
      }
    }

    // Skip HeyDev's own errors
    if (isHeyDevError(undefined, stack)) {
      // Still call original handler
      if (originalOnUnhandledRejection) {
        originalOnUnhandledRejection.call(window, event);
      }
      return;
    }

    // Capture the rejection as an exception
    const capturedError: CapturedErrorEvent = {
      error_type: 'exception',
      message: errorMessage,
      stack,
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
    if (originalOnUnhandledRejection) {
      originalOnUnhandledRejection.call(window, event);
    }
  };

  isErrorCaptureInstalled = true;
}

/**
 * Uninstall the error handlers and restore original behavior
 */
export function uninstallErrorCapture(): void {
  if (!isErrorCaptureInstalled) {
    return;
  }

  // Restore original onerror handler
  window.onerror = originalOnError;
  originalOnError = null;

  // Restore original unhandled rejection handler
  window.onunhandledrejection = originalOnUnhandledRejection;
  originalOnUnhandledRejection = null;

  errorCallback = null;
  isErrorCaptureInstalled = false;
}

/**
 * Check if error capture is currently installed
 */
export function isErrorCaptureActive(): boolean {
  return isErrorCaptureInstalled;
}

/**
 * Check if a URL is a HeyDev API endpoint
 * Used to prevent capturing errors from our own requests
 */
function isHeyDevApiUrl(url: string): boolean {
  if (!heydevEndpoint) {
    return false;
  }
  try {
    const urlObj = new URL(url);
    const endpointObj = new URL(heydevEndpoint);
    return urlObj.hostname === endpointObj.hostname;
  } catch {
    // If URL parsing fails, do a simple string check
    return url.includes(heydevEndpoint);
  }
}

/**
 * Install network error capture by wrapping global fetch
 *
 * Captures:
 * - HTTP responses with 4xx/5xx status codes
 * - Network failures (connection refused, timeout, etc.)
 *
 * @param callback - Function called when a network error is captured
 * @param endpoint - HeyDev endpoint URL to exclude from capture
 */
export function installNetworkCapture(callback: ErrorCaptureCallback, endpoint?: string): void {
  if (isNetworkCaptureInstalled) {
    return;
  }

  networkCallback = callback;
  heydevEndpoint = endpoint || null;

  // Store original fetch
  originalFetch = window.fetch;

  // Wrap fetch to capture errors
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // Determine the URL being fetched
    let url: string;
    let method = 'GET';

    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input instanceof Request) {
      url = input.url;
      method = input.method || 'GET';
    } else {
      url = String(input);
    }

    // Override method if specified in init
    if (init?.method) {
      method = init.method;
    }

    // Skip HeyDev API requests to prevent infinite loops
    if (isHeyDevApiUrl(url)) {
      return originalFetch!.call(window, input, init);
    }

    try {
      const response = await originalFetch!.call(window, input, init);

      // Check for error status codes (4xx and 5xx)
      if (response.status >= 400) {
        // Clone response to read body without consuming it
        const clonedResponse = response.clone();
        let responseText = '';

        try {
          const text = await clonedResponse.text();
          // Capture first 200 chars of response
          responseText = text.slice(0, 200);
        } catch {
          // Ignore errors reading response body
        }

        const capturedError: CapturedErrorEvent = {
          error_type: 'network',
          message: responseText || `HTTP ${response.status} ${response.statusText}`,
          url,
          status: response.status,
          method,
        };

        // Call callback with captured error
        if (networkCallback) {
          try {
            networkCallback(capturedError);
          } catch {
            // Silently ignore errors in callback to prevent infinite loops
          }
        }
      }

      return response;
    } catch (error) {
      // Network failure (connection refused, timeout, DNS error, etc.)
      const errorMessage = error instanceof Error ? error.message : 'Network request failed';

      const capturedError: CapturedErrorEvent = {
        error_type: 'network',
        message: errorMessage,
        url,
        method,
      };

      // Call callback with captured error
      if (networkCallback) {
        try {
          networkCallback(capturedError);
        } catch {
          // Silently ignore errors in callback to prevent infinite loops
        }
      }

      // Re-throw the original error
      throw error;
    }
  };

  isNetworkCaptureInstalled = true;
}

/**
 * Uninstall network capture and restore original fetch
 */
export function uninstallNetworkCapture(): void {
  if (!isNetworkCaptureInstalled) {
    return;
  }

  // Restore original fetch
  if (originalFetch) {
    window.fetch = originalFetch;
    originalFetch = null;
  }

  networkCallback = null;
  heydevEndpoint = null;
  isNetworkCaptureInstalled = false;
}

/**
 * Check if network capture is currently installed
 */
export function isNetworkCaptureActive(): boolean {
  return isNetworkCaptureInstalled;
}
