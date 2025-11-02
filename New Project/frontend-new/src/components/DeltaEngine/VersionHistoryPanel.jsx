import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  GitBranch, 
  User, 
  Calendar,
  RotateCcw,
  FileText,
  ChevronRight,
  X,
  Save,
  Tag
} from 'lucide-react';
import useDeltaSync from '../../hooks/useDeltaSync';
import { formatTimestamp } from '../../utils/timeUtils';

/**
 * VersionHistoryPanel - Displays version history with rollback capability
 */
export default function VersionHistoryPanel({ 
  projectId, 
  fileId, 
  fileName,
  onRollback,
  onClose,
  isOpen 
}) {
  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const { getVersionHistory, rollbackToSnapshot } = useDeltaSync(projectId, fileId);

  // Load version history
  useEffect(() => {
    if (isOpen && fileId) {
      loadHistory();
    }
  }, [isOpen, fileId]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const history = await getVersionHistory(50, 0);
      setSnapshots(history);
    } catch (error) {
      console.error('Failed to load version history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollback = async (snapshotId) => {
    try {
      setIsLoading(true);
      const result = await rollbackToSnapshot(snapshotId);
      
      if (onRollback) {
        onRollback(result.content, result.snapshot);
      }
      
      await loadHistory();
    } catch (error) {
      console.error('Rollback failed:', error);
      alert('Failed to rollback: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getTriggerIcon = (trigger) => {
    switch (trigger?.type) {
      case 'manual':
        return <Save className="w-4 h-4 text-blue-500" />;
      case 'auto_save':
        return <Clock className="w-4 h-4 text-green-500" />;
      case 'cursor_jump':
        return <GitBranch className="w-4 h-4 text-purple-500" />;
      case 'undo_redo':
        return <RotateCcw className="w-4 h-4 text-orange-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTriggerLabel = (trigger) => {
    const labels = {
      manual: 'Manual Save',
      auto_save: 'Auto Save',
      idle: 'Idle Save',
      focus_loss: 'Focus Loss',
      cursor_jump: 'Cursor Jump',
      undo_redo: 'Undo/Redo',
      time_interval: 'Periodic Save'
    };
    return labels[trigger?.type] || 'Auto Save';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-700 shadow-2xl z-50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Version History</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* File info */}
          <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <FileText className="w-4 h-4" />
              <span className="font-medium truncate">{fileName}</span>
            </div>
          </div>

          {/* Snapshots list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && snapshots.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              </div>
            ) : snapshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
                <Clock className="w-12 h-12 mb-2 opacity-50" />
                <p>No version history yet</p>
                <p className="text-sm mt-1">Versions will appear as you edit</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {snapshots.map((snapshot, index) => (
                  <motion.div
                    key={snapshot.snapshotId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`group relative p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedSnapshot?.snapshotId === snapshot.snapshotId
                        ? 'bg-blue-500/10 border-blue-500'
                        : 'bg-gray-800/30 border-gray-700 hover:bg-gray-800/60 hover:border-gray-600'
                    }`}
                    onClick={() => setSelectedSnapshot(snapshot)}
                  >
                    {/* Version indicator */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getTriggerIcon(snapshot.trigger)}
                        <span className="text-xs font-mono text-gray-400">
                          v{snapshot.versionNumber}
                        </span>
                        {snapshot.isCheckpoint && (
                          <Tag className="w-3 h-3 text-yellow-500" />
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(snapshot.createdAt)}
                      </span>
                    </div>

                    {/* Message */}
                    <p className="text-sm text-white mb-2 line-clamp-2">
                      {snapshot.message || 'Auto-saved'}
                    </p>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      {snapshot.user && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{snapshot.user.username}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="text-green-400">
                          +{snapshot.metadata?.linesAdded || 0}
                        </span>
                        <span className="text-red-400">
                          -{snapshot.metadata?.linesRemoved || 0}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <AnimatePresence>
                      {selectedSnapshot?.snapshotId === snapshot.snapshotId && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t border-gray-700 flex gap-2"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRollback(snapshot.snapshotId);
                            }}
                            disabled={isLoading}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Restore
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDiff(true);
                            }}
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                          >
                            View Diff
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700 bg-gray-800/30">
            <div className="text-xs text-gray-400 text-center">
              {snapshots.length} version{snapshots.length !== 1 ? 's' : ''} available
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
