/**
 * HeyDev Accessibility Utilities
 * Focus management and keyboard navigation helpers
 */

/** Selector for all focusable elements within a container */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Get all focusable elements within a container
 * @param container The container element to search within
 * @returns Array of focusable elements in DOM order
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  return Array.from(elements).filter((el) => {
    // Additional check: element must be visible
    return el.offsetParent !== null || el.getClientRects().length > 0;
  });
}

/**
 * Focus trap instance for managing focus within a container
 */
export interface FocusTrapInstance {
  /** Activate the focus trap */
  activate: () => void;
  /** Deactivate the focus trap */
  deactivate: () => void;
  /** Check if the focus trap is active */
  isActive: () => boolean;
}

/**
 * Creates a focus trap that keeps focus within a container
 * When Tab is pressed at the last element, focus moves to the first element (and vice versa for Shift+Tab)
 *
 * @param container The container to trap focus within
 * @param options Configuration options
 * @returns FocusTrap instance with control methods
 */
export function createFocusTrap(
  container: HTMLElement,
  options: {
    /** Element to focus when trap is activated (default: first focusable element) */
    initialFocus?: HTMLElement;
    /** Element to focus when trap is deactivated (default: element that had focus before activation) */
    returnFocus?: HTMLElement;
    /** Called when Escape key is pressed */
    onEscape?: () => void;
  } = {}
): FocusTrapInstance {
  let active = false;
  let previouslyFocusedElement: Element | null = null;

  /**
   * Handle keydown events to manage focus
   */
  const handleKeydown = (event: KeyboardEvent) => {
    if (!active) return;

    // Handle Escape key
    if (event.key === 'Escape') {
      if (options.onEscape) {
        options.onEscape();
      }
      return;
    }

    // Only handle Tab key
    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Shift+Tab on first element -> move to last element
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    // Tab on last element -> move to first element
    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
      return;
    }

    // If focus is outside container, bring it back
    if (!container.contains(document.activeElement)) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  /**
   * Handle focus events to ensure focus stays within container
   */
  const handleFocusIn = (event: FocusEvent) => {
    if (!active) return;

    // If focus moved outside the container, bring it back
    if (!container.contains(event.target as Node)) {
      const focusableElements = getFocusableElements(container);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }
  };

  return {
    activate: () => {
      if (active) return;

      active = true;

      // Store the currently focused element to restore later
      previouslyFocusedElement = document.activeElement;

      // Add event listeners
      document.addEventListener('keydown', handleKeydown, true);
      document.addEventListener('focusin', handleFocusIn, true);

      // Focus the initial element
      const focusableElements = getFocusableElements(container);
      const elementToFocus =
        options.initialFocus ??
        (focusableElements.length > 0 ? focusableElements[0] : null);

      if (elementToFocus) {
        // Use requestAnimationFrame to ensure the element is focusable
        requestAnimationFrame(() => {
          elementToFocus.focus();
        });
      }
    },

    deactivate: () => {
      if (!active) return;

      active = false;

      // Remove event listeners
      document.removeEventListener('keydown', handleKeydown, true);
      document.removeEventListener('focusin', handleFocusIn, true);

      // Return focus to the element that had focus before activation
      const returnElement = options.returnFocus ?? previouslyFocusedElement;
      if (returnElement && returnElement instanceof HTMLElement) {
        returnElement.focus();
      }

      previouslyFocusedElement = null;
    },

    isActive: () => active,
  };
}

/**
 * Announce a message to screen readers using a live region
 * @param message The message to announce
 * @param priority 'polite' (default) or 'assertive'
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  // Create a live region if it doesn't exist
  let liveRegion = document.getElementById('heydev-sr-announcer');

  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'heydev-sr-announcer';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    // Visually hidden but available to screen readers
    liveRegion.style.cssText =
      'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
    document.body.appendChild(liveRegion);
  } else {
    liveRegion.setAttribute('aria-live', priority);
  }

  // Clear and set the message (the change triggers the announcement)
  liveRegion.textContent = '';
  // Use setTimeout to ensure the DOM update is processed
  const regionToUpdate = liveRegion;
  setTimeout(() => {
    regionToUpdate.textContent = message;
  }, 50);
}

/**
 * Check if the user prefers reduced motion
 * @returns true if the user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
