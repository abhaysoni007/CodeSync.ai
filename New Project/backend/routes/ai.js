import express from 'express';
import {
  handleAIRequest,
  getInteractionHistory,
  getInteractionDetails,
  deleteInteraction,
  getUsageStats
} from '../controllers/AIController.js';
import { authenticate } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

/**
 * Rate limiter for AI requests
 * Limit: 30 requests per hour per user
 */
const aiRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: {
    success: false,
    message: 'Too many AI requests. Please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use user ID for rate limiting
  keyGenerator: (req) => req.user?.id || req.ip
});

/**
 * Rate limiter for history/stats endpoints
 * More generous limit: 100 requests per hour
 */
const queryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip
});

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/ai/request
 * @desc    Send AI request to Gemini
 * @access  Private
 * @body    {
 *            prompt: string (required) - User's question/instruction
 *            model?: string - Specific Gemini model ('gemini-2.0-flash-exp' or 'gemini-1.5-pro')
 *            systemPrompt?: string - System instructions
 *            temperature?: number - 0.0 to 2.0 (creativity level)
 *            maxTokens?: number - Maximum response length
 *          }
 * @response {
 *             success: boolean,
 *             data: {
 *               response: string,
 *               provider: 'gemini',
 *               model: string,
 *               usage: { promptTokens, completionTokens, totalTokens },
 *               interactionId: string,
 *               isFallback: boolean
 *             }
 *           }
 */
router.post('/request', aiRequestLimiter, handleAIRequest);

/**
 * @route   GET /api/ai/history
 * @desc    Get AI interaction history
 * @access  Private
 * @query   {
 *            page?: number - Page number (default: 1)
 *            limit?: number - Items per page (default: 20, max: 100)
 *            provider?: string - Filter by provider
 *            startDate?: string - Filter by start date (ISO format)
 *            endDate?: string - Filter by end date (ISO format)
 *          }
 * @response {
 *             success: boolean,
 *             data: {
 *               interactions: Array,
 *               stats: Object,
 *               pagination: { total, page, pages, limit }
 *             }
 *           }
 */
router.get('/history', queryLimiter, getInteractionHistory);

/**
 * @route   GET /api/ai/interaction/:id
 * @desc    Get single interaction details
 * @access  Private
 * @params  id - Interaction ID
 */
router.get('/interaction/:id', queryLimiter, getInteractionDetails);

/**
 * @route   DELETE /api/ai/interaction/:id
 * @desc    Delete an interaction
 * @access  Private
 * @params  id - Interaction ID
 */
router.delete('/interaction/:id', deleteInteraction);

/**
 * @route   GET /api/ai/stats
 * @desc    Get usage statistics
 * @access  Private
 * @query   {
 *            period?: string - '7d' | '30d' | '90d' (default: '30d')
 *          }
 * @response {
 *             success: boolean,
 *             data: {
 *               period: string,
 *               startDate: Date,
 *               endDate: Date,
 *               daily: Array<{ provider, date, requests, tokens, cost }>,
 *               totals: { totalRequests, totalTokens, totalCost }
 *             }
 *           }
 */
router.get('/stats', queryLimiter, getUsageStats);

export default router;
