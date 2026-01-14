/**
 * Feedback API Routes (Dashboard)
 * Session-authenticated endpoints for viewing and managing feedback conversations
 */

import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { eq, and, isNull, isNotNull, desc, asc, sql } from 'drizzle-orm';
import { db, apiKeys, sessions, users, conversations, messages } from '../db/index.js';
import type { ConversationStatus } from '../db/schema.js';

export const feedbackApiRoutes = new Hono();

/**
 * Get authenticated user from session cookie
 */
async function getAuthenticatedUser(sessionCookie: string | undefined) {
  if (!sessionCookie) {
    return null;
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.sessionId, sessionCookie),
  });

  if (!session || new Date(session.expiresAt) < new Date()) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  return user;
}

/**
 * Get the user's API key
 */
async function getUserApiKey(userId: number) {
  return db.query.apiKeys.findFirst({
    where: eq(apiKeys.userId, String(userId)),
  });
}

/**
 * Parse message content to extract text preview
 */
function getMessagePreview(content: string, maxLength = 100): string {
  try {
    // Try parsing as JSON (inbound messages)
    const parsed = JSON.parse(content);
    const text = parsed.text || '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  } catch {
    // Plain text (outbound messages)
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  }
}

/**
 * GET /
 * List feedback conversations for authenticated user's API key
 *
 * Query params:
 * - archived: 'true' | 'false' (default: 'false')
 * - status: 'new' | 'resolved' (optional)
 */
feedbackApiRoutes.get('/', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  // Get user's API key
  const apiKey = await getUserApiKey(user.id);
  if (!apiKey) {
    return c.json({ error: 'No API key found. Generate one first.' }, 400);
  }

  // Parse query params
  const archivedParam = c.req.query('archived');
  const statusParam = c.req.query('status') as ConversationStatus | undefined;
  const showArchived = archivedParam === 'true';

  // Build where conditions
  const conditions = [eq(conversations.apiKeyId, apiKey.id)];

  if (showArchived) {
    conditions.push(isNotNull(conversations.archivedAt));
  } else {
    conditions.push(isNull(conversations.archivedAt));
  }

  if (statusParam && (statusParam === 'new' || statusParam === 'resolved')) {
    conditions.push(eq(conversations.status, statusParam));
  }

  // Fetch conversations with latest message using subquery
  const conversationsList = await db.query.conversations.findMany({
    where: and(...conditions),
    orderBy: [desc(conversations.createdAt)],
  });

  // For each conversation, get message count and latest message
  const results = await Promise.all(
    conversationsList.map(async (conv) => {
      // Get message count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(eq(messages.conversationId, conv.id));

      const messageCount = countResult[0]?.count ?? 0;

      // Get latest message
      const latestMessageResult = await db.query.messages.findFirst({
        where: eq(messages.conversationId, conv.id),
        orderBy: [desc(messages.createdAt)],
      });

      const latestMessage = latestMessageResult
        ? getMessagePreview(latestMessageResult.content)
        : null;

      return {
        id: conv.id,
        sessionId: conv.sessionId,
        status: conv.status,
        readAt: conv.readAt,
        archivedAt: conv.archivedAt,
        createdAt: conv.createdAt,
        latestMessage,
        messageCount,
      };
    })
  );

  return c.json(results);
});

/**
 * GET /unread-count
 * Get count of unread (non-archived) conversations
 */
feedbackApiRoutes.get('/unread-count', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const apiKey = await getUserApiKey(user.id);
  if (!apiKey) {
    return c.json({ error: 'No API key found. Generate one first.' }, 400);
  }

  // Count non-archived conversations where readAt is null
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(conversations)
    .where(
      and(
        eq(conversations.apiKeyId, apiKey.id),
        isNull(conversations.archivedAt),
        isNull(conversations.readAt)
      )
    );

  const count = countResult[0]?.count ?? 0;

  return c.json({ count });
});

/**
 * GET /:conversationId
 * Get a single conversation with all messages
 */
feedbackApiRoutes.get('/:conversationId', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  // Get user's API key
  const apiKey = await getUserApiKey(user.id);
  if (!apiKey) {
    return c.json({ error: 'No API key found. Generate one first.' }, 400);
  }

  const conversationId = parseInt(c.req.param('conversationId'), 10);
  if (isNaN(conversationId)) {
    return c.json({ error: 'Invalid conversation ID' }, 400);
  }

  // Fetch conversation
  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, conversationId),
      eq(conversations.apiKeyId, apiKey.id)
    ),
  });

  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  // Fetch all messages for this conversation in chronological order
  const conversationMessages = await db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: [asc(messages.createdAt)],
  });

  // Extract context from first inbound message
  let context = null;
  const firstInboundMessage = conversationMessages.find(m => m.direction === 'inbound');
  if (firstInboundMessage) {
    try {
      const parsed = JSON.parse(firstInboundMessage.content);
      context = parsed.context || null;
    } catch {
      // Content not JSON, no context available
    }
  }

  // Format messages for response
  const formattedMessages = conversationMessages.map((msg) => {
    let text = msg.content;
    let screenshotUrl = null;
    let audioUrl = null;

    // Parse JSON content for inbound messages
    if (msg.direction === 'inbound') {
      try {
        const parsed = JSON.parse(msg.content);
        text = parsed.text || '';
        screenshotUrl = parsed.screenshot_url || null;
        audioUrl = parsed.audio_url || null;
      } catch {
        // Content not JSON, use as-is
      }
    }

    return {
      id: msg.id,
      direction: msg.direction,
      text,
      screenshotUrl,
      audioUrl,
      createdAt: msg.createdAt,
    };
  });

  return c.json({
    id: conversation.id,
    sessionId: conversation.sessionId,
    status: conversation.status,
    readAt: conversation.readAt,
    archivedAt: conversation.archivedAt,
    createdAt: conversation.createdAt,
    context,
    messages: formattedMessages,
  });
});

/**
 * Helper to get and verify conversation ownership
 */
async function getConversationForUser(conversationId: number, apiKeyId: number) {
  return db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, conversationId),
      eq(conversations.apiKeyId, apiKeyId)
    ),
  });
}

/**
 * PATCH /:conversationId/read
 * Mark a conversation as read (sets readAt to current timestamp)
 */
feedbackApiRoutes.patch('/:conversationId/read', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const apiKey = await getUserApiKey(user.id);
  if (!apiKey) {
    return c.json({ error: 'No API key found. Generate one first.' }, 400);
  }

  const conversationId = parseInt(c.req.param('conversationId'), 10);
  if (isNaN(conversationId)) {
    return c.json({ error: 'Invalid conversation ID' }, 400);
  }

  const conversation = await getConversationForUser(conversationId, apiKey.id);
  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  // Update readAt to current timestamp
  const [updated] = await db
    .update(conversations)
    .set({ readAt: Math.floor(Date.now() / 1000) })
    .where(eq(conversations.id, conversationId))
    .returning();

  return c.json({
    id: updated.id,
    sessionId: updated.sessionId,
    status: updated.status,
    readAt: updated.readAt,
    archivedAt: updated.archivedAt,
    createdAt: updated.createdAt,
  });
});

/**
 * PATCH /:conversationId/status
 * Update conversation status (new | resolved)
 */
feedbackApiRoutes.patch('/:conversationId/status', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const apiKey = await getUserApiKey(user.id);
  if (!apiKey) {
    return c.json({ error: 'No API key found. Generate one first.' }, 400);
  }

  const conversationId = parseInt(c.req.param('conversationId'), 10);
  if (isNaN(conversationId)) {
    return c.json({ error: 'Invalid conversation ID' }, 400);
  }

  const conversation = await getConversationForUser(conversationId, apiKey.id);
  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  // Parse and validate body
  const body = await c.req.json<{ status: ConversationStatus }>();
  if (!body.status || (body.status !== 'new' && body.status !== 'resolved')) {
    return c.json({ error: "Invalid status. Must be 'new' or 'resolved'" }, 400);
  }

  const [updated] = await db
    .update(conversations)
    .set({ status: body.status })
    .where(eq(conversations.id, conversationId))
    .returning();

  return c.json({
    id: updated.id,
    sessionId: updated.sessionId,
    status: updated.status,
    readAt: updated.readAt,
    archivedAt: updated.archivedAt,
    createdAt: updated.createdAt,
  });
});

/**
 * PATCH /:conversationId/archive
 * Archive a conversation (sets archivedAt to current timestamp)
 */
feedbackApiRoutes.patch('/:conversationId/archive', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const apiKey = await getUserApiKey(user.id);
  if (!apiKey) {
    return c.json({ error: 'No API key found. Generate one first.' }, 400);
  }

  const conversationId = parseInt(c.req.param('conversationId'), 10);
  if (isNaN(conversationId)) {
    return c.json({ error: 'Invalid conversation ID' }, 400);
  }

  const conversation = await getConversationForUser(conversationId, apiKey.id);
  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  const [updated] = await db
    .update(conversations)
    .set({ archivedAt: Math.floor(Date.now() / 1000) })
    .where(eq(conversations.id, conversationId))
    .returning();

  return c.json({
    id: updated.id,
    sessionId: updated.sessionId,
    status: updated.status,
    readAt: updated.readAt,
    archivedAt: updated.archivedAt,
    createdAt: updated.createdAt,
  });
});

/**
 * PATCH /:conversationId/unarchive
 * Unarchive a conversation (sets archivedAt to null)
 */
feedbackApiRoutes.patch('/:conversationId/unarchive', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const apiKey = await getUserApiKey(user.id);
  if (!apiKey) {
    return c.json({ error: 'No API key found. Generate one first.' }, 400);
  }

  const conversationId = parseInt(c.req.param('conversationId'), 10);
  if (isNaN(conversationId)) {
    return c.json({ error: 'Invalid conversation ID' }, 400);
  }

  const conversation = await getConversationForUser(conversationId, apiKey.id);
  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  const [updated] = await db
    .update(conversations)
    .set({ archivedAt: null })
    .where(eq(conversations.id, conversationId))
    .returning();

  return c.json({
    id: updated.id,
    sessionId: updated.sessionId,
    status: updated.status,
    readAt: updated.readAt,
    archivedAt: updated.archivedAt,
    createdAt: updated.createdAt,
  });
});

/**
 * POST /:conversationId/reply
 * Send a reply to a conversation (creates outbound message)
 */
feedbackApiRoutes.post('/:conversationId/reply', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const apiKey = await getUserApiKey(user.id);
  if (!apiKey) {
    return c.json({ error: 'No API key found. Generate one first.' }, 400);
  }

  const conversationId = parseInt(c.req.param('conversationId'), 10);
  if (isNaN(conversationId)) {
    return c.json({ error: 'Invalid conversation ID' }, 400);
  }

  const conversation = await getConversationForUser(conversationId, apiKey.id);
  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  // Parse and validate body
  const body = await c.req.json<{ message: string }>();
  if (!body.message || typeof body.message !== 'string' || body.message.trim() === '') {
    return c.json({ error: 'Message is required' }, 400);
  }

  // Create outbound message
  const [newMessage] = await db
    .insert(messages)
    .values({
      conversationId: conversation.id,
      direction: 'outbound',
      content: body.message.trim(),
    })
    .returning();

  return c.json({
    id: newMessage.id,
    direction: newMessage.direction,
    text: newMessage.content,
    createdAt: newMessage.createdAt,
  });
});
