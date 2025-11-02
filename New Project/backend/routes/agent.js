import express from 'express';
import {
  handleAgentRequest,
  createComponent,
  createPage,
  modifyFile,
  getAgentLogs,
  executeApprovedAction
} from '../controllers/AgentController.js';
import { authenticate } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

/**
 * Rate limiter for Agent requests
 * Limit: 20 requests per hour per user
 */
const agentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    success: false,
    message: 'Too many agent requests. Please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip
});

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/ai/agent
 * @desc    Execute AI Agent task (code generation + file operations)
 * @access  Private
 */
router.post('/agent', agentLimiter, handleAgentRequest);

/**
 * @route   POST /api/ai/agent/component
 * @desc    Create a new component
 * @access  Private
 */
router.post('/agent/component', agentLimiter, createComponent);

/**
 * @route   POST /api/ai/agent/page
 * @desc    Create a new page
 * @access  Private
 */
router.post('/agent/page', agentLimiter, createPage);

/**
 * @route   POST /api/ai/agent/modify
 * @desc    Modify existing file
 * @access  Private
 */
router.post('/agent/modify', agentLimiter, modifyFile);

/**
 * @route   GET /api/ai/agent/logs
 * @desc    Get agent execution logs
 * @access  Private
 */
router.get('/agent/logs', getAgentLogs);

/**
 * @route   POST /api/ai/agent/approve
 * @desc    Execute approved terminal command
 * @access  Private
 */
router.post('/agent/approve', agentLimiter, executeApprovedAction);

export default router;
