import { useState, useEffect, useCallback, useRef } from 'react';
import * as fileAPI from '../services/fileAPI';
import toast from 'react-hot-toast';

/**
 * File explorer state.
 *
 * The server reads the project's real directory, so the tree here is a view of disk, not a copy we
 * have to keep patched. Every mutation - ours, a collaborator's, or one the shell made by running
 * `npm install` - is answered the same way: refetch. That is why the old per-event patching
 * (handleCreated/handleRenamed/handleDeleted rewriting nodes in place) is gone: it could only ever
 * describe changes that came through the UI, and silently drifted from disk for everything else.
 *
 * A node's `path` is its real path from the project root, e.g. ['src', 'index.js'], and its `id`
 * is that path joined - unique, and stable across reloads.
 */
export const useFileExplorer = (projectId, socket) => {
  const [fileStructure, setFileStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set(['root']));
  const [selectedNode, setSelectedNode] = useState(null);
  const [renamingNode, setRenamingNode] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const loadFileStructure = useCallback(async () => {
    if (!projectId) return;

    try {
      setError(null);
      const response = await fileAPI.getFileStructure(projectId);
      if (!response.success) throw new Error(response.message || 'Failed to load file structure');
      setFileStructure(response.data);
    } catch (err) {
      console.error('Load file structure error:', err);
      setError(err.message);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Refetching is cheap but a busy install emits a lot of change events; collapse them.
  const reloadTimer = useRef(null);
  const scheduleReload = useCallback(() => {
    clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(loadFileStructure, 250);
  }, [loadFileStructure]);

  const createNode = useCallback(async (name, type, parentPath = []) => {
    if (!projectId || !name) return;

    try {
      const response = await fileAPI.createFileOrFolder(projectId, {
        name,
        type,
        parentPath,
        content: type === 'file' ? '' : undefined,
      });
      if (!response.success) throw new Error(response.message);

      await loadFileStructure();
      // Peers already refetch from the server's `filesystem:changed`; this emit is what feeds the
      // activity timeline, which needs to know *who* did it.
      socket?.emit('filesystem:created', { projectId, node: response.data, parentPath });
      toast.success(`${type === 'file' ? 'File' : 'Folder'} created`);
      return response.data;
    } catch (err) {
      console.error('Create node error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to create');
      throw err;
    }
  }, [projectId, socket, loadFileStructure]);

  const renameNode = useCallback(async (path, newName) => {
    if (!projectId || !path?.length || !newName) return;

    try {
      const response = await fileAPI.renameFileOrFolder(projectId, { path, newName });
      if (!response.success) throw new Error(response.message);

      await loadFileStructure();
      socket?.emit('filesystem:renamed', { projectId, path, oldName: response.data.oldName, newName });
      toast.success('Renamed');
      setRenamingNode(null);
      return response.data;
    } catch (err) {
      console.error('Rename node error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to rename');
      throw err;
    }
  }, [projectId, socket, loadFileStructure]);

  const deleteNode = useCallback(async (path) => {
    if (!projectId || !path?.length) return;

    try {
      const response = await fileAPI.deleteFileOrFolder(projectId, { path });
      if (!response.success) throw new Error(response.message);

      await loadFileStructure();
      socket?.emit('filesystem:deleted', { projectId, path, deletedNode: response.data });
      toast.success('Deleted');
      return response.data;
    } catch (err) {
      console.error('Delete node error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete');
      throw err;
    }
  }, [projectId, socket, loadFileStructure]);

  const uploadFiles = useCallback(async (files, parentPath = []) => {
    if (!projectId || !files?.length) return;

    try {
      const response = await fileAPI.uploadFiles(projectId, files, parentPath);
      if (!response.success) throw new Error(response.message);

      await loadFileStructure();
      toast.success(response.message);
      return response.data;
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err.response?.data?.message || err.message || 'Upload failed');
      throw err;
    }
  }, [projectId, loadFileStructure]);

  /** Move a node into another folder. `targetPath` [] means the project root. */
  const moveNode = useCallback(async (path, targetPath) => {
    if (!projectId || !path?.length) return;

    try {
      const response = await fileAPI.moveNode(projectId, { path, targetPath });
      if (!response.success) throw new Error(response.message);

      await loadFileStructure();
      socket?.emit('filesystem:renamed', {
        projectId,
        path,
        oldName: path[path.length - 1],
        newName: path[path.length - 1],
      });
      toast.success('Moved');
      return response.data;
    } catch (err) {
      console.error('Move error:', err);
      toast.error(err.response?.data?.message || err.message || 'Move failed');
      throw err;
    }
  }, [projectId, socket, loadFileStructure]);

  const toggleFolder = useCallback((nodeId) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const expandFolder = useCallback((nodeId) => {
    setExpandedFolders((prev) => new Set([...prev, nodeId]));
  }, []);

  const collapseFolder = useCallback((nodeId) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  const selectNode = useCallback((node, path) => setSelectedNode({ node, path }), []);
  const startRenaming = useCallback((node, path) => setRenamingNode({ node, path }), []);
  const cancelRenaming = useCallback(() => setRenamingNode(null), []);

  const showContextMenu = useCallback((event, node, path) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, node, path });
  }, []);

  const hideContextMenu = useCallback(() => setContextMenu(null), []);

  /** Walk the tree by real names, e.g. ['src', 'index.js']. */
  const findNodeByPath = useCallback((structure, path) => {
    if (!structure || !path?.length) return structure;
    let current = structure;
    for (const name of path) {
      if (!current.children) return null;
      current = current.children.find((child) => child.name === name);
      if (!current) return null;
    }
    return current;
  }, []);

  // One signal, one response: something on disk moved, refetch the tree. The server emits this
  // for its own HTTP mutations and for anything a terminal writes.
  useEffect(() => {
    if (!socket || !projectId) return;

    socket.on('filesystem:changed', scheduleReload);
    return () => {
      socket.off('filesystem:changed', scheduleReload);
      clearTimeout(reloadTimer.current);
    };
  }, [socket, projectId, scheduleReload]);

  useEffect(() => {
    loadFileStructure();
  }, [loadFileStructure]);

  return {
    fileStructure,
    loading,
    error,
    expandedFolders,
    selectedNode,
    renamingNode,
    contextMenu,

    loadFileStructure,
    createNode,
    renameNode,
    deleteNode,
    moveNode,
    uploadFiles,
    toggleFolder,
    expandFolder,
    collapseFolder,
    selectNode,
    startRenaming,
    cancelRenaming,
    showContextMenu,
    hideContextMenu,
    findNodeByPath,
  };
};

export default useFileExplorer;
