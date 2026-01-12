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

export const VERSION = '0.1.0';

const app = new Hono();

// CORS middleware - allow all origins
app.use('*', cors());

// Health check endpoint (public)
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Serve uploaded files statically at GET /uploads/:filename
app.use('/uploads/*', serveStatic({ root: './' }));

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
