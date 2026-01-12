/**
 * API Key Validation Middleware
 * Validates API keys from X-API-Key header or query parameter
 */

import { createMiddleware } from 'hono/factory';
import { eq } from 'drizzle-orm';
import { db, apiKeys, type ApiKey } from '../db/index.js';

// Extend Hono's context variables to include the API key
declare module 'hono' {
  interface ContextVariableMap {
    apiKey: ApiKey;
  }
}

/**
 * Middleware that validates API keys from X-API-Key header or ?api_key query param
 * Attaches the api_key record to request context if valid
 * Returns 401 if invalid or missing
 */
export const apiKeyAuth = createMiddleware(async (c, next) => {
  // Extract API key from header or query parameter
  const apiKeyFromHeader = c.req.header('X-API-Key');
  const apiKeyFromQuery = c.req.query('api_key');
  const key = apiKeyFromHeader || apiKeyFromQuery;

  if (!key) {
    return c.json(
      { error: 'API key required. Provide via X-API-Key header or api_key query parameter.' },
      401
    );
  }

  // Look up the API key in the database
  const apiKeyRecord = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.key, key),
  });

  if (!apiKeyRecord) {
    return c.json({ error: 'Invalid API key.' }, 401);
  }

  // Attach the API key record to the context for use in handlers
  c.set('apiKey', apiKeyRecord);

  return next();
});
