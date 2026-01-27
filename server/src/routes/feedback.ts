/**
 * Feedback Submission Routes
 * Handles receiving feedback and creating conversations
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db, conversations, messages } from '../db/index.js';
import { routeToChannels } from '../services/channelRouter.js';

/**
 * Context object captured from the widget
 */
interface FeedbackContext {
  url: string;
  browser: string;
  os: string;
  viewport: { width: number; height: number };
  timestamp: string;
  timezone: string;
  console_errors?: { message: string; timestamp: string }[];
}

/**
 * Feedback submission request body
 */
interface FeedbackRequest {
  text: string;
  screenshot_url?: string;
  audio_url?: string;
  context: FeedbackContext;
  session_id: string;
}

export const feedbackRoutes = new Hono();

/**
 * POST /feedback - Submit feedback
 * Creates or retrieves a conversation and stores the message
 */
feedbackRoutes.post('/', async (c) => {
  try {
    // Get API key from context (set by apiKeyAuth middleware)
    const apiKey = c.get('apiKey');

    // Parse request body
    const body = await c.req.json<FeedbackRequest>();

    // Validate required fields
    if (!body.text || typeof body.text !== 'string') {
      return c.json({ error: 'Missing required field: text' }, 400);
    }

    if (!body.session_id || typeof body.session_id !== 'string') {
      return c.json({ error: 'Missing required field: session_id' }, 400);
    }

    if (!body.context || typeof body.context !== 'object') {
      return c.json({ error: 'Missing required field: context' }, 400);
    }

    // Validate context fields
    const { context } = body;
    const requiredContextFields = ['url', 'browser', 'os', 'viewport', 'timestamp', 'timezone'];
    for (const field of requiredContextFields) {
      if (!(field in context)) {
        return c.json({ error: `Missing required context field: ${field}` }, 400);
      }
    }

    // Find existing conversation or create new one
    let conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.apiKeyId, apiKey.id),
        eq(conversations.sessionId, body.session_id)
      ),
    });

    if (!conversation) {
      // Create new conversation
      const [newConversation] = await db
        .insert(conversations)
        .values({
          apiKeyId: apiKey.id,
          sessionId: body.session_id,
        })
        .returning();

      conversation = newConversation;
    }

    // Build message content with metadata
    const messageContent = JSON.stringify({
      text: body.text,
      screenshot_url: body.screenshot_url || null,
      audio_url: body.audio_url || null,
      context: body.context,
    });

    // Store the message
    await db.insert(messages).values({
      conversationId: conversation.id,
      direction: 'inbound',
      content: messageContent,
    });

    // Route to notification channels (non-blocking)
    routeToChannels(
      apiKey.id,
      {
        text: body.text,
        screenshot_url: body.screenshot_url,
        audio_url: body.audio_url,
      },
      body.context,
      body.session_id
    ).catch((err) => {
      console.error('Error routing to notification channels:', err);
    });

    return c.json({
      conversation_id: String(conversation.id),
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    return c.json({ error: 'Failed to submit feedback' }, 500);
  }
});
