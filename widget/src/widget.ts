/**
 * HeyDev Widget Entry Point
 * Auto-initializes from a script tag with data-api-key attribute
 * Uses Shadow DOM to isolate styles from the host page
 */

import { createFloatingButton, type FloatingButtonInstance } from './components/FloatingButton';
import { createFeedbackPanel, type FeedbackPanelInstance } from './components/FeedbackPanel';
import { createFeedbackForm, type FeedbackFormInstance } from './components/FeedbackForm';
import { installErrorInterceptor } from './utils/consoleErrors';

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
  let button: FloatingButtonInstance;
  let panel: FeedbackPanelInstance;
  let form: FeedbackFormInstance | null = null;

  // Create floating button
  button = createFloatingButton({ container });

  // Create feedback panel
  panel = createFeedbackPanel({ container });

  // Create form when panel opens
  const createForm = () => {
    if (form) {
      form.destroy();
    }

    form = createFeedbackForm({
      container: panel.body,
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      onSuccess: () => {
        // Form handles success message and auto-close
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
    createForm();
  });

  // Public API
  const widget: HeyDevWidget = {
    version: VERSION,
    open: () => {
      panel.open();
      createForm();
    },
    close: () => {
      panel.close();
    },
    isOpen: () => panel.isOpen(),
    destroy: () => {
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
