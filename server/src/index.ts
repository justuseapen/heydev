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
import { errorsRoutes } from './routes/errors.js';
import { replyRoutes } from './routes/reply.js';
import { webhookReplyRoutes } from './routes/webhookReply.js';
import { eventsRoutes } from './routes/events.js';
import { authRoutes } from './routes/auth.js';
import { keysRoutes } from './routes/keys.js';
import { channelsRoutes } from './routes/channels.js';
import { feedbackApiRoutes } from './routes/feedbackApi.js';
import { registerWebhookSender } from './services/webhookSender.js';
import { registerEmailSender } from './services/emailNotificationSender.js';

export const VERSION = '0.1.0';

// Register notification channel senders
registerWebhookSender();
registerEmailSender();

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

// Feedback inbox routes (requires session auth, not API key auth)
// Note: GET /api/feedback is session-auth, POST /api/feedback is API key auth (under protected routes)
app.route('/api/feedback', feedbackApiRoutes);

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

// Mount error routes under /api/errors (protected)
api.route('/errors', errorsRoutes);

// Mount user reply routes under /api/reply (protected)
api.route('/reply', replyRoutes);

// Mount webhook reply routes under /api/webhook (protected)
api.route('/webhook', webhookReplyRoutes);

// Mount protected routes under /api
app.route('/api', api);

// Serve dashboard static files (production build)
// This serves the React app's built assets
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dashboard is built to ../dashboard/dist relative to server/dist
const dashboardPath = join(__dirname, '../../dashboard/dist');

if (existsSync(dashboardPath)) {
  // Serve static assets
  app.use('/*', serveStatic({ root: dashboardPath }));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (c) => {
    const indexPath = join(dashboardPath, 'index.html');
    if (existsSync(indexPath)) {
      const html = readFileSync(indexPath, 'utf-8');
      return c.html(html);
    }
    return c.notFound();
  });

  console.log(`Dashboard static files served from ${dashboardPath}`);
} else {
  console.log(`Dashboard not found at ${dashboardPath} - only API available`);
}

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
