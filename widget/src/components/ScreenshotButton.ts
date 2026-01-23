/**
 * HeyDev Screenshot Button Component
 * A button for capturing screenshots with html2canvas-pro
 * Uses dynamic import to reduce initial bundle size
 * Note: html2canvas-pro supports modern CSS color functions (oklch, oklab, etc.)
 */

import type html2canvasModule from 'html2canvas-pro';

// html2canvas-pro is dynamically imported when needed
type Html2CanvasType = typeof html2canvasModule;

/** CSS styles for the screenshot button and preview */
const SCREENSHOT_STYLES = `
  .heydev-screenshot-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background-color: var(--heydev-btn-secondary-bg, #f3f4f6);
    color: var(--heydev-text-secondary, #6b7280);
    border: 1px solid var(--heydev-border, #e5e5e5);
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    flex-shrink: 0;
  }

  .heydev-screenshot-btn:hover:not(:disabled) {
    background-color: var(--heydev-btn-secondary-hover, #e5e7eb);
    border-color: var(--heydev-border-hover, #d1d5db);
    color: var(--heydev-text, #1f2937);
  }

  .heydev-screenshot-btn:focus {
    outline: 2px solid var(--heydev-primary, #6366f1);
    outline-offset: 2px;
  }

  .heydev-screenshot-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .heydev-screenshot-btn svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }

  .heydev-screenshot-btn.is-loading svg {
    animation: heydev-spin 1s linear infinite;
  }

  @keyframes heydev-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .heydev-screenshot-preview-container {
    margin-top: 12px;
  }

  .heydev-screenshot-preview {
    position: relative;
    display: inline-block;
  }

  .heydev-screenshot-preview img {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid var(--heydev-border, #e5e5e5);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .heydev-screenshot-remove-btn {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 20px;
    height: 20px;
    background-color: var(--heydev-danger, #ef4444);
    color: white;
    border: 2px solid var(--heydev-panel-bg, #ffffff);
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: background-color 0.15s ease, transform 0.15s ease;
  }

  .heydev-screenshot-remove-btn:hover {
    background-color: var(--heydev-danger-hover, #dc2626);
    transform: scale(1.1);
  }

  .heydev-screenshot-remove-btn:focus {
    outline: 2px solid var(--heydev-primary, #6366f1);
    outline-offset: 2px;
  }

  .heydev-screenshot-remove-btn svg {
    width: 10px;
    height: 10px;
    fill: currentColor;
  }

  @media (prefers-reduced-motion: reduce) {
    .heydev-screenshot-btn,
    .heydev-screenshot-remove-btn {
      transition: none;
    }
    .heydev-screenshot-btn.is-loading svg {
      animation: none;
    }
  }
`;

/** Camera icon SVG */
const CAMERA_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
  <path fill-rule="evenodd" d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm13.5 3a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clip-rule="evenodd" />
</svg>`;

/** Loading spinner icon SVG */
const LOADING_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
  <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd" />
</svg>`;

/** Close (X) icon SVG */
const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
</svg>`;

export interface ScreenshotButtonOptions {
  /** Container element to render the button into */
  container?: HTMLElement;
  /** Container element to render the preview into (if different from button container) */
  previewContainer?: HTMLElement;
  /** Callback when screenshot is captured */
  onCapture?: (dataUrl: string) => void;
  /** Callback when screenshot is removed */
  onRemove?: () => void;
}

export interface ScreenshotButtonInstance {
  /** The button element */
  button: HTMLButtonElement;
  /** The preview container element */
  previewElement: HTMLDivElement;
  /** Check if there's a screenshot captured */
  hasScreenshot: () => boolean;
  /** Get the screenshot data URL */
  getScreenshot: () => string | null;
  /** Clear the screenshot */
  clearScreenshot: () => void;
  /** Remove from DOM */
  destroy: () => void;
}

/**
 * Creates and renders the screenshot button component
 * @param options Configuration options
 * @returns ScreenshotButton instance with control methods
 */
export function createScreenshotButton(
  options: ScreenshotButtonOptions = {}
): ScreenshotButtonInstance {
  const container = options.container ?? document.body;
  const previewContainer = options.previewContainer ?? container;
  const onCapture = options.onCapture;
  const onRemove = options.onRemove;

  // State
  let screenshotDataUrl: string | null = null;
  let isLoading = false;

  // Inject styles if not already present
  const styleId = 'heydev-screenshot-styles';
  if (!container.querySelector(`#${styleId}`)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = SCREENSHOT_STYLES;
    container.appendChild(style);
  }
  // Also inject styles into preview container if different
  if (previewContainer !== container && !previewContainer.querySelector(`#${styleId}`)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = SCREENSHOT_STYLES;
    previewContainer.appendChild(style);
  }

  // Create button
  const button = document.createElement('button');
  button.className = 'heydev-screenshot-btn';
  button.type = 'button';
  button.setAttribute('aria-label', 'Take screenshot');
  button.innerHTML = CAMERA_ICON;

  // Create preview container (hidden initially)
  const previewElement = document.createElement('div');
  previewElement.className = 'heydev-screenshot-preview-container';
  previewElement.style.display = 'none';

  // Update UI based on state
  const updateUI = () => {
    button.disabled = isLoading || screenshotDataUrl !== null;
    button.classList.toggle('is-loading', isLoading);
    button.innerHTML = isLoading ? LOADING_ICON : CAMERA_ICON;
    button.setAttribute(
      'aria-label',
      isLoading
        ? 'Capturing screenshot...'
        : screenshotDataUrl
          ? 'Screenshot captured'
          : 'Take screenshot'
    );

    // Update preview visibility
    if (screenshotDataUrl) {
      previewElement.style.display = 'block';
      previewElement.innerHTML = `
        <div class="heydev-screenshot-preview">
          <img src="${screenshotDataUrl}" alt="Screenshot preview" />
          <button class="heydev-screenshot-remove-btn" type="button" aria-label="Remove screenshot">
            ${CLOSE_ICON}
          </button>
        </div>
      `;
      // Add remove button handler
      const removeBtn = previewElement.querySelector('.heydev-screenshot-remove-btn');
      removeBtn?.addEventListener('click', handleRemove);
    } else {
      previewElement.style.display = 'none';
      previewElement.innerHTML = '';
    }
  };

  // Handle capture
  const handleCapture = async () => {
    if (isLoading || screenshotDataUrl) return;

    isLoading = true;
    updateUI();

    try {
      // Load html2canvas-pro from CDN if not already loaded
      // This keeps the bundle small while still providing screenshot functionality
      // html2canvas-pro supports modern CSS color functions (oklch, oklab, lab, lch, color())
      let html2canvas = (window as unknown as { html2canvas?: Html2CanvasType }).html2canvas;

      if (!html2canvas) {
        // Load html2canvas-pro from CDN (supports modern CSS color functions like oklch)
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/html2canvas-pro@1.6.6/dist/html2canvas-pro.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load html2canvas-pro'));
          document.head.appendChild(script);
        });
        html2canvas = (window as unknown as { html2canvas?: Html2CanvasType }).html2canvas;

        if (!html2canvas) {
          throw new Error('html2canvas-pro failed to initialize');
        }
      }

      // Use html2canvas to capture the viewport
      const canvas = await html2canvas(document.body, {
        scale: 1,
        useCORS: true,
        logging: false,
        allowTaint: true,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        x: window.scrollX,
        y: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
      });

      screenshotDataUrl = canvas.toDataURL('image/png');

      if (onCapture) {
        onCapture(screenshotDataUrl);
      }
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    } finally {
      isLoading = false;
      updateUI();
    }
  };

  // Handle remove
  const handleRemove = () => {
    screenshotDataUrl = null;
    updateUI();
    if (onRemove) {
      onRemove();
    }
  };

  // Event handler
  button.addEventListener('click', handleCapture);

  // Add to containers
  container.appendChild(button);
  previewContainer.appendChild(previewElement);

  // Initial UI update
  updateUI();

  return {
    button,
    previewElement,
    hasScreenshot: () => screenshotDataUrl !== null,
    getScreenshot: () => screenshotDataUrl,
    clearScreenshot: () => {
      screenshotDataUrl = null;
      updateUI();
    },
    destroy: () => {
      button.removeEventListener('click', handleCapture);
      button.remove();
      previewElement.remove();
    },
  };
}
