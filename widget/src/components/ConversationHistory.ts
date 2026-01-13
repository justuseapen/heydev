/**
 * HeyDev Conversation History Component
 * Displays the conversation history with user and developer messages
 * Persists history in sessionStorage for session duration
 */

/** Message type for conversation history */
export interface HistoryMessage {
  /** Unique message ID */
  id: string;
  /** Message direction: 'user' for user-sent, 'developer' for dev replies */
  direction: 'user' | 'developer';
  /** Message text content */
  text: string;
  /** ISO timestamp when message was created */
  timestamp: string;
  /** Screenshot URL if attached (only for user messages) */
  screenshotUrl?: string;
}

/** CSS styles for the conversation history */
const HISTORY_STYLES = `
  .heydev-conversation-history {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
    max-height: 200px;
    overflow-y: auto;
    padding-right: 4px;
    scroll-behavior: smooth;
  }

  .heydev-conversation-history:empty {
    display: none;
    margin-bottom: 0;
  }

  .heydev-history-message {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    border-radius: 12px;
    max-width: 85%;
    animation: heydev-message-slide-in 0.3s ease-out;
  }

  @keyframes heydev-message-slide-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* User messages - right aligned */
  .heydev-history-message.user {
    background-color: var(--heydev-primary, #6366f1);
    color: white;
    align-self: flex-end;
    border-bottom-right-radius: 4px;
  }

  .heydev-history-message.user .heydev-message-header {
    color: rgba(255, 255, 255, 0.8);
  }

  .heydev-history-message.user .heydev-message-label {
    color: rgba(255, 255, 255, 0.9);
  }

  .heydev-history-message.user .heydev-message-text {
    color: white;
  }

  /* Developer messages - left aligned */
  .heydev-history-message.developer {
    background-color: var(--heydev-message-developer-bg, #f3f4f6);
    align-self: flex-start;
    border-bottom-left-radius: 4px;
  }

  .heydev-history-message.developer .heydev-message-label {
    color: var(--heydev-primary, #6366f1);
  }

  .heydev-message-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--heydev-text-secondary, #6b7280);
  }

  .heydev-message-label {
    font-weight: 600;
  }

  .heydev-message-time {
    font-size: 10px;
  }

  .heydev-message-text {
    font-size: 14px;
    line-height: 1.4;
    color: var(--heydev-text, #1f2937);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .heydev-message-screenshot {
    margin-top: 8px;
    max-width: 150px;
    border-radius: 6px;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .heydev-message-screenshot:hover {
    transform: scale(1.05);
  }

  /* Scrollbar styling */
  .heydev-conversation-history::-webkit-scrollbar {
    width: 6px;
  }

  .heydev-conversation-history::-webkit-scrollbar-track {
    background: transparent;
  }

  .heydev-conversation-history::-webkit-scrollbar-thumb {
    background-color: var(--heydev-border, #e5e5e5);
    border-radius: 3px;
  }

  .heydev-conversation-history::-webkit-scrollbar-thumb:hover {
    background-color: var(--heydev-text-secondary, #6b7280);
  }

  @media (prefers-reduced-motion: reduce) {
    .heydev-history-message {
      animation: none;
    }
    .heydev-conversation-history {
      scroll-behavior: auto;
    }
  }
`;

export interface ConversationHistoryOptions {
  /** Container element to render into */
  container: HTMLElement;
  /** Session ID for storage key */
  sessionId: string;
}

export interface ConversationHistoryInstance {
  /** The history container element */
  element: HTMLDivElement;
  /** Add a user message */
  addUserMessage: (text: string, screenshotUrl?: string) => HistoryMessage;
  /** Add a developer message */
  addDeveloperMessage: (text: string, timestamp: string, messageId?: number) => HistoryMessage;
  /** Get all messages */
  getMessages: () => HistoryMessage[];
  /** Get message count */
  getMessageCount: () => number;
  /** Check if there are any messages */
  hasMessages: () => boolean;
  /** Clear all messages (also clears storage) */
  clear: () => void;
  /** Remove from DOM */
  destroy: () => void;
}

/** Storage key prefix for conversation history */
const STORAGE_KEY_PREFIX = 'heydev_history_';

/**
 * Format timestamp for display
 */
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Load messages from sessionStorage
 */
function loadFromStorage(sessionId: string): HistoryMessage[] {
  try {
    const key = STORAGE_KEY_PREFIX + sessionId;
    const stored = sessionStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as HistoryMessage[];
    }
  } catch (error) {
    console.warn('[HeyDev] Failed to load conversation history:', error);
  }
  return [];
}

/**
 * Save messages to sessionStorage
 */
function saveToStorage(sessionId: string, messages: HistoryMessage[]): void {
  try {
    const key = STORAGE_KEY_PREFIX + sessionId;
    sessionStorage.setItem(key, JSON.stringify(messages));
  } catch (error) {
    console.warn('[HeyDev] Failed to save conversation history:', error);
  }
}

/**
 * Clear messages from sessionStorage
 */
function clearStorage(sessionId: string): void {
  try {
    const key = STORAGE_KEY_PREFIX + sessionId;
    sessionStorage.removeItem(key);
  } catch (error) {
    console.warn('[HeyDev] Failed to clear conversation history:', error);
  }
}

/**
 * Creates the conversation history component
 */
export function createConversationHistory(
  options: ConversationHistoryOptions
): ConversationHistoryInstance {
  const { container, sessionId } = options;

  // Inject styles if not already present
  const styleId = 'heydev-conversation-history-styles';
  if (!container.querySelector(`#${styleId}`)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = HISTORY_STYLES;
    container.appendChild(style);
  }

  // Create history container
  const historyContainer = document.createElement('div');
  historyContainer.className = 'heydev-conversation-history';
  historyContainer.setAttribute('role', 'log');
  historyContainer.setAttribute('aria-label', 'Conversation history');
  historyContainer.setAttribute('aria-live', 'polite');

  // Load existing messages from storage
  const messages: HistoryMessage[] = loadFromStorage(sessionId);
  // Track displayed message IDs to avoid duplicates
  const displayedIds = new Set<string>();

  /**
   * Create a message element from a HistoryMessage
   */
  const createMessageElement = (message: HistoryMessage): HTMLDivElement => {
    const messageEl = document.createElement('div');
    messageEl.className = `heydev-history-message ${message.direction}`;
    messageEl.setAttribute('data-message-id', message.id);

    const header = document.createElement('div');
    header.className = 'heydev-message-header';

    const label = document.createElement('span');
    label.className = 'heydev-message-label';
    label.textContent = message.direction === 'user' ? 'You' : 'Developer';

    const time = document.createElement('span');
    time.className = 'heydev-message-time';
    time.textContent = formatTime(message.timestamp);

    header.appendChild(label);
    header.appendChild(time);

    const text = document.createElement('div');
    text.className = 'heydev-message-text';
    text.textContent = message.text;

    messageEl.appendChild(header);
    messageEl.appendChild(text);

    // Add screenshot thumbnail if present
    if (message.screenshotUrl) {
      const img = document.createElement('img');
      img.className = 'heydev-message-screenshot';
      img.src = message.screenshotUrl;
      img.alt = 'Screenshot attachment';
      img.title = 'Click to view full size';
      img.addEventListener('click', () => {
        window.open(message.screenshotUrl, '_blank');
      });
      messageEl.appendChild(img);
    }

    return messageEl;
  };

  /**
   * Render a message to the DOM
   */
  const renderMessage = (message: HistoryMessage, animate = true): void => {
    if (displayedIds.has(message.id)) return;
    displayedIds.add(message.id);

    const messageEl = createMessageElement(message);

    // Disable animation if needed
    if (!animate) {
      messageEl.style.animation = 'none';
    }

    historyContainer.appendChild(messageEl);

    // Scroll to bottom
    historyContainer.scrollTop = historyContainer.scrollHeight;
  };

  /**
   * Add a user message
   */
  const addUserMessage = (text: string, screenshotUrl?: string): HistoryMessage => {
    const message: HistoryMessage = {
      id: generateMessageId(),
      direction: 'user',
      text,
      timestamp: new Date().toISOString(),
      screenshotUrl,
    };

    messages.push(message);
    saveToStorage(sessionId, messages);
    renderMessage(message);

    return message;
  };

  /**
   * Add a developer message
   */
  const addDeveloperMessage = (text: string, timestamp: string, messageId?: number): HistoryMessage => {
    // Create a unique ID - use server messageId if provided
    const id = messageId !== undefined ? `dev_${messageId}` : generateMessageId();

    // Check if we already have this message
    const existingIndex = messages.findIndex(m => m.id === id);
    if (existingIndex >= 0) {
      return messages[existingIndex];
    }

    const message: HistoryMessage = {
      id,
      direction: 'developer',
      text,
      timestamp,
    };

    messages.push(message);
    saveToStorage(sessionId, messages);
    renderMessage(message);

    return message;
  };

  /**
   * Render all existing messages (on component creation)
   */
  const renderAllMessages = (): void => {
    messages.forEach(message => renderMessage(message, false));
  };

  /**
   * Clear all messages
   */
  const clear = (): void => {
    messages.length = 0;
    displayedIds.clear();
    historyContainer.innerHTML = '';
    clearStorage(sessionId);
  };

  // Insert at the beginning of container (before form)
  container.insertBefore(historyContainer, container.firstChild);

  // Render existing messages from storage
  renderAllMessages();

  return {
    element: historyContainer,
    addUserMessage,
    addDeveloperMessage,
    getMessages: () => [...messages],
    getMessageCount: () => messages.length,
    hasMessages: () => messages.length > 0,
    clear,
    destroy: () => {
      historyContainer.remove();
    },
  };
}
