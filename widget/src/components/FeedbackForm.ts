/**
 * HeyDev Feedback Form Component
 * Integrates TextInput, ScreenshotButton, VoiceButton, and handles submission
 */

import { createTextInput, type TextInputInstance } from './TextInput';
import { createScreenshotButton, type ScreenshotButtonInstance } from './ScreenshotButton';
import { createVoiceButton, type VoiceButtonInstance } from './VoiceButton';
import { submitFeedback } from '../services/submitFeedback';
import { submitReply } from '../services/submitReply';
import { getSessionId } from '../utils/session';

/** CSS styles for the feedback form */
const FORM_STYLES = `
  .heydev-feedback-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .heydev-form-textarea-row {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  .heydev-form-textarea-container {
    flex: 1;
  }

  .heydev-form-actions {
    display: flex;
    gap: 8px;
  }

  .heydev-form-preview-area {
    min-height: 0;
  }

  .heydev-form-submit-area {
    position: relative;
  }

  .heydev-form-status {
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    text-align: center;
    animation: heydev-fade-in 0.2s ease;
  }

  @keyframes heydev-fade-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .heydev-form-status.success {
    background-color: var(--heydev-success-bg, #d1fae5);
    color: var(--heydev-success-text, #065f46);
  }

  .heydev-form-status.error {
    background-color: var(--heydev-error-bg, #fee2e2);
    color: var(--heydev-error-text, #991b1b);
  }

  .heydev-submit-btn.is-loading {
    pointer-events: none;
  }

  .heydev-submit-btn.is-loading .heydev-btn-text {
    visibility: hidden;
  }

  .heydev-submit-btn.is-loading::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: heydev-spinner 0.6s linear infinite;
  }

  @keyframes heydev-spinner {
    to { transform: rotate(360deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .heydev-form-status {
      animation: none;
    }
    .heydev-submit-btn.is-loading::after {
      animation: none;
    }
  }
`;

export interface FeedbackFormOptions {
  /** Container element to render into */
  container: HTMLElement;
  /** Backend endpoint URL */
  endpoint: string;
  /** API key for authentication */
  apiKey: string;
  /** Session ID for the current session */
  sessionId?: string;
  /** Existing conversation ID - if set, form is in reply mode */
  conversationId?: string;
  /** Callback when feedback is successfully submitted (includes submitted text and screenshot URL) */
  onSuccess?: (conversationId: string, submittedText: string, screenshotUrl?: string) => void;
  /** Callback when reply is successfully submitted */
  onReplySuccess?: (submittedText: string) => void;
  /** Callback when submission fails */
  onError?: (error: string) => void;
  /** Callback to close the panel */
  onClose?: () => void;
}

export interface FeedbackFormInstance {
  /** The form container element */
  element: HTMLDivElement;
  /** The text input instance */
  textInput: TextInputInstance;
  /** The screenshot button instance */
  screenshotButton: ScreenshotButtonInstance;
  /** The voice button instance */
  voiceButton: VoiceButtonInstance;
  /** Check if form is in reply mode */
  isReplyMode: () => boolean;
  /** Set form to reply mode with conversation ID */
  setReplyMode: (conversationId: string) => void;
  /** Clear the form */
  clear: () => void;
  /** Focus the textarea */
  focus: () => void;
  /** Remove from DOM */
  destroy: () => void;
}

/**
 * Creates the feedback form component
 * @param options Configuration options
 * @returns FeedbackForm instance with control methods
 */
export function createFeedbackForm(
  options: FeedbackFormOptions
): FeedbackFormInstance {
  const { container, endpoint, apiKey, onSuccess, onReplySuccess, onError, onClose } = options;
  const sessionId = options.sessionId ?? getSessionId();

  // Track reply mode state - form is in reply mode if conversationId is provided
  let currentConversationId: string | null = options.conversationId ?? null;
  const isInReplyMode = () => currentConversationId !== null;

  // Inject styles if not already present
  const styleId = 'heydev-feedback-form-styles';
  if (!container.querySelector(`#${styleId}`)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = FORM_STYLES;
    container.appendChild(style);
  }

  // Create form container
  const form = document.createElement('div');
  form.className = 'heydev-feedback-form';

  // Create textarea row
  const textareaRow = document.createElement('div');
  textareaRow.className = 'heydev-form-textarea-row';
  form.appendChild(textareaRow);

  // Create textarea container
  const textareaContainer = document.createElement('div');
  textareaContainer.className = 'heydev-form-textarea-container';
  textareaRow.appendChild(textareaContainer);

  // Create action buttons container
  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'heydev-form-actions';
  textareaRow.appendChild(actionsContainer);

  // Create preview area
  const previewArea = document.createElement('div');
  previewArea.className = 'heydev-form-preview-area';
  form.appendChild(previewArea);

  // Create submit area
  const submitArea = document.createElement('div');
  submitArea.className = 'heydev-form-submit-area';
  form.appendChild(submitArea);

  // Create status message area
  const statusArea = document.createElement('div');
  form.appendChild(statusArea);

  // State
  let isSubmitting = false;

  // Show status message
  const showStatus = (message: string, type: 'success' | 'error') => {
    statusArea.innerHTML = `<div class="heydev-form-status ${type}">${message}</div>`;
  };

  // Clear status message
  const clearStatus = () => {
    statusArea.innerHTML = '';
  };

  // Handle submission
  const handleSubmit = async (text: string) => {
    if (isSubmitting || !text.trim()) return;

    isSubmitting = true;
    clearStatus();

    // Capture the text before clearing (for conversation history)
    const submittedText = text.trim();

    // Get submit button and show loading state
    const submitBtn = textInput.submitButton;
    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;

    // Wrap text in span for hiding during loading
    const btnContent = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span class="heydev-btn-text">${btnContent}</span>`;

    // Check if we're in reply mode or initial feedback mode
    if (isInReplyMode() && currentConversationId) {
      // Reply mode - send to reply endpoint
      await submitReply({
        text,
        conversationId: currentConversationId,
        sessionId,
        endpoint,
        apiKey,
        onStart: () => {
          // Already handled above
        },
        onSuccess: () => {
          showStatus('Reply sent!', 'success');

          // Clear form
          textInput.clear();

          // Notify parent
          if (onReplySuccess) {
            onReplySuccess(submittedText);
          }

          // Clear status after a delay (don't close panel for replies)
          setTimeout(() => {
            clearStatus();
          }, 1500);
        },
        onError: (error) => {
          showStatus(`Error: ${error}`, 'error');

          if (onError) {
            onError(error);
          }
        },
      });
    } else {
      // Initial feedback mode
      await submitFeedback({
        text,
        screenshot: screenshotBtn.getScreenshot(),
        endpoint,
        apiKey,
        onStart: () => {
          // Already handled above
        },
        onSuccess: (conversationId, screenshotUrl) => {
          showStatus('Feedback sent!', 'success');

          // Clear form
          textInput.clear();
          screenshotBtn.clearScreenshot();

          // Notify parent with submitted text and screenshot URL
          if (onSuccess) {
            onSuccess(conversationId, submittedText, screenshotUrl);
          }

          // Close panel after 2 seconds
          setTimeout(() => {
            if (onClose) {
              onClose();
            }
            clearStatus();
          }, 2000);
        },
        onError: (error) => {
          showStatus(`Error: ${error}`, 'error');

          if (onError) {
            onError(error);
          }
        },
      });
    }

    // Reset button state
    isSubmitting = false;
    submitBtn.classList.remove('is-loading');
    submitBtn.innerHTML = btnContent;

    // Update button disabled state based on textarea content
    submitBtn.disabled = !textInput.getValue().trim();
  };

  // Update form for reply mode (update placeholder, button text, hide screenshot)
  const updateFormForReplyMode = () => {
    // Update placeholder text
    textInput.textarea.placeholder = 'Type your reply...';

    // Update button text
    const btnTextSpan = textInput.submitButton.querySelector('span');
    if (btnTextSpan) {
      btnTextSpan.textContent = 'Send Reply';
    } else {
      // Button might have just the SVG and text, update the text node
      textInput.submitButton.innerHTML = textInput.submitButton.innerHTML.replace('Send Feedback', 'Send Reply');
    }
    textInput.submitButton.setAttribute('aria-label', 'Send reply');

    // Hide screenshot button in reply mode (not typically needed for quick replies)
    screenshotBtn.button.style.display = 'none';
  };

  // Create text input
  const textInput = createTextInput({
    container: textareaContainer,
    placeholder: "What's on your mind?",
    onSubmit: handleSubmit,
  });

  // Move submit button to submit area
  submitArea.appendChild(textInput.submitButton);

  // Create screenshot button
  const screenshotBtn = createScreenshotButton({
    container: actionsContainer,
    previewContainer: previewArea,
  });

  // Create voice button (voice input still available in reply mode)
  const voiceBtn = createVoiceButton({
    container: actionsContainer,
    transcribeEndpoint: `${endpoint}/api/transcribe`,
    getSessionId: () => sessionId,
    onTranscript: (text) => {
      textInput.setValue(text);
    },
  });

  // Add form to container
  container.appendChild(form);

  // If starting in reply mode, update the form UI
  if (isInReplyMode()) {
    updateFormForReplyMode();
  }

  return {
    element: form,
    textInput,
    screenshotButton: screenshotBtn,
    voiceButton: voiceBtn,
    isReplyMode: isInReplyMode,
    setReplyMode: (conversationId: string) => {
      currentConversationId = conversationId;
      updateFormForReplyMode();
    },
    clear: () => {
      textInput.clear();
      screenshotBtn.clearScreenshot();
      clearStatus();
    },
    focus: () => {
      textInput.focus();
    },
    destroy: () => {
      textInput.destroy();
      screenshotBtn.destroy();
      voiceBtn.destroy();
      form.remove();
    },
  };
}
