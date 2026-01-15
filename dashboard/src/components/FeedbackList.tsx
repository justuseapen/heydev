import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// In production, API is served from same origin (relative path). In dev, use VITE_API_URL or localhost.
const API_BASE = import.meta.env.VITE_API_URL || '';

interface Conversation {
  id: number;
  sessionId: string;
  status: 'new' | 'resolved';
  readAt: number | null;
  archivedAt: number | null;
  createdAt: string;
  latestMessage: string | null;
  messageCount: number;
  type: 'feedback' | 'error';
  occurrenceCount: number;
  lastOccurredAt: string | null;
  projectId: number | null;
  projectName: string | null;
}

type TypeFilter = 'all' | 'feedback' | 'error';

interface FeedbackListProps {
  archived: boolean;
  typeFilter?: TypeFilter;
  projectId?: number | null;
}

function ErrorIcon() {
  return (
    <svg
      className="w-4 h-4 text-red-600"
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

function formatRelativeTime(dateString: string): string {
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

export function FeedbackList({ archived, typeFilter = 'all', projectId }: FeedbackListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ archived: String(archived) });
    if (typeFilter !== 'all') {
      params.set('type', typeFilter);
    }
    if (projectId !== null && projectId !== undefined) {
      params.set('projectId', String(projectId));
    }

    fetch(`${API_BASE}/api/feedback?${params}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch feedback');
        return res.json();
      })
      .then((data) => {
        setConversations(data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [archived, typeFilter, projectId]);

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        {error}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {archived
          ? 'No archived feedback.'
          : 'No feedback yet. When users submit feedback, it will appear here.'}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conv) => {
        const isUnread = conv.readAt === null;
        const isError = conv.type === 'error';

        return (
          <Link
            key={conv.id}
            to={`/inbox/${conv.id}`}
            className={`block p-4 border transition-colors ${
              isError
                ? 'bg-red-50 border-red-200 hover:bg-red-100'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Type and unread indicator */}
              {isError ? (
                <span className="mt-0.5 flex-shrink-0">
                  <ErrorIcon />
                </span>
              ) : isUnread ? (
                <span className="mt-2 w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
              ) : (
                <span className="w-4 flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <p
                    className={`text-sm truncate ${
                      isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    {conv.latestMessage || 'No message content'}
                  </p>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {formatRelativeTime(conv.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {conv.projectName && projectId === undefined && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {conv.projectName}
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 ${
                      conv.status === 'new'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {conv.status}
                  </span>
                  {isError && conv.occurrenceCount > 1 && (
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800">
                      {conv.occurrenceCount} occurrences
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {conv.messageCount} message{conv.messageCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
