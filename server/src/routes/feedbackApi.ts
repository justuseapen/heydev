/**
 * Feedback API Routes (Dashboard)
 * Session-authenticated endpoints for viewing and managing feedback conversations
 */

import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { eq, and, isNull, isNotNull, desc, sql } from 'drizzle-orm';
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
