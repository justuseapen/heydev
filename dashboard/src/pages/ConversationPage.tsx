import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

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

  return (
    <div>
      {/* Back link */}
      <Link
        to="/inbox"
        className="inline-block mb-4 text-gray-600 hover:text-gray-900 text-sm"
      >
        &larr; Back to Inbox
      </Link>

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

      {/* Messages */}
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
