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
 * @route   POST /files/:id/save-snapshot
 * @desc    Save a snapshot of the file
 * @access  Private
 */
router.post('/:id/save-snapshot', 
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid file ID'),
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
    param('id').isMongoId().withMessage('Invalid file ID'),
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
    param('id').isMongoId().withMessage('Invalid file ID'),
    param('versionNumber').isInt({ min: 1 }).withMessage('Invalid version number')
  ],
  getVersionDetails
);

/**
 * @route   POST /files/:id/revert/:versionNumber
 * @desc    Revert file to a specific version
 * @access  Private
 */
router.post('/:id/revert/:versionNumber',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid file ID'),
    param('versionNumber').isInt({ min: 1 }).withMessage('Invalid version number'),
    body('createSnapshot').optional().isBoolean()
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
    param('id').isMongoId().withMessage('Invalid file ID'),
    param('versionA').isInt({ min: 1 }),
    param('versionB').isInt({ min: 1 })
  ],
  compareVersions
);

/**
 * @route   DELETE /files/:id/versions/:versionNumber
 * @desc    Delete a version
 * @access  Private
 */
router.delete('/:id/versions/:versionNumber',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid file ID'),
    param('versionNumber').isInt({ min: 1 })
  ],
  deleteVersion
);

export default router;
