/**
 * HeyDev Server Entry Point
 * Backend API for the feedback widget
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';

export const VERSION = '0.1.0';

const app = new Hono();

// CORS middleware - allow all origins
app.use('*', cors());

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

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
