import express from 'express';
import { 
  createTerminal, 
  executeCommand, 
  killProcess,
  closeTerminal,
  getTerminalSessions 
} from '../controllers/terminalController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * Terminal Routes
 * All routes require authentication
 */

// Get all active terminal sessions for a project
router.get('/:projectId/sessions', authenticate, getTerminalSessions);

// Create a new terminal session
router.post('/:projectId/create', authenticate, createTerminal);

// Execute a command in a terminal
router.post('/:projectId/execute', authenticate, executeCommand);

// Kill a running process
router.post('/:projectId/kill', authenticate, killProcess);

// Close a terminal session
router.delete('/:projectId/:terminalId', authenticate, closeTerminal);

export default router;
