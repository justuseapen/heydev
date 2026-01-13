/**
 * Webhook Reply Routes
 * Allows developers to send replies to users via API
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db, conversations, messages } from '../db/index.js';
import { emitSessionMessage } from '../services/sseManager.js';

/**
 * Webhook reply request body
 */
interface WebhookReplyRequest {
  session_id: string;
  message: string;
}

export const webhookReplyRoutes = new Hono();

/**
 * POST /webhook/reply - Send a reply to a user
 * Finds the conversation by session_id and stores an outbound message
 */
webhookReplyRoutes.post('/reply', async (c) => {
  try {
    // Get API key from context (set by apiKeyAuth middleware)
    const apiKey = c.get('apiKey');

    // Parse request body
    const body = await c.req.json<WebhookReplyRequest>();

    // Validate required fields
    if (!body.session_id || typeof body.session_id !== 'string') {
      return c.json({ success: false, error: 'Missing required field: session_id' }, 400);
    }

    if (!body.message || typeof body.message !== 'string') {
      return c.json({ success: false, error: 'Missing required field: message' }, 400);
    }

    // Find active conversation by session_id and API key
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.apiKeyId, apiKey.id),
        eq(conversations.sessionId, body.session_id)
      ),
    });

    if (!conversation) {
      return c.json(
        { success: false, error: 'Conversation not found for session_id' },
        404
      );
    }

    // Store the outbound message
    const [newMessage] = await db
      .insert(messages)
      .values({
        conversationId: conversation.id,
        direction: 'outbound',
        content: body.message,
      })
      .returning();

    // Emit SSE event to notify connected widget
    emitSessionMessage(body.session_id, {
      text: body.message,
      timestamp: newMessage.createdAt,
      messageId: newMessage.id,
    });

    return c.json({
      success: true,
      message_id: newMessage.id,
      conversation_id: conversation.id,
    });
  } catch (error) {
    console.error('Webhook reply error:', error);
    return c.json({ success: false, error: 'Failed to send reply' }, 500);
  }
});
