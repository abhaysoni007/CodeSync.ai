import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { api } from '../utils/api';
import toast from 'react-hot-toast';
import {
  Plus,
  FolderOpen,
  Users,
  LogOut,
  Settings,
  Code2,
  Trash2,
  Edit,
  Key,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useUser();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await api.getProjects();
      console.log('Projects API Response:', response.data);
      
      // Backend returns: { success: true, data: { projects: [...] } }
      const projectsData = response.data?.data?.projects || [];
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load projects');
      }
      setProjects([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProject.name.trim()) {
      toast.error('Project name is required');
      return;
    }

    try {
      const response = await api.createProject(newProject);
      toast.success('Project created!');
      
      // Backend returns: { success: true, data: { project: {...} } }
      const createdProject = response.data?.data?.project || response.data?.project;
      if (createdProject) {
        setProjects([createdProject, ...projects]);
        setShowCreateModal(false);
        setNewProject({ name: '', description: '' });
        
        // Navigate to project
        navigate(`/project/${createdProject._id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create project');
      console.error('Create project error:', error);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await api.deleteProject(id);
      toast.success('Project deleted');
      setProjects(projects.filter((p) => p._id !== id));
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error('Please enter a project code');
      return;
    }

    try {
      const response = await api.joinProject(joinCode);
      toast.success('Joined project successfully!');
      const joinedProject = response.data?.data?.project || response.data?.project;
      
      if (joinedProject) {
        setProjects([joinedProject, ...projects]);
        setShowJoinModal(false);
        setJoinCode('');
        navigate(`/project/${joinedProject._id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to join project');
    }
  };

  const copyJoinCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success('Join code copied to clipboard!');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast.error('Failed to copy join code');
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-vscode-bg">
        <div className="text-center">
          <div className="spinner w-12 h-12 border-4 mb-4"></div>
          <p className="text-vscode-text">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vscode-bg">
      {/* Header */}
      <header className="bg-vscode-sidebar border-b border-vscode-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-vscode-accent p-2 rounded-lg">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Collaborative Editor
                </h1>
                <p className="text-sm text-vscode-textMuted">
                  Welcome, {user?.username}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/profile')}
                className="btn-secondary flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="btn-secondary flex items-center gap-2 hover:bg-red-600"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Actions */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Your Projects</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setShowJoinModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Key className="w-5 h-5" />
              Join by Code
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Project
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="w-16 h-16 text-vscode-textMuted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-vscode-text mb-2">
              No projects yet
            </h3>
            <p className="text-vscode-textMuted mb-6">
              Create your first project to start collaborating
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project?._id || Math.random()}
                className="card group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-vscode-accent p-2 rounded-lg">
                      <FolderOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-vscode-accent transition-colors">
                        {project?.name || 'Untitled Project'}
                      </h3>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Edit project
                      }}
                      className="p-1.5 hover:bg-vscode-panel rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit className="w-4 h-4 text-vscode-textMuted" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project._id);
                      }}
                      className="p-1.5 hover:bg-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-vscode-textMuted mb-4 line-clamp-2">
                  {project?.description || 'No description'}
                </p>

                <div className="flex items-center justify-between text-xs text-vscode-textMuted mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{project?.members?.length || 0} members</span>
                  </div>
                  <div>
                    {project?.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>

                {/* Join Code */}
                {project?.joinCode && (
                  <div className="mb-4 p-2 bg-vscode-panel rounded border border-vscode-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="w-3 h-3 text-vscode-accent" />
                        <span className="text-xs text-vscode-textMuted">Join Code:</span>
                        <code className="text-xs font-mono font-semibold text-vscode-accent">
                          {project.joinCode}
                        </code>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyJoinCode(project.joinCode);
                        }}
                        className="p-1 hover:bg-vscode-bg rounded transition-colors"
                        title="Copy join code"
                      >
                        {copiedCode === project.joinCode ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-vscode-textMuted" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Open Room Button */}
                <button
                  onClick={() => navigate(`/project/${project._id}`)}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  Open Room
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">
              Create New Project
            </h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label htmlFor="projectName" className="block text-sm font-medium text-vscode-text mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  id="projectName"
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject({ ...newProject, name: e.target.value })
                  }
                  required
                  className="input-field"
                  placeholder="My Awesome Project"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="projectDesc" className="block text-sm font-medium text-vscode-text mb-2">
                  Description
                </label>
                <textarea
                  id="projectDesc"
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({ ...newProject, description: e.target.value })
                  }
                  className="input-field"
                  rows="3"
                  placeholder="Brief description of your project"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join by Code Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Key className="w-6 h-6 text-vscode-accent" />
              Join by Code
            </h3>
            <form onSubmit={handleJoinByCode} className="space-y-4">
              <div>
                <label htmlFor="joinCode" className="block text-sm font-medium text-vscode-text mb-2">
                  Project Code *
                </label>
                <input
                  type="text"
                  id="joinCode"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  required
                  className="input-field font-mono tracking-wider"
                  placeholder="Enter project code (e.g., ABC123XYZ)"
                  autoFocus
                />
                <p className="mt-2 text-xs text-vscode-textMuted">
                  Enter the unique project code shared with you
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                  Join Project
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
