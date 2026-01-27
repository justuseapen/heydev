/**
 * Channel Management Routes
 * Dashboard endpoints for managing notification channels
 */

import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { eq, and } from 'drizzle-orm';
import { db, apiKeys, channels, sessions, users, type ChannelType, channelTypes } from '../db/index.js';
import { sendEmailVerificationCode } from '../services/emailService.js';

// In-memory store for email verification codes
// Format: Map<email, { code: string, expiresAt: Date, apiKeyId: number }>
const emailVerificationCodes = new Map<string, { code: string; expiresAt: Date; apiKeyId: number }>();

/**
 * Generate a 6-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
 * GET /api/channels/webhook/secret
 * Generate a new webhook signing secret
 */
channelsRoutes.get('/webhook/secret', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const crypto = await import('crypto');
  const secret = 'whsec_' + crypto.randomBytes(24).toString('hex');

  return c.json({ secret });
});

/**
 * POST /api/channels/webhook/test
 * Send a test webhook to verify the configuration
 */
channelsRoutes.post('/webhook/test', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const apiKey = await getUserApiKey(user.id);

  if (!apiKey) {
    return c.json({ error: 'API key required' }, 400);
  }

  const body = await c.req.json() as {
    url: string;
    secret?: string;
    headers?: Record<string, string>;
  };

  if (!body.url) {
    return c.json({ error: 'Webhook URL is required' }, 400);
  }

  // Validate URL format
  try {
    new URL(body.url);
  } catch {
    return c.json({ error: 'Invalid URL format' }, 400);
  }

  // Build test payload
  const testPayload = {
    event: 'test',
    message: 'This is a test webhook from HeyDev',
    timestamp: new Date().toISOString(),
  };

  const payloadJson = JSON.stringify(testPayload);

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'HeyDev-Webhook/1.0',
  };

  // Add custom headers
  if (body.headers) {
    for (const [key, value] of Object.entries(body.headers)) {
      if (key && value) {
        headers[key] = value;
      }
    }
  }

  // Add HMAC signature if secret is provided
  if (body.secret) {
    const crypto = await import('crypto');
    const hmac = crypto.createHmac('sha256', body.secret);
    hmac.update(payloadJson);
    headers['X-HeyDev-Signature'] = hmac.digest('hex');
  }

  try {
    // Create abort controller for timeout (5 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(body.url, {
      method: 'POST',
      headers,
      body: payloadJson,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return c.json({
        success: true,
        statusCode: response.status,
        message: 'Webhook test successful!',
      });
    }

    return c.json({
      success: false,
      statusCode: response.status,
      error: `HTTP ${response.status}: ${response.statusText}`,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return c.json({
        success: false,
        error: 'Request timed out after 5 seconds',
      });
    }

    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/channels/email/send-verification
 * Send a verification email with a 6-digit code
 */
channelsRoutes.post('/email/send-verification', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const apiKey = await getUserApiKey(user.id);

  if (!apiKey) {
    return c.json({ error: 'API key required' }, 400);
  }

  const body = await c.req.json() as { email: string };

  if (!body.email) {
    return c.json({ error: 'Email is required' }, 400);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return c.json({ error: 'Invalid email format' }, 400);
  }

  // Generate a 6-digit code
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Store the code
  emailVerificationCodes.set(body.email.toLowerCase(), {
    code,
    expiresAt,
    apiKeyId: apiKey.id,
  });

  // Send the verification email
  const result = await sendEmailVerificationCode(body.email, code);

  if (!result.success) {
    return c.json({ error: result.error || 'Failed to send verification email' }, 500);
  }

  return c.json({ success: true, message: 'Verification code sent' });
});

/**
 * POST /api/channels/email/verify
 * Verify the 6-digit code and save the email channel
 */
channelsRoutes.post('/email/verify', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const apiKey = await getUserApiKey(user.id);

  if (!apiKey) {
    return c.json({ error: 'API key required' }, 400);
  }

  const body = await c.req.json() as { email: string; code: string };

  if (!body.email || !body.code) {
    return c.json({ error: 'Email and code are required' }, 400);
  }

  // Look up the stored code
  const stored = emailVerificationCodes.get(body.email.toLowerCase());

  if (!stored) {
    return c.json({ error: 'No verification code found. Please request a new one.' }, 400);
  }

  // Check if expired
  if (new Date() > stored.expiresAt) {
    emailVerificationCodes.delete(body.email.toLowerCase());
    return c.json({ error: 'Verification code has expired. Please request a new one.' }, 400);
  }

  // Check if code matches
  if (stored.code !== body.code.trim()) {
    return c.json({ error: 'Invalid verification code' }, 400);
  }

  // Check if the stored code was for this API key
  if (stored.apiKeyId !== apiKey.id) {
    return c.json({ error: 'Verification code invalid for this account' }, 400);
  }

  // Code is valid - delete it
  emailVerificationCodes.delete(body.email.toLowerCase());

  // Save or update the email channel
  const existingChannel = await db.query.channels.findFirst({
    where: and(
      eq(channels.apiKeyId, apiKey.id),
      eq(channels.type, 'email')
    ),
  });

  const emailConfig = { email: body.email.toLowerCase() };

  if (existingChannel) {
    // Update existing channel
    await db
      .update(channels)
      .set({
        config: emailConfig,
        verified: true,
        enabled: true,
      })
      .where(eq(channels.id, existingChannel.id));
  } else {
    // Create new channel
    await db.insert(channels).values({
      apiKeyId: apiKey.id,
      type: 'email',
      config: emailConfig,
      enabled: true,
      verified: true,
    });
  }

  return c.json({ success: true, message: 'Email verified successfully' });
});

/**
 * POST /api/channels/slack/test
 * Send a test message to verify the Slack webhook configuration
 */
channelsRoutes.post('/slack/test', async (c) => {
  const sessionCookie = getCookie(c, 'heydev_session');
  const user = await getAuthenticatedUser(sessionCookie);

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const apiKey = await getUserApiKey(user.id);

  if (!apiKey) {
    return c.json({ error: 'API key required' }, 400);
  }

  const body = await c.req.json() as {
    webhookUrl: string;
  };

  if (!body.webhookUrl) {
    return c.json({ error: 'Slack webhook URL is required' }, 400);
  }

  // Validate URL format (Slack webhooks start with https://hooks.slack.com/)
  if (!body.webhookUrl.startsWith('https://hooks.slack.com/')) {
    return c.json({ error: 'Invalid Slack webhook URL. It should start with https://hooks.slack.com/' }, 400);
  }

  // Build test payload with Block Kit
  const testPayload = {
    text: 'Test message from HeyDev',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'HeyDev Test Message',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Your Slack integration is working! You will receive feedback notifications in this channel.',
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Sent at ${new Date().toLocaleString()} | via <https://heydev.io|HeyDev>`,
          },
        ],
      },
    ],
  };

  try {
    // Create abort controller for timeout (5 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(body.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return c.json({
        success: true,
        message: 'Test message sent successfully! Check your Slack channel.',
      });
    }

    const errorText = await response.text();
    return c.json({
      success: false,
      error: `Slack API error: ${response.status} - ${errorText}`,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return c.json({
        success: false,
        error: 'Request timed out after 5 seconds',
      });
    }

    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
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
