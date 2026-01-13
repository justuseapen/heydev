/**
 * Notification Channel Router
 * Routes feedback to all enabled notification channels for an API key
 */

import { eq, and } from 'drizzle-orm';
import { db, channels, type Channel, type ChannelType } from '../db/index.js';

/**
 * Feedback data to be sent to notification channels
 */
export interface FeedbackData {
  text: string;
  screenshot_url?: string | null;
  audio_url?: string | null;
}

/**
 * Context data captured from the widget
 */
export interface FeedbackContext {
  url: string;
  browser: string;
  os: string;
  viewport: { width: number; height: number };
  timestamp: string;
  timezone: string;
  console_errors?: { message: string; timestamp: string }[];
}

/**
 * Result of attempting to send to a single channel
 */
export interface ChannelResult {
  channelId: number;
  channelType: ChannelType;
  success: boolean;
  error?: string;
  statusCode?: number;
}

/**
 * Summary of all channel delivery attempts
 */
export interface DeliverySummary {
  totalChannels: number;
  successful: number;
  failed: number;
  results: ChannelResult[];
}

/**
 * Channel sender function signature
 * Each channel type implements this interface
 */
export type ChannelSender = (
  channel: Channel,
  feedback: FeedbackData,
  context: FeedbackContext,
  sessionId: string
) => Promise<ChannelResult>;

/**
 * Registry of channel sender functions by type
 * Sender functions are registered here as they're implemented
 */
const channelSenders: Partial<Record<ChannelType, ChannelSender>> = {};

/**
 * Register a sender function for a channel type
 * @param type - The channel type
 * @param sender - The sender function
 */
export function registerChannelSender(type: ChannelType, sender: ChannelSender): void {
  channelSenders[type] = sender;
}

/**
 * Get all enabled channels for an API key
 * @param apiKeyId - The API key ID
 * @returns Array of enabled channels
 */
async function getEnabledChannels(apiKeyId: number): Promise<Channel[]> {
  return db.query.channels.findMany({
    where: and(
      eq(channels.apiKeyId, apiKeyId),
      eq(channels.enabled, true)
    ),
  });
}

/**
 * Route feedback to all enabled notification channels
 * @param apiKeyId - The API key ID to find channels for
 * @param feedback - The feedback data to send
 * @param context - The context data from the widget
 * @param sessionId - The session ID for the conversation
 * @returns Summary of delivery statuses
 */
export async function routeToChannels(
  apiKeyId: number,
  feedback: FeedbackData,
  context: FeedbackContext,
  sessionId: string
): Promise<DeliverySummary> {
  // Fetch all enabled channels for this API key
  const enabledChannels = await getEnabledChannels(apiKeyId);

  // Initialize summary
  const summary: DeliverySummary = {
    totalChannels: enabledChannels.length,
    successful: 0,
    failed: 0,
    results: [],
  };

  // If no channels enabled, return early
  if (enabledChannels.length === 0) {
    return summary;
  }

  // Send to all channels concurrently
  const sendPromises = enabledChannels.map(async (channel): Promise<ChannelResult> => {
    const sender = channelSenders[channel.type];

    // If no sender registered for this type, report as failed
    if (!sender) {
      return {
        channelId: channel.id,
        channelType: channel.type,
        success: false,
        error: `No sender registered for channel type: ${channel.type}`,
      };
    }

    try {
      // Call the sender function
      return await sender(channel, feedback, context, sessionId);
    } catch (error) {
      // Catch any unexpected errors from the sender
      return {
        channelId: channel.id,
        channelType: channel.type,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Wait for all sends to complete
  const results = await Promise.all(sendPromises);

  // Aggregate results
  for (const result of results) {
    summary.results.push(result);
    if (result.success) {
      summary.successful++;
    } else {
      summary.failed++;
    }
  }

  return summary;
}

/**
 * Check if a sender is registered for a channel type
 * @param type - The channel type to check
 * @returns True if a sender is registered
 */
export function hasSender(type: ChannelType): boolean {
  return type in channelSenders;
}

/**
 * Get all registered channel types
 * @returns Array of channel types with registered senders
 */
export function getRegisteredChannelTypes(): ChannelType[] {
  return Object.keys(channelSenders) as ChannelType[];
}
