/**
 * HeyDev Floating Button Component
 * A circular feedback button fixed to the bottom-right corner
 */

/** CSS styles for the floating button */
const BUTTON_STYLES = `
  .heydev-floating-button {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--heydev-primary, #6366f1);
    color: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    z-index: 2147483647;
    animation: heydev-button-entrance 0.3s ease-out;
  }

  .heydev-floating-button:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  .heydev-floating-button:focus {
    outline: 2px solid var(--heydev-primary, #6366f1);
    outline-offset: 2px;
  }

  .heydev-floating-button:active {
    transform: scale(0.98);
  }

  .heydev-floating-button svg {
    width: 24px;
    height: 24px;
    fill: currentColor;
  }

  /* Notification badge styles */
  .heydev-notification-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background-color: var(--heydev-badge-bg, #ef4444);
    color: var(--heydev-badge-text, white);
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    animation: heydev-badge-pop 0.3s ease-out;
  }

  @keyframes heydev-badge-pop {
    0% {
      transform: scale(0);
      opacity: 0;
    }
    50% {
      transform: scale(1.2);
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes heydev-button-entrance {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .heydev-floating-button {
      animation: none;
    }
    .heydev-floating-button:hover {
      transform: none;
    }
    .heydev-notification-badge {
      animation: none;
    }
  }
`;

/** Chat/feedback SVG icon */
const CHAT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path fill-rule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297-.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97ZM6.75 8.25a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H7.5Z" clip-rule="evenodd" />
</svg>`;

export interface FloatingButtonOptions {
  /** Container element to render into (for Shadow DOM support) */
  container?: HTMLElement;
}

export interface FloatingButtonInstance {
  /** The button element */
  element: HTMLButtonElement;
  /** Remove the button from DOM */
  destroy: () => void;
  /** Show the button */
  show: () => void;
  /** Hide the button */
  hide: () => void;
  /** Show notification badge with count */
  showBadge: (count: number) => void;
  /** Hide notification badge */
  hideBadge: () => void;
  /** Get current badge count */
  getBadgeCount: () => number;
}

/**
 * Creates and renders the floating feedback button
 * @param options Configuration options
 * @returns Button instance with control methods
 */
export function createFloatingButton(
  options: FloatingButtonOptions = {}
): FloatingButtonInstance {
  const container = options.container ?? document.body;

  // Inject styles if not already present
  const styleId = 'heydev-floating-button-styles';
  if (!container.querySelector(`#${styleId}`)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = BUTTON_STYLES;
    container.appendChild(style);
  }

  // Create button element
  const button = document.createElement('button');
  button.className = 'heydev-floating-button';
  button.setAttribute('aria-label', 'Open feedback');
  button.setAttribute('type', 'button');
  button.innerHTML = CHAT_ICON;

  // Badge state
  let badgeCount = 0;
  let badgeElement: HTMLSpanElement | null = null;

  // Update badge display
  const updateBadge = () => {
    if (badgeCount > 0) {
      if (!badgeElement) {
        badgeElement = document.createElement('span');
        badgeElement.className = 'heydev-notification-badge';
        button.appendChild(badgeElement);
      }
      // Show count, max 99+
      badgeElement.textContent = badgeCount > 99 ? '99+' : String(badgeCount);
      button.setAttribute('aria-label', `Open feedback (${badgeCount} new message${badgeCount > 1 ? 's' : ''})`);
    } else {
      if (badgeElement) {
        badgeElement.remove();
        badgeElement = null;
      }
      button.setAttribute('aria-label', 'Open feedback');
    }
  };

  // Dispatch custom event on click
  button.addEventListener('click', () => {
    const event = new CustomEvent('heydev:open', {
      bubbles: true,
      composed: true,
    });
    button.dispatchEvent(event);
  });

  // Add to container
  container.appendChild(button);

  return {
    element: button,
    destroy: () => {
      button.remove();
    },
    show: () => {
      button.style.display = 'flex';
    },
    hide: () => {
      button.style.display = 'none';
    },
    showBadge: (count: number) => {
      badgeCount = Math.max(0, count);
      updateBadge();
    },
    hideBadge: () => {
      badgeCount = 0;
      updateBadge();
    },
    getBadgeCount: () => badgeCount,
  };
}
