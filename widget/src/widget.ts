/**
 * HeyDev Widget Entry Point
 * Auto-initializes from a script tag with data-api-key attribute
 * Uses Shadow DOM to isolate styles from the host page
 */

import { createFloatingButton, type FloatingButtonInstance } from './components/FloatingButton';
import { createFeedbackPanel, type FeedbackPanelInstance } from './components/FeedbackPanel';
import { createFeedbackForm, type FeedbackFormInstance } from './components/FeedbackForm';
import { createConversationHistory, type ConversationHistoryInstance } from './components/ConversationHistory';
import { createSSEClient, type SSEClientInstance, type SSEMessage } from './services/sseClient';
import { installErrorInterceptor } from './utils/consoleErrors';
import { getSessionId } from './utils/session';
import { createThemeStyleElement, type Theme } from './utils/theme';
import {
  installErrorCapture,
  uninstallErrorCapture,
  installNetworkCapture,
  uninstallNetworkCapture,
  type CapturedErrorEvent,
} from './utils/errorCapture';
import { submitError } from './services/submitError';

/**
 * Configuration options read from script tag data attributes
 *
 * Supported attributes:
 * - data-api-key (required): API key for authentication
 * - data-endpoint: Backend endpoint URL (default: https://heydev.io)
 * - data-theme: 'light', 'dark', or 'auto' (default: 'auto')
 * - data-error-tracking: 'true' to enable automatic error capture (default: 'false')
 * - data-capture-exceptions: 'true'/'false' to capture JavaScript exceptions (default: 'true' when error-tracking enabled)
 * - data-capture-network: 'true'/'false' to capture network errors (default: 'true' when error-tracking enabled)
 */
interface WidgetConfig {
  /** API key for authentication (required) */
  apiKey: string;
  /** Backend endpoint URL (default: https://heydev.io) */
  endpoint: string;
  /** Theme setting: 'light', 'dark', or 'auto' (default: 'auto') */
  theme: Theme;
  /** Whether error tracking is enabled */
  errorTracking: boolean;
  /** Whether to capture JavaScript exceptions (default: true when error-tracking enabled) */
  captureExceptions: boolean;
  /** Whether to capture network errors (default: true when error-tracking enabled) */
  captureNetwork: boolean;
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
  /** Manually capture and submit an error */
  captureError: (error: Error) => void;
}

/** Global HeyDev object exposed on window */
declare global {
  interface Window {
    HeyDev?: HeyDevWidget;
  }
}

/** Default production endpoint */
const DEFAULT_ENDPOINT = 'https://heydev.io';

/** Widget version */
const VERSION = '0.1.0';

/** CSS reset styles for Shadow DOM to normalize browser defaults */
const SHADOW_RESET_STYLES = `
  :host {
    all: initial;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: var(--heydev-text, #1f2937);
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

  // Parse theme attribute: 'light', 'dark', or 'auto' (default)
  const themeAttr = script.getAttribute('data-theme');
  let theme: Theme = 'auto';
  if (themeAttr === 'light' || themeAttr === 'dark') {
    theme = themeAttr;
  }

  // Parse error-tracking attribute (default: false)
  const errorTrackingAttr = script.getAttribute('data-error-tracking');
  const errorTracking = errorTrackingAttr === 'true';

  // Parse capture-exceptions attribute (default: true when error-tracking enabled)
  // Allows explicit override via 'true' or 'false' string values
  const captureExceptionsAttr = script.getAttribute('data-capture-exceptions');
  const captureExceptions =
    captureExceptionsAttr === 'false' ? false : captureExceptionsAttr === 'true' ? true : errorTracking;

  // Parse capture-network attribute (default: true when error-tracking enabled)
  // Allows explicit override via 'true' or 'false' string values
  const captureNetworkAttr = script.getAttribute('data-capture-network');
  const captureNetwork =
    captureNetworkAttr === 'false' ? false : captureNetworkAttr === 'true' ? true : errorTracking;

  return {
    apiKey,
    endpoint,
    theme,
    errorTracking,
    captureExceptions,
    captureNetwork,
  };
}

/**
 * Create and inject the Shadow DOM container
 */
function createShadowContainer(theme: Theme): ShadowRoot {
  // Create host element
  const host = document.createElement('div');
  host.id = 'heydev-widget';
  host.style.cssText = 'position: fixed; z-index: 2147483647; pointer-events: none;';

  // Attach shadow DOM
  const shadow = host.attachShadow({ mode: 'open' });

  // Inject theme styles first (CSS custom properties)
  const themeStyle = createThemeStyleElement(theme);
  shadow.appendChild(themeStyle);

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

  // Error capture callback for submitting captured errors
  const handleCapturedError = (error: CapturedErrorEvent) => {
    submitError({
      error,
      endpoint: config.endpoint,
      apiKey: config.apiKey,
    });
  };

  // Install error tracking based on configuration
  // captureExceptions and captureNetwork can be individually enabled/disabled
  if (config.captureExceptions) {
    installErrorCapture(handleCapturedError);
  }
  if (config.captureNetwork) {
    installNetworkCapture(handleCapturedError, config.endpoint);
  }

  // Create Shadow DOM container with theme
  const shadow = createShadowContainer(config.theme);
  const container = shadow.querySelector('.heydev-container') as HTMLElement;

  // Create components
  let form: FeedbackFormInstance | null = null;
  let conversationHistory: ConversationHistoryInstance | null = null;
  let sseClient: SSEClientInstance | null = null;

  // Track unread messages when panel is closed
  let unreadCount = 0;
  // Track if we've sent feedback (to know when to connect SSE)
  let hasSentFeedback = false;
  // Track the current conversation ID (for reply mode)
  let currentConversationId: string | null = null;
  // Get session ID once for consistent use
  const sessionId = getSessionId();

  // Create floating button
  const button: FloatingButtonInstance = createFloatingButton({ container });

  // Create feedback panel
  const panel: FeedbackPanelInstance = createFeedbackPanel({ container });

  /**
   * Handle incoming SSE message
   */
  const handleSSEMessage = (message: SSEMessage) => {
    // Add message to conversation history if it exists
    if (conversationHistory) {
      conversationHistory.addDeveloperMessage(message.text, message.timestamp, message.messageId);
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
    if (conversationHistory) {
      conversationHistory.destroy();
    }

    // Create conversation history first (shows above form)
    conversationHistory = createConversationHistory({
      container: panel.body,
      sessionId,
    });

    // Check if we have existing messages (indicates returning user with existing conversation)
    if (conversationHistory.hasMessages()) {
      hasSentFeedback = true;
      connectSSE();
    }

    // Try to restore conversation ID from storage
    const storedConversationId = conversationHistory.getConversationId();
    if (storedConversationId && !currentConversationId) {
      currentConversationId = storedConversationId;
    }

    // Determine if form should start in reply mode
    // Reply mode is enabled if we have an existing conversation ID
    const isReplyMode = currentConversationId !== null;

    form = createFeedbackForm({
      container: panel.body,
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      sessionId,
      // Pass conversation ID to enable reply mode if we have one
      conversationId: isReplyMode ? (currentConversationId ?? undefined) : undefined,
      onSuccess: (conversationId, submittedText, screenshotUrl) => {
        // Add user message to conversation history
        if (conversationHistory) {
          conversationHistory.addUserMessage(submittedText, screenshotUrl);
          // Persist the conversation ID for future sessions
          conversationHistory.setConversationId(conversationId);
        }

        // Store the conversation ID for future replies
        currentConversationId = conversationId;

        // Form handles success message and auto-close
        console.log('[HeyDev] Feedback sent, conversation:', conversationId);

        // Connect to SSE after first feedback sent
        if (!hasSentFeedback) {
          hasSentFeedback = true;
          connectSSE();
        }

        // After first feedback, switch form to reply mode
        if (form && !form.isReplyMode()) {
          form.setReplyMode(conversationId);
        }
      },
      onReplySuccess: (submittedText) => {
        // Add user reply to conversation history
        if (conversationHistory) {
          conversationHistory.addUserMessage(submittedText);
        }
        console.log('[HeyDev] Reply sent');
      },
      onError: (error) => {
        console.error('[HeyDev] Submission failed:', error);
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

      // Cleanup error capture
      uninstallErrorCapture();
      uninstallNetworkCapture();

      if (conversationHistory) {
        conversationHistory.destroy();
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
    captureError: (error: Error) => {
      // Manual error capture - works regardless of error tracking setting
      const capturedError: CapturedErrorEvent = {
        error_type: 'exception',
        message: error.message || 'Unknown error',
        stack: error.stack,
      };
      handleCapturedError(capturedError);
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
