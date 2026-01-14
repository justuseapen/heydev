/**
 * Error Submission Routes
 * Handles receiving error reports from the widget
 */

import { Hono } from 'hono';
import { db, conversations, messages } from '../db/index.js';

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

    // For now, just create a new conversation for each error
    // US-003 will add fingerprinting and grouping logic
    const [conversation] = await db
      .insert(conversations)
      .values({
        apiKeyId: apiKey.id,
        sessionId: body.session_id,
        type: 'error',
        lastOccurredAt: new Date().toISOString(),
      })
      .returning();

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

    return c.json({ success: true });
  } catch (error) {
    console.error('Error submission error:', error);
    return c.json({ error: 'Failed to submit error' }, 500);
  }
});
