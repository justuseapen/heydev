/**
 * SSE Manager
 * Manages Server-Sent Events connections for real-time message delivery
 */

import { EventEmitter } from 'events';

// Types for SSE messages
export interface SSEMessage {
  text: string;
  timestamp: string;
  messageId: number;
}

/**
 * Event emitter for broadcasting messages to connected clients
 * Uses session ID as the event name to route messages to the correct client
 */
const messageEmitter = new EventEmitter();

// Set higher limit for listeners since we may have many concurrent connections
messageEmitter.setMaxListeners(1000);

/**
 * Subscribe to messages for a specific session
 */
export function subscribeToSession(
  sessionId: string,
  callback: (message: SSEMessage) => void
): () => void {
  const eventName = `message:${sessionId}`;
  messageEmitter.on(eventName, callback);

  // Return unsubscribe function
  return () => {
    messageEmitter.off(eventName, callback);
  };
}

/**
 * Emit a message to all clients listening for a specific session
 */
export function emitSessionMessage(sessionId: string, message: SSEMessage): void {
  const eventName = `message:${sessionId}`;
  messageEmitter.emit(eventName, message);
}

/**
 * Get the number of listeners for a session (useful for debugging)
 */
export function getSessionListenerCount(sessionId: string): number {
  const eventName = `message:${sessionId}`;
  return messageEmitter.listenerCount(eventName);
}
