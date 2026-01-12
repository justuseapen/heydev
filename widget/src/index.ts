/**
 * HeyDev Widget Entry Point
 * A drop-in JavaScript widget for frictionless user feedback
 */

export const VERSION = '0.1.0';

// Component exports
export {
  createFloatingButton,
  type FloatingButtonOptions,
  type FloatingButtonInstance,
} from './components/FloatingButton';
export {
  createFeedbackPanel,
  type FeedbackPanelOptions,
  type FeedbackPanelInstance,
} from './components/FeedbackPanel';
export {
  createTextInput,
  type TextInputOptions,
  type TextInputInstance,
} from './components/TextInput';
export {
  createScreenshotButton,
  type ScreenshotButtonOptions,
  type ScreenshotButtonInstance,
} from './components/ScreenshotButton';
export {
  createVoiceButton,
  type VoiceButtonOptions,
  type VoiceButtonInstance,
} from './components/VoiceButton';

// Utility exports
export { captureContext, type PageContext } from './utils/context';
export {
  installErrorInterceptor,
  uninstallErrorInterceptor,
  getConsoleErrors,
  clearCapturedErrors,
  type CapturedError,
} from './utils/consoleErrors';
export { getSessionId, clearSessionId } from './utils/session';
