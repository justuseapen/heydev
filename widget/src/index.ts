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
export {
  createFeedbackForm,
  type FeedbackFormOptions,
  type FeedbackFormInstance,
} from './components/FeedbackForm';
export {
  createMessageDisplay,
  type MessageDisplayOptions,
  type MessageDisplayInstance,
} from './components/MessageDisplay';
export {
  createConversationHistory,
  type ConversationHistoryOptions,
  type ConversationHistoryInstance,
  type HistoryMessage,
} from './components/ConversationHistory';

// Service exports
export {
  submitFeedback,
  type SubmitFeedbackOptions,
  type SubmitFeedbackResult,
} from './services/submitFeedback';
export {
  submitReply,
  type SubmitReplyOptions,
  type SubmitReplyResult,
} from './services/submitReply';
export {
  createSSEClient,
  type SSEClientOptions,
  type SSEClientInstance,
  type SSEMessage,
} from './services/sseClient';

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
