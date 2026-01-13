/**
 * HeyDev Submit Feedback Service
 * Handles the complete feedback submission flow:
 * - Upload screenshot if present
 * - Submit feedback to backend
 * - Handle loading/success/error states
 */

import { captureContext, type PageContext } from '../utils/context';
import { getConsoleErrors, type CapturedError } from '../utils/consoleErrors';
import { getSessionId } from '../utils/session';

/** Feedback context including console errors */
interface FeedbackContext extends PageContext {
  console_errors?: CapturedError[];
}

/** Response from upload endpoint */
interface UploadResponse {
  url?: string;
  error?: string;
}

/** Response from feedback endpoint */
interface FeedbackResponse {
  conversation_id?: string;
  error?: string;
}

/** Options for submitFeedback */
export interface SubmitFeedbackOptions {
  /** The feedback text */
  text: string;
  /** Screenshot data URL (base64) */
  screenshot?: string | null;
  /** Base endpoint URL */
  endpoint: string;
  /** API key for authentication */
  apiKey: string;
  /** Callback when submission starts */
  onStart?: () => void;
  /** Callback when submission succeeds */
  onSuccess?: (conversationId: string) => void;
  /** Callback when submission fails */
  onError?: (error: string) => void;
}

/** Result of feedback submission */
export interface SubmitFeedbackResult {
  success: boolean;
  conversationId?: string;
  error?: string;
}

/**
 * Convert a data URL to a Blob for upload
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const match = parts[0].match(/:(.*?);/);
  const mime = match ? match[1] : 'image/png';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Upload a screenshot and return the URL
 */
async function uploadScreenshot(
  endpoint: string,
  apiKey: string,
  dataUrl: string
): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const formData = new FormData();
  formData.append('file', blob, 'screenshot.png');

  const response = await fetch(`${endpoint}/api/upload`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData: UploadResponse = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload failed with status ${response.status}`);
  }

  const data: UploadResponse = await response.json();
  if (!data.url) {
    throw new Error('Upload response missing URL');
  }

  return data.url;
}

/**
 * Submit feedback to the backend
 */
async function submitToBackend(
  endpoint: string,
  apiKey: string,
  text: string,
  screenshotUrl: string | null,
  context: FeedbackContext,
  sessionId: string
): Promise<string> {
  const response = await fetch(`${endpoint}/api/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      text,
      screenshot_url: screenshotUrl,
      audio_url: null,
      context,
      session_id: sessionId,
    }),
  });

  if (!response.ok) {
    const errorData: FeedbackResponse = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Feedback submission failed with status ${response.status}`);
  }

  const data: FeedbackResponse = await response.json();
  if (!data.conversation_id) {
    throw new Error('Feedback response missing conversation_id');
  }

  return data.conversation_id;
}

/**
 * Submit feedback with screenshot upload and context capture
 * @param options Submission options
 * @returns Result with success status and conversation ID or error
 */
export async function submitFeedback(
  options: SubmitFeedbackOptions
): Promise<SubmitFeedbackResult> {
  const { text, screenshot, endpoint, apiKey, onStart, onSuccess, onError } = options;

  // Signal start
  if (onStart) {
    onStart();
  }

  try {
    // Capture context and console errors
    const context: FeedbackContext = {
      ...captureContext(),
      console_errors: getConsoleErrors(),
    };

    // Get session ID
    const sessionId = getSessionId();

    // Upload screenshot if present
    let screenshotUrl: string | null = null;
    if (screenshot) {
      screenshotUrl = await uploadScreenshot(endpoint, apiKey, screenshot);
    }

    // Submit feedback
    const conversationId = await submitToBackend(
      endpoint,
      apiKey,
      text,
      screenshotUrl,
      context,
      sessionId
    );

    // Signal success
    if (onSuccess) {
      onSuccess(conversationId);
    }

    return {
      success: true,
      conversationId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Signal error
    if (onError) {
      onError(errorMessage);
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
