import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import {
  saveSnapshot,
  getVersionHistory,
  getVersionDetails,
  revertToVersion,
  compareVersions,
  deleteVersion
} from '../controllers/FileVersionController.js';

const router = express.Router();

/**
 * @route   POST /files/:id/versions
 * @route   POST /files/:id/save-snapshot
 * @desc    Save a snapshot version of the file
 * @access  Private
 */
router.post(['/:id/versions', '/:id/save-snapshot'],
  authenticate,
  [
    param('id').notEmpty().withMessage('File ID or path is required'),
    body('content').notEmpty().withMessage('Content is required'),
    body('message').optional().trim(),
    body('tags').optional().isArray()
  ],
  saveSnapshot
);

/**
 * @route   GET /files/:id/versions
 * @desc    Get version history for a file
 * @access  Private
 */
router.get('/:id/versions',
  authenticate,
  [
    param('id').notEmpty().withMessage('File ID or path is required'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('includeAutoSave').optional().isBoolean()
  ],
  getVersionHistory
);

/**
 * @route   GET /files/:id/versions/:versionNumber
 * @desc    Get specific version details
 * @access  Private
 */
router.get('/:id/versions/:versionNumber',
  authenticate,
  [
    param('id').notEmpty().withMessage('File ID or path is required'),
    param('versionNumber').isInt({ min: 1 }).withMessage('Invalid version number')
  ],
  getVersionDetails
);

/**
 * @route   POST /files/:id/versions/:versionNumber/restore
 * @route   POST /files/:id/revert/:versionNumber
 * @desc    Restore file to a specific historical version
 * @access  Private
 */
router.post(['/:id/versions/:versionNumber/restore', '/:id/revert/:versionNumber'],
  authenticate,
  [
    param('id').notEmpty().withMessage('File ID or path is required'),
    param('versionNumber').isInt({ min: 1 }).withMessage('Invalid version number'),
    body('message').optional().trim()
  ],
  revertToVersion
);

/**
 * @route   GET /files/:id/compare/:versionA/:versionB
 * @desc    Compare two versions
 * @access  Private
 */
router.get('/:id/compare/:versionA/:versionB',
  authenticate,
  [
    param('id').notEmpty().withMessage('File ID or path is required'),
    param('versionA').isInt({ min: 1 }),
    param('versionB').isInt({ min: 1 })
  ],
  compareVersions
);

/**
 * @route   DELETE /files/:id/versions/:versionNumber
 * @desc    Delete a version (soft delete)
 * @access  Private
 */
router.delete('/:id/versions/:versionNumber',
  authenticate,
  [
    param('id').notEmpty().withMessage('File ID or path is required'),
    param('versionNumber').isInt({ min: 1 })
  ],
  deleteVersion
);

export default router;
