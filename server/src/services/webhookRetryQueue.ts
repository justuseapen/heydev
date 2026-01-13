/**
 * Webhook Retry Queue
 * Simple in-memory queue for retrying failed webhook deliveries
 * Uses exponential backoff: 1s, 4s, 16s delays
 */

import type { Channel } from '../db/index.js';
import type { FeedbackData, FeedbackContext } from './channelRouter.js';

/**
 * Maximum number of retry attempts
 */
const MAX_RETRIES = 3;

/**
 * Exponential backoff delays in milliseconds
 * 1s, 4s, 16s (base 4 exponential: 4^0, 4^1, 4^2 seconds)
 */
const RETRY_DELAYS_MS = [1000, 4000, 16000];

/**
 * A queued webhook delivery item
 */
export interface RetryItem {
  id: string;
  channel: Channel;
  feedback: FeedbackData;
  context: FeedbackContext;
  sessionId: string;
  attempts: number;
  lastAttemptAt: Date;
  createdAt: Date;
}

/**
 * Callback type for webhook send function
 */
export type WebhookSendFn = (
  channel: Channel,
  feedback: FeedbackData,
  context: FeedbackContext,
  sessionId: string
) => Promise<{ success: boolean; statusCode?: number; error?: string }>;

/**
 * In-memory retry queue
 */
const retryQueue = new Map<string, RetryItem>();

/**
 * Reference to the webhook send function (set during initialization)
 */
let webhookSendFn: WebhookSendFn | null = null;

/**
 * Timer for processing the retry queue
 */
let processingTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Generate a unique ID for a retry item
 */
function generateRetryId(): string {
  return `retry_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Initialize the retry queue with the webhook send function
 * @param sendFn - The function to use for sending webhooks
 */
export function initRetryQueue(sendFn: WebhookSendFn): void {
  webhookSendFn = sendFn;
  // Start processing timer
  scheduleNextProcess();
}

/**
 * Add a failed webhook to the retry queue
 * @param channel - The channel configuration
 * @param feedback - The feedback data
 * @param context - The context data
 * @param sessionId - The session ID
 * @returns The retry item ID
 */
export function queueForRetry(
  channel: Channel,
  feedback: FeedbackData,
  context: FeedbackContext,
  sessionId: string
): string {
  const id = generateRetryId();
  const item: RetryItem = {
    id,
    channel,
    feedback,
    context,
    sessionId,
    attempts: 0,
    lastAttemptAt: new Date(),
    createdAt: new Date(),
  };

  retryQueue.set(id, item);

  // Ensure processing is scheduled
  scheduleNextProcess();

  return id;
}

/**
 * Schedule the next queue processing cycle
 */
function scheduleNextProcess(): void {
  // Don't schedule if already scheduled
  if (processingTimer !== null) {
    return;
  }

  // Check every second for items ready to retry
  processingTimer = setTimeout(() => {
    processingTimer = null;
    processQueue().catch((error) => {
      console.error('[HeyDev Webhook Retry] Error processing queue:', error);
    });
  }, 1000);
}

/**
 * Process items in the retry queue
 */
async function processQueue(): Promise<void> {
  if (!webhookSendFn) {
    console.warn('[HeyDev Webhook Retry] Queue not initialized, skipping process');
    return;
  }

  const now = Date.now();
  const itemsToProcess: RetryItem[] = [];

  // Find items ready for retry
  for (const item of retryQueue.values()) {
    // Calculate delay based on attempt count
    const delay = RETRY_DELAYS_MS[item.attempts] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
    const readyAt = item.lastAttemptAt.getTime() + delay;

    if (now >= readyAt) {
      itemsToProcess.push(item);
    }
  }

  // Process each ready item
  for (const item of itemsToProcess) {
    item.attempts++;
    item.lastAttemptAt = new Date();

    try {
      const result = await webhookSendFn(
        item.channel,
        item.feedback,
        item.context,
        item.sessionId
      );

      if (result.success) {
        // Success - remove from queue
        retryQueue.delete(item.id);
        console.log(
          `[HeyDev Webhook Retry] Retry successful after ${item.attempts} attempt(s) for channel ${item.channel.id}`
        );
      } else {
        // Failed - check if we should retry again
        if (item.attempts >= MAX_RETRIES) {
          // Final failure - remove from queue and log
          retryQueue.delete(item.id);
          console.error(
            `[HeyDev Webhook Retry] Final failure after ${item.attempts} attempts for channel ${item.channel.id}: ${result.error}`
          );
        } else {
          // Keep in queue for next retry
          console.warn(
            `[HeyDev Webhook Retry] Attempt ${item.attempts}/${MAX_RETRIES} failed for channel ${item.channel.id}: ${result.error}`
          );
        }
      }
    } catch (error) {
      // Unexpected error during send
      if (item.attempts >= MAX_RETRIES) {
        retryQueue.delete(item.id);
        console.error(
          `[HeyDev Webhook Retry] Final failure after ${item.attempts} attempts for channel ${item.channel.id}:`,
          error
        );
      } else {
        console.warn(
          `[HeyDev Webhook Retry] Attempt ${item.attempts}/${MAX_RETRIES} failed for channel ${item.channel.id}:`,
          error
        );
      }
    }
  }

  // Schedule next processing cycle if queue is not empty
  if (retryQueue.size > 0) {
    scheduleNextProcess();
  }
}

/**
 * Get the current queue size (for testing/monitoring)
 * @returns Number of items in the queue
 */
export function getQueueSize(): number {
  return retryQueue.size;
}

/**
 * Get all items in the queue (for testing/monitoring)
 * @returns Array of retry items
 */
export function getQueueItems(): RetryItem[] {
  return Array.from(retryQueue.values());
}

/**
 * Clear the retry queue (for testing)
 */
export function clearQueue(): void {
  retryQueue.clear();
  if (processingTimer !== null) {
    clearTimeout(processingTimer);
    processingTimer = null;
  }
}

/**
 * Stop the retry queue processing (for graceful shutdown)
 */
export function stopRetryQueue(): void {
  if (processingTimer !== null) {
    clearTimeout(processingTimer);
    processingTimer = null;
  }
}
