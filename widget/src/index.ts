/**
 * HeyDev Widget Entry Point
 * A drop-in JavaScript widget for frictionless user feedback
 */

export const VERSION = '0.1.0';

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
