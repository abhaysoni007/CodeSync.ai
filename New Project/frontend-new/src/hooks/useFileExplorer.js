import { useState, useEffect, useCallback } from 'react';
import * as fileAPI from '../services/fileAPI';
import toast from 'react-hot-toast';

/**
 * Custom hook for managing file explorer state and operations
 * @param {string} projectId - The current project ID
 * @param {Object} socket - Socket.io instance for real-time updates
 * @returns {Object} - File explorer state and methods
 */
export const useFileExplorer = (projectId, socket) => {
  const [fileStructure, setFileStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set(['root']));
  const [selectedNode, setSelectedNode] = useState(null);
  const [renamingNode, setRenamingNode] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  /**
   * Load file structure from server
   */
  const loadFileStructure = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fileAPI.getFileStructure(projectId);
      
      if (response.success) {
        setFileStructure(response.data);
      } else {
        throw new Error(response.message || 'Failed to load file structure');
      }
    } catch (err) {
      console.error('Load file structure error:', err);
      setError(err.message);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  /**
   * Create a new file or folder
   */
  const createNode = useCallback(async (name, type, parentPath = []) => {
    if (!projectId || !name) return;

    try {
      const response = await fileAPI.createFileOrFolder(projectId, {
        name,
        type,
        parentPath,
        content: type === 'file' ? '' : undefined
      });

      if (response.success) {
        // Update local structure
        await loadFileStructure();
        
        // Emit socket event for real-time sync
        if (socket?.connected) {
          socket.emit('filesystem:created', {
            projectId,
            node: response.data,
            parentPath
          });
        }

        toast.success(`${type === 'file' ? 'File' : 'Folder'} created successfully`);
        return response.data;
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      console.error('Create node error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to create');
      throw err;
    }
  }, [projectId, socket, loadFileStructure]);

  /**
   * Rename a file or folder
   */
  const renameNode = useCallback(async (path, newName) => {
    if (!projectId || !path || !newName) return;

    try {
      const response = await fileAPI.renameFileOrFolder(projectId, {
        path,
        newName
      });

      if (response.success) {
        // Update local structure
        await loadFileStructure();
        
        // Emit socket event
        if (socket?.connected) {
          socket.emit('filesystem:renamed', {
            projectId,
            path,
            oldName: response.data.oldName,
            newName
          });
        }

        toast.success('Renamed successfully');
        setRenamingNode(null);
        return response.data;
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      console.error('Rename node error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to rename');
      throw err;
    }
  }, [projectId, socket, loadFileStructure]);

  /**
   * Delete a file or folder
   */
  const deleteNode = useCallback(async (path) => {
    if (!projectId || !path) return;

    try {
      const response = await fileAPI.deleteFileOrFolder(projectId, { path });

      if (response.success) {
        // Update local structure
        await loadFileStructure();
        
        // Emit socket event
        if (socket?.connected) {
          socket.emit('filesystem:deleted', {
            projectId,
            path,
            deletedNode: response.data
          });
        }

        toast.success('Deleted successfully');
        return response.data;
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      console.error('Delete node error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete');
      throw err;
    }
  }, [projectId, socket, loadFileStructure]);

  /**
   * Toggle folder expansion
   */
  const toggleFolder = useCallback((nodeId) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  /**
   * Expand folder
   */
  const expandFolder = useCallback((nodeId) => {
    setExpandedFolders(prev => new Set([...prev, nodeId]));
  }, []);

  /**
   * Collapse folder
   */
  const collapseFolder = useCallback((nodeId) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  /**
   * Select a node
   */
  const selectNode = useCallback((node, path) => {
    setSelectedNode({ node, path });
  }, []);

  /**
   * Start renaming a node
   */
  const startRenaming = useCallback((node, path) => {
    setRenamingNode({ node, path });
  }, []);

  /**
   * Cancel renaming
   */
  const cancelRenaming = useCallback(() => {
    setRenamingNode(null);
  }, []);

  /**
   * Show context menu
   */
  const showContextMenu = useCallback((event, node, path) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      node,
      path
    });
  }, []);

  /**
   * Hide context menu
   */
  const hideContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  /**
   * Find node by path
   */
  const findNodeByPath = useCallback((structure, path) => {
    if (!structure || !path || path.length === 0) return structure;

    let current = structure;
    for (let i = 0; i < path.length; i++) {
      if (!current.children) return null;
      current = current.children.find(child => child.id === path[i]);
      if (!current) return null;
    }
    return current;
  }, []);

  /**
   * Update node in structure
   */
  const updateNodeInStructure = useCallback((structure, path, updates) => {
    const node = findNodeByPath(structure, path);
    if (node) {
      Object.assign(node, updates);
    }
    return { ...structure };
  }, [findNodeByPath]);

  /**
   * Real-time socket event handlers
   */
  useEffect(() => {
    if (!socket || !projectId) return;

    // File/Folder created
    const handleCreated = ({ node, parentPath }) => {
      setFileStructure(prev => {
        if (!prev) return prev;
        
        const parent = parentPath.length === 0 ? prev : findNodeByPath(prev, parentPath);
        if (parent && parent.type === 'folder') {
          if (!parent.children) parent.children = [];
          
          // Check if already exists
          const exists = parent.children.some(child => child.id === node.id);
          if (!exists) {
            parent.children.push(node);
          }
        }
        
        return { ...prev };
      });
    };

    // File/Folder renamed
    const handleRenamed = ({ path, newName }) => {
      setFileStructure(prev => {
        if (!prev) return prev;
        return updateNodeInStructure(prev, path, { name: newName });
      });
    };

    // File/Folder deleted
    const handleDeleted = ({ path }) => {
      setFileStructure(prev => {
        if (!prev || path.length === 0) return prev;
        
        const parentPath = path.slice(0, -1);
        const nodeId = path[path.length - 1];
        const parent = parentPath.length === 0 ? prev : findNodeByPath(prev, parentPath);
        
        if (parent && parent.children) {
          parent.children = parent.children.filter(child => child.id !== nodeId);
        }
        
        return { ...prev };
      });
    };

    // File content updated
    const handleFileUpdated = ({ path, content }) => {
      setFileStructure(prev => {
        if (!prev) return prev;
        return updateNodeInStructure(prev, path, { content });
      });
    };

    // Listen to events
    socket.on('filesystem:created', handleCreated);
    socket.on('filesystem:renamed', handleRenamed);
    socket.on('filesystem:deleted', handleDeleted);
    socket.on('filesystem:file-updated', handleFileUpdated);

    // Cleanup
    return () => {
      socket.off('filesystem:created', handleCreated);
      socket.off('filesystem:renamed', handleRenamed);
      socket.off('filesystem:deleted', handleDeleted);
      socket.off('filesystem:file-updated', handleFileUpdated);
    };
  }, [socket, projectId, findNodeByPath, updateNodeInStructure]);

  /**
   * Load initial structure on mount
   */
  useEffect(() => {
    loadFileStructure();
  }, [loadFileStructure]);

  return {
    // State
    fileStructure,
    loading,
    error,
    expandedFolders,
    selectedNode,
    renamingNode,
    contextMenu,

    // Methods
    loadFileStructure,
    createNode,
    renameNode,
    deleteNode,
    toggleFolder,
    expandFolder,
    collapseFolder,
    selectNode,
    startRenaming,
    cancelRenaming,
    showContextMenu,
    hideContextMenu,
    findNodeByPath
  };
};

export default useFileExplorer;
