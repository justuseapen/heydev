/**
 * User Reply Routes
 * Handles user follow-up replies to existing conversations
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db, conversations, messages } from '../db/index.js';

/**
 * Reply request body
 */
interface ReplyRequest {
  conversation_id: string;
  text: string;
  session_id: string;
}

export const replyRoutes = new Hono();

/**
 * POST /reply - Submit a user follow-up reply
 * Adds a new inbound message to an existing conversation
 */
replyRoutes.post('/', async (c) => {
  try {
    // Get API key from context (set by apiKeyAuth middleware)
    const apiKey = c.get('apiKey');

    // Parse request body
    const body = await c.req.json<ReplyRequest>();

    // Validate required fields
    if (!body.conversation_id || typeof body.conversation_id !== 'string') {
      return c.json({ error: 'Missing required field: conversation_id' }, 400);
    }

    if (!body.text || typeof body.text !== 'string') {
      return c.json({ error: 'Missing required field: text' }, 400);
    }

    if (!body.session_id || typeof body.session_id !== 'string') {
      return c.json({ error: 'Missing required field: session_id' }, 400);
    }

    // Find the conversation and verify it belongs to this API key and session
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, parseInt(body.conversation_id, 10)),
        eq(conversations.apiKeyId, apiKey.id),
        eq(conversations.sessionId, body.session_id)
      ),
    });

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    // Build message content (simpler for replies - just text)
    const messageContent = JSON.stringify({
      text: body.text,
    });

    // Store the message
    const [newMessage] = await db.insert(messages).values({
      conversationId: conversation.id,
      direction: 'inbound',
      content: messageContent,
    }).returning();

    return c.json({
      success: true,
      message_id: newMessage.id,
      conversation_id: conversation.id,
    });
  } catch (error) {
    console.error('Reply submission error:', error);
    return c.json({ error: 'Failed to submit reply' }, 500);
  }
});
