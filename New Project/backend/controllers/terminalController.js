import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store active terminal sessions
const terminalSessions = new Map();
const processMap = new Map();

// Maximum concurrent processes per user
const MAX_PROCESSES_PER_USER = 3;

// Command execution timeout (2 minutes)
const EXECUTION_TIMEOUT = 120000;

/**
 * Sanitize and validate command
 */
const sanitizeCommand = (command) => {
  // Remove potentially dangerous characters and commands
  const dangerousPatterns = [
    /rm\s+-rf\s+\//, // Prevent deleting root
    /format\s+/, // Prevent formatting
    /del\s+\/[sf]/, // Prevent recursive delete
    /:\(\)\{.*\}:/, // Fork bomb
    />[>&]\s*\/dev\//, // Prevent device manipulation
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      throw new Error('Command contains potentially dangerous operations');
    }
  }

  return command.trim();
};

/**
 * Get shell based on platform
 */
const getShell = (shellType = 'powershell') => {
  const platform = os.platform();
  
  if (platform === 'win32') {
    // Windows
    if (shellType === 'cmd') {
      return { shell: 'cmd.exe', args: ['/c'] };
    } else if (shellType === 'bash') {
      // Check if WSL is available
      return { shell: 'bash.exe', args: ['-c'] };
    } else {
      // Default to PowerShell
      return { shell: 'powershell.exe', args: ['-Command'] };
    }
  } else if (platform === 'darwin') {
    // macOS
    return { shell: 'zsh', args: ['-c'] };
  } else {
    // Linux
    return { shell: 'bash', args: ['-c'] };
  }
};

/**
 * Get project directory path
 */
const getProjectDirectory = (projectId) => {
  // Adjust this path based on your project structure
  const projectsDir = path.join(__dirname, '..', 'projects', projectId);
  
  // Ensure directory exists
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }
  
  return projectsDir;
};

/**
 * Validate working directory (prevent directory escape)
 */
const validateWorkingDirectory = (cwd, projectId) => {
  const projectDir = getProjectDirectory(projectId);
  const resolvedCwd = path.resolve(cwd);
  
  // Ensure cwd is within project directory
  if (!resolvedCwd.startsWith(projectDir)) {
    throw new Error('Access denied: Cannot access files outside project directory');
  }
  
  return resolvedCwd;
};

/**
 * Create Terminal Session
 */
export const createTerminal = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { terminalId, shell = 'powershell' } = req.body;
    const userId = req.user.id;

    // Check user's active process count
    const userProcessCount = Array.from(processMap.values()).filter(
      (p) => p.userId === userId
    ).length;

    if (userProcessCount >= MAX_PROCESSES_PER_USER) {
      return res.status(429).json({
        success: false,
        message: `Maximum ${MAX_PROCESSES_PER_USER} concurrent processes allowed`,
      });
    }

    const cwd = getProjectDirectory(projectId);

    // Store session metadata
    terminalSessions.set(terminalId, {
      id: terminalId,
      projectId,
      userId,
      shell,
      cwd,
      createdAt: new Date(),
    });

    // Emit success to socket
    const io = req.app.get('io');
    io.to(`project:${projectId}`).emit('terminal:created', {
      terminalId,
      cwd,
      shell,
    });

    res.json({
      success: true,
      data: {
        terminalId,
        cwd,
        shell,
      },
    });
  } catch (error) {
    console.error('Error creating terminal:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create terminal',
    });
  }
};

/**
 * Execute Command
 */
export const executeCommand = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { terminalId, command } = req.body;
    const userId = req.user.id;

    if (!command || !terminalId) {
      return res.status(400).json({
        success: false,
        message: 'Terminal ID and command are required',
      });
    }

    // Get terminal session
    const session = terminalSessions.get(terminalId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Terminal session not found',
      });
    }

    // Verify user owns this terminal
    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to terminal',
      });
    }

    // Sanitize command
    const sanitizedCommand = sanitizeCommand(command);

    // Get shell configuration
    const { shell, args } = getShell(session.shell);

    // Validate and get working directory
    const cwd = validateWorkingDirectory(session.cwd, projectId);

    // Kill any existing process for this terminal
    if (processMap.has(terminalId)) {
      const existingProcess = processMap.get(terminalId);
      try {
        process.kill(existingProcess.pid);
      } catch (error) {
        // Process might already be dead
      }
      processMap.delete(terminalId);
    }

    // Spawn process
    const childProcess = spawn(shell, [...args, sanitizedCommand], {
      cwd,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        TERM: 'xterm-256color',
      },
      shell: false,
    });

    // Store process reference
    processMap.set(terminalId, {
      process: childProcess,
      userId,
      terminalId,
      command: sanitizedCommand,
      pid: childProcess.pid,
    });

    const io = req.app.get('io');

    // Handle stdout
    childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      io.to(`project:${projectId}`).emit('terminal:output', {
        terminalId,
        output,
      });
    });

    // Handle stderr
    childProcess.stderr.on('data', (data) => {
      const output = data.toString();
      io.to(`project:${projectId}`).emit('terminal:output', {
        terminalId,
        output: `\x1b[31m${output}\x1b[0m`, // Red color for errors
      });
    });

    // Handle process exit
    childProcess.on('close', (code) => {
      processMap.delete(terminalId);
      io.to(`project:${projectId}`).emit('terminal:exit', {
        terminalId,
        code,
      });
    });

    // Handle errors
    childProcess.on('error', (error) => {
      console.error('Process error:', error);
      processMap.delete(terminalId);
      io.to(`project:${projectId}`).emit('terminal:error', {
        terminalId,
        error: error.message,
      });
    });

    // Set execution timeout
    setTimeout(() => {
      if (processMap.has(terminalId)) {
        try {
          const proc = processMap.get(terminalId);
          process.kill(proc.pid);
          processMap.delete(terminalId);
          
          io.to(`project:${projectId}`).emit('terminal:output', {
            terminalId,
            output: '\r\n\x1b[33m[Command timeout - process killed after 2 minutes]\x1b[0m\r\n',
          });
        } catch (error) {
          console.error('Error killing timed out process:', error);
        }
      }
    }, EXECUTION_TIMEOUT);

    res.json({
      success: true,
      data: {
        terminalId,
        pid: childProcess.pid,
        command: sanitizedCommand,
      },
    });
  } catch (error) {
    console.error('Error executing command:', error);
    
    const io = req.app.get('io');
    io.to(`project:${projectId}`).emit('terminal:error', {
      terminalId: req.body.terminalId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute command',
    });
  }
};

/**
 * Kill Running Process
 */
export const killProcess = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { terminalId } = req.body;
    const userId = req.user.id;

    if (!processMap.has(terminalId)) {
      return res.status(404).json({
        success: false,
        message: 'No running process found',
      });
    }

    const processInfo = processMap.get(terminalId);

    // Verify user owns this process
    if (processInfo.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Kill the process
    try {
      process.kill(processInfo.pid);
      processMap.delete(terminalId);

      const io = req.app.get('io');
      io.to(`project:${projectId}`).emit('terminal:exit', {
        terminalId,
        code: 'SIGKILL',
      });

      res.json({
        success: true,
        message: 'Process killed successfully',
      });
    } catch (error) {
      processMap.delete(terminalId);
      throw new Error('Failed to kill process');
    }
  } catch (error) {
    console.error('Error killing process:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to kill process',
    });
  }
};

/**
 * Close Terminal Session
 */
export const closeTerminal = async (req, res) => {
  try {
    const { projectId, terminalId } = req.params;
    const userId = req.user.id;

    const session = terminalSessions.get(terminalId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Terminal session not found',
      });
    }

    // Verify user owns this terminal
    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Kill any running process
    if (processMap.has(terminalId)) {
      try {
        const proc = processMap.get(terminalId);
        process.kill(proc.pid);
      } catch (error) {
        // Process might already be dead
      }
      processMap.delete(terminalId);
    }

    // Remove session
    terminalSessions.delete(terminalId);

    res.json({
      success: true,
      message: 'Terminal closed successfully',
    });
  } catch (error) {
    console.error('Error closing terminal:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to close terminal',
    });
  }
};

/**
 * Get Terminal Sessions
 */
export const getTerminalSessions = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const sessions = Array.from(terminalSessions.values()).filter(
      (session) => session.projectId === projectId && session.userId === userId
    );

    res.json({
      success: true,
      data: {
        sessions: sessions.map((s) => ({
          id: s.id,
          shell: s.shell,
          cwd: s.cwd,
          createdAt: s.createdAt,
          hasActiveProcess: processMap.has(s.id),
        })),
      },
    });
  } catch (error) {
    console.error('Error getting terminal sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get terminal sessions',
    });
  }
};

/**
 * Cleanup on process exit
 */
process.on('exit', () => {
  // Kill all child processes
  for (const [terminalId, processInfo] of processMap.entries()) {
    try {
      process.kill(processInfo.pid);
    } catch (error) {
      // Ignore errors during cleanup
    }
  }
});
