/**
 * Channel Management Routes
 * Dashboard endpoints for managing notification channels
 */

import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { eq, and } from 'drizzle-orm';
import { db, apiKeys, channels, sessions, users, type ChannelType, channelTypes } from '../db/index.js';

export const channelsRoutes = new Hono();

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
 * Get user's API key record
 */
async function getUserApiKey(userId: number) {
  return db.query.apiKeys.findFirst({
    where: eq(apiKeys.userId, String(userId)),
  });
}

/**
 * GET /api/channels
 * Get all notification channels for the current user
 */
channelsRoutes.get('/', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const apiKey = await getUserApiKey(user.id);

  if (!apiKey) {
    // Return empty channels if no API key - user needs to set up API key first
    return c.json({
      channels: channelTypes.map((type) => ({
        type,
        enabled: false,
        verified: false,
        configured: false,
      })),
    });
  }

  // Get existing channel configurations
  const existingChannels = await db.query.channels.findMany({
    where: eq(channels.apiKeyId, apiKey.id),
  });

  // Create map of existing channels
  const channelMap = new Map(existingChannels.map((ch) => [ch.type, ch]));

  // Return all channel types with their status
  const allChannels = channelTypes.map((type) => {
    const existing = channelMap.get(type);
    return {
      id: existing?.id,
      type,
      enabled: existing?.enabled ?? false,
      verified: existing?.verified ?? false,
      configured: existing?.config ? Object.keys(existing.config).length > 0 : false,
      config: existing?.config ?? {},
    };
  });

  return c.json({ channels: allChannels });
});

/**
 * POST /api/channels
 * Create or update a channel configuration
 */
channelsRoutes.post('/', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const apiKey = await getUserApiKey(user.id);

  if (!apiKey) {
    return c.json({ error: 'API key required. Generate one first.' }, 400);
  }

  const body = await c.req.json() as {
    type: ChannelType;
    config?: Record<string, unknown>;
    enabled?: boolean;
  };

  if (!body.type || !channelTypes.includes(body.type)) {
    return c.json({ error: 'Invalid channel type' }, 400);
  }

  // Check if channel already exists
  const existingChannel = await db.query.channels.findFirst({
    where: and(
      eq(channels.apiKeyId, apiKey.id),
      eq(channels.type, body.type)
    ),
  });

  if (existingChannel) {
    // Update existing channel
    const [updated] = await db
      .update(channels)
      .set({
        config: body.config ?? existingChannel.config,
        enabled: body.enabled ?? existingChannel.enabled,
      })
      .where(eq(channels.id, existingChannel.id))
      .returning();

    return c.json({
      success: true,
      channel: {
        id: updated.id,
        type: updated.type,
        enabled: updated.enabled,
        verified: updated.verified,
        configured: updated.config ? Object.keys(updated.config).length > 0 : false,
      },
    });
  }

  // Create new channel
  const [newChannel] = await db
    .insert(channels)
    .values({
      apiKeyId: apiKey.id,
      type: body.type,
      config: body.config ?? {},
      enabled: body.enabled ?? false,
      verified: false,
    })
    .returning();

  return c.json({
    success: true,
    channel: {
      id: newChannel.id,
      type: newChannel.type,
      enabled: newChannel.enabled,
      verified: newChannel.verified,
      configured: newChannel.config ? Object.keys(newChannel.config).length > 0 : false,
    },
  });
});

/**
 * PATCH /api/channels/:type/toggle
 * Enable or disable a channel
 */
channelsRoutes.patch('/:type/toggle', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const apiKey = await getUserApiKey(user.id);

  if (!apiKey) {
    return c.json({ error: 'API key required' }, 400);
  }

  const type = c.req.param('type') as ChannelType;
  if (!channelTypes.includes(type)) {
    return c.json({ error: 'Invalid channel type' }, 400);
  }

  const body = await c.req.json() as { enabled: boolean };

  // Find existing channel
  const existingChannel = await db.query.channels.findFirst({
    where: and(
      eq(channels.apiKeyId, apiKey.id),
      eq(channels.type, type)
    ),
  });

  if (existingChannel) {
    // Update enabled status
    const [updated] = await db
      .update(channels)
      .set({ enabled: body.enabled })
      .where(eq(channels.id, existingChannel.id))
      .returning();

    return c.json({
      success: true,
      channel: {
        id: updated.id,
        type: updated.type,
        enabled: updated.enabled,
        verified: updated.verified,
        configured: updated.config ? Object.keys(updated.config).length > 0 : false,
      },
    });
  }

  // Create new channel with enabled status (but not configured)
  const [newChannel] = await db
    .insert(channels)
    .values({
      apiKeyId: apiKey.id,
      type,
      config: {},
      enabled: body.enabled,
      verified: false,
    })
    .returning();

  return c.json({
    success: true,
    channel: {
      id: newChannel.id,
      type: newChannel.type,
      enabled: newChannel.enabled,
      verified: newChannel.verified,
      configured: false,
    },
  });
});

/**
 * GET /api/channels/:type
 * Get a specific channel's configuration
 */
channelsRoutes.get('/:type', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const apiKey = await getUserApiKey(user.id);

  if (!apiKey) {
    return c.json({ error: 'API key required' }, 400);
  }

  const type = c.req.param('type') as ChannelType;
  if (!channelTypes.includes(type)) {
    return c.json({ error: 'Invalid channel type' }, 400);
  }

  const channel = await db.query.channels.findFirst({
    where: and(
      eq(channels.apiKeyId, apiKey.id),
      eq(channels.type, type)
    ),
  });

  if (!channel) {
    return c.json({
      type,
      enabled: false,
      verified: false,
      configured: false,
      config: {},
    });
  }

  return c.json({
    id: channel.id,
    type: channel.type,
    enabled: channel.enabled,
    verified: channel.verified,
    configured: channel.config ? Object.keys(channel.config).length > 0 : false,
    config: channel.config,
  });
});
