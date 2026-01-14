import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

// In production, API is served from same origin (relative path). In dev, use VITE_API_URL or localhost.
const API_BASE = import.meta.env.VITE_API_URL || '';

interface Message {
  id: number;
  direction: 'inbound' | 'outbound';
  text: string;
  screenshotUrl: string | null;
  audioUrl: string | null;
  createdAt: string;
}

interface Context {
  url: string;
  browser: string;
  os: string;
  viewport: { width: number; height: number };
  timestamp: string;
  timezone: string;
  console_errors?: { message: string; timestamp: string }[];
}

interface Conversation {
  id: number;
  sessionId: string;
  status: 'new' | 'resolved';
  readAt: number | null;
  archivedAt: number | null;
  createdAt: string;
  context: Context | null;
  messages: Message[];
  type: 'feedback' | 'error';
  occurrenceCount: number;
  lastOccurredAt: string | null;
}

/**
 * Parsed error occurrence content from a message
 */
interface ErrorOccurrence {
  error_type: 'exception' | 'network';
  message: string;
  stack: string | null;
  filename: string | null;
  lineno: number | null;
  colno: number | null;
  url: string | null;
  status: number | null;
  method: string | null;
  context: Context;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

// Helper for US-009 - will be used when error details are displayed
function _formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
// Export for future use
export { _formatRelativeTime as formatRelativeTime };

/**
 * Parse error message content from JSON
 * Helper for US-009 - will be used when error details are displayed
 */
function _parseErrorOccurrence(text: string): ErrorOccurrence | null {
  try {
    return JSON.parse(text) as ErrorOccurrence;
  } catch {
    return null;
  }
}
export { _parseErrorOccurrence as parseErrorOccurrence };

/**
 * Error icon component (exclamation triangle)
 * Helper for US-009 - will be used when error details are displayed
 */
function _ErrorIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={`${className} text-red-600`}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}
export { _ErrorIcon as ErrorIcon };

export function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    // Fetch conversation
    fetch(`${API_BASE}/api/feedback/${conversationId}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            navigate('/login');
            throw new Error('Not authenticated');
          }
          throw new Error('Conversation not found');
        }
        return res.json();
      })
      .then((data) => {
        setConversation(data);
        // Mark as read
        return fetch(`${API_BASE}/api/feedback/${conversationId}/read`, {
          method: 'PATCH',
          credentials: 'include',
        });
      })
      .catch((err) => {
        if (err.message !== 'Not authenticated') {
          setError(err.message);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [conversationId, navigate]);

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Link to="/inbox" className="text-gray-600 hover:text-gray-900">
          Back to Inbox
        </Link>
      </div>
    );
  }

  if (!conversation) {
    return null;
  }

  const ctx = conversation.context;
  const consoleErrors = ctx?.console_errors || [];

  const handleSendReply = async () => {
    if (!replyText.trim() || !conversationId) return;

    setSending(true);
    setSendError(null);

    try {
      const response = await fetch(`${API_BASE}/api/feedback/${conversationId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: replyText.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reply');
      }

      // Add new message to the conversation
      const newMessage: Message = {
        id: data.id,
        direction: 'outbound',
        text: data.text,
        screenshotUrl: null,
        audioUrl: null,
        createdAt: data.createdAt,
      };

      setConversation((prev) =>
        prev ? { ...prev, messages: [...prev.messages, newMessage] } : prev
      );
      setReplyText('');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: 'new' | 'resolved') => {
    if (!conversationId) return;

    try {
      const response = await fetch(`${API_BASE}/api/feedback/${conversationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      setConversation((prev) =>
        prev ? { ...prev, status: newStatus } : prev
      );
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  const handleArchive = async () => {
    if (!conversationId) return;

    try {
      const response = await fetch(`${API_BASE}/api/feedback/${conversationId}/archive`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to archive');
      }

      // Redirect to inbox after archiving
      navigate('/inbox');
    } catch (err) {
      console.error('Archive error:', err);
    }
  };

  const handleUnarchive = async () => {
    if (!conversationId) return;

    try {
      const response = await fetch(`${API_BASE}/api/feedback/${conversationId}/unarchive`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to unarchive');
      }

      setConversation((prev) =>
        prev ? { ...prev, archivedAt: null } : prev
      );
    } catch (err) {
      console.error('Unarchive error:', err);
    }
  };

  return (
    <div>
      {/* Header with back link and actions */}
      <div className="flex items-center justify-between mb-4">
        <Link
          to="/inbox"
          className="text-gray-600 hover:text-gray-900 text-sm"
        >
          &larr; Back to Inbox
        </Link>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Status buttons */}
          {conversation.status === 'new' ? (
            <button
              onClick={() => handleStatusChange('resolved')}
              className="px-4 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Mark Resolved
            </button>
          ) : (
            <button
              onClick={() => handleStatusChange('new')}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Reopen
            </button>
          )}

          {/* Archive/Unarchive buttons */}
          {conversation.archivedAt ? (
            <button
              onClick={handleUnarchive}
              className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Unarchive
            </button>
          ) : conversation.status === 'resolved' ? (
            <button
              onClick={handleArchive}
              className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Archive
            </button>
          ) : null}
        </div>
      </div>

      {/* Error Details section - shown for error conversations */}
      {conversation.type === 'error' && (() => {
        // Get the first message to display primary error details
        const firstMsg = conversation.messages[0];
        const errorDetails = firstMsg ? _parseErrorOccurrence(firstMsg.text) : null;

        if (!errorDetails) return null;

        return (
          <div className="mb-6 p-4 bg-red-50 border border-red-200">
            {/* Error header with icon */}
            <div className="flex items-start gap-3">
              <_ErrorIcon className="w-6 h-6 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium uppercase text-red-700 bg-red-100 px-2 py-0.5">
                    {errorDetails.error_type === 'network' ? 'Network Error' : 'Exception'}
                  </span>
                  {conversation.occurrenceCount > 1 && (
                    <span className="text-xs text-red-600">
                      {conversation.occurrenceCount} occurrences
                    </span>
                  )}
                  {conversation.lastOccurredAt && (
                    <span className="text-xs text-gray-500">
                      - Last seen: {_formatRelativeTime(conversation.lastOccurredAt)}
                    </span>
                  )}
                </div>

                {/* Error message prominently displayed */}
                <p className="text-red-900 font-semibold text-lg break-words">
                  {errorDetails.message}
                </p>

                {/* Location info if available */}
                {(errorDetails.filename || errorDetails.url) && (
                  <p className="text-sm text-red-700 mt-1 break-all">
                    {errorDetails.error_type === 'network' ? (
                      <>
                        {errorDetails.method && <span className="font-medium">{errorDetails.method} </span>}
                        {errorDetails.url}
                        {errorDetails.status && <span className="font-medium"> ({errorDetails.status})</span>}
                      </>
                    ) : (
                      <>
                        {errorDetails.filename}
                        {errorDetails.lineno != null && `:${errorDetails.lineno}`}
                        {errorDetails.colno != null && `:${errorDetails.colno}`}
                      </>
                    )}
                  </p>
                )}

                {/* Stack trace in monospace font */}
                {errorDetails.stack && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-red-700 mb-1">Stack Trace:</p>
                    <pre className="text-xs font-mono text-red-800 bg-red-100 p-3 overflow-x-auto whitespace-pre border border-red-200">
                      {errorDetails.stack}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Context metadata */}
      {ctx && (
        <div className="mb-6 p-4 bg-gray-100 text-sm">
          <h3 className="font-semibold text-gray-900 mb-2">Context</h3>
          <div className="grid grid-cols-2 gap-2 text-gray-600">
            <div>
              <span className="font-medium">URL:</span>{' '}
              <a
                href={ctx.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {ctx.url}
              </a>
            </div>
            <div>
              <span className="font-medium">Browser:</span> {ctx.browser}
            </div>
            <div>
              <span className="font-medium">OS:</span> {ctx.os}
            </div>
            <div>
              <span className="font-medium">Viewport:</span> {ctx.viewport.width}x{ctx.viewport.height}
            </div>
            <div>
              <span className="font-medium">Timestamp:</span> {ctx.timestamp}
            </div>
            <div>
              <span className="font-medium">Timezone:</span> {ctx.timezone}
            </div>
          </div>

          {/* Console errors */}
          {consoleErrors.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowErrors(!showErrors)}
                className="text-sm font-medium text-red-600 hover:text-red-800"
              >
                {showErrors ? 'Hide' : 'Show'} {consoleErrors.length} console error{consoleErrors.length !== 1 ? 's' : ''}
              </button>
              {showErrors && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 text-xs font-mono overflow-x-auto">
                  {consoleErrors.map((err, idx) => (
                    <div key={idx} className="mb-1">
                      <span className="text-gray-500">[{err.timestamp}]</span>{' '}
                      <span className="text-red-700">{err.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Messages / Error Occurrences */}
      {conversation.type === 'error' ? (
        /* Error occurrences - each message is an occurrence */
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm mb-2">
            Occurrences ({conversation.messages.filter(m => m.direction === 'inbound').length})
          </h3>
          {conversation.messages.map((msg, index) => {
            const isInbound = msg.direction === 'inbound';

            // For outbound messages (replies), use regular display
            if (!isInbound) {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[70%] p-4 bg-gray-900 text-white">
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <div className="text-xs mt-2 text-gray-400">
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              );
            }

            // Parse error occurrence data from message
            const errorOccurrence = _parseErrorOccurrence(msg.text);

            if (!errorOccurrence) {
              // Fallback for unparseable messages
              return (
                <div key={msg.id} className="p-3 bg-gray-50 border border-gray-200">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{msg.text}</p>
                  <div className="text-xs text-gray-400 mt-1">{formatTime(msg.createdAt)}</div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className="p-3 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Occurrence number and timestamp */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500">
                        #{conversation.messages.filter(m => m.direction === 'inbound').length - index}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>

                    {/* Error message */}
                    <p className="text-sm text-gray-900 break-words">
                      {errorOccurrence.message}
                    </p>

                    {/* Context URL if different from first occurrence */}
                    {errorOccurrence.context?.url && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {errorOccurrence.context.url}
                      </p>
                    )}

                    {/* Browser/OS info */}
                    {errorOccurrence.context && (
                      <p className="text-xs text-gray-400 mt-1">
                        {errorOccurrence.context.browser} - {errorOccurrence.context.os}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Regular feedback messages */
        <div className="space-y-4">
          {conversation.messages.map((msg) => {
            const isInbound = msg.direction === 'inbound';

            return (
              <div
                key={msg.id}
                className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[70%] p-4 ${
                    isInbound
                      ? 'bg-white border border-gray-200'
                      : 'bg-gray-900 text-white'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Screenshot */}
                  {msg.screenshotUrl && (
                    <button
                      onClick={() => setFullScreenImage(msg.screenshotUrl)}
                      className="mt-2 block"
                    >
                      <img
                        src={msg.screenshotUrl}
                        alt="Screenshot"
                        className="max-w-full h-auto border border-gray-300 cursor-pointer hover:opacity-90"
                        style={{ maxHeight: '200px' }}
                      />
                    </button>
                  )}

                  <div
                    className={`text-xs mt-2 ${
                      isInbound ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply composer */}
      <div className="mt-6 border-t border-gray-200 pt-6">
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Type your reply..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 resize-none"
        />
        {sendError && (
          <div className="text-red-600 text-sm mt-2">{sendError}</div>
        )}
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleSendReply}
            disabled={!replyText.trim() || sending}
            className="bg-gray-900 text-white px-6 py-2 font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send Reply'}
          </button>
        </div>
      </div>

      {/* Full screen image modal */}
      {fullScreenImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setFullScreenImage(null)}
        >
          <img
            src={fullScreenImage}
            alt="Screenshot full size"
            className="max-w-full max-h-full object-contain"
          />
          <button
            onClick={() => setFullScreenImage(null)}
            className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
