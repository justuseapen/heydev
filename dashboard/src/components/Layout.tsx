import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

// In production, API is served from same origin (relative path). In dev, use VITE_API_URL or localhost.
const API_BASE = import.meta.env.VITE_API_URL || '';

interface User {
  id: number;
  email: string;
}

export function Layout() {
  const [user, setUser] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then((data) => {
        setUser(data);
        // Fetch unread count if authenticated
        return fetch(`${API_BASE}/api/feedback/unread-count`, { credentials: 'include' });
      })
      .then((res) => {
        if (res.ok) return res.json();
        return { count: 0 };
      })
      .then((data) => {
        setUnreadCount(data.count || 0);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    setUnreadCount(0);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <svg
                className="w-8 h-8 text-indigo-600"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              <span className="text-xl font-bold text-gray-900">HeyDev</span>
            </Link>
            <nav className="flex items-center gap-4">
              {loading ? null : user ? (
                <>
                  <Link
                    to="/inbox"
                    className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                  >
                    Inbox{unreadCount > 0 && ` (${unreadCount})`}
                  </Link>
                  <Link
                    to="/setup"
                    className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                  >
                    Setup
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Log In
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
