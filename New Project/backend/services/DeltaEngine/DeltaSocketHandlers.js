import deltaManager from './DeltaManager.js';
import DeltaScheduler from './DeltaScheduler.js';
import { createChecksum } from './utils/checksum.js';

// Create scheduler instance
const deltaScheduler = new DeltaScheduler(deltaManager);

/**
 * Setup Delta Sync Socket Handlers
 * Real-time delta synchronization across clients
 */
export function setupDeltaSockets(io, socket) {
  console.log(`[DeltaSync] Setting up delta handlers for user ${socket.username}`);

  /**
   * Initialize delta sync for a file
   */
  socket.on('delta:init', async ({ projectId, fileId, initialContent }, callback) => {
    try {
      console.log(`[DeltaSync] Initializing delta sync for file ${fileId}`);

      // Initialize in delta manager
      const snapshot = await deltaManager.initializeFile(
        fileId,
        projectId,
        initialContent || ''
      );

      // Register with scheduler
      deltaScheduler.registerFile(fileId, projectId, socket.userId);

      // Store current file tracking
      socket.currentDeltaFiles = socket.currentDeltaFiles || new Set();
      socket.currentDeltaFiles.add(fileId);

      if (callback) {
        callback({
          success: true,
          snapshot: {
            snapshotId: snapshot.snapshotId,
            versionNumber: snapshot.versionNumber,
            checksum: snapshot.checksum
          }
        });
      }
    } catch (error) {
      console.error('[DeltaSync] Init error:', error);
      if (callback) {
        callback({ success: false, message: error.message });
      }
    }
  });

  /**
   * Client sends delta update
   */
  socket.on('delta:update', async (data, callback) => {
    try {
      const {
        projectId,
        fileId,
        newContent,
        oldContent,
        cursorPosition,
        checksum
      } = data;

      // Verify checksum
      const computedChecksum = createChecksum(newContent);
      if (checksum && checksum !== computedChecksum) {
        console.warn('[DeltaSync] Checksum mismatch detected');
      }

      // Notify scheduler about the edit
      deltaScheduler.onEdit({
        fileId,
        projectId,
        userId: socket.userId,
        newContent,
        oldContent,
        cursorPosition
      });

      // Broadcast delta to other clients in the same project/file
      const roomKey = `project:${projectId}:file:${fileId}`;
      
      socket.to(roomKey).emit('delta:sync', {
        userId: socket.userId,
        username: socket.username,
        fileId,
        delta: {
          newContent,
          checksum: computedChecksum,
          timestamp: Date.now()
        }
      });

      if (callback) {
        callback({ success: true });
      }
    } catch (error) {
      console.error('[DeltaSync] Update error:', error);
      if (callback) {
        callback({ success: false, message: error.message });
      }
    }
  });

  /**
   * Client saves file (trigger snapshot)
   */
  socket.on('delta:save', async (data, callback) => {
    try {
      const { projectId, fileId, content, oldContent, message } = data;

      console.log(`[DeltaSync] Save event for file ${fileId}`);

      // Create snapshot
      const snapshot = await deltaManager.createSnapshot({
        projectId,
        fileId,
        userId: socket.userId,
        newContent: content,
        oldContent: oldContent || '',
        trigger: 'auto_save',
        message: message || 'Saved',
        tags: []
      });

      // Notify scheduler
      deltaScheduler.onSave({
        fileId,
        projectId,
        userId: socket.userId,
        newContent: content,
        oldContent: oldContent || ''
      });

      // Broadcast acknowledgment
      const roomKey = `project:${projectId}:file:${fileId}`;
      
      io.to(roomKey).emit('delta:ack', {
        snapshotId: snapshot.snapshotId,
        versionNumber: snapshot.versionNumber,
        checksum: snapshot.checksum,
        userId: socket.userId,
        username: socket.username
      });

      if (callback) {
        callback({
          success: true,
          snapshot: {
            snapshotId: snapshot.snapshotId,
            versionNumber: snapshot.versionNumber,
            checksum: snapshot.checksum
          }
        });
      }
    } catch (error) {
      console.error('[DeltaSync] Save error:', error);
      if (callback) {
        callback({ success: false, message: error.message });
      }
    }
  });

  /**
   * Manual snapshot creation
   */
  socket.on('delta:snapshot', async (data, callback) => {
    try {
      const { projectId, fileId, content, oldContent, message, tags } = data;

      console.log(`[DeltaSync] Manual snapshot for file ${fileId}`);

      const snapshot = await deltaManager.createSnapshot({
        projectId,
        fileId,
        userId: socket.userId,
        newContent: content,
        oldContent: oldContent || '',
        trigger: 'manual',
        message: message || 'Manual snapshot',
        tags: tags || []
      });

      // Broadcast to room
      const roomKey = `project:${projectId}:file:${fileId}`;
      
      io.to(roomKey).emit('delta:snapshot-created', {
        snapshotId: snapshot.snapshotId,
        versionNumber: snapshot.versionNumber,
        message: snapshot.message,
        userId: socket.userId,
        username: socket.username
      });

      if (callback) {
        callback({
          success: true,
          snapshot: {
            snapshotId: snapshot.snapshotId,
            versionNumber: snapshot.versionNumber,
            checksum: snapshot.checksum,
            metadata: snapshot.metadata
          }
        });
      }
    } catch (error) {
      console.error('[DeltaSync] Manual snapshot error:', error);
      if (callback) {
        callback({ success: false, message: error.message });
      }
    }
  });

  /**
   * Request rollback to a snapshot
   */
  socket.on('delta:rollback', async (data, callback) => {
    try {
      const { projectId, fileId, snapshotId } = data;

      console.log(`[DeltaSync] Rollback request for file ${fileId} to snapshot ${snapshotId}`);

      const result = await deltaManager.rollbackToSnapshot(
        fileId,
        snapshotId,
        socket.userId
      );

      // Broadcast rollback to all clients
      const roomKey = `project:${projectId}:file:${fileId}`;
      
      io.to(roomKey).emit('delta:rollback-complete', {
        fileId,
        content: result.content,
        snapshot: {
          snapshotId: result.snapshot.snapshotId,
          versionNumber: result.snapshot.versionNumber,
          checksum: result.snapshot.checksum
        },
        userId: socket.userId,
        username: socket.username
      });

      if (callback) {
        callback({
          success: true,
          content: result.content,
          snapshot: {
            snapshotId: result.snapshot.snapshotId,
            versionNumber: result.snapshot.versionNumber
          }
        });
      }
    } catch (error) {
      console.error('[DeltaSync] Rollback error:', error);
      if (callback) {
        callback({ success: false, message: error.message });
      }
    }
  });

  /**
   * Get version history
   */
  socket.on('delta:get-history', async (data, callback) => {
    try {
      const { fileId, limit, skip } = data;

      const snapshots = await deltaManager.getVersionHistory(
        fileId,
        limit || 50,
        skip || 0
      );

      if (callback) {
        callback({
          success: true,
          snapshots: snapshots.map(s => ({
            snapshotId: s.snapshotId,
            versionNumber: s.versionNumber,
            checksum: s.checksum,
            message: s.message,
            trigger: s.trigger,
            metadata: s.metadata,
            isCheckpoint: s.isCheckpoint,
            user: s.userId ? {
              id: s.userId._id,
              username: s.userId.username,
              avatar: s.userId.avatar
            } : null,
            createdAt: s.createdAt
          }))
        });
      }
    } catch (error) {
      console.error('[DeltaSync] Get history error:', error);
      if (callback) {
        callback({ success: false, message: error.message });
      }
    }
  });

  /**
   * Request missing deltas for sync recovery
   */
  socket.on('delta:sync-request', async (data, callback) => {
    try {
      const { fileId, lastVersionNumber } = data;

      console.log(`[DeltaSync] Sync request for file ${fileId} from version ${lastVersionNumber}`);

      const content = await deltaManager.getLatestContent(fileId);
      const latestSnapshot = await deltaManager.getVersionHistory(fileId, 1);

      if (callback) {
        callback({
          success: true,
          content,
          snapshot: latestSnapshot[0] ? {
            snapshotId: latestSnapshot[0].snapshotId,
            versionNumber: latestSnapshot[0].versionNumber,
            checksum: latestSnapshot[0].checksum
          } : null
        });
      }
    } catch (error) {
      console.error('[DeltaSync] Sync request error:', error);
      if (callback) {
        callback({ success: false, message: error.message });
      }
    }
  });

  /**
   * Focus loss event
   */
  socket.on('delta:focus-loss', async (data) => {
    try {
      const { projectId, fileId, content, oldContent } = data;

      deltaScheduler.onFocusLoss({
        fileId,
        projectId,
        userId: socket.userId,
        newContent: content,
        oldContent: oldContent || ''
      });
    } catch (error) {
      console.error('[DeltaSync] Focus loss error:', error);
    }
  });

  /**
   * Undo/Redo event
   */
  socket.on('delta:undo-redo', async (data) => {
    try {
      const { projectId, fileId, content, oldContent } = data;

      deltaScheduler.onUndoRedo({
        fileId,
        projectId,
        userId: socket.userId,
        newContent: content,
        oldContent: oldContent || ''
      });
    } catch (error) {
      console.error('[DeltaSync] Undo/Redo error:', error);
    }
  });

  /**
   * Client disconnect - cleanup
   */
  socket.on('disconnect', () => {
    if (socket.currentDeltaFiles) {
      socket.currentDeltaFiles.forEach(fileId => {
        deltaScheduler.unregisterFile(fileId);
      });
      socket.currentDeltaFiles.clear();
    }
  });
}

export default setupDeltaSockets;
