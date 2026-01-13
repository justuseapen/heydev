/**
 * HeyDev Submit Reply Service
 * Handles submitting user follow-up replies to existing conversations
 */

/** Response from reply endpoint */
interface ReplyResponse {
  success?: boolean;
  message_id?: number;
  conversation_id?: number;
  error?: string;
}

/** Options for submitReply */
export interface SubmitReplyOptions {
  /** The reply text */
  text: string;
  /** Conversation ID to reply to */
  conversationId: string;
  /** Session ID */
  sessionId: string;
  /** Base endpoint URL */
  endpoint: string;
  /** API key for authentication */
  apiKey: string;
  /** Callback when submission starts */
  onStart?: () => void;
  /** Callback when submission succeeds */
  onSuccess?: (messageId: number) => void;
  /** Callback when submission fails */
  onError?: (error: string) => void;
}

/** Result of reply submission */
export interface SubmitReplyResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Submit a follow-up reply to an existing conversation
 * @param options Submission options
 * @returns Result with success status and message ID or error
 */
export async function submitReply(
  options: SubmitReplyOptions
): Promise<SubmitReplyResult> {
  const { text, conversationId, sessionId, endpoint, apiKey, onStart, onSuccess, onError } = options;

  // Signal start
  if (onStart) {
    onStart();
  }

  try {
    const response = await fetch(`${endpoint}/api/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        text,
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      const errorData: ReplyResponse = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Reply submission failed with status ${response.status}`);
    }

    const data: ReplyResponse = await response.json();
    if (!data.success || data.message_id === undefined) {
      throw new Error('Reply response missing message_id');
    }

    // Signal success
    if (onSuccess) {
      onSuccess(data.message_id);
    }

    return {
      success: true,
      messageId: data.message_id,
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
