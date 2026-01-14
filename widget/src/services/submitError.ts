/**
 * HeyDev Error Submission Service
 * Handles sending captured errors to the backend
 */

import { captureContext } from '../utils/context';
import { getSessionId } from '../utils/session';
import type { CapturedErrorEvent } from '../utils/errorCapture';

/** Flag to prevent infinite loops when submitting errors */
let isSubmittingError = false;

/**
 * Check if a URL is a HeyDev API endpoint
 * Used to prevent capturing errors from error submission
 */
function isHeyDevEndpoint(url: string, endpoint: string): boolean {
  try {
    const urlObj = new URL(url);
    const endpointObj = new URL(endpoint);
    return urlObj.hostname === endpointObj.hostname;
  } catch {
    // If URL parsing fails, do a simple string check
    return url.includes(endpoint);
  }
}

/** Options for submitError */
export interface SubmitErrorOptions {
  /** The captured error event */
  error: CapturedErrorEvent;
  /** Base endpoint URL */
  endpoint: string;
  /** API key for authentication */
  apiKey: string;
}

/**
 * Submit a captured error to the HeyDev backend
 *
 * Handles network failures gracefully by logging to console without throwing.
 * Prevents infinite loops by:
 * 1. Tracking when a submission is in progress
 * 2. Not capturing errors that occur during error submission
 *
 * @param options - The error submission options
 */
export async function submitError(options: SubmitErrorOptions): Promise<void> {
  const { error, endpoint, apiKey } = options;

  // Prevent infinite loops - don't submit if we're already submitting
  if (isSubmittingError) {
    return;
  }

  // Check if this is an error from a HeyDev endpoint (shouldn't capture these)
  if (error.url && isHeyDevEndpoint(error.url, endpoint)) {
    return;
  }

  isSubmittingError = true;

  try {
    // Capture current page context
    const context = captureContext();

    // Get session ID
    const sessionId = getSessionId();

    // Build the error payload
    const payload = {
      error: {
        type: error.error_type,
        message: error.message,
        stack: error.stack,
        filename: error.filename,
        lineno: error.lineno,
        colno: error.colno,
        url: error.url,
        status: error.status,
        method: error.method,
      },
      context,
      session_id: sessionId,
    };

    // Submit to the API
    const response = await fetch(`${endpoint}/api/errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Log failure but don't throw - we don't want error submission failures to cause more errors
      console.warn('[HeyDev] Failed to submit error:', response.status, response.statusText);
    }
  } catch (err) {
    // Log the error but don't throw - prevents cascading failures
    console.warn('[HeyDev] Error while submitting error:', err instanceof Error ? err.message : 'Unknown error');
  } finally {
    isSubmittingError = false;
  }
}

/**
 * Check if error submission is currently in progress
 * Useful for testing and debugging
 */
export function isErrorSubmissionInProgress(): boolean {
  return isSubmittingError;
}
