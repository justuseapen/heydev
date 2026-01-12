/**
 * Session ID generation and storage utility
 * Generates and persists anonymous session IDs for tracking conversations
 */

const SESSION_STORAGE_KEY = 'heydev_session_id';
const SESSION_ID_PREFIX = 'sess_';
const SESSION_ID_RANDOM_LENGTH = 16;

// Alphanumeric characters for random ID generation
const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generate a random alphanumeric string of specified length
 */
function generateRandomString(length: number): string {
  let result = '';
  const randomValues = new Uint32Array(length);

  // Use crypto.getRandomValues for secure random generation
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    // Fallback for environments without crypto (rare in browsers)
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * ALPHANUMERIC.length);
    }
  }

  for (let i = 0; i < length; i++) {
    result += ALPHANUMERIC[randomValues[i] % ALPHANUMERIC.length];
  }

  return result;
}

/**
 * Generate a new session ID in the format 'sess_' + 16 random alphanumeric chars
 */
function generateSessionId(): string {
  return SESSION_ID_PREFIX + generateRandomString(SESSION_ID_RANDOM_LENGTH);
}

/**
 * Check if sessionStorage is available
 */
function isSessionStorageAvailable(): boolean {
  try {
    const testKey = '__heydev_test__';
    sessionStorage.setItem(testKey, testKey);
    sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// In-memory fallback when sessionStorage is unavailable
let inMemorySessionId: string | null = null;

/**
 * Get the current session ID, creating one if it doesn't exist.
 * The session ID is stored in sessionStorage and persists for the browser session.
 * Falls back to in-memory storage if sessionStorage is unavailable.
 *
 * @returns The session ID in format 'sess_' + 16 alphanumeric characters
 */
export function getSessionId(): string {
  // Try to use sessionStorage
  if (isSessionStorageAvailable()) {
    const existingId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existingId) {
      return existingId;
    }

    const newId = generateSessionId();
    sessionStorage.setItem(SESSION_STORAGE_KEY, newId);
    return newId;
  }

  // Fallback to in-memory storage
  if (inMemorySessionId) {
    return inMemorySessionId;
  }

  inMemorySessionId = generateSessionId();
  return inMemorySessionId;
}

/**
 * Clear the current session ID (useful for testing or logout scenarios).
 * After calling this, the next getSessionId() call will generate a new ID.
 */
export function clearSessionId(): void {
  if (isSessionStorageAvailable()) {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
  inMemorySessionId = null;
}
