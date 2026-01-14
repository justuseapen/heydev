import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Conversation {
  id: number;
  sessionId: string;
  status: 'new' | 'resolved';
  readAt: number | null;
  archivedAt: number | null;
  createdAt: string;
  latestMessage: string | null;
  messageCount: number;
}

type TypeFilter = 'all' | 'feedback' | 'error';

interface FeedbackListProps {
  archived: boolean;
  typeFilter?: TypeFilter;
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

export function FeedbackList({ archived, typeFilter = 'all' }: FeedbackListProps) {
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
  }, [archived, typeFilter]);

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

        return (
          <Link
            key={conv.id}
            to={`/inbox/${conv.id}`}
            className="block p-4 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* Unread indicator */}
              {isUnread && (
                <span className="mt-2 w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
              )}
              {!isUnread && <span className="w-2 flex-shrink-0" />}

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
                  <span
                    className={`text-xs px-2 py-0.5 ${
                      conv.status === 'new'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {conv.status}
                  </span>
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
