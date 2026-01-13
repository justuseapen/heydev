/**
 * Webhook Notification Sender
 * Sends feedback to configured webhook endpoints with HMAC-SHA256 signatures
 */

import { createHmac } from 'crypto';
import {
  registerChannelSender,
  type ChannelResult,
  type FeedbackData,
  type FeedbackContext,
} from './channelRouter.js';
import type { Channel } from '../db/index.js';

/**
 * Webhook channel configuration stored in channel.config
 */
export interface WebhookConfig {
  url: string;
  secret?: string;
  headers?: Record<string, string>;
}

/**
 * Webhook payload schema sent to configured endpoints
 */
export interface WebhookPayload {
  event: 'feedback.received';
  feedback: FeedbackData;
  context: FeedbackContext;
  session_id: string;
  timestamp: string;
}

/**
 * Default timeout for webhook requests (5 seconds)
 */
const WEBHOOK_TIMEOUT_MS = 5000;

/**
 * Generate HMAC-SHA256 signature for payload
 * @param payload - The JSON payload to sign
 * @param secret - The secret key for signing
 * @returns Hex-encoded HMAC-SHA256 signature
 */
function generateSignature(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Send feedback to a webhook endpoint
 * @param channel - The channel configuration
 * @param feedback - The feedback data
 * @param context - The context data
 * @param sessionId - The session ID
 * @returns Result of the webhook delivery
 */
export async function sendWebhook(
  channel: Channel,
  feedback: FeedbackData,
  context: FeedbackContext,
  sessionId: string
): Promise<ChannelResult> {
  const config = channel.config as WebhookConfig | null;

  // Validate configuration
  if (!config?.url) {
    return {
      channelId: channel.id,
      channelType: 'webhook',
      success: false,
      error: 'Webhook URL not configured',
    };
  }

  // Build the payload
  const payload: WebhookPayload = {
    event: 'feedback.received',
    feedback,
    context,
    session_id: sessionId,
    timestamp: new Date().toISOString(),
  };

  const payloadJson = JSON.stringify(payload);

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'HeyDev-Webhook/1.0',
  };

  // Add custom headers from config
  if (config.headers) {
    for (const [key, value] of Object.entries(config.headers)) {
      headers[key] = value;
    }
  }

  // Add HMAC signature if secret is configured
  if (config.secret) {
    const signature = generateSignature(payloadJson, config.secret);
    headers['X-HeyDev-Signature'] = signature;
  }

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    // Make the request
    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: payloadJson,
      signal: controller.signal,
    });

    // Clear the timeout
    clearTimeout(timeoutId);

    // Check for successful response (2xx status codes)
    if (response.ok) {
      return {
        channelId: channel.id,
        channelType: 'webhook',
        success: true,
        statusCode: response.status,
      };
    }

    // Non-2xx response
    return {
      channelId: channel.id,
      channelType: 'webhook',
      success: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
      statusCode: response.status,
    };
  } catch (error) {
    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        channelId: channel.id,
        channelType: 'webhook',
        success: false,
        error: 'Request timed out after 5 seconds',
      };
    }

    // Handle other errors (network errors, etc.)
    return {
      channelId: channel.id,
      channelType: 'webhook',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Register the webhook sender with the channel router
 */
export function registerWebhookSender(): void {
  registerChannelSender('webhook', sendWebhook);
}
