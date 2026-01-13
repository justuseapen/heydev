/**
 * Transcription Routes
 * Handles audio transcription using OpenAI Whisper API
 */

import { Hono } from 'hono';
import OpenAI from 'openai';

// Allowed audio MIME types for transcription
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp3', 'audio/mpeg'];

// Rate limiting: 10 requests per minute per session
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

// In-memory rate limit store (session_id -> { count, windowStart })
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if a session is rate limited
 * Returns true if the request should be allowed, false if rate limited
 */
function checkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(sessionId);

  if (!entry) {
    // First request from this session
    rateLimitStore.set(sessionId, { count: 1, windowStart: now });
    return true;
  }

  // Check if we're still in the same window
  if (now - entry.windowStart < RATE_LIMIT_WINDOW_MS) {
    // Within window - check count
    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
      return false; // Rate limited
    }
    entry.count++;
    return true;
  } else {
    // Window expired - reset
    rateLimitStore.set(sessionId, { count: 1, windowStart: now });
    return true;
  }
}

/**
 * Clean up old rate limit entries periodically
 * Called on each request to prevent memory leaks
 */
function cleanupRateLimitStore(): void {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS * 2; // Remove entries older than 2 windows

  for (const [sessionId, entry] of rateLimitStore.entries()) {
    if (entry.windowStart < cutoff) {
      rateLimitStore.delete(sessionId);
    }
  }
}

// Lazy-initialize OpenAI client to avoid crash when env var is missing
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI();
  }
  return openai;
}

export const transcribeRoutes = new Hono();

/**
 * POST /transcribe - Transcribe audio using OpenAI Whisper API
 * Accepts multipart/form-data with 'audio' field (webm/opus or other audio)
 * Requires 'session_id' field for rate limiting
 * Returns JSON with 'text' field containing transcription
 */
transcribeRoutes.post('/', async (c) => {
  try {
    // Cleanup old rate limit entries
    cleanupRateLimitStore();

    // Parse multipart form data
    const formData = await c.req.formData();
    const audioFile = formData.get('audio');
    const sessionId = formData.get('session_id');

    // Validate session_id for rate limiting
    if (!sessionId || typeof sessionId !== 'string') {
      return c.json({ error: 'session_id is required for rate limiting' }, 400);
    }

    // Check rate limit
    if (!checkRateLimit(sessionId)) {
      return c.json(
        {
          error: 'Rate limit exceeded. Maximum 10 transcription requests per minute.',
        },
        429
      );
    }

    // Validate audio file
    if (!audioFile || !(audioFile instanceof File)) {
      return c.json({ error: 'No audio file provided. Include an "audio" field in the form data.' }, 400);
    }

    // Check file type - be lenient with MIME types since browsers may vary
    // Accept webm/opus which is common for MediaRecorder
    const fileType = audioFile.type || '';
    const isAllowedType =
      ALLOWED_AUDIO_TYPES.some((t) => fileType.startsWith(t.split('/')[0] + '/')) ||
      fileType.includes('opus') ||
      fileType === '';

    if (!isAllowedType && fileType !== '') {
      return c.json(
        {
          error: `Invalid audio type "${fileType}". Allowed types: ${ALLOWED_AUDIO_TYPES.join(', ')}`,
        },
        400
      );
    }

    // Convert File to the format OpenAI expects
    // OpenAI SDK accepts File objects from the Fetch API
    const client = getOpenAIClient();
    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });

    return c.json({ text: transcription.text });
  } catch (error) {
    console.error('Transcription error:', error);

    // Check for specific OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return c.json({ error: 'OpenAI API key is invalid or not configured' }, 500);
      }
      if (error.status === 429) {
        return c.json({ error: 'OpenAI rate limit exceeded. Please try again later.' }, 503);
      }
      return c.json({ error: `OpenAI API error: ${error.message}` }, 500);
    }

    return c.json({ error: 'Failed to transcribe audio.' }, 500);
  }
});
