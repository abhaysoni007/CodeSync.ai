/**
 * DeltaScheduler - Smart trigger system for snapshot creation
 * Implements event-based + time-based hybrid scheduling
 */
class DeltaScheduler {
  constructor(deltaManager) {
    this.deltaManager = deltaManager;
    this.timers = new Map(); // Track timers per file
    this.lastEditTime = new Map(); // Track last edit timestamp
    this.editCounts = new Map(); // Track edit count since last snapshot
    this.lastCursorPosition = new Map(); // Track cursor jumps
    
    // Configuration
    this.config = {
      idleThreshold: 10000, // 10 seconds of no edits
      timeInterval: 60000, // 60 seconds active editing
      batchDelay: 200, // 200ms to batch rapid edits
      cursorJumpThreshold: 30, // Lines
      editCountThreshold: 50 // Edits before auto-snapshot
    };
  }

  /**
   * Register a file for snapshot scheduling
   */
  registerFile(fileId, projectId, userId) {
    if (this.timers.has(fileId)) {
      return; // Already registered
    }

    console.log(`[DeltaScheduler] Registered file ${fileId} for snapshot scheduling`);
    
    this.lastEditTime.set(fileId, Date.now());
    this.editCounts.set(fileId, 0);
    
    // Start time-based interval
    this.startTimeInterval(fileId, projectId, userId);
  }

  /**
   * Unregister a file from scheduling
   */
  unregisterFile(fileId) {
    this.stopAllTimers(fileId);
    this.timers.delete(fileId);
    this.lastEditTime.delete(fileId);
    this.editCounts.delete(fileId);
    this.lastCursorPosition.delete(fileId);
    
    console.log(`[DeltaScheduler] Unregistered file ${fileId}`);
  }

  /**
   * Handle edit event
   */
  onEdit({
    fileId,
    projectId,
    userId,
    newContent,
    oldContent,
    cursorPosition = null
  }) {
    const now = Date.now();
    const lastEdit = this.lastEditTime.get(fileId) || 0;
    const timeSinceLastEdit = now - lastEdit;

    // Update tracking
    this.lastEditTime.set(fileId, now);
    const editCount = (this.editCounts.get(fileId) || 0) + 1;
    this.editCounts.set(fileId, editCount);

    // Check for cursor jump
    if (cursorPosition && this.lastCursorPosition.has(fileId)) {
      const lastPos = this.lastCursorPosition.get(fileId);
      const lineDiff = Math.abs(cursorPosition.line - lastPos.line);
      
      if (lineDiff > this.config.cursorJumpThreshold) {
        console.log(`[DeltaScheduler] Cursor jump detected (${lineDiff} lines)`);
        this.triggerSnapshot(fileId, projectId, userId, newContent, oldContent, 'cursor_jump');
      }
    }
    
    if (cursorPosition) {
      this.lastCursorPosition.set(fileId, cursorPosition);
    }

    // Check edit count threshold
    if (editCount >= this.config.editCountThreshold) {
      console.log(`[DeltaScheduler] Edit count threshold reached (${editCount})`);
      this.triggerSnapshot(fileId, projectId, userId, newContent, oldContent, 'auto_save');
      this.editCounts.set(fileId, 0);
      return;
    }

    // Reset idle timer
    this.resetIdleTimer(fileId, projectId, userId, newContent, oldContent);
  }

  /**
   * Handle save event
   */
  onSave({ fileId, projectId, userId, newContent, oldContent }) {
    console.log(`[DeltaScheduler] Save event for file ${fileId}`);
    this.triggerSnapshot(fileId, projectId, userId, newContent, oldContent, 'auto_save');
    this.editCounts.set(fileId, 0);
  }

  /**
   * Handle focus loss event
   */
  onFocusLoss({ fileId, projectId, userId, newContent, oldContent }) {
    console.log(`[DeltaScheduler] Focus loss for file ${fileId}`);
    this.triggerSnapshot(fileId, projectId, userId, newContent, oldContent, 'focus_loss');
  }

  /**
   * Handle undo/redo boundary
   */
  onUndoRedo({ fileId, projectId, userId, newContent, oldContent }) {
    console.log(`[DeltaScheduler] Undo/Redo boundary for file ${fileId}`);
    this.triggerSnapshot(fileId, projectId, userId, newContent, oldContent, 'undo_redo');
  }

  /**
   * Manual snapshot trigger
   */
  onManualSave({ fileId, projectId, userId, newContent, oldContent, message }) {
    console.log(`[DeltaScheduler] Manual save for file ${fileId}`);
    this.triggerSnapshot(fileId, projectId, userId, newContent, oldContent, 'manual', message);
  }

  /**
   * Start time-based interval timer
   */
  startTimeInterval(fileId, projectId, userId) {
    // Clear existing timer
    if (this.timers.has(`${fileId}:interval`)) {
      clearInterval(this.timers.get(`${fileId}:interval`));
    }

    // Set new interval
    const intervalId = setInterval(() => {
      const lastEdit = this.lastEditTime.get(fileId);
      const now = Date.now();
      
      // Only create snapshot if there were recent edits
      if (lastEdit && (now - lastEdit) < this.config.timeInterval) {
        console.log(`[DeltaScheduler] Time interval trigger for file ${fileId}`);
        // This will be handled by the socket handler to get current content
        this.emitSnapshotRequest(fileId, 'time_interval');
      }
    }, this.config.timeInterval);

    this.timers.set(`${fileId}:interval`, intervalId);
  }

  /**
   * Reset idle timer
   */
  resetIdleTimer(fileId, projectId, userId, newContent, oldContent) {
    // Clear existing idle timer
    if (this.timers.has(`${fileId}:idle`)) {
      clearTimeout(this.timers.get(`${fileId}:idle`));
    }

    // Set new idle timer
    const timerId = setTimeout(() => {
      console.log(`[DeltaScheduler] Idle threshold reached for file ${fileId}`);
      this.triggerSnapshot(fileId, projectId, userId, newContent, oldContent, 'idle');
    }, this.config.idleThreshold);

    this.timers.set(`${fileId}:idle`, timerId);
  }

  /**
   * Trigger snapshot creation
   */
  async triggerSnapshot(fileId, projectId, userId, newContent, oldContent, trigger, message = null) {
    try {
      // Buffer the delta first (batching)
      const batchTimerKey = `${fileId}:batch`;
      
      if (this.timers.has(batchTimerKey)) {
        clearTimeout(this.timers.get(batchTimerKey));
      }

      // Batch rapid edits
      const timerId = setTimeout(async () => {
        await this.deltaManager.createSnapshot({
          projectId,
          fileId,
          userId,
          newContent,
          oldContent,
          trigger,
          message: message || this.getDefaultMessage(trigger),
          tags: []
        });

        this.timers.delete(batchTimerKey);
      }, this.config.batchDelay);

      this.timers.set(batchTimerKey, timerId);
    } catch (error) {
      console.error('[DeltaScheduler] Trigger snapshot error:', error);
    }
  }

  /**
   * Emit snapshot request event (for socket handlers)
   */
  emitSnapshotRequest(fileId, trigger) {
    // This will be caught by socket handlers
    console.log(`[DeltaScheduler] Emitting snapshot request for ${fileId} (${trigger})`);
  }

  /**
   * Stop all timers for a file
   */
  stopAllTimers(fileId) {
    const keys = Array.from(this.timers.keys()).filter(k => k.startsWith(fileId));
    
    keys.forEach(key => {
      const timer = this.timers.get(key);
      if (timer) {
        if (key.includes(':interval')) {
          clearInterval(timer);
        } else {
          clearTimeout(timer);
        }
        this.timers.delete(key);
      }
    });
  }

  /**
   * Get default message for trigger type
   */
  getDefaultMessage(trigger) {
    const messages = {
      auto_save: 'Auto-saved',
      idle: 'Saved after idle period',
      focus_loss: 'Saved on focus loss',
      manual: 'Manual save',
      cursor_jump: 'Saved after cursor jump',
      undo_redo: 'Saved at undo/redo boundary',
      time_interval: 'Periodic auto-save'
    };

    return messages[trigger] || 'Auto-saved snapshot';
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('[DeltaScheduler] Configuration updated:', this.config);
  }

  /**
   * Get scheduler statistics
   */
  getStats() {
    return {
      activeFiles: this.timers.size,
      totalEdits: Array.from(this.editCounts.values()).reduce((a, b) => a + b, 0),
      files: Array.from(this.lastEditTime.keys()).map(fileId => ({
        fileId,
        lastEdit: this.lastEditTime.get(fileId),
        editCount: this.editCounts.get(fileId),
        timers: Array.from(this.timers.keys()).filter(k => k.startsWith(fileId))
      }))
    };
  }
}

export default DeltaScheduler;
