/**
 * Slack Notification Sender
 * Sends feedback notifications to Slack via Incoming Webhooks
 * Uses Slack Block Kit for rich message formatting
 */

import {
  registerChannelSender,
  type ChannelResult,
  type FeedbackData,
  type FeedbackContext,
} from './channelRouter.js';
import type { Channel } from '../db/index.js';

/**
 * Slack channel configuration stored in channel.config
 */
export interface SlackConfig {
  webhookUrl: string;
  channelName?: string;
}

/**
 * Default timeout for Slack webhook requests (5 seconds)
 */
const SLACK_TIMEOUT_MS = 5000;

/**
 * Maximum number of console errors to show in Slack message
 */
const MAX_CONSOLE_ERRORS = 5;

/**
 * Escape text for Slack mrkdwn format
 */
function escapeSlackText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Truncate text to a maximum length with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Extract the page path from a full URL
 */
function getPagePath(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search || '/';
  } catch {
    return url;
  }
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return timestamp;
  }
}

/**
 * Build Slack Block Kit message for feedback notification
 */
function buildSlackBlocks(
  feedback: FeedbackData,
  context: FeedbackContext,
  sessionId: string
): object[] {
  const blocks: object[] = [];

  // Header
  blocks.push({
    type: 'header',
    text: {
      type: 'plain_text',
      text: 'New Feedback Received',
      emoji: true,
    },
  });

  // Feedback text
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `>${escapeSlackText(truncate(feedback.text, 2000)).split('\n').join('\n>')}`,
    },
  });

  // Context fields
  const pagePath = getPagePath(context.url);
  const time = formatTimestamp(context.timestamp);

  blocks.push({
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: `*Page:*\n${escapeSlackText(truncate(pagePath, 50))}`,
      },
      {
        type: 'mrkdwn',
        text: `*Browser:*\n${escapeSlackText(context.browser)}`,
      },
      {
        type: 'mrkdwn',
        text: `*OS:*\n${escapeSlackText(context.os)}`,
      },
      {
        type: 'mrkdwn',
        text: `*Time:*\n${escapeSlackText(time)}`,
      },
    ],
  });

  // Screenshot (if available)
  if (feedback.screenshot_url) {
    blocks.push({
      type: 'image',
      image_url: feedback.screenshot_url,
      alt_text: 'Screenshot',
    });
  }

  // Console errors (if any)
  if (context.console_errors && context.console_errors.length > 0) {
    const errorsToShow = context.console_errors.slice(0, MAX_CONSOLE_ERRORS);
    const errorLines = errorsToShow
      .map((err) => `\`${escapeSlackText(truncate(err.message, 100))}\``)
      .join('\n');

    const moreText =
      context.console_errors.length > MAX_CONSOLE_ERRORS
        ? `\n_...and ${context.console_errors.length - MAX_CONSOLE_ERRORS} more_`
        : '';

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Console Errors (${context.console_errors.length}):*\n${errorLines}${moreText}`,
      },
    });
  }

  // Divider
  blocks.push({ type: 'divider' });

  // Footer with session ID
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Session: \`${truncate(sessionId, 20)}\` | via <https://heydev.io|HeyDev>`,
      },
    ],
  });

  return blocks;
}

/**
 * Build the Slack webhook payload
 */
function buildSlackPayload(
  feedback: FeedbackData,
  context: FeedbackContext,
  sessionId: string
): object {
  const blocks = buildSlackBlocks(feedback, context, sessionId);

  // Include a fallback text for notifications
  const fallbackText = `New feedback from ${getPagePath(context.url)}: ${truncate(feedback.text, 100)}`;

  return {
    text: fallbackText,
    blocks,
  };
}

/**
 * Send feedback notification to Slack via Incoming Webhook
 */
export async function sendSlackNotification(
  channel: Channel,
  feedback: FeedbackData,
  context: FeedbackContext,
  sessionId: string
): Promise<ChannelResult> {
  const config = channel.config as SlackConfig | null;

  // Validate configuration
  if (!config?.webhookUrl) {
    return {
      channelId: channel.id,
      channelType: 'slack',
      success: false,
      error: 'Slack webhook URL not configured',
    };
  }

  // Validate webhook URL format (Slack webhooks start with https://hooks.slack.com/)
  if (!config.webhookUrl.startsWith('https://hooks.slack.com/')) {
    return {
      channelId: channel.id,
      channelType: 'slack',
      success: false,
      error: 'Invalid Slack webhook URL format',
    };
  }

  // Build the payload
  const payload = buildSlackPayload(feedback, context, sessionId);
  const payloadJson = JSON.stringify(payload);

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SLACK_TIMEOUT_MS);

    // Make the request
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payloadJson,
      signal: controller.signal,
    });

    // Clear the timeout
    clearTimeout(timeoutId);

    // Slack webhooks return "ok" on success
    if (response.ok) {
      return {
        channelId: channel.id,
        channelType: 'slack',
        success: true,
        statusCode: response.status,
      };
    }

    // Get error text from response
    const errorText = await response.text();

    return {
      channelId: channel.id,
      channelType: 'slack',
      success: false,
      error: `Slack API error: ${response.status} - ${errorText}`,
      statusCode: response.status,
    };
  } catch (error) {
    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        channelId: channel.id,
        channelType: 'slack',
        success: false,
        error: 'Request timed out after 5 seconds',
      };
    }

    // Handle other errors (network errors, etc.)
    return {
      channelId: channel.id,
      channelType: 'slack',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Register the Slack sender with the channel router
 */
export function registerSlackSender(): void {
  registerChannelSender('slack', sendSlackNotification);
}
