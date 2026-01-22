import { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface Project {
  id: number;
  name: string;
  createdAt: string;
  hasApiKey: boolean;
  apiKeyPrefix: string | null;
}

interface ProjectSelectorProps {
  selectedProjectId: number | null;
  onSelectProject: (projectId: number | null) => void;
  onCreateProject?: () => void;
  refreshKey?: number;
}

export function ProjectSelector({ selectedProjectId, onSelectProject, onCreateProject, refreshKey }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/projects`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch projects');
        return res.json();
      })
      .then((data) => {
        setProjects(data);
      })
      .catch((err) => {
        console.error('Failed to load projects:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [refreshKey]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const displayText = selectedProject ? selectedProject.name : 'All Projects';

  if (loading) {
    return (
      <div className="inline-flex items-center px-3 py-2 text-sm text-gray-500">
        Loading projects...
      </div>
    );
  }

  // If no projects and no create option, hide completely
  if (projects.length === 0 && !onCreateProject) {
    return null;
  }

  // If only one project and no create option, show static text
  if (projects.length === 1 && !onCreateProject) {
    return (
      <div className="inline-flex items-center px-3 py-2 text-sm text-gray-700">
        <span className="font-medium">{projects[0].name}</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
      >
        <span>{displayText}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="py-1">
            <button
              onClick={() => {
                onSelectProject(null);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                selectedProjectId === null ? 'bg-gray-50 font-medium' : ''
              }`}
            >
              All Projects
            </button>
            <div className="border-t border-gray-100" />
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  onSelectProject(project.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                  selectedProjectId === project.id ? 'bg-gray-50 font-medium' : ''
                }`}
              >
                {project.name}
              </button>
            ))}
            {onCreateProject && (
              <>
                <div className="border-t border-gray-100" />
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onCreateProject();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Project
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
