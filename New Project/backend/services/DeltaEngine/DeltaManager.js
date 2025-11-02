import DeltaSnapshot from '../../models/DeltaSnapshot.js';
import { createChecksum, generateSnapshotId } from './utils/checksum.js';
import { computeDiff, applyPatch } from './utils/diffUtils.js';
import { compressDelta, decompressDelta } from './DeltaCompressor.js';
import RedisCache from './RedisCache.js';

/**
 * DeltaManager - Main orchestrator for delta snapshot system
 * Handles creation, storage, retrieval, and application of deltas
 */
class DeltaManager {
  constructor() {
    this.cache = new RedisCache();
    this.pendingDeltas = new Map(); // Buffer for unsaved edits
    this.versionCounters = new Map(); // Track version numbers per file
    this.CHECKPOINT_INTERVAL = 20; // Create full checkpoint every N deltas
    this.MAX_CACHE_SIZE = 10; // Keep last N deltas in Redis
  }

  /**
   * Initialize delta tracking for a file
   */
  async initializeFile(fileId, projectId, initialContent = '') {
    try {
      // Check if file already has snapshots
      const latestSnapshot = await DeltaSnapshot.findOne({
        fileId,
        status: 'active'
      }).sort({ versionNumber: -1 });

      if (latestSnapshot) {
        this.versionCounters.set(fileId, latestSnapshot.versionNumber);
        return latestSnapshot;
      }

      // Create initial checkpoint
      const snapshotId = generateSnapshotId();
      const checksum = createChecksum(initialContent);

      const initialSnapshot = new DeltaSnapshot({
        snapshotId,
        projectId,
        fileId,
        userId: null, // System-generated
        delta: '',
        baseVersion: null,
        checksum,
        fullSnapshot: initialContent,
        isCheckpoint: true,
        versionNumber: 1,
        message: 'Initial snapshot',
        trigger: {
          type: 'manual',
          timestamp: new Date()
        }
      });

      await initialSnapshot.save();
      this.versionCounters.set(fileId, 1);
      
      // Cache initial snapshot
      await this.cache.set(`snapshot:${fileId}:latest`, initialSnapshot);

      return initialSnapshot;
    } catch (error) {
      console.error('[DeltaManager] Initialize file error:', error);
      throw error;
    }
  }

  /**
   * Create a new delta snapshot
   */
  async createSnapshot({
    projectId,
    fileId,
    userId,
    newContent,
    oldContent,
    trigger = 'auto_save',
    message = 'Auto-saved snapshot',
    tags = []
  }) {
    try {
      // Get current version number
      let versionNumber = this.versionCounters.get(fileId) || 1;
      versionNumber++;
      this.versionCounters.set(fileId, versionNumber);

      // Compute delta
      const delta = computeDiff(oldContent, newContent);
      const checksum = createChecksum(newContent);
      const snapshotId = generateSnapshotId();

      // Get base version
      const latestSnapshot = await DeltaSnapshot.findOne({
        fileId,
        status: 'active'
      }).sort({ createdAt: -1 });

      const baseVersion = latestSnapshot ? latestSnapshot.snapshotId : null;

      // Determine if this should be a checkpoint
      const isCheckpoint = versionNumber % this.CHECKPOINT_INTERVAL === 0;

      // Compress delta if necessary
      const deltaSize = Buffer.byteLength(delta.patch, 'utf8');
      let compressedDelta = delta.patch;
      let compressionRatio = 1.0;
      let isCompressed = false;

      if (deltaSize > 1024) { // Compress if > 1KB
        const compressed = await compressDelta(delta.patch);
        compressedDelta = compressed.data;
        compressionRatio = compressed.ratio;
        isCompressed = true;
      }

      // Create snapshot document
      const snapshot = new DeltaSnapshot({
        snapshotId,
        projectId,
        fileId,
        userId,
        delta: compressedDelta,
        baseVersion,
        checksum,
        fullSnapshot: isCheckpoint ? newContent : null,
        isCheckpoint,
        versionNumber,
        message,
        tags,
        metadata: {
          linesAdded: delta.stats.linesAdded,
          linesRemoved: delta.stats.linesRemoved,
          charsAdded: delta.stats.charsAdded,
          charsRemoved: delta.stats.charsRemoved,
          deltaSize,
          compressed: isCompressed,
          compressionRatio
        },
        trigger: {
          type: trigger,
          timestamp: new Date()
        }
      });

      await snapshot.save();

      // Update cache
      await this.cache.addDelta(fileId, snapshot);
      await this.cache.set(`snapshot:${fileId}:latest`, snapshot);

      // Cleanup old deltas periodically
      if (versionNumber % 50 === 0) {
        await this.cleanupOldDeltas(fileId);
      }

      console.log(`[DeltaManager] Created snapshot ${snapshotId} (v${versionNumber}) for file ${fileId}`);

      return snapshot;
    } catch (error) {
      console.error('[DeltaManager] Create snapshot error:', error);
      throw error;
    }
  }

  /**
   * Get snapshot by ID
   */
  async getSnapshot(snapshotId) {
    try {
      // Try cache first
      const cached = await this.cache.get(`snapshot:id:${snapshotId}`);
      if (cached) return cached;

      // Fetch from database
      const snapshot = await DeltaSnapshot.findOne({ snapshotId, status: 'active' })
        .populate('userId', 'username email avatar');

      if (snapshot) {
        await this.cache.set(`snapshot:id:${snapshotId}`, snapshot);
      }

      return snapshot;
    } catch (error) {
      console.error('[DeltaManager] Get snapshot error:', error);
      throw error;
    }
  }

  /**
   * Get file version history
   */
  async getVersionHistory(fileId, limit = 50, skip = 0) {
    try {
      const snapshots = await DeltaSnapshot.find({
        fileId,
        status: 'active'
      })
        .populate('userId', 'username email avatar')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      return snapshots;
    } catch (error) {
      console.error('[DeltaManager] Get version history error:', error);
      throw error;
    }
  }

  /**
   * Rollback to a specific snapshot
   */
  async rollbackToSnapshot(fileId, snapshotId, userId) {
    try {
      const targetSnapshot = await this.getSnapshot(snapshotId);
      
      if (!targetSnapshot) {
        throw new Error('Snapshot not found');
      }

      // If it's a checkpoint, we have the full content
      if (targetSnapshot.isCheckpoint && targetSnapshot.fullSnapshot) {
        return {
          content: targetSnapshot.fullSnapshot,
          snapshot: targetSnapshot
        };
      }

      // Otherwise, reconstruct from deltas
      const content = await this.reconstructContent(fileId, snapshotId);

      // Create a new snapshot for this rollback
      const latestContent = await this.getLatestContent(fileId);
      
      const rollbackSnapshot = await this.createSnapshot({
        projectId: targetSnapshot.projectId,
        fileId,
        userId,
        newContent: content,
        oldContent: latestContent,
        trigger: 'manual',
        message: `Rolled back to version ${targetSnapshot.versionNumber}`,
        tags: ['rollback']
      });

      return {
        content,
        snapshot: rollbackSnapshot,
        rolledBackFrom: targetSnapshot
      };
    } catch (error) {
      console.error('[DeltaManager] Rollback error:', error);
      throw error;
    }
  }

  /**
   * Reconstruct file content from deltas
   */
  async reconstructContent(fileId, targetSnapshotId) {
    try {
      // Find nearest checkpoint before target
      const targetSnapshot = await this.getSnapshot(targetSnapshotId);
      
      if (!targetSnapshot) {
        throw new Error('Target snapshot not found');
      }

      // Get the nearest checkpoint at or before this version
      const checkpoint = await DeltaSnapshot.findOne({
        fileId,
        versionNumber: { $lte: targetSnapshot.versionNumber },
        isCheckpoint: true,
        status: 'active'
      }).sort({ versionNumber: -1 });

      if (!checkpoint) {
        throw new Error('No checkpoint found for reconstruction');
      }

      let content = checkpoint.fullSnapshot || '';

      // If target is the checkpoint itself, return it
      if (checkpoint.snapshotId === targetSnapshotId) {
        return content;
      }

      // Get all deltas between checkpoint and target
      const deltas = await DeltaSnapshot.find({
        fileId,
        versionNumber: {
          $gt: checkpoint.versionNumber,
          $lte: targetSnapshot.versionNumber
        },
        status: 'active'
      }).sort({ versionNumber: 1 });

      // Apply each delta sequentially
      for (const delta of deltas) {
        let patch = delta.delta;

        // Decompress if necessary
        if (delta.metadata.compressed) {
          patch = await decompressDelta(patch);
        }

        content = applyPatch(content, patch);
      }

      return content;
    } catch (error) {
      console.error('[DeltaManager] Reconstruct content error:', error);
      throw error;
    }
  }

  /**
   * Get latest file content
   */
  async getLatestContent(fileId) {
    try {
      // Try to get from latest checkpoint
      const latestCheckpoint = await DeltaSnapshot.getLatestCheckpoint(fileId);
      
      if (!latestCheckpoint) {
        return '';
      }

      // Get all deltas after the checkpoint
      const deltas = await DeltaSnapshot.find({
        fileId,
        versionNumber: { $gt: latestCheckpoint.versionNumber },
        status: 'active'
      }).sort({ versionNumber: 1 });

      let content = latestCheckpoint.fullSnapshot || '';

      // Apply remaining deltas
      for (const delta of deltas) {
        let patch = delta.delta;
        
        if (delta.metadata.compressed) {
          patch = await decompressDelta(patch);
        }
        
        content = applyPatch(content, patch);
      }

      return content;
    } catch (error) {
      console.error('[DeltaManager] Get latest content error:', error);
      throw error;
    }
  }

  /**
   * Compare two snapshots (generate diff)
   */
  async compareSnapshots(snapshotId1, snapshotId2) {
    try {
      const content1 = await this.reconstructContent(
        (await this.getSnapshot(snapshotId1)).fileId,
        snapshotId1
      );
      
      const content2 = await this.reconstructContent(
        (await this.getSnapshot(snapshotId2)).fileId,
        snapshotId2
      );

      return computeDiff(content1, content2);
    } catch (error) {
      console.error('[DeltaManager] Compare snapshots error:', error);
      throw error;
    }
  }

  /**
   * Cleanup old deltas for a file
   */
  async cleanupOldDeltas(fileId, keepCount = 100) {
    try {
      const archived = await DeltaSnapshot.cleanupOldDeltas(fileId, keepCount);
      console.log(`[DeltaManager] Archived ${archived} old deltas for file ${fileId}`);
      return archived;
    } catch (error) {
      console.error('[DeltaManager] Cleanup error:', error);
      throw error;
    }
  }

  /**
   * Get delta statistics for a file
   */
  async getFileStats(fileId) {
    try {
      const stats = await DeltaSnapshot.aggregate([
        { $match: { fileId: fileId, status: 'active' } },
        {
          $group: {
            _id: null,
            totalSnapshots: { $sum: 1 },
            totalCheckpoints: {
              $sum: { $cond: ['$isCheckpoint', 1, 0] }
            },
            totalSize: { $sum: '$metadata.deltaSize' },
            avgCompressionRatio: { $avg: '$metadata.compressionRatio' },
            linesAdded: { $sum: '$metadata.linesAdded' },
            linesRemoved: { $sum: '$metadata.linesRemoved' }
          }
        }
      ]);

      return stats[0] || {
        totalSnapshots: 0,
        totalCheckpoints: 0,
        totalSize: 0,
        avgCompressionRatio: 1.0,
        linesAdded: 0,
        linesRemoved: 0
      };
    } catch (error) {
      console.error('[DeltaManager] Get file stats error:', error);
      throw error;
    }
  }

  /**
   * Buffer pending delta (before committing to DB)
   */
  bufferDelta(fileId, delta) {
    if (!this.pendingDeltas.has(fileId)) {
      this.pendingDeltas.set(fileId, []);
    }
    
    this.pendingDeltas.get(fileId).push({
      ...delta,
      timestamp: Date.now()
    });
  }

  /**
   * Flush pending deltas for a file
   */
  async flushPendingDeltas(fileId) {
    const pending = this.pendingDeltas.get(fileId);
    
    if (!pending || pending.length === 0) {
      return null;
    }

    // Merge all pending deltas
    const merged = this.mergePendingDeltas(pending);
    this.pendingDeltas.delete(fileId);

    return merged;
  }

  /**
   * Merge multiple pending deltas into one
   */
  mergePendingDeltas(deltas) {
    if (deltas.length === 0) return null;
    if (deltas.length === 1) return deltas[0];

    // Combine all changes
    let combinedPatch = '';
    let totalLinesAdded = 0;
    let totalLinesRemoved = 0;
    let totalCharsAdded = 0;
    let totalCharsRemoved = 0;

    for (const delta of deltas) {
      combinedPatch += delta.patch + '\n';
      totalLinesAdded += delta.stats?.linesAdded || 0;
      totalLinesRemoved += delta.stats?.linesRemoved || 0;
      totalCharsAdded += delta.stats?.charsAdded || 0;
      totalCharsRemoved += delta.stats?.charsRemoved || 0;
    }

    return {
      patch: combinedPatch,
      stats: {
        linesAdded: totalLinesAdded,
        linesRemoved: totalLinesRemoved,
        charsAdded: totalCharsAdded,
        charsRemoved: totalCharsRemoved
      }
    };
  }
}

// Singleton instance
const deltaManager = new DeltaManager();

export default deltaManager;
