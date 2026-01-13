/**
 * SSE Events Routes
 * Server-Sent Events endpoint for real-time message delivery to widgets
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { subscribeToSession, type SSEMessage } from '../services/sseManager.js';

export const eventsRoutes = new Hono();

// Heartbeat interval in milliseconds (30 seconds)
const HEARTBEAT_INTERVAL = 30000;

/**
 * GET /events/:sessionId - Establish SSE connection for real-time replies
 *
 * The widget connects to this endpoint after sending initial feedback
 * to receive developer replies in real-time.
 */
eventsRoutes.get('/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');

  if (!sessionId) {
    return c.json({ error: 'Session ID is required' }, 400);
  }

  return streamSSE(c, async (stream) => {
    let isConnected = true;

    // Set up message listener for this session
    const unsubscribe = subscribeToSession(sessionId, (message: SSEMessage) => {
      if (isConnected) {
        stream.writeSSE({
          event: 'message',
          data: JSON.stringify(message),
        });
      }
    });

    // Send initial connection event
    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({ sessionId, timestamp: new Date().toISOString() }),
    });

    // Set up heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (isConnected) {
        stream.writeSSE({
          event: 'heartbeat',
          data: JSON.stringify({ timestamp: new Date().toISOString() }),
        });
      }
    }, HEARTBEAT_INTERVAL);

    // Wait for disconnect
    // The stream will be aborted when the client disconnects
    try {
      await new Promise<void>((resolve) => {
        stream.onAbort(() => {
          isConnected = false;
          resolve();
        });
      });
    } finally {
      // Clean up
      isConnected = false;
      clearInterval(heartbeatInterval);
      unsubscribe();
    }
  });
});
