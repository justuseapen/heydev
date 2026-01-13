/**
 * HeyDev Server Entry Point
 * Backend API for the feedback widget
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { apiKeyAuth } from './middleware/apiKey.js';
import { uploadRoutes } from './routes/upload.js';
import { transcribeRoutes } from './routes/transcribe.js';
import { feedbackRoutes } from './routes/feedback.js';
import { replyRoutes } from './routes/reply.js';
import { webhookReplyRoutes } from './routes/webhookReply.js';
import { eventsRoutes } from './routes/events.js';
import { authRoutes } from './routes/auth.js';
import { keysRoutes } from './routes/keys.js';
import { channelsRoutes } from './routes/channels.js';
import { registerWebhookSender } from './services/webhookSender.js';

export const VERSION = '0.1.0';

// Register notification channel senders
registerWebhookSender();

const app = new Hono();

// CORS middleware - allow credentials for dashboard
app.use('*', cors({
  origin: (origin) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return '*';
    // Allow localhost on any port for development
    if (origin.startsWith('http://localhost:')) return origin;
    // Allow the production dashboard URL if set
    if (process.env.DASHBOARD_URL && origin === process.env.DASHBOARD_URL) return origin;
    // Default: allow all (for widget on any domain)
    return '*';
  },
  credentials: true,
}));

// Health check endpoint (public)
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Serve uploaded files statically at GET /uploads/:filename
app.use('/uploads/*', serveStatic({ root: './' }));

// SSE endpoint for real-time message delivery (no API key required, uses session ID)
app.route('/api/events', eventsRoutes);

// Auth routes (public - no API key required)
app.route('/api/auth', authRoutes);

// API key management routes (requires session auth, not API key auth)
app.route('/api/keys', keysRoutes);

// Channel management routes (requires session auth, not API key auth)
app.route('/api/channels', channelsRoutes);

// Protected API routes - require API key authentication
const api = new Hono();
api.use('*', apiKeyAuth);

// Example protected endpoint - returns API key info
api.get('/me', (c) => {
  const apiKey = c.get('apiKey');
  return c.json({
    id: apiKey.id,
    createdAt: apiKey.createdAt,
    userId: apiKey.userId,
  });
});

// Mount upload routes under /api/upload (protected)
api.route('/upload', uploadRoutes);

// Mount transcription routes under /api/transcribe (protected)
api.route('/transcribe', transcribeRoutes);

// Mount feedback routes under /api/feedback (protected)
api.route('/feedback', feedbackRoutes);

// Mount user reply routes under /api/reply (protected)
api.route('/reply', replyRoutes);

// Mount webhook reply routes under /api/webhook (protected)
api.route('/webhook', webhookReplyRoutes);

// Mount protected routes under /api
app.route('/api', api);

// Get port from environment or use default
const port = parseInt(process.env.PORT || '3000', 10);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`HeyDev server v${VERSION} running on http://localhost:${info.port}`);
  }
);

export { app };
