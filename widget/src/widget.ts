/**
 * HeyDev Widget Entry Point
 * Auto-initializes from a script tag with data-api-key attribute
 * Uses Shadow DOM to isolate styles from the host page
 */

import { createFloatingButton, type FloatingButtonInstance } from './components/FloatingButton';
import { createFeedbackPanel, type FeedbackPanelInstance } from './components/FeedbackPanel';
import { createFeedbackForm, type FeedbackFormInstance } from './components/FeedbackForm';
import { createMessageDisplay, type MessageDisplayInstance } from './components/MessageDisplay';
import { createSSEClient, type SSEClientInstance, type SSEMessage } from './services/sseClient';
import { installErrorInterceptor } from './utils/consoleErrors';
import { getSessionId } from './utils/session';

/** Configuration options read from script tag data attributes */
interface WidgetConfig {
  /** API key for authentication (required) */
  apiKey: string;
  /** Backend endpoint URL (default: https://api.heydev.io) */
  endpoint: string;
}

/** The HeyDev widget public API */
export interface HeyDevWidget {
  /** Widget version */
  version: string;
  /** Open the feedback panel */
  open: () => void;
  /** Close the feedback panel */
  close: () => void;
  /** Check if the panel is currently open */
  isOpen: () => boolean;
  /** Destroy the widget and remove from DOM */
  destroy: () => void;
}

/** Global HeyDev object exposed on window */
declare global {
  interface Window {
    HeyDev?: HeyDevWidget;
  }
}

/** Default production endpoint */
const DEFAULT_ENDPOINT = 'https://api.heydev.io';

/** Widget version */
const VERSION = '0.1.0';

/** CSS reset styles for Shadow DOM to normalize browser defaults */
const SHADOW_RESET_STYLES = `
  :host {
    all: initial;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #1f2937;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }
`;

/**
 * Get configuration from the current script tag's data attributes
 */
function getConfigFromScript(): WidgetConfig | null {
  // Find the script tag that loaded this widget
  // Look for script with data-api-key attribute or src containing 'heydev'
  const scripts = document.querySelectorAll('script[data-api-key]');

  if (scripts.length === 0) {
    console.warn('[HeyDev] No script tag found with data-api-key attribute. Widget not initialized.');
    return null;
  }

  // Use the last matching script tag (in case of multiple)
  const script = scripts[scripts.length - 1] as HTMLScriptElement;

  const apiKey = script.getAttribute('data-api-key');
  if (!apiKey) {
    console.warn('[HeyDev] data-api-key attribute is empty. Widget not initialized.');
    return null;
  }

  const endpoint = script.getAttribute('data-endpoint') || DEFAULT_ENDPOINT;

  return {
    apiKey,
    endpoint,
  };
}

/**
 * Create and inject the Shadow DOM container
 */
function createShadowContainer(): ShadowRoot {
  // Create host element
  const host = document.createElement('div');
  host.id = 'heydev-widget';
  host.style.cssText = 'position: fixed; z-index: 2147483647; pointer-events: none;';

  // Attach shadow DOM
  const shadow = host.attachShadow({ mode: 'open' });

  // Inject reset styles
  const resetStyle = document.createElement('style');
  resetStyle.textContent = SHADOW_RESET_STYLES;
  shadow.appendChild(resetStyle);

  // Create content container inside shadow (with pointer-events restored)
  const container = document.createElement('div');
  container.className = 'heydev-container';
  container.style.pointerEvents = 'auto';
  shadow.appendChild(container);

  // Add to body
  document.body.appendChild(host);

  return shadow;
}

/**
 * Initialize the widget
 */
function initWidget(config: WidgetConfig): HeyDevWidget {
  // Install console error interceptor
  installErrorInterceptor();

  // Create Shadow DOM container
  const shadow = createShadowContainer();
  const container = shadow.querySelector('.heydev-container') as HTMLElement;

  // Create components
  let form: FeedbackFormInstance | null = null;
  let messageDisplay: MessageDisplayInstance | null = null;
  let sseClient: SSEClientInstance | null = null;

  // Track unread messages when panel is closed
  let unreadCount = 0;
  // Track if we've sent feedback (to know when to connect SSE)
  let hasSentFeedback = false;

  // Create floating button
  const button: FloatingButtonInstance = createFloatingButton({ container });

  // Create feedback panel
  const panel: FeedbackPanelInstance = createFeedbackPanel({ container });

  /**
   * Handle incoming SSE message
   */
  const handleSSEMessage = (message: SSEMessage) => {
    // Add message to display if it exists
    if (messageDisplay) {
      messageDisplay.addDeveloperMessage(message);
    }

    // If panel is closed, increment unread count and show badge
    if (!panel.isOpen()) {
      unreadCount++;
      button.showBadge(unreadCount);
    }
  };

  /**
   * Connect to SSE if not already connected
   */
  const connectSSE = () => {
    if (sseClient) return; // Already connected

    const sessionId = getSessionId();
    sseClient = createSSEClient({
      endpoint: config.endpoint,
      sessionId,
      onMessage: handleSSEMessage,
      onConnected: () => {
        console.log('[HeyDev] SSE connected');
      },
      onDisconnected: () => {
        console.log('[HeyDev] SSE disconnected');
      },
      onError: (error) => {
        console.warn('[HeyDev] SSE error:', error.message);
      },
    });
  };

  // Create form when panel opens
  const createForm = () => {
    if (form) {
      form.destroy();
    }
    if (messageDisplay) {
      messageDisplay.destroy();
    }

    // Create message display first (shows above form)
    messageDisplay = createMessageDisplay({
      container: panel.body,
    });

    form = createFeedbackForm({
      container: panel.body,
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      onSuccess: (conversationId) => {
        // Form handles success message and auto-close
        console.log('[HeyDev] Feedback sent, conversation:', conversationId);

        // Connect to SSE after first feedback sent
        if (!hasSentFeedback) {
          hasSentFeedback = true;
          connectSSE();
        }
      },
      onError: (error) => {
        console.error('[HeyDev] Feedback submission failed:', error);
      },
      onClose: () => {
        panel.close();
      },
    });

    // Focus textarea after form is created
    setTimeout(() => form?.focus(), 100);
  };

  // Listen for open event (within shadow DOM)
  container.addEventListener('heydev:open', () => {
    // Clear unread count and badge when opening panel
    unreadCount = 0;
    button.hideBadge();
    createForm();
  });

  // Public API
  const widget: HeyDevWidget = {
    version: VERSION,
    open: () => {
      // Clear unread count and badge when opening panel
      unreadCount = 0;
      button.hideBadge();
      panel.open();
      createForm();
    },
    close: () => {
      panel.close();
    },
    isOpen: () => panel.isOpen(),
    destroy: () => {
      // Disconnect SSE
      if (sseClient) {
        sseClient.disconnect();
        sseClient = null;
      }

      if (messageDisplay) {
        messageDisplay.destroy();
      }
      if (form) {
        form.destroy();
      }
      panel.destroy();
      button.destroy();

      // Remove shadow host
      const host = shadow.host;
      if (host && host.parentNode) {
        host.parentNode.removeChild(host);
      }

      // Clear global reference
      delete window.HeyDev;
    },
  };

  return widget;
}

/**
 * Auto-initialize when script loads
 */
function autoInit(): void {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const config = getConfigFromScript();
      if (config) {
        window.HeyDev = initWidget(config);
      }
    });
  } else {
    // DOM already ready
    const config = getConfigFromScript();
    if (config) {
      window.HeyDev = initWidget(config);
    }
  }
}

// Auto-initialize
autoInit();

// Export for manual initialization if needed
export { initWidget, getConfigFromScript, type WidgetConfig };
