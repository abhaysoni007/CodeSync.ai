import express from 'express';
import { 
  createTerminal, 
  executeCommand, 
  killProcess,
  closeTerminal,
  getTerminalSessions 
} from '../controllers/terminalController.js';
import { listPorts } from '../controllers/portsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireProjectMember } from '../middleware/projectAccess.js';

const router = express.Router();

/**
 * Terminal Routes
 * All routes require authentication
 */

// Which dev servers are currently listening (for the Ports panel).
router.get('/:projectId/ports', authenticate, requireProjectMember, listPorts);

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
