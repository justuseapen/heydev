/**
 * HeyDev Text Input Component
 * A textarea with auto-resize and submit button for feedback
 */

/** CSS styles for the text input */
const TEXT_INPUT_STYLES = `
  .heydev-text-input-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .heydev-textarea {
    width: 100%;
    min-height: 60px;
    max-height: 150px;
    padding: 12px;
    border: 1px solid var(--heydev-border, #e5e5e5);
    border-radius: 8px;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    color: var(--heydev-text, #1f2937);
    background-color: var(--heydev-input-bg, #ffffff);
    resize: none;
    overflow-y: auto;
    box-sizing: border-box;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .heydev-textarea::placeholder {
    color: var(--heydev-text-secondary, #9ca3af);
  }

  .heydev-textarea:focus {
    outline: none;
    border-color: var(--heydev-primary, #6366f1);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }

  .heydev-submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 10px 16px;
    background-color: var(--heydev-primary, #6366f1);
    color: white;
    border: none;
    border-radius: 8px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s ease, opacity 0.15s ease;
  }

  .heydev-submit-btn:hover:not(:disabled) {
    background-color: var(--heydev-primary-hover, #4f46e5);
  }

  .heydev-submit-btn:focus {
    outline: 2px solid var(--heydev-primary, #6366f1);
    outline-offset: 2px;
  }

  .heydev-submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .heydev-submit-btn svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  @media (prefers-reduced-motion: reduce) {
    .heydev-textarea,
    .heydev-submit-btn {
      transition: none;
    }
  }
`;

/** Send icon SVG */
const SEND_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
  <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
</svg>`;

export interface TextInputOptions {
  /** Container element to render into (for Shadow DOM support) */
  container?: HTMLElement;
  /** Placeholder text for the textarea */
  placeholder?: string;
  /** Callback when submit is triggered */
  onSubmit?: (text: string) => void;
}

export interface TextInputInstance {
  /** The container element */
  element: HTMLDivElement;
  /** The textarea element */
  textarea: HTMLTextAreaElement;
  /** The submit button element */
  submitButton: HTMLButtonElement;
  /** Get the current text value */
  getValue: () => string;
  /** Set the text value */
  setValue: (value: string) => void;
  /** Clear the text */
  clear: () => void;
  /** Focus the textarea */
  focus: () => void;
  /** Remove from DOM */
  destroy: () => void;
}

/**
 * Creates and renders the text input component
 * @param options Configuration options
 * @returns TextInput instance with control methods
 */
export function createTextInput(
  options: TextInputOptions = {}
): TextInputInstance {
  const container = options.container ?? document.body;
  const placeholder = options.placeholder ?? "What's on your mind?";
  const onSubmit = options.onSubmit;

  // Inject styles if not already present
  const styleId = 'heydev-text-input-styles';
  if (!container.querySelector(`#${styleId}`)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = TEXT_INPUT_STYLES;
    container.appendChild(style);
  }

  // Create container
  const inputContainer = document.createElement('div');
  inputContainer.className = 'heydev-text-input-container';

  // Create textarea
  const textarea = document.createElement('textarea');
  textarea.className = 'heydev-textarea';
  textarea.placeholder = placeholder;
  textarea.setAttribute('aria-label', 'Feedback message');

  // Create submit button
  const submitButton = document.createElement('button');
  submitButton.className = 'heydev-submit-btn';
  submitButton.type = 'button';
  submitButton.disabled = true;
  submitButton.setAttribute('aria-label', 'Send feedback');
  submitButton.innerHTML = `${SEND_ICON}<span>Send Feedback</span>`;

  // Assemble
  inputContainer.appendChild(textarea);
  inputContainer.appendChild(submitButton);

  // Auto-resize function
  const autoResize = () => {
    // Reset height to auto to get scrollHeight
    textarea.style.height = 'auto';
    // Set height to scrollHeight, capped at max-height via CSS
    const newHeight = Math.min(textarea.scrollHeight, 150);
    textarea.style.height = `${newHeight}px`;
  };

  // Update submit button state
  const updateButtonState = () => {
    const hasText = textarea.value.trim().length > 0;
    submitButton.disabled = !hasText;
  };

  // Handle submit
  const handleSubmit = () => {
    const text = textarea.value.trim();
    if (text && onSubmit) {
      onSubmit(text);
    }
  };

  // Event handlers
  textarea.addEventListener('input', () => {
    autoResize();
    updateButtonState();
  });

  submitButton.addEventListener('click', handleSubmit);

  // Keyboard shortcut: Cmd/Ctrl + Enter
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!submitButton.disabled) {
        handleSubmit();
      }
    }
  };
  textarea.addEventListener('keydown', handleKeydown);

  // Add to container
  container.appendChild(inputContainer);

  return {
    element: inputContainer,
    textarea,
    submitButton,
    getValue: () => textarea.value,
    setValue: (value: string) => {
      textarea.value = value;
      autoResize();
      updateButtonState();
    },
    clear: () => {
      textarea.value = '';
      autoResize();
      updateButtonState();
    },
    focus: () => textarea.focus(),
    destroy: () => {
      textarea.removeEventListener('keydown', handleKeydown);
      inputContainer.remove();
    },
  };
}
