/**
 * Error Submission Routes
 * Handles receiving error reports from the widget
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db, conversations, messages } from '../db/index.js';
import crypto from 'crypto';
import { routeToChannels } from '../services/channelRouter.js';

/**
 * Error details captured from the browser
 */
interface ErrorDetails {
  type: 'exception' | 'network';
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  url?: string;
  status?: number;
  method?: string;
}

/**
 * Context object captured from the widget
 */
interface ErrorContext {
  url: string;
  browser: string;
  os: string;
  viewport: { width: number; height: number };
  timestamp: string;
  timezone: string;
}

/**
 * Error submission request body
 */
interface ErrorRequest {
  error: ErrorDetails;
  context: ErrorContext;
  session_id: string;
}

export const errorsRoutes = new Hono();

/**
 * Normalize a stack trace for fingerprinting
 * Removes line numbers, column numbers, and query strings that vary between deployments
 */
function normalizeStack(stack: string): string {
  return stack
    // Remove line and column numbers (e.g., :123:45)
    .replace(/:\d+:\d+/g, ':X:X')
    // Remove query strings in URLs (e.g., ?v=123)
    .replace(/\?[^\s)]+/g, '')
    // Normalize webpack chunk hashes (e.g., main.abc123.js -> main.X.js)
    .replace(/\.[a-f0-9]{8,}\.js/gi, '.X.js')
    // Trim whitespace
    .trim();
}

/**
 * Generate a fingerprint for error grouping
 * Combines error type, message, and normalized stack trace to create a unique hash
 */
export function generateFingerprint(
  type: 'exception' | 'network',
  message: string,
  stack?: string
): string {
  const parts: string[] = [type, message];

  if (stack) {
    parts.push(normalizeStack(stack));
  }

  const content = parts.join('|');
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 32);
}

/**
 * POST /errors - Submit an error report
 * Creates a new error conversation or stores occurrence in existing one
 */
errorsRoutes.post('/', async (c) => {
  try {
    // Get API key from context (set by apiKeyAuth middleware)
    const apiKey = c.get('apiKey');

    // Parse request body
    const body = await c.req.json<ErrorRequest>();

    // Validate required fields
    if (!body.error || typeof body.error !== 'object') {
      return c.json({ error: 'Missing required field: error' }, 400);
    }

    if (!body.error.type || !['exception', 'network'].includes(body.error.type)) {
      return c.json({ error: "Invalid error type. Must be 'exception' or 'network'" }, 400);
    }

    if (!body.error.message || typeof body.error.message !== 'string') {
      return c.json({ error: 'Missing required field: error.message' }, 400);
    }

    if (!body.session_id || typeof body.session_id !== 'string') {
      return c.json({ error: 'Missing required field: session_id' }, 400);
    }

    if (!body.context || typeof body.context !== 'object') {
      return c.json({ error: 'Missing required field: context' }, 400);
    }

    // Validate context fields
    const { context } = body;
    const requiredContextFields = ['url', 'browser', 'os', 'viewport', 'timestamp', 'timezone'];
    for (const field of requiredContextFields) {
      if (!(field in context)) {
        return c.json({ error: `Missing required context field: ${field}` }, 400);
      }
    }

    // Generate fingerprint for error grouping
    const fingerprint = generateFingerprint(
      body.error.type,
      body.error.message,
      body.error.stack
    );

    // Check for existing conversation with same fingerprint and API key
    const [existingConversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.apiKeyId, apiKey.id),
          eq(conversations.fingerprint, fingerprint)
        )
      )
      .limit(1);

    let conversation;

    if (existingConversation) {
      // Update existing conversation: increment count, update timestamp, reset status, clear readAt
      const [updated] = await db
        .update(conversations)
        .set({
          occurrenceCount: existingConversation.occurrenceCount + 1,
          lastOccurredAt: new Date().toISOString(),
          status: 'new',
          readAt: null,
        })
        .where(eq(conversations.id, existingConversation.id))
        .returning();
      conversation = updated;
    } else {
      // Create new error conversation with fingerprint
      const [newConversation] = await db
        .insert(conversations)
        .values({
          apiKeyId: apiKey.id,
          sessionId: body.session_id,
          type: 'error',
          fingerprint,
          lastOccurredAt: new Date().toISOString(),
        })
        .returning();
      conversation = newConversation;
    }

    // Build message content with error details
    const messageContent = JSON.stringify({
      error_type: body.error.type,
      message: body.error.message,
      stack: body.error.stack || null,
      filename: body.error.filename || null,
      lineno: body.error.lineno || null,
      colno: body.error.colno || null,
      url: body.error.url || null,
      status: body.error.status || null,
      method: body.error.method || null,
      context: body.context,
    });

    // Store the message
    await db.insert(messages).values({
      conversationId: conversation.id,
      direction: 'inbound',
      content: messageContent,
    });

    // Route to notification channels (non-blocking)
    // For errors, we format the message as feedback text
    const errorText = body.error.type === 'exception'
      ? `Exception: ${body.error.message}${body.error.stack ? `\n\nStack trace:\n${body.error.stack}` : ''}`
      : `Network Error: ${body.error.method || 'GET'} ${body.error.url || 'unknown'} - ${body.error.status || 'failed'}: ${body.error.message}`;

    routeToChannels(
      apiKey.id,
      {
        text: errorText,
        screenshot_url: null,
        audio_url: null,
      },
      body.context,
      body.session_id
    ).catch((err) => {
      console.error('Error routing to notification channels:', err);
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Error submission error:', error);
    return c.json({ error: 'Failed to submit error' }, 500);
  }
});
