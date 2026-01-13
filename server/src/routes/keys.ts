/**
 * API Key Management Routes
 * Dashboard endpoints for generating and managing API keys
 */

import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db, apiKeys, sessions, users } from '../db/index.js';

export const keysRoutes = new Hono();

/**
 * Generate a secure API key with format: hd_live_<32 random hex chars>
 */
function generateApiKey(): string {
  const randomPart = crypto.randomBytes(16).toString('hex');
  return `hd_live_${randomPart}`;
}

/**
 * Get display prefix from API key (first 12 chars + ****)
 * e.g., "hd_live_abcd****"
 */
function getKeyPrefix(key: string): string {
  return key.substring(0, 12) + '****';
}

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
 * GET /api/keys
 * Get the current user's API key (returns prefix only, not full key)
 */
keysRoutes.get('/', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  // Find existing API key for this user
  const existingKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.userId, String(user.id)),
  });

  if (!existingKey) {
    return c.json({ hasKey: false });
  }

  return c.json({
    hasKey: true,
    keyPrefix: getKeyPrefix(existingKey.key),
    createdAt: existingKey.createdAt,
  });
});

/**
 * POST /api/keys
 * Generate a new API key for the current user
 * Returns full key only on creation (shown once)
 */
keysRoutes.post('/', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  // Check if user already has an API key
  const existingKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.userId, String(user.id)),
  });

  if (existingKey) {
    return c.json(
      { error: 'API key already exists. Delete existing key to generate a new one.' },
      400
    );
  }

  // Generate new API key
  const key = generateApiKey();

  // Store in database
  const [newApiKey] = await db
    .insert(apiKeys)
    .values({
      key,
      userId: String(user.id),
    })
    .returning();

  // Return full key - shown only once!
  return c.json({
    success: true,
    key,
    keyPrefix: getKeyPrefix(key),
    createdAt: newApiKey.createdAt,
    message: 'API key generated. Save it now - it will not be shown again!',
  });
});

/**
 * DELETE /api/keys
 * Delete the current user's API key
 */
keysRoutes.delete('/', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  // Find and delete the API key
  const existingKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.userId, String(user.id)),
  });

  if (!existingKey) {
    return c.json({ error: 'No API key found' }, 404);
  }

  await db.delete(apiKeys).where(eq(apiKeys.id, existingKey.id));

  return c.json({ success: true, message: 'API key deleted' });
});
