/**
 * HeyDev Message Display Component
 * Displays developer reply messages in the feedback panel
 */

import type { SSEMessage } from '../services/sseClient';

/** CSS styles for the message display */
const MESSAGE_STYLES = `
  .heydev-messages-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
    max-height: 200px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .heydev-messages-container:empty {
    display: none;
  }

  .heydev-message {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    border-radius: 12px;
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

  .heydev-message.developer {
    background-color: var(--heydev-message-developer-bg, #f3f4f6);
    border-bottom-left-radius: 4px;
    align-self: flex-start;
    max-width: 90%;
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
    color: var(--heydev-primary, #6366f1);
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

  @media (prefers-reduced-motion: reduce) {
    .heydev-message {
      animation: none;
    }
  }
`;

export interface MessageDisplayOptions {
  /** Container element to render into */
  container: HTMLElement;
}

export interface MessageDisplayInstance {
  /** The messages container element */
  element: HTMLDivElement;
  /** Add a developer message */
  addDeveloperMessage: (message: SSEMessage) => void;
  /** Clear all messages */
  clear: () => void;
  /** Get message count */
  getMessageCount: () => number;
  /** Remove from DOM */
  destroy: () => void;
}

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
 * Creates the message display component
 */
export function createMessageDisplay(
  options: MessageDisplayOptions
): MessageDisplayInstance {
  const { container } = options;

  // Inject styles if not already present
  const styleId = 'heydev-message-display-styles';
  if (!container.querySelector(`#${styleId}`)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = MESSAGE_STYLES;
    container.appendChild(style);
  }

  // Create messages container
  const messagesContainer = document.createElement('div');
  messagesContainer.className = 'heydev-messages-container';
  messagesContainer.setAttribute('role', 'log');
  messagesContainer.setAttribute('aria-label', 'Message history');
  messagesContainer.setAttribute('aria-live', 'polite');

  // Track messages to avoid duplicates
  const displayedMessageIds = new Set<number>();

  /**
   * Add a message element
   */
  const addDeveloperMessage = (message: SSEMessage) => {
    // Skip if already displayed
    if (displayedMessageIds.has(message.messageId)) {
      return;
    }
    displayedMessageIds.add(message.messageId);

    const messageEl = document.createElement('div');
    messageEl.className = 'heydev-message developer';

    const header = document.createElement('div');
    header.className = 'heydev-message-header';

    const label = document.createElement('span');
    label.className = 'heydev-message-label';
    label.textContent = 'Developer';

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

    messagesContainer.appendChild(messageEl);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  // Insert at the beginning of container (before form)
  container.insertBefore(messagesContainer, container.firstChild);

  return {
    element: messagesContainer,
    addDeveloperMessage,
    clear: () => {
      messagesContainer.innerHTML = '';
      displayedMessageIds.clear();
    },
    getMessageCount: () => displayedMessageIds.size,
    destroy: () => {
      messagesContainer.remove();
    },
  };
}
