/**
 * Project Management Routes
 * Dashboard endpoints for creating and managing projects
 * Each project gets its own API key
 */

import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db, apiKeys, sessions, users, projects, channels } from '../db/index.js';

export const projectsRoutes = new Hono();

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
 * GET /api/projects
 * List all projects for the authenticated user
 */
projectsRoutes.get('/', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  // Get all projects for this user
  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, user.id),
  });

  // Get API keys for each project
  const projectsWithKeys = await Promise.all(
    userProjects.map(async (project) => {
      const apiKey = await db.query.apiKeys.findFirst({
        where: eq(apiKeys.projectId, project.id),
      });

      return {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        hasApiKey: !!apiKey,
        apiKeyPrefix: apiKey ? getKeyPrefix(apiKey.key) : null,
      };
    })
  );

  return c.json(projectsWithKeys);
});

/**
 * POST /api/projects
 * Create a new project with an API key
 */
projectsRoutes.post('/', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  // Parse body
  const body = await c.req.json<{ name: string }>();
  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    return c.json({ error: 'Project name is required' }, 400);
  }

  const projectName = body.name.trim();

  // Create the project
  const [newProject] = await db.insert(projects).values({
    userId: user.id,
    name: projectName,
  }).returning();

  // Generate and create API key for the project
  const key = generateApiKey();
  await db.insert(apiKeys).values({
    key,
    projectId: newProject.id,
    userId: String(user.id), // Keep for backward compatibility
  });

  return c.json({
    id: newProject.id,
    name: newProject.name,
    createdAt: newProject.createdAt,
    apiKey: key, // Return full key on creation (shown only once)
    apiKeyPrefix: getKeyPrefix(key),
    message: 'Project created. Save your API key - it will not be shown again!',
  });
});

/**
 * GET /api/projects/:id
 * Get a specific project with its API key
 */
projectsRoutes.get('/:id', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const projectId = parseInt(c.req.param('id'), 10);
  if (isNaN(projectId)) {
    return c.json({ error: 'Invalid project ID' }, 400);
  }

  // Find the project (ensuring it belongs to this user)
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, user.id)),
  });

  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  // Get the API key
  const apiKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.projectId, project.id),
  });

  return c.json({
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey ? getKeyPrefix(apiKey.key) : null,
    apiKeyCreatedAt: apiKey?.createdAt || null,
  });
});

/**
 * PATCH /api/projects/:id
 * Update a project's name
 */
projectsRoutes.patch('/:id', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const projectId = parseInt(c.req.param('id'), 10);
  if (isNaN(projectId)) {
    return c.json({ error: 'Invalid project ID' }, 400);
  }

  // Find the project (ensuring it belongs to this user)
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, user.id)),
  });

  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  // Parse body
  const body = await c.req.json<{ name: string }>();
  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    return c.json({ error: 'Project name is required' }, 400);
  }

  // Update the project
  const [updated] = await db.update(projects)
    .set({ name: body.name.trim() })
    .where(eq(projects.id, projectId))
    .returning();

  return c.json({
    id: updated.id,
    name: updated.name,
    createdAt: updated.createdAt,
  });
});

/**
 * DELETE /api/projects/:id
 * Delete a project and all associated data (API key, conversations, channels)
 */
projectsRoutes.delete('/:id', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const projectId = parseInt(c.req.param('id'), 10);
  if (isNaN(projectId)) {
    return c.json({ error: 'Invalid project ID' }, 400);
  }

  // Find the project (ensuring it belongs to this user)
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, user.id)),
  });

  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  // Find the API key for this project
  const apiKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.projectId, project.id),
  });

  if (apiKey) {
    // Delete channels associated with this API key
    await db.delete(channels).where(eq(channels.apiKeyId, apiKey.id));

    // Note: We don't delete conversations here to preserve history
    // They become orphaned but can be cleaned up separately if needed

    // Delete the API key
    await db.delete(apiKeys).where(eq(apiKeys.id, apiKey.id));
  }

  // Delete the project
  await db.delete(projects).where(eq(projects.id, projectId));

  return c.json({ success: true, message: 'Project deleted' });
});

/**
 * POST /api/projects/:id/regenerate-key
 * Regenerate the API key for a project
 */
projectsRoutes.post('/:id/regenerate-key', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const projectId = parseInt(c.req.param('id'), 10);
  if (isNaN(projectId)) {
    return c.json({ error: 'Invalid project ID' }, 400);
  }

  // Find the project (ensuring it belongs to this user)
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, user.id)),
  });

  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  // Find and delete the old API key
  const oldApiKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.projectId, project.id),
  });

  if (oldApiKey) {
    await db.delete(apiKeys).where(eq(apiKeys.id, oldApiKey.id));
  }

  // Generate new API key
  const key = generateApiKey();
  await db.insert(apiKeys).values({
    key,
    projectId: project.id,
    userId: String(user.id),
  });

  return c.json({
    success: true,
    apiKey: key, // Return full key on regeneration (shown only once)
    apiKeyPrefix: getKeyPrefix(key),
    message: 'API key regenerated. Save it now - it will not be shown again!',
  });
});
