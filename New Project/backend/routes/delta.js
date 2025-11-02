import express from 'express';
import { authenticate } from '../middleware/auth.js';
import deltaManager from '../services/DeltaEngine/DeltaManager.js';
import DeltaSnapshot from '../models/DeltaSnapshot.js';

const router = express.Router();

/**
 * Initialize delta tracking for a file
 * POST /delta/init
 */
router.post('/init', authenticate, async (req, res) => {
  try {
    const { fileId, projectId, initialContent } = req.body;

    if (!fileId || !projectId) {
      return res.status(400).json({
        success: false,
        message: 'File ID and Project ID are required'
      });
    }

    const snapshot = await deltaManager.initializeFile(
      fileId,
      projectId,
      initialContent || ''
    );

    res.json({
      success: true,
      snapshot: {
        snapshotId: snapshot.snapshotId,
        versionNumber: snapshot.versionNumber,
        checksum: snapshot.checksum,
        createdAt: snapshot.createdAt
      }
    });
  } catch (error) {
    console.error('[Delta Routes] Init error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Create a snapshot manually
 * POST /delta/snapshot
 */
router.post('/snapshot', authenticate, async (req, res) => {
  try {
    const {
      projectId,
      fileId,
      newContent,
      oldContent,
      message,
      tags
    } = req.body;

    if (!fileId || !projectId || newContent === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Required fields missing'
      });
    }

    const snapshot = await deltaManager.createSnapshot({
      projectId,
      fileId,
      userId: req.userId,
      newContent,
      oldContent: oldContent || '',
      trigger: 'manual',
      message: message || 'Manual snapshot',
      tags: tags || []
    });

    res.json({
      success: true,
      snapshot: {
        snapshotId: snapshot.snapshotId,
        versionNumber: snapshot.versionNumber,
        checksum: snapshot.checksum,
        metadata: snapshot.metadata,
        createdAt: snapshot.createdAt
      }
    });
  } catch (error) {
    console.error('[Delta Routes] Create snapshot error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get version history for a file
 * GET /delta/history/:fileId
 */
router.get('/history/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const snapshots = await deltaManager.getVersionHistory(fileId, limit, skip);

    res.json({
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
      })),
      total: snapshots.length
    });
  } catch (error) {
    console.error('[Delta Routes] Get history error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get a specific snapshot
 * GET /delta/snapshot/:snapshotId
 */
router.get('/snapshot/:snapshotId', authenticate, async (req, res) => {
  try {
    const { snapshotId } = req.params;

    const snapshot = await deltaManager.getSnapshot(snapshotId);

    if (!snapshot) {
      return res.status(404).json({
        success: false,
        message: 'Snapshot not found'
      });
    }

    res.json({
      success: true,
      snapshot: {
        snapshotId: snapshot.snapshotId,
        versionNumber: snapshot.versionNumber,
        checksum: snapshot.checksum,
        message: snapshot.message,
        trigger: snapshot.trigger,
        metadata: snapshot.metadata,
        isCheckpoint: snapshot.isCheckpoint,
        baseVersion: snapshot.baseVersion,
        user: snapshot.userId ? {
          id: snapshot.userId._id,
          username: snapshot.userId.username,
          avatar: snapshot.userId.avatar
        } : null,
        createdAt: snapshot.createdAt
      }
    });
  } catch (error) {
    console.error('[Delta Routes] Get snapshot error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Rollback to a snapshot
 * POST /delta/rollback
 */
router.post('/rollback', authenticate, async (req, res) => {
  try {
    const { fileId, snapshotId } = req.body;

    if (!fileId || !snapshotId) {
      return res.status(400).json({
        success: false,
        message: 'File ID and Snapshot ID are required'
      });
    }

    const result = await deltaManager.rollbackToSnapshot(
      fileId,
      snapshotId,
      req.userId
    );

    res.json({
      success: true,
      content: result.content,
      snapshot: {
        snapshotId: result.snapshot.snapshotId,
        versionNumber: result.snapshot.versionNumber,
        checksum: result.snapshot.checksum,
        createdAt: result.snapshot.createdAt
      },
      rolledBackFrom: {
        snapshotId: result.rolledBackFrom.snapshotId,
        versionNumber: result.rolledBackFrom.versionNumber
      }
    });
  } catch (error) {
    console.error('[Delta Routes] Rollback error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get latest file content
 * GET /delta/content/:fileId
 */
router.get('/content/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;

    const content = await deltaManager.getLatestContent(fileId);

    res.json({
      success: true,
      content
    });
  } catch (error) {
    console.error('[Delta Routes] Get content error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Compare two snapshots
 * POST /delta/compare
 */
router.post('/compare', authenticate, async (req, res) => {
  try {
    const { snapshotId1, snapshotId2 } = req.body;

    if (!snapshotId1 || !snapshotId2) {
      return res.status(400).json({
        success: false,
        message: 'Two snapshot IDs are required'
      });
    }

    const diff = await deltaManager.compareSnapshots(snapshotId1, snapshotId2);

    res.json({
      success: true,
      diff: {
        patch: diff.patch,
        stats: diff.stats,
        hasChanges: diff.hasChanges
      }
    });
  } catch (error) {
    console.error('[Delta Routes] Compare error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get file statistics
 * GET /delta/stats/:fileId
 */
router.get('/stats/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;

    const stats = await deltaManager.getFileStats(fileId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[Delta Routes] Get stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Cleanup old deltas
 * POST /delta/cleanup/:fileId
 */
router.post('/cleanup/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    const keepCount = parseInt(req.body.keepCount) || 100;

    const archived = await deltaManager.cleanupOldDeltas(fileId, keepCount);

    res.json({
      success: true,
      archived
    });
  } catch (error) {
    console.error('[Delta Routes] Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get deltas since a specific version
 * GET /delta/since/:fileId/:versionNumber
 */
router.get('/since/:fileId/:versionNumber', authenticate, async (req, res) => {
  try {
    const { fileId, versionNumber } = req.params;

    const deltas = await DeltaSnapshot.getDeltasSince(
      fileId,
      parseInt(versionNumber)
    );

    res.json({
      success: true,
      deltas: deltas.map(d => ({
        snapshotId: d.snapshotId,
        versionNumber: d.versionNumber,
        checksum: d.checksum,
        metadata: d.metadata,
        createdAt: d.createdAt
      }))
    });
  } catch (error) {
    console.error('[Delta Routes] Get deltas since error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
