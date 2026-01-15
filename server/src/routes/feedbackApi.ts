/**
 * Feedback API Routes (Dashboard)
 * Session-authenticated endpoints for viewing and managing feedback conversations
 */

import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { eq, and, isNull, isNotNull, desc, asc, sql, inArray } from 'drizzle-orm';
import { db, apiKeys, sessions, users, conversations, messages, projects } from '../db/index.js';
import type { ConversationStatus, ConversationType } from '../db/schema.js';

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
 * Get all API keys for user's projects
 */
async function getUserApiKeys(userId: number) {
  // Get all projects for this user
  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, userId),
  });

  if (userProjects.length === 0) {
    return [];
  }

  const projectIds = userProjects.map(p => p.id);

  // Get all API keys for these projects
  return db.query.apiKeys.findMany({
    where: inArray(apiKeys.projectId, projectIds),
  });
}

/**
 * Get project info for an API key
 */
async function getProjectForApiKey(apiKeyId: number) {
  const apiKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.id, apiKeyId),
  });

  if (!apiKey?.projectId) return null;

  return db.query.projects.findFirst({
    where: eq(projects.id, apiKey.projectId),
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
 * List feedback conversations for authenticated user's projects
 *
 * Query params:
 * - archived: 'true' | 'false' (default: 'false')
 * - status: 'new' | 'resolved' (optional)
 * - type: 'feedback' | 'error' (optional, filters by conversation type)
 * - projectId: number (optional, filter by specific project)
 */
feedbackApiRoutes.get('/', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  // Get all API keys for user's projects
  const userApiKeys = await getUserApiKeys(user.id);
  if (userApiKeys.length === 0) {
    return c.json({ error: 'No projects found. Create a project first.' }, 400);
  }

  // Parse query params
  const archivedParam = c.req.query('archived');
  const statusParam = c.req.query('status') as ConversationStatus | undefined;
  const typeParam = c.req.query('type') as ConversationType | undefined;
  const projectIdParam = c.req.query('projectId');
  const showArchived = archivedParam === 'true';

  // Filter API keys by project if specified
  let apiKeyIds = userApiKeys.map(k => k.id);

  if (projectIdParam) {
    const projectId = parseInt(projectIdParam, 10);
    if (!isNaN(projectId)) {
      // Find the API key for this specific project
      const projectApiKey = userApiKeys.find(k => k.projectId === projectId);
      if (projectApiKey) {
        apiKeyIds = [projectApiKey.id];
      } else {
        // Project not found or doesn't belong to user
        return c.json([]);
      }
    }
  }

  // Build where conditions - span all user's API keys (or filtered by project)
  const conditions = [inArray(conversations.apiKeyId, apiKeyIds)];

  if (showArchived) {
    conditions.push(isNotNull(conversations.archivedAt));
  } else {
    conditions.push(isNull(conversations.archivedAt));
  }

  if (statusParam && (statusParam === 'new' || statusParam === 'resolved')) {
    conditions.push(eq(conversations.status, statusParam));
  }

  // Filter by type if provided
  if (typeParam && (typeParam === 'feedback' || typeParam === 'error')) {
    conditions.push(eq(conversations.type, typeParam));
  }

  // Fetch conversations with latest message using subquery
  const conversationsList = await db.query.conversations.findMany({
    where: and(...conditions),
    orderBy: [desc(conversations.createdAt)],
  });

  // Build a map of apiKeyId -> project for efficient lookup
  const apiKeyToProject = new Map<number, { id: number; name: string }>();
  for (const apiKey of userApiKeys) {
    if (apiKey.projectId) {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, apiKey.projectId),
      });
      if (project) {
        apiKeyToProject.set(apiKey.id, { id: project.id, name: project.name });
      }
    }
  }

  // For each conversation, get message count, latest message, and project info
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

      // Get project info
      const project = apiKeyToProject.get(conv.apiKeyId);

      return {
        id: conv.id,
        sessionId: conv.sessionId,
        status: conv.status,
        type: conv.type,
        occurrenceCount: conv.occurrenceCount,
        lastOccurredAt: conv.lastOccurredAt,
        readAt: conv.readAt,
        archivedAt: conv.archivedAt,
        createdAt: conv.createdAt,
        latestMessage,
        messageCount,
        projectId: project?.id || null,
        projectName: project?.name || null,
      };
    })
  );

  return c.json(results);
});

/**
 * GET /unread-count
 * Get count of unread (non-archived) conversations across all projects
 */
feedbackApiRoutes.get('/unread-count', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const userApiKeys = await getUserApiKeys(user.id);
  if (userApiKeys.length === 0) {
    return c.json({ count: 0 });
  }

  const apiKeyIds = userApiKeys.map(k => k.id);

  // Count non-archived conversations where readAt is null across all projects
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(conversations)
    .where(
      and(
        inArray(conversations.apiKeyId, apiKeyIds),
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

  // Get all API keys for user's projects
  const userApiKeys = await getUserApiKeys(user.id);
  if (userApiKeys.length === 0) {
    return c.json({ error: 'No projects found. Create a project first.' }, 400);
  }

  const apiKeyIds = userApiKeys.map(k => k.id);

  const conversationId = parseInt(c.req.param('conversationId'), 10);
  if (isNaN(conversationId)) {
    return c.json({ error: 'Invalid conversation ID' }, 400);
  }

  // Fetch conversation - check if it belongs to any of user's projects
  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, conversationId),
      inArray(conversations.apiKeyId, apiKeyIds)
    ),
  });

  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  // Get project info for this conversation
  const project = await getProjectForApiKey(conversation.apiKeyId);

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
    type: conversation.type,
    occurrenceCount: conversation.occurrenceCount,
    lastOccurredAt: conversation.lastOccurredAt,
    readAt: conversation.readAt,
    archivedAt: conversation.archivedAt,
    createdAt: conversation.createdAt,
    context,
    messages: formattedMessages,
    projectId: project?.id || null,
    projectName: project?.name || null,
  });
});

/**
 * Helper to get and verify conversation ownership across all user's projects
 */
async function getConversationForUserProjects(conversationId: number, apiKeyIds: number[]) {
  return db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, conversationId),
      inArray(conversations.apiKeyId, apiKeyIds)
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

  const userApiKeys = await getUserApiKeys(user.id);
  if (userApiKeys.length === 0) {
    return c.json({ error: 'No projects found. Create a project first.' }, 400);
  }

  const apiKeyIds = userApiKeys.map(k => k.id);

  const conversationId = parseInt(c.req.param('conversationId'), 10);
  if (isNaN(conversationId)) {
    return c.json({ error: 'Invalid conversation ID' }, 400);
  }

  const conversation = await getConversationForUserProjects(conversationId, apiKeyIds);
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

  const userApiKeys = await getUserApiKeys(user.id);
  if (userApiKeys.length === 0) {
    return c.json({ error: 'No projects found. Create a project first.' }, 400);
  }

  const apiKeyIds = userApiKeys.map(k => k.id);

  const conversationId = parseInt(c.req.param('conversationId'), 10);
  if (isNaN(conversationId)) {
    return c.json({ error: 'Invalid conversation ID' }, 400);
  }

  const conversation = await getConversationForUserProjects(conversationId, apiKeyIds);
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

  const userApiKeys = await getUserApiKeys(user.id);
  if (userApiKeys.length === 0) {
    return c.json({ error: 'No projects found. Create a project first.' }, 400);
  }

  const apiKeyIds = userApiKeys.map(k => k.id);

  const conversationId = parseInt(c.req.param('conversationId'), 10);
  if (isNaN(conversationId)) {
    return c.json({ error: 'Invalid conversation ID' }, 400);
  }

  const conversation = await getConversationForUserProjects(conversationId, apiKeyIds);
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

  const userApiKeys = await getUserApiKeys(user.id);
  if (userApiKeys.length === 0) {
    return c.json({ error: 'No projects found. Create a project first.' }, 400);
  }

  const apiKeyIds = userApiKeys.map(k => k.id);

  const conversationId = parseInt(c.req.param('conversationId'), 10);
  if (isNaN(conversationId)) {
    return c.json({ error: 'Invalid conversation ID' }, 400);
  }

  const conversation = await getConversationForUserProjects(conversationId, apiKeyIds);
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

  const userApiKeys = await getUserApiKeys(user.id);
  if (userApiKeys.length === 0) {
    return c.json({ error: 'No projects found. Create a project first.' }, 400);
  }

  const apiKeyIds = userApiKeys.map(k => k.id);

  const conversationId = parseInt(c.req.param('conversationId'), 10);
  if (isNaN(conversationId)) {
    return c.json({ error: 'Invalid conversation ID' }, 400);
  }

  const conversation = await getConversationForUserProjects(conversationId, apiKeyIds);
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
