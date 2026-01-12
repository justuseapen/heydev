/**
 * HeyDev Feedback Panel Component
 * A panel that opens when the feedback button is clicked
 */

/** CSS styles for the feedback panel */
const PANEL_STYLES = `
  .heydev-panel-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483646;
  }

  .heydev-feedback-panel {
    position: fixed;
    bottom: 96px;
    right: 24px;
    width: 360px;
    max-height: 480px;
    background-color: var(--heydev-panel-bg, #ffffff);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;
  }

  .heydev-feedback-panel.heydev-panel-open {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  .heydev-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid var(--heydev-border, #e5e5e5);
  }

  .heydev-panel-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--heydev-text, #1f2937);
  }

  .heydev-panel-close {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    color: var(--heydev-text-secondary, #6b7280);
    transition: background-color 0.15s ease, color 0.15s ease;
  }

  .heydev-panel-close:hover {
    background-color: var(--heydev-hover-bg, #f3f4f6);
    color: var(--heydev-text, #1f2937);
  }

  .heydev-panel-close:focus {
    outline: 2px solid var(--heydev-primary, #6366f1);
    outline-offset: 2px;
  }

  .heydev-panel-close svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }

  .heydev-panel-body {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    color: var(--heydev-text, #1f2937);
  }

  @media (prefers-reduced-motion: reduce) {
    .heydev-feedback-panel {
      transition: none;
    }
  }
`;

/** Close (X) SVG icon */
const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
</svg>`;

export interface FeedbackPanelOptions {
  /** Container element to render into (for Shadow DOM support) */
  container?: HTMLElement;
}

export interface FeedbackPanelInstance {
  /** The panel element */
  element: HTMLDivElement;
  /** The panel body element (for adding content) */
  body: HTMLDivElement;
  /** Remove the panel from DOM */
  destroy: () => void;
  /** Open the panel */
  open: () => void;
  /** Close the panel */
  close: () => void;
  /** Check if panel is open */
  isOpen: () => boolean;
}

/**
 * Creates and renders the feedback panel
 * @param options Configuration options
 * @returns Panel instance with control methods
 */
export function createFeedbackPanel(
  options: FeedbackPanelOptions = {}
): FeedbackPanelInstance {
  const container = options.container ?? document.body;
  let panelOpen = false;

  // Inject styles if not already present
  const styleId = 'heydev-feedback-panel-styles';
  if (!container.querySelector(`#${styleId}`)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = PANEL_STYLES;
    container.appendChild(style);
  }

  // Create overlay for click-outside detection
  const overlay = document.createElement('div');
  overlay.className = 'heydev-panel-overlay';
  overlay.style.display = 'none';

  // Create panel element
  const panel = document.createElement('div');
  panel.className = 'heydev-feedback-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Send Feedback');
  panel.setAttribute('aria-modal', 'true');

  // Create header
  const header = document.createElement('div');
  header.className = 'heydev-panel-header';

  const title = document.createElement('h2');
  title.className = 'heydev-panel-title';
  title.textContent = 'Send Feedback';

  const closeButton = document.createElement('button');
  closeButton.className = 'heydev-panel-close';
  closeButton.setAttribute('aria-label', 'Close feedback panel');
  closeButton.setAttribute('type', 'button');
  closeButton.innerHTML = CLOSE_ICON;

  header.appendChild(title);
  header.appendChild(closeButton);

  // Create body
  const body = document.createElement('div');
  body.className = 'heydev-panel-body';

  // Assemble panel
  panel.appendChild(header);
  panel.appendChild(body);

  // Helper functions for open/close
  const open = () => {
    if (panelOpen) return;
    panelOpen = true;
    overlay.style.display = 'block';
    panel.classList.add('heydev-panel-open');
    // Focus close button for accessibility
    setTimeout(() => closeButton.focus(), 50);
  };

  const close = () => {
    if (!panelOpen) return;
    panelOpen = false;
    overlay.style.display = 'none';
    panel.classList.remove('heydev-panel-open');
    // Dispatch close event
    const event = new CustomEvent('heydev:close', {
      bubbles: true,
      composed: true,
    });
    panel.dispatchEvent(event);
  };

  // Event handlers
  closeButton.addEventListener('click', close);

  overlay.addEventListener('click', close);

  // Listen for custom events
  const handleOpen = () => open();
  const handleClose = () => close();

  container.addEventListener('heydev:open', handleOpen);
  container.addEventListener('heydev:close', handleClose);

  // Keyboard handling for Escape key (will be enhanced in accessibility story)
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && panelOpen) {
      close();
    }
  };
  document.addEventListener('keydown', handleKeydown);

  // Add to container
  container.appendChild(overlay);
  container.appendChild(panel);

  return {
    element: panel,
    body,
    destroy: () => {
      container.removeEventListener('heydev:open', handleOpen);
      container.removeEventListener('heydev:close', handleClose);
      document.removeEventListener('keydown', handleKeydown);
      overlay.remove();
      panel.remove();
    },
    open,
    close,
    isOpen: () => panelOpen,
  };
}
