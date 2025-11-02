import { useEffect, useCallback, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import useDeltaStore from '../stores/useDeltaStore';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * useDeltaSync Hook
 * Manages real-time delta synchronization for a file
 */
export function useDeltaSync(projectId, fileId, initialContent = '') {
  // Create socket connection for delta sync
  const socketRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastChecksum, setLastChecksum] = useState(null);
  
  // Zustand store
  const {
    addSnapshot,
    setCurrentVersion,
    setSyncStatus,
    addPendingDelta,
    clearPendingDeltas,
    getLatestSnapshot,
    isSynced
  } = useDeltaStore();

  // Refs for current content
  const currentContentRef = useRef(initialContent);
  const oldContentRef = useRef(initialContent);
  const cursorPositionRef = useRef(null);
  const initializationAttemptedRef = useRef(false);

  // Update content ref when initialContent changes
  useEffect(() => {
    if (initialContent !== undefined && initialContent !== null) {
      currentContentRef.current = initialContent;
      oldContentRef.current = initialContent;
    }
  }, [initialContent]);

  // Timer refs for batching
  const updateTimerRef = useRef(null);
  const saveTimerRef = useRef(null);

  /**
   * Setup socket connection
   */
  useEffect(() => {
    if (!projectId || !fileId) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    // Create socket connection
    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[useDeltaSync] Socket connected for delta sync');
      // Try to initialize when socket connects
      if (!initializationAttemptedRef.current && fileId) {
        initializationAttemptedRef.current = true;
        initialize();
      }
    });

    socket.on('disconnect', () => {
      console.log('[useDeltaSync] Socket disconnected');
      setIsInitialized(false);
      initializationAttemptedRef.current = false;
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [projectId, fileId]);

  /**
   * Initialize delta sync for the file
   */
  const initialize = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket || !socket.connected || !projectId || !fileId || isInitialized) return;

    try {
      console.log('[useDeltaSync] Initializing delta sync for file:', fileId);

      // Join project/file room
      const roomKey = `project:${projectId}:file:${fileId}`;
      socket.emit('join-project', { projectId });

      // Initialize delta tracking
      socket.emit('delta:init', {
        projectId,
        fileId,
        initialContent: currentContentRef.current
      }, (response) => {
        if (response.success) {
          console.log('[useDeltaSync] Delta sync initialized:', response.snapshot);
          
          addSnapshot(fileId, response.snapshot);
          setCurrentVersion(fileId, response.snapshot.versionNumber);
          setLastChecksum(response.snapshot.checksum);
          setSyncStatus(fileId, { synced: true, initialized: true });
          setIsInitialized(true);
        } else {
          console.error('[useDeltaSync] Failed to initialize:', response.message);
          setSyncStatus(fileId, { synced: false, error: response.message });
        }
      });
    } catch (error) {
      console.error('[useDeltaSync] Initialize error:', error);
      setSyncStatus(fileId, { synced: false, error: error.message });
    }
  }, [projectId, fileId, isInitialized, addSnapshot, setCurrentVersion, setSyncStatus]);

  /**
   * Send delta update to server
   */
  const sendDelta = useCallback((newContent, cursorPosition = null) => {
    const socket = socketRef.current;
    if (!socket || !isInitialized) return;

    // Update refs
    const oldContent = currentContentRef.current;
    currentContentRef.current = newContent;
    if (cursorPosition) {
      cursorPositionRef.current = cursorPosition;
    }

    // Clear existing timer
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }

    // Batch rapid updates (debounce)
    updateTimerRef.current = setTimeout(() => {
      setIsSyncing(true);

      socket.emit('delta:update', {
        projectId,
        fileId,
        newContent,
        oldContent,
        cursorPosition: cursorPositionRef.current,
        checksum: null // Will be computed on server
      }, (response) => {
        setIsSyncing(false);
        
        if (response?.success) {
          setSyncStatus(fileId, { synced: true, lastSync: Date.now() });
          oldContentRef.current = newContent;
        } else {
          console.error('[useDeltaSync] Update failed:', response?.message);
          setSyncStatus(fileId, { synced: false, error: response?.message });
        }
      });
    }, 200); // 200ms debounce
  }, [isInitialized, projectId, fileId, setSyncStatus]);

  /**
   * Save file and create snapshot
   */
  const saveSnapshot = useCallback((message = null) => {
    const socket = socketRef.current;
    if (!socket || !isInitialized) return Promise.resolve(null);

    return new Promise((resolve, reject) => {
      const content = currentContentRef.current;
      const oldContent = oldContentRef.current;

      socket.emit('delta:save', {
        projectId,
        fileId,
        content,
        oldContent,
        message
      }, (response) => {
        if (response.success) {
          console.log('[useDeltaSync] Snapshot saved:', response.snapshot);
          
          addSnapshot(fileId, response.snapshot);
          setCurrentVersion(fileId, response.snapshot.versionNumber);
          setLastChecksum(response.snapshot.checksum);
          setSyncStatus(fileId, { synced: true, lastSave: Date.now() });
          oldContentRef.current = content;
          
          resolve(response.snapshot);
        } else {
          console.error('[useDeltaSync] Save failed:', response.message);
          setSyncStatus(fileId, { synced: false, error: response.message });
          reject(new Error(response.message));
        }
      });
    });
  }, [isInitialized, projectId, fileId, addSnapshot, setCurrentVersion, setSyncStatus]);

  /**
   * Create manual snapshot
   */
  const createManualSnapshot = useCallback((message, tags = []) => {
    const socket = socketRef.current;
    if (!socket || !isInitialized) return Promise.resolve(null);

    return new Promise((resolve, reject) => {
      socket.emit('delta:snapshot', {
        projectId,
        fileId,
        content: currentContentRef.current,
        oldContent: oldContentRef.current,
        message,
        tags
      }, (response) => {
        if (response.success) {
          addSnapshot(fileId, response.snapshot);
          setCurrentVersion(fileId, response.snapshot.versionNumber);
          resolve(response.snapshot);
        } else {
          reject(new Error(response.message));
        }
      });
    });
  }, [isInitialized, projectId, fileId, addSnapshot, setCurrentVersion]);

  /**
   * Rollback to a specific snapshot
   */
  const rollbackToSnapshot = useCallback((snapshotId) => {
    const socket = socketRef.current;
    if (!socket || !isInitialized) return Promise.resolve(null);

    return new Promise((resolve, reject) => {
      socket.emit('delta:rollback', {
        projectId,
        fileId,
        snapshotId
      }, (response) => {
        if (response.success) {
          console.log('[useDeltaSync] Rolled back to snapshot:', snapshotId);
          
          currentContentRef.current = response.content;
          oldContentRef.current = response.content;
          
          addSnapshot(fileId, response.snapshot);
          setCurrentVersion(fileId, response.snapshot.versionNumber);
          setSyncStatus(fileId, { synced: true });
          
          resolve({
            content: response.content,
            snapshot: response.snapshot
          });
        } else {
          reject(new Error(response.message));
        }
      });
    });
  }, [isInitialized, projectId, fileId, addSnapshot, setCurrentVersion, setSyncStatus]);

  /**
   * Get version history
   */
  const getVersionHistory = useCallback((limit = 50, skip = 0) => {
    const socket = socketRef.current;
    if (!socket || !isInitialized) return Promise.resolve([]);

    return new Promise((resolve, reject) => {
      socket.emit('delta:get-history', {
        fileId,
        limit,
        skip
      }, (response) => {
        if (response.success) {
          resolve(response.snapshots);
        } else {
          reject(new Error(response.message));
        }
      });
    });
  }, [isInitialized, fileId]);

  /**
   * Handle focus loss
   */
  const handleFocusLoss = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !isInitialized) return;

    socket.emit('delta:focus-loss', {
      projectId,
      fileId,
      content: currentContentRef.current,
      oldContent: oldContentRef.current
    });
  }, [isInitialized, projectId, fileId]);

  /**
   * Handle undo/redo
   */
  const handleUndoRedo = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !isInitialized) return;

    socket.emit('delta:undo-redo', {
      projectId,
      fileId,
      content: currentContentRef.current,
      oldContent: oldContentRef.current
    });
  }, [isInitialized, projectId, fileId]);

  /**
   * Auto-save interval
   */
  useEffect(() => {
    if (!isInitialized) return;

    const autoSaveInterval = setInterval(() => {
      if (currentContentRef.current !== oldContentRef.current) {
        saveSnapshot('Auto-save');
      }
    }, 60000); // Every 60 seconds

    return () => clearInterval(autoSaveInterval);
  }, [isInitialized, saveSnapshot]);

  /**
   * Listen to socket events
   */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !isInitialized) return;

    // Delta sync from other clients
    const handleDeltaSync = (data) => {
      if (data.fileId === fileId && data.userId !== socket.id) {
        console.log('[useDeltaSync] Received delta sync from:', data.username);
        
        // Update content
        currentContentRef.current = data.delta.newContent;
        setLastChecksum(data.delta.checksum);
        setSyncStatus(fileId, { synced: true, lastRemoteSync: Date.now() });
      }
    };

    // Snapshot acknowledgment
    const handleDeltaAck = (data) => {
      if (data.userId !== socket.id) {
        console.log('[useDeltaSync] Snapshot created by:', data.username);
        setSyncStatus(fileId, { synced: true });
      }
    };

    // Rollback complete
    const handleRollbackComplete = (data) => {
      if (data.fileId === fileId && data.userId !== socket.id) {
        console.log('[useDeltaSync] File rolled back by:', data.username);
        
        currentContentRef.current = data.content;
        oldContentRef.current = data.content;
        setLastChecksum(data.snapshot.checksum);
      }
    };

    socket.on('delta:sync', handleDeltaSync);
    socket.on('delta:ack', handleDeltaAck);
    socket.on('delta:rollback-complete', handleRollbackComplete);

    return () => {
      socket.off('delta:sync', handleDeltaSync);
      socket.off('delta:ack', handleDeltaAck);
      socket.off('delta:rollback-complete', handleRollbackComplete);
    };
  }, [isInitialized, fileId, setSyncStatus]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    // Only initialize once per file
    if (!initializationAttemptedRef.current && socketRef.current?.connected) {
      initializationAttemptedRef.current = true;
      initialize();
    }
  }, [initialize]);

  // Reset initialization flag when file changes
  useEffect(() => {
    initializationAttemptedRef.current = false;
    setIsInitialized(false);
  }, [fileId]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return {
    isInitialized,
    isSyncing,
    lastChecksum,
    sendDelta,
    saveSnapshot,
    createManualSnapshot,
    rollbackToSnapshot,
    getVersionHistory,
    handleFocusLoss,
    handleUndoRedo,
    currentContent: currentContentRef.current,
    isSynced: isSynced(fileId)
  };
}

export default useDeltaSync;
