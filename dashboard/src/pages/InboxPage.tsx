import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FeedbackList } from '../components/FeedbackList';
import { ProjectSelector } from '../components/ProjectSelector';
import { NewProjectModal } from '../components/NewProjectModal';

// In production, API is served from same origin (relative path). In dev, use VITE_API_URL or localhost.
const API_BASE = import.meta.env.VITE_API_URL || '';

type Tab = 'active' | 'archived';
type TypeFilter = 'all' | 'feedback' | 'error';

export function InboxPage() {
  const [tab, setTab] = useState<Tab>('active');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projectRefreshKey, setProjectRefreshKey] = useState(0);
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
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-3xl font-bold text-gray-900"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Feedback Inbox
        </h1>
        <ProjectSelector
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
          onCreateProject={() => setShowNewProjectModal(true)}
          refreshKey={projectRefreshKey}
        />
      </div>

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

      {/* Type filter */}
      <div className="flex gap-2 mb-6">
        {(['all', 'feedback', 'error'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setTypeFilter(filter)}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              typeFilter === filter
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter === 'all' ? 'All' : filter === 'feedback' ? 'Feedback' : 'Errors'}
          </button>
        ))}
      </div>

      {/* Feedback list */}
      <FeedbackList
        archived={tab === 'archived'}
        typeFilter={typeFilter}
        projectId={selectedProjectId}
      />

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onProjectCreated={(project) => {
          setProjectRefreshKey((k) => k + 1);
          setSelectedProjectId(project.id);
          setShowNewProjectModal(false);
        }}
      />
    </div>
  );
}
