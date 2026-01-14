import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type Tab = 'active' | 'archived';

export function InboxPage() {
  const [tab, setTab] = useState<Tab>('active');
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated');
        setAuthenticated(true);
      })
      .catch(() => {
        navigate('/login');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate]);

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading...
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div>
      <h1
        className="text-3xl font-bold text-gray-900 mb-6"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        Feedback Inbox
      </h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setTab('active')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'active'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setTab('archived')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'archived'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Archived
          </button>
        </nav>
      </div>

      {/* Content placeholder - FeedbackList will be added in US-016 */}
      <div className="text-center py-12 text-gray-500">
        No feedback yet. When users submit feedback, it will appear here.
      </div>
    </div>
  );
}
