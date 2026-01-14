/**
 * Authentication Routes
 * Handles magic link authentication for the dashboard
 */

import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db, users, authTokens, sessions } from '../db/index.js';
import { sendMagicLinkEmail } from '../services/emailService.js';

export const authRoutes = new Hono();

// Token expiration time: 15 minutes
const TOKEN_EXPIRY_MS = 15 * 60 * 1000;

// Session expiration time: 7 days
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate a secure random token
 */
function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * POST /api/auth/magic-link
 * Send a magic link email to the user
 */
authRoutes.post('/magic-link', async (c) => {
  const body = await c.req.json().catch(() => null);

  if (!body || typeof body.email !== 'string') {
    return c.json({ error: 'Email is required' }, 400);
  }

  const email = body.email.toLowerCase().trim();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return c.json({ error: 'Invalid email format' }, 400);
  }

  // Find or create user
  let user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    const [newUser] = await db
      .insert(users)
      .values({ email })
      .returning();
    user = newUser;
  }

  // Generate magic link token
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString();

  // Store the token
  await db.insert(authTokens).values({
    token,
    userId: user.id,
    expiresAt,
  });

  // Get base URL for the magic link
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = c.req.header('host') || 'localhost:3000';
  const baseUrl = process.env.API_BASE_URL || `${protocol}://${host}`;

  // Send the magic link email
  const result = await sendMagicLinkEmail(email, token, baseUrl);

  if (!result.success) {
    return c.json({ error: 'Failed to send magic link email' }, 500);
  }

  return c.json({
    success: true,
    message: 'Magic link sent to your email',
  });
});

/**
 * GET /api/auth/verify
 * Verify a magic link token and create a session
 */
authRoutes.get('/verify', async (c) => {
  const token = c.req.query('token');

  if (!token) {
    return c.json({ error: 'Token is required' }, 400);
  }

  // Find the token
  const authToken = await db.query.authTokens.findFirst({
    where: eq(authTokens.token, token),
  });

  if (!authToken) {
    // Redirect to login with error
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:5174';
    return c.redirect(`${dashboardUrl}/login?error=invalid_token`);
  }

  // Check if token is expired
  const now = new Date();
  if (new Date(authToken.expiresAt) < now) {
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:5174';
    return c.redirect(`${dashboardUrl}/login?error=expired_token`);
  }

  // Check if token was already used
  if (authToken.usedAt) {
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:5174';
    return c.redirect(`${dashboardUrl}/login?error=used_token`);
  }

  // Mark token as used
  await db
    .update(authTokens)
    .set({ usedAt: now.toISOString() })
    .where(eq(authTokens.id, authToken.id));

  // Create a session
  const sessionId = generateToken();
  const sessionExpiresAt = new Date(Date.now() + SESSION_EXPIRY_MS).toISOString();

  await db.insert(sessions).values({
    sessionId,
    userId: authToken.userId,
    expiresAt: sessionExpiresAt,
  });

  // Set session cookie
  setCookie(c, 'heydev_session', sessionId, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: SESSION_EXPIRY_MS / 1000, // maxAge is in seconds
  });

  // Redirect to dashboard setup page
  const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:5174';
  return c.redirect(`${dashboardUrl}/setup`);
});

/**
 * GET /api/auth/me
 * Get the current authenticated user (checks session cookie)
 */
authRoutes.get('/me', async (c) => {
  const sessionId = getCookie(c, 'heydev_session');

  if (!sessionId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  // Find the session
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.sessionId, sessionId),
  });

  if (!session) {
    return c.json({ error: 'Invalid session' }, 401);
  }

  // Check if session is expired
  if (new Date(session.expiresAt) < new Date()) {
    return c.json({ error: 'Session expired' }, 401);
  }

  // Get the user
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  return c.json({
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    setupStep: user.setupStep,
    setupCompletedAt: user.setupCompletedAt,
  });
});

/**
 * PATCH /api/auth/setup-step
 * Update the user's setup progress step
 */
authRoutes.patch('/setup-step', async (c) => {
  const sessionId = getCookie(c, 'heydev_session');

  if (!sessionId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  // Find the session
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.sessionId, sessionId),
  });

  if (!session) {
    return c.json({ error: 'Invalid session' }, 401);
  }

  // Check if session is expired
  if (new Date(session.expiresAt) < new Date()) {
    return c.json({ error: 'Session expired' }, 401);
  }

  // Parse request body
  const body = await c.req.json().catch(() => null);

  if (!body || typeof body.step !== 'number') {
    return c.json({ error: 'Step is required and must be a number' }, 400);
  }

  const { step } = body;

  // Validate step is 1-4
  if (step < 1 || step > 4 || !Number.isInteger(step)) {
    return c.json({ error: 'Step must be an integer between 1 and 4' }, 400);
  }

  // Build update data
  const updateData: { setupStep: number; setupCompletedAt?: number } = {
    setupStep: step,
  };

  // When step is set to 4, also set setup_completed_at to current timestamp
  if (step === 4) {
    updateData.setupCompletedAt = Date.now();
  }

  // Update the user
  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, session.userId));

  // Get updated user
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  return c.json({
    setupStep: user.setupStep,
    setupCompletedAt: user.setupCompletedAt,
  });
});

/**
 * POST /api/auth/logout
 * Clear the session cookie and delete the session
 */
authRoutes.post('/logout', async (c) => {
  const sessionId = getCookie(c, 'heydev_session');

  if (sessionId) {
    // Delete the session from database
    await db.delete(sessions).where(eq(sessions.sessionId, sessionId));

    // Clear the cookie
    setCookie(c, 'heydev_session', '', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 0,
    });
  }

  return c.json({ success: true });
});
