/**
 * SSE Client Service
 * Connects to the server's SSE endpoint for real-time message delivery
 */

/** Message received from the server via SSE */
export interface SSEMessage {
  text: string;
  timestamp: string;
  messageId: number;
}

/** SSE client options */
export interface SSEClientOptions {
  /** Backend endpoint URL (e.g., https://api.heydev.io) */
  endpoint: string;
  /** Session ID to subscribe to */
  sessionId: string;
  /** Callback when a message is received */
  onMessage: (message: SSEMessage) => void;
  /** Callback when connected */
  onConnected?: () => void;
  /** Callback when disconnected */
  onDisconnected?: () => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

/** SSE client instance */
export interface SSEClientInstance {
  /** Whether the client is currently connected */
  isConnected: () => boolean;
  /** Disconnect from the server */
  disconnect: () => void;
  /** Reconnect to the server */
  reconnect: () => void;
}

/**
 * Creates an SSE client that connects to the server for real-time messages
 */
export function createSSEClient(options: SSEClientOptions): SSEClientInstance {
  const { endpoint, sessionId, onMessage, onConnected, onDisconnected, onError } = options;

  let eventSource: EventSource | null = null;
  let connected = false;
  let reconnectAttempts = 0;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  // Maximum reconnect attempts before giving up
  const MAX_RECONNECT_ATTEMPTS = 10;
  // Base delay for exponential backoff (1 second)
  const BASE_RECONNECT_DELAY = 1000;
  // Maximum delay between reconnects (30 seconds)
  const MAX_RECONNECT_DELAY = 30000;

  /**
   * Calculate reconnect delay with exponential backoff
   */
  const getReconnectDelay = (): number => {
    const delay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts),
      MAX_RECONNECT_DELAY
    );
    // Add some jitter (0-25% of delay)
    return delay + Math.random() * delay * 0.25;
  };

  /**
   * Connect to the SSE endpoint
   */
  const connect = () => {
    if (destroyed || eventSource) return;

    const url = `${endpoint}/api/events/${sessionId}`;
    eventSource = new EventSource(url);

    // Handle connection open
    eventSource.onopen = () => {
      connected = true;
      reconnectAttempts = 0;
    };

    // Handle connection event from server
    eventSource.addEventListener('connected', () => {
      if (onConnected) {
        onConnected();
      }
    });

    // Handle message event
    eventSource.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as SSEMessage;
        onMessage(message);
      } catch (error) {
        console.error('[HeyDev SSE] Failed to parse message:', error);
      }
    });

    // Handle heartbeat (keep-alive, no action needed)
    eventSource.addEventListener('heartbeat', () => {
      // Connection is alive, nothing to do
    });

    // Handle errors
    eventSource.onerror = () => {
      const wasConnected = connected;
      connected = false;

      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      if (wasConnected && onDisconnected) {
        onDisconnected();
      }

      // Attempt to reconnect if not destroyed
      if (!destroyed) {
        scheduleReconnect();
      }
    };
  };

  /**
   * Schedule a reconnection attempt
   */
  const scheduleReconnect = () => {
    if (destroyed || reconnectTimeout) return;

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('[HeyDev SSE] Max reconnect attempts reached, giving up');
      if (onError) {
        onError(new Error('Max reconnect attempts reached'));
      }
      return;
    }

    const delay = getReconnectDelay();
    reconnectAttempts++;

    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      connect();
    }, delay);
  };

  /**
   * Disconnect from the server
   */
  const disconnect = () => {
    destroyed = true;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    if (connected) {
      connected = false;
      if (onDisconnected) {
        onDisconnected();
      }
    }
  };

  /**
   * Manually trigger a reconnection
   */
  const reconnect = () => {
    if (destroyed) {
      destroyed = false;
    }

    // Clear any pending reconnect
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    // Close existing connection
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    // Reset reconnect attempts for manual reconnect
    reconnectAttempts = 0;

    // Connect immediately
    connect();
  };

  // Start connection
  connect();

  return {
    isConnected: () => connected,
    disconnect,
    reconnect,
  };
}
