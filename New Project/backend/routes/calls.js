import express from 'express';
import { param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import {
  createCallToken,
  endCall,
  getCallHistory,
  getActiveCall
} from '../controllers/CallSessionController.js';

const router = express.Router();

/**
 * @route   POST /rooms/:id/call-token
 * @desc    Generate LiveKit access token for video call
 * @access  Private
 */
router.post('/:id/call-token',
  authenticate,
  [param('id').isMongoId().withMessage('Invalid room ID')],
  createCallToken
);

/**
 * @route   POST /rooms/:id/end-call
 * @desc    End call session or leave call
 * @access  Private
 */
router.post('/:id/end-call',
  authenticate,
  [param('id').isMongoId().withMessage('Invalid room ID')],
  endCall
);

/**
 * @route   GET /rooms/:id/call-history
 * @desc    Get call history for a room
 * @access  Private
 */
router.get('/:id/call-history',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid room ID'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  getCallHistory
);

/**
 * @route   GET /rooms/:id/active-call
 * @desc    Get active call session for a room
 * @access  Private
 */
router.get('/:id/active-call',
  authenticate,
  [param('id').isMongoId().withMessage('Invalid room ID')],
  getActiveCall
);

export default router;
