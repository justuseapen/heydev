/**
 * HeyDev Voice Button Component
 * A button for recording voice input with Web Speech API real-time transcription
 * Falls back to MediaRecorder + Whisper API when Web Speech API is unavailable
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

  .heydev-voice-btn.is-transcribing {
    background-color: var(--heydev-primary, #6366f1);
    border-color: var(--heydev-primary, #6366f1);
    color: white;
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

  @keyframes heydev-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .heydev-voice-btn.is-transcribing svg {
    animation: heydev-spin 1s linear infinite;
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
    .heydev-voice-btn.is-transcribing svg {
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

/** Loading spinner icon SVG */
const LOADING_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
  <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd" />
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

/** Check if MediaRecorder is available for fallback */
function isMediaRecorderSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && typeof navigator.mediaDevices !== 'undefined';
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
  /** Callback when transcribing starts (fallback mode only) */
  onTranscribingStart?: () => void;
  /** Callback when transcribing ends (fallback mode only) */
  onTranscribingEnd?: () => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /** Maximum recording duration in seconds (default: 60) */
  maxDuration?: number;
  /** Endpoint URL for Whisper API transcription (required for fallback mode) */
  transcribeEndpoint?: string;
  /** Function to get the current session ID (required for fallback mode) */
  getSessionId?: () => string;
}

export interface VoiceButtonInstance {
  /** The button element (null if not supported) */
  button: HTMLButtonElement | null;
  /** The container element (includes unsupported message if applicable) */
  element: HTMLElement;
  /** Check if voice recording is supported (either native or fallback) */
  isSupported: () => boolean;
  /** Check if using fallback mode (MediaRecorder + Whisper API) */
  isFallbackMode: () => boolean;
  /** Check if currently recording */
  isRecording: () => boolean;
  /** Check if currently transcribing (fallback mode only) */
  isTranscribing: () => boolean;
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
 * Supports two modes:
 * 1. Native mode: Uses Web Speech API for real-time transcription
 * 2. Fallback mode: Uses MediaRecorder + Whisper API when Speech API unavailable
 *
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
  const onTranscribingStart = options.onTranscribingStart;
  const onTranscribingEnd = options.onTranscribingEnd;
  const onError = options.onError;
  const maxDuration = options.maxDuration ?? 60;
  const transcribeEndpoint = options.transcribeEndpoint;
  const getSessionId = options.getSessionId;

  // Check for Web Speech API support
  const SpeechRecognitionClass = getSpeechRecognition();
  const hasNativeSupport = SpeechRecognitionClass !== null;

  // Check for MediaRecorder fallback support
  const hasFallbackSupport = isMediaRecorderSupported();

  // Determine which mode to use (can be overridden at runtime)
  const isSupported = hasNativeSupport || hasFallbackSupport;

  // State
  let recording = false;
  let nativeModeFailed = false; // Track if native mode failed (e.g., network error)
  let transcribing = false;
  let recognition: SpeechRecognition | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  let mediaStream: MediaStream | null = null;
  let audioChunks: Blob[] = [];
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let finalTranscript = '';
  let intentionallyStopped = false; // Track if user explicitly stopped recording
  let restartAttempts = 0; // Track restart attempts to prevent infinite loops
  const MAX_RESTART_ATTEMPTS = 3;

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
      isFallbackMode: () => false,
      isRecording: () => false,
      isTranscribing: () => false,
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
    button.classList.remove('is-recording', 'is-transcribing');

    if (transcribing) {
      button.classList.add('is-transcribing');
      button.innerHTML = LOADING_ICON;
      button.setAttribute('aria-label', 'Transcribing...');
      button.disabled = true;
    } else if (recording) {
      button.classList.add('is-recording');
      button.innerHTML = STOP_ICON;
      button.setAttribute('aria-label', 'Stop voice recording');
      button.disabled = false;

      // Add recording indicator
      const newIndicator = document.createElement('div');
      newIndicator.className = 'heydev-voice-recording-indicator';
      button.appendChild(newIndicator);
    } else {
      button.innerHTML = MIC_ICON;
      button.setAttribute('aria-label', 'Start voice recording');
      button.disabled = false;
    }
  };

  // =========================================================
  // Native Mode: Web Speech API
  // =========================================================
  const startNativeRecording = () => {
    if (recording || !SpeechRecognitionClass) return;

    // Check if we're on a secure context (HTTPS or localhost)
    // Web Speech API requires secure context in most browsers
    if (!window.isSecureContext) {
      console.warn('Speech recognition may not work on non-HTTPS connections');
    }

    try {
      recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      finalTranscript = '';
      intentionallyStopped = false;
      restartAttempts = 0;

      // Set recording state BEFORE calling start() to ensure auto-restart logic
      // works even if onend fires before onstart (browser quirk)
      recording = true;
      updateUI();
      if (onRecordingStart) {
        onRecordingStart();
      }

      recognition.onstart = () => {
        // Recording state already set - this confirms successful start
        // Reset restart attempts on successful start
        restartAttempts = 0;
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
          const fullTranscript = (finalTranscript + interimTranscript).trim();
          const isFinal = interimTranscript === '';
          onTranscript(fullTranscript, isFinal);
        }
      };

      recognition.onerror = (event: Event & { error: string }) => {
        console.error('Speech recognition error:', event.error);
        // Don't stop on 'no-speech' error - just let it continue trying
        if (event.error === 'no-speech') {
          return;
        }

        // Provide user-friendly error messages
        let errorMessage = event.error;
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone found. Please connect a microphone and try again.';
            break;
          case 'network':
            // Network error - fall back to MediaRecorder + Whisper API
            if (hasFallbackSupport && transcribeEndpoint) {
              console.log('Web Speech API network error, falling back to MediaRecorder + Whisper');
              nativeModeFailed = true;
              intentionallyStopped = true;
              stopNativeRecording();
              // Automatically start fallback recording
              startFallbackRecording();
              return;
            }
            errorMessage = 'Network error. Speech recognition requires an internet connection.';
            break;
          case 'aborted':
            errorMessage = 'Recording was interrupted. Please try again.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech service not available. Please try again later.';
            break;
        }

        if (onError) {
          onError(errorMessage);
        }
        intentionallyStopped = true; // Prevent restart on errors (except no-speech)
        stopNativeRecording();
      };

      recognition.onend = () => {
        // Only stop if we intentionally stopped, otherwise try to restart
        if (intentionallyStopped) {
          if (recording) {
            stopNativeRecording();
          }
        } else if (recording && restartAttempts < MAX_RESTART_ATTEMPTS) {
          // Recognition ended unexpectedly - try to restart
          restartAttempts++;
          console.log(
            `Speech recognition ended unexpectedly, restarting (attempt ${restartAttempts}/${MAX_RESTART_ATTEMPTS})`
          );
          try {
            recognition?.start();
          } catch (e) {
            console.error('Failed to restart speech recognition:', e);
            stopNativeRecording();
          }
        } else if (recording) {
          // Max restart attempts reached
          console.warn('Speech recognition failed to stay active after multiple attempts');
          stopNativeRecording();
        }
      };

      recognition.start();

      timeoutId = setTimeout(() => {
        if (recording) {
          stopNativeRecording();
        }
      }, maxDuration * 1000);
    } catch (error) {
      // Reset state on error since we set it before calling start()
      recording = false;
      updateUI();
      console.error('Failed to start speech recognition:', error);
      if (onError) {
        // Check for common issues
        if (!window.isSecureContext) {
          onError('Voice recording requires HTTPS. Please use a secure connection.');
        } else if (error instanceof DOMException && error.name === 'NotAllowedError') {
          onError('Microphone access denied. Please allow microphone access and try again.');
        } else {
          onError('Failed to start voice recording. Please try again.');
        }
      }
    }
  };

  const stopNativeRecording = () => {
    if (!recording) return;

    recording = false;
    intentionallyStopped = true; // Mark as intentionally stopped to prevent restart

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

  // =========================================================
  // Fallback Mode: MediaRecorder + Whisper API
  // =========================================================
  const startFallbackRecording = async () => {
    if (recording || transcribing) return;

    try {
      // Request microphone access
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine best MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      mediaRecorder = new MediaRecorder(mediaStream, { mimeType });
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release microphone
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
          mediaStream = null;
        }

        if (onRecordingStop) {
          onRecordingStop();
        }

        // Check if we have audio to transcribe
        if (audioChunks.length === 0) {
          return;
        }

        // Transcribe the audio
        await transcribeAudio();
      };

      mediaRecorder.onerror = () => {
        console.error('MediaRecorder error');
        if (onError) {
          onError('Recording failed');
        }
        stopFallbackRecording();
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      recording = true;
      updateUI();

      if (onRecordingStart) {
        onRecordingStart();
      }

      // Set up max duration timeout
      timeoutId = setTimeout(() => {
        if (recording) {
          stopFallbackRecording();
        }
      }, maxDuration * 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      if (onError) {
        if (error instanceof DOMException) {
          switch (error.name) {
            case 'NotAllowedError':
              onError('Microphone access denied. Please allow microphone access and try again.');
              break;
            case 'NotFoundError':
              onError('No microphone found. Please connect a microphone and try again.');
              break;
            case 'NotReadableError':
              onError('Microphone is in use by another application.');
              break;
            case 'OverconstrainedError':
              onError('No suitable microphone found.');
              break;
            default:
              onError(`Microphone error: ${error.message}`);
          }
        } else {
          onError('Failed to start recording. Please try again.');
        }
      }
    }
  };

  const stopFallbackRecording = () => {
    if (!recording) return;

    recording = false;

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop();
      } catch {
        // Ignore errors when stopping
      }
    }

    updateUI();
  };

  const transcribeAudio = async () => {
    if (!transcribeEndpoint) {
      console.error('No transcribe endpoint configured for fallback mode');
      if (onError) {
        onError('Transcription not configured');
      }
      return;
    }

    transcribing = true;
    updateUI();

    if (onTranscribingStart) {
      onTranscribingStart();
    }

    try {
      // Create audio blob
      const audioBlob = new Blob(audioChunks, {
        type: audioChunks[0]?.type || 'audio/webm',
      });

      // Build form data
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      // Add session ID if available
      if (getSessionId) {
        formData.append('session_id', getSessionId());
      }

      // Send to server
      const response = await fetch(transcribeEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.text && onTranscript) {
        onTranscript(data.text, true);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      if (onError) {
        onError(error instanceof Error ? error.message : 'Transcription failed');
      }
    } finally {
      transcribing = false;
      audioChunks = [];
      updateUI();

      if (onTranscribingEnd) {
        onTranscribingEnd();
      }
    }
  };

  // =========================================================
  // Public API
  // =========================================================
  // Determine which mode to use at runtime
  const shouldUseNativeMode = () => hasNativeSupport && !nativeModeFailed;
  const shouldUseFallbackMode = () => hasFallbackSupport && (nativeModeFailed || !hasNativeSupport);

  const startRecording = () => {
    if (shouldUseNativeMode()) {
      startNativeRecording();
    } else if (shouldUseFallbackMode()) {
      startFallbackRecording();
    }
  };

  const stopRecording = () => {
    // Stop whichever mode is currently active
    if (recognition) {
      stopNativeRecording();
    } else if (mediaRecorder) {
      stopFallbackRecording();
    }
  };

  const toggleRecording = () => {
    if (transcribing) return; // Don't toggle while transcribing

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
    isFallbackMode: () => shouldUseFallbackMode(),
    isRecording: () => recording,
    isTranscribing: () => transcribing,
    startRecording,
    stopRecording,
    toggleRecording,
    destroy: () => {
      if (recording) {
        stopRecording();
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
      button.removeEventListener('click', toggleRecording);
      element.remove();
    },
  };
}
