/**
 * API Key Management Routes
 * Dashboard endpoints for generating and managing API keys
 */

import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { eq, inArray } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db, apiKeys, sessions, users, projects } from '../db/index.js';

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
 * Get all API keys for user's projects
 */
keysRoutes.get('/', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  // Get all projects for this user
  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, user.id),
  });

  if (userProjects.length === 0) {
    return c.json({ hasKeys: false, keys: [] });
  }

  const projectIds = userProjects.map(p => p.id);

  // Get all API keys for these projects
  const userApiKeys = await db.query.apiKeys.findMany({
    where: inArray(apiKeys.projectId, projectIds),
  });

  // Map keys to projects
  const keysWithProjects = userApiKeys.map(key => {
    const project = userProjects.find(p => p.id === key.projectId);
    return {
      id: key.id,
      keyPrefix: getKeyPrefix(key.key),
      createdAt: key.createdAt,
      projectId: key.projectId,
      projectName: project?.name || null,
    };
  });

  return c.json({
    hasKeys: keysWithProjects.length > 0,
    keys: keysWithProjects,
  });
});

/**
 * POST /api/keys
 * Generate a new API key for a project
 * Requires projectId in body
 * @deprecated Use POST /api/projects which creates both project and API key
 */
keysRoutes.post('/', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  // Parse body for projectId
  const body = await c.req.json<{ projectId?: number }>();

  if (!body.projectId) {
    return c.json(
      { error: 'projectId is required. Use POST /api/projects to create a new project with an API key.' },
      400
    );
  }

  // Verify project belongs to user
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, body.projectId),
  });

  if (!project || project.userId !== user.id) {
    return c.json({ error: 'Project not found' }, 404);
  }

  // Check if project already has an API key
  const existingKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.projectId, body.projectId),
  });

  if (existingKey) {
    return c.json(
      { error: 'Project already has an API key. Use POST /api/projects/:id/regenerate-key to generate a new one.' },
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
      projectId: body.projectId,
      userId: String(user.id),
    })
    .returning();

  // Return full key - shown only once!
  return c.json({
    success: true,
    key,
    keyPrefix: getKeyPrefix(key),
    createdAt: newApiKey.createdAt,
    projectId: body.projectId,
    projectName: project.name,
    message: 'API key generated. Save it now - it will not be shown again!',
  });
});

/**
 * DELETE /api/keys
 * Delete API key for a specific project
 * Requires projectId query param
 */
keysRoutes.delete('/', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const projectIdParam = c.req.query('projectId');
  if (!projectIdParam) {
    return c.json({ error: 'projectId query parameter is required' }, 400);
  }

  const projectId = parseInt(projectIdParam, 10);
  if (isNaN(projectId)) {
    return c.json({ error: 'Invalid projectId' }, 400);
  }

  // Verify project belongs to user
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project || project.userId !== user.id) {
    return c.json({ error: 'Project not found' }, 404);
  }

  // Find and delete the API key
  const existingKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.projectId, projectId),
  });

  if (!existingKey) {
    return c.json({ error: 'No API key found for this project' }, 404);
  }

  await db.delete(apiKeys).where(eq(apiKeys.id, existingKey.id));

  return c.json({ success: true, message: 'API key deleted' });
});
