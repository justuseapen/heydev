/**
 * HeyDev Voice Button Component
 * A button for recording voice input with Web Speech API real-time transcription
 */

/** CSS styles for the voice button */
const VOICE_BUTTON_STYLES = `
  .heydev-voice-btn {
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
    position: relative;
  }

  .heydev-voice-btn:hover:not(:disabled) {
    background-color: var(--heydev-btn-secondary-hover, #e5e7eb);
    border-color: var(--heydev-border-hover, #d1d5db);
    color: var(--heydev-text, #1f2937);
  }

  .heydev-voice-btn:focus {
    outline: 2px solid var(--heydev-primary, #6366f1);
    outline-offset: 2px;
  }

  .heydev-voice-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .heydev-voice-btn svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }

  .heydev-voice-btn.is-recording {
    background-color: var(--heydev-danger, #ef4444);
    border-color: var(--heydev-danger, #ef4444);
    color: white;
  }

  .heydev-voice-btn.is-recording:hover:not(:disabled) {
    background-color: var(--heydev-danger-hover, #dc2626);
    border-color: var(--heydev-danger-hover, #dc2626);
  }

  .heydev-voice-recording-indicator {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 12px;
    height: 12px;
    background-color: var(--heydev-danger, #ef4444);
    border: 2px solid var(--heydev-panel-bg, #ffffff);
    border-radius: 50%;
    animation: heydev-pulse 1s ease-in-out infinite;
  }

  @keyframes heydev-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.9); }
  }

  .heydev-voice-unsupported {
    font-size: 12px;
    color: var(--heydev-text-secondary, #9ca3af);
    padding: 8px 12px;
    background-color: var(--heydev-btn-secondary-bg, #f3f4f6);
    border-radius: 8px;
    text-align: center;
  }

  @media (prefers-reduced-motion: reduce) {
    .heydev-voice-btn {
      transition: none;
    }
    .heydev-voice-recording-indicator {
      animation: none;
    }
  }
`;

/** Microphone icon SVG */
const MIC_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
  <path d="M7 4a3 3 0 0 1 6 0v6a3 3 0 1 1-6 0V4Z" />
  <path d="M5.5 9.643a.75.75 0 0 0-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-1.5v-1.546A6.001 6.001 0 0 0 16 10v-.357a.75.75 0 0 0-1.5 0V10a4.5 4.5 0 0 1-9 0v-.357Z" />
</svg>`;

/** Stop icon SVG */
const STOP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
  <path fill-rule="evenodd" d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm5-2.25A.75.75 0 0 1 7.75 7h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5Z" clip-rule="evenodd" />
</svg>`;

/** Type declarations for Web Speech API */
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognition;

/** Check if Web Speech API is available */
function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export interface VoiceButtonOptions {
  /** Container element to render the button into */
  container?: HTMLElement;
  /** Callback when transcription text is received (called continuously during recording) */
  onTranscript?: (text: string, isFinal: boolean) => void;
  /** Callback when recording starts */
  onRecordingStart?: () => void;
  /** Callback when recording stops */
  onRecordingStop?: () => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /** Maximum recording duration in seconds (default: 60) */
  maxDuration?: number;
}

export interface VoiceButtonInstance {
  /** The button element (null if not supported) */
  button: HTMLButtonElement | null;
  /** The container element (includes unsupported message if applicable) */
  element: HTMLElement;
  /** Check if voice recording is supported */
  isSupported: () => boolean;
  /** Check if currently recording */
  isRecording: () => boolean;
  /** Start recording */
  startRecording: () => void;
  /** Stop recording */
  stopRecording: () => void;
  /** Toggle recording state */
  toggleRecording: () => void;
  /** Remove from DOM */
  destroy: () => void;
}

/**
 * Creates and renders the voice button component
 * @param options Configuration options
 * @returns VoiceButton instance with control methods
 */
export function createVoiceButton(
  options: VoiceButtonOptions = {}
): VoiceButtonInstance {
  const container = options.container ?? document.body;
  const onTranscript = options.onTranscript;
  const onRecordingStart = options.onRecordingStart;
  const onRecordingStop = options.onRecordingStop;
  const onError = options.onError;
  const maxDuration = options.maxDuration ?? 60;

  // Check for Web Speech API support
  const SpeechRecognitionClass = getSpeechRecognition();
  const isSupported = SpeechRecognitionClass !== null;

  // State
  let recording = false;
  let recognition: SpeechRecognition | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let finalTranscript = '';

  // Inject styles if not already present
  const styleId = 'heydev-voice-button-styles';
  if (!container.querySelector(`#${styleId}`)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = VOICE_BUTTON_STYLES;
    container.appendChild(style);
  }

  // Create element wrapper
  const element = document.createElement('div');
  element.className = 'heydev-voice-container';

  // If not supported, show message
  if (!isSupported) {
    const unsupportedMessage = document.createElement('div');
    unsupportedMessage.className = 'heydev-voice-unsupported';
    unsupportedMessage.textContent = 'Voice not supported';
    element.appendChild(unsupportedMessage);
    container.appendChild(element);

    return {
      button: null,
      element,
      isSupported: () => false,
      isRecording: () => false,
      startRecording: () => {
        /* no-op: voice not supported */
      },
      stopRecording: () => {
        /* no-op: voice not supported */
      },
      toggleRecording: () => {
        /* no-op: voice not supported */
      },
      destroy: () => element.remove(),
    };
  }

  // Create button
  const button = document.createElement('button');
  button.className = 'heydev-voice-btn';
  button.type = 'button';
  button.setAttribute('aria-label', 'Start voice recording');
  button.innerHTML = MIC_ICON;

  // Recording indicator (hidden initially)
  const indicator = document.createElement('div');
  indicator.className = 'heydev-voice-recording-indicator';
  indicator.style.display = 'none';
  button.appendChild(indicator);

  element.appendChild(button);

  // Update UI based on state
  const updateUI = () => {
    button.classList.toggle('is-recording', recording);
    button.innerHTML = recording ? STOP_ICON : MIC_ICON;
    button.setAttribute(
      'aria-label',
      recording ? 'Stop voice recording' : 'Start voice recording'
    );

    // Re-add indicator if recording
    if (recording) {
      const newIndicator = document.createElement('div');
      newIndicator.className = 'heydev-voice-recording-indicator';
      button.appendChild(newIndicator);
    }
  };

  // Start recording
  const startRecording = () => {
    if (recording || !SpeechRecognitionClass) return;

    try {
      recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      finalTranscript = '';

      recognition.onstart = () => {
        recording = true;
        updateUI();
        if (onRecordingStart) {
          onRecordingStart();
        }
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + ' ';
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (onTranscript) {
          // Send the full transcript (final + interim)
          const fullTranscript = (finalTranscript + interimTranscript).trim();
          const isFinal = interimTranscript === '';
          onTranscript(fullTranscript, isFinal);
        }
      };

      recognition.onerror = (event: Event & { error: string }) => {
        console.error('Speech recognition error:', event.error);
        if (onError) {
          onError(event.error);
        }
        stopRecording();
      };

      recognition.onend = () => {
        // Recognition ended (could be automatic)
        if (recording) {
          // If we're still supposed to be recording, it ended unexpectedly
          // This can happen after long pauses - just stop cleanly
          stopRecording();
        }
      };

      recognition.start();

      // Set up max duration timeout
      timeoutId = setTimeout(() => {
        if (recording) {
          stopRecording();
        }
      }, maxDuration * 1000);
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      if (onError) {
        onError('Failed to start speech recognition');
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (!recording) return;

    recording = false;

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Ignore errors when stopping
      }
      recognition = null;
    }

    updateUI();

    if (onRecordingStop) {
      onRecordingStop();
    }
  };

  // Toggle recording
  const toggleRecording = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Event handler
  button.addEventListener('click', toggleRecording);

  // Add to container
  container.appendChild(element);

  return {
    button,
    element,
    isSupported: () => isSupported,
    isRecording: () => recording,
    startRecording,
    stopRecording,
    toggleRecording,
    destroy: () => {
      if (recording) {
        stopRecording();
      }
      button.removeEventListener('click', toggleRecording);
      element.remove();
    },
  };
}
