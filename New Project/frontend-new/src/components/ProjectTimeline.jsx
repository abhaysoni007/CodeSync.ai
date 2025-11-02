import { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  Clock,
  Users,
  FileText,
  Edit,
  Trash2,
  MessageSquare,
  UserPlus,
  UserMinus,
  Sparkles,
  File,
  FilePlus,
  FileEdit,
  FileX
} from 'lucide-react';

const ActivityIcon = ({ type }) => {
  const iconClass = "w-4 h-4";
  
  switch (type) {
    case 'user_joined':
      return <UserPlus className={iconClass} />;
    case 'user_left':
      return <UserMinus className={iconClass} />;
    case 'file_created':
      return <FilePlus className={iconClass} />;
    case 'file_edited':
      return <FileEdit className={iconClass} />;
    case 'file_deleted':
      return <FileX className={iconClass} />;
    case 'file_renamed':
      return <Edit className={iconClass} />;
    case 'chat_message':
      return <MessageSquare className={iconClass} />;
    case 'ai_interaction':
      return <Sparkles className={iconClass} />;
    case 'member_added':
      return <UserPlus className={iconClass} />;
    case 'member_removed':
      return <UserMinus className={iconClass} />;
    default:
      return <Clock className={iconClass} />;
  }
};

const getActivityColor = (type) => {
  const colors = {
    'user_joined': 'bg-green-500',
    'user_left': 'bg-gray-500',
    'file_created': 'bg-blue-500',
    'file_edited': 'bg-yellow-500',
    'file_deleted': 'bg-red-500',
    'file_renamed': 'bg-purple-500',
    'chat_message': 'bg-indigo-500',
    'ai_interaction': 'bg-pink-500',
    'member_added': 'bg-green-500',
    'member_removed': 'bg-orange-500',
    'project_created': 'bg-blue-600',
    'project_updated': 'bg-teal-500'
  };
  return colors[type] || 'bg-gray-400';
};

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function ProjectTimeline({ projectId, socket }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch initial activities
  useEffect(() => {
    fetchActivities();
  }, [projectId, filter, page]);

  // Listen for real-time activity updates
  useEffect(() => {
    if (!socket || !projectId) return;

    const handleNewActivity = ({ activity }) => {
      console.log('[Timeline] New activity received:', activity);
      
      // Check if activity matches current filter
      if (filter === 'all' || activity.type === filter) {
        setActivities(prev => {
          // Avoid duplicates
          const exists = prev.some(a => a._id === activity._id);
          if (exists) return prev;
          
          // Add new activity at the top
          return [activity, ...prev];
        });
      }
    };

    socket.on('activity:new', handleNewActivity);

    return () => {
      socket.off('activity:new', handleNewActivity);
    };
  }, [socket, projectId, filter]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });
      
      if (filter !== 'all') {
        params.append('type', filter);
      }

      const response = await api.get(`/projects/${projectId}/activity?${params}`);
      
      if (response.data.success) {
        const newActivities = response.data.data.activities;
        setActivities(prev => page === 1 ? newActivities : [...prev, ...newActivities]);
        setHasMore(response.data.data.pagination.page < response.data.data.pagination.pages);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activity timeline');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All Activity' },
    { value: 'user_joined', label: 'User Joins' },
    { value: 'file_edited', label: 'File Edits' },
    { value: 'chat_message', label: 'Chat Messages' },
    { value: 'ai_interaction', label: 'AI Interactions' }
  ];

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
          </div>
          
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
              setActivities([]);
            }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {filterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-6 py-4">
        {loading && activities.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No activity yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={activity._id} className="flex gap-4">
                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full ${getActivityColor(activity.type)} flex items-center justify-center text-white`}>
                    <ActivityIcon type={activity.type} />
                  </div>
                  {index < activities.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-200 mt-2" />
                  )}
                </div>

                {/* Activity content */}
                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {activity.userId?.avatar ? (
                          <img
                            src={activity.userId.avatar}
                            alt={activity.userId.username}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                            {activity.userId?.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-gray-900">
                          {activity.userId?.username || 'Unknown User'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-700 mt-1">
                        {activity.action}
                      </p>
                      
                      {/* Metadata */}
                      {activity.metadata && (
                        <div className="mt-2 text-xs text-gray-500 space-y-1">
                          {activity.metadata.fileName && (
                            <div className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              <span>{activity.metadata.fileName}</span>
                            </div>
                          )}
                          {activity.metadata.message && (
                            <div className="bg-gray-50 rounded p-2 italic">
                              "{activity.metadata.message.substring(0, 100)}{activity.metadata.message.length > 100 ? '...' : ''}"
                            </div>
                          )}
                          {activity.metadata.changesCount && (
                            <span>{activity.metadata.changesCount} changes</span>
                          )}
                        </div>
                      )}
                    </div>

                    <span className="text-xs text-gray-500 ml-4 whitespace-nowrap">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="text-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
