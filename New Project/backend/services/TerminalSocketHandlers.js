/**
 * Terminal Socket Handlers
 * Real-time terminal communication via Socket.io
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Store active terminal sessions per socket
const terminalSessions = new Map();
const processMap = new Map();

/**
 * Setup Terminal Socket Handlers
 */
export const setupTerminalSockets = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Terminal] Socket connected: ${socket.id}`);

    /**
     * Create Terminal Session
     */
    socket.on('terminal:create', async ({ terminalId, projectId, shell = 'powershell' }) => {
      try {
        console.log(`[Terminal] Creating terminal: ${terminalId} for project: ${projectId}`);

        // Get project directory
        const projectDir = path.join(process.cwd(), 'projects', projectId);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(projectDir)) {
          fs.mkdirSync(projectDir, { recursive: true });
        }

        // Store session
        terminalSessions.set(terminalId, {
          socketId: socket.id,
          projectId,
          shell,
          cwd: projectDir,
          createdAt: Date.now(),
        });

        // Join project room
        socket.join(`project:${projectId}`);

        // Emit success
        socket.emit('terminal:created', {
          terminalId,
          cwd: projectDir,
        });
      } catch (error) {
        console.error('[Terminal] Error creating terminal:', error);
        socket.emit('terminal:error', {
          terminalId,
          error: error.message,
        });
      }
    });

    /**
     * Execute Command
     */
    socket.on('terminal:execute', async ({ terminalId, projectId, command }) => {
      try {
        console.log(`[Terminal] Executing command in ${terminalId}: ${command}`);

        const session = terminalSessions.get(terminalId);
        if (!session) {
          socket.emit('terminal:error', {
            terminalId,
            error: 'Terminal session not found',
          });
          return;
        }

        // Kill any existing process
        if (processMap.has(terminalId)) {
          const oldProcess = processMap.get(terminalId);
          try {
            if (os.platform() === 'win32') {
              spawn('taskkill', ['/pid', oldProcess.pid.toString(), '/f', '/t']);
            } else {
              process.kill(-oldProcess.pid);
            }
          } catch (error) {
            console.error('[Terminal] Error killing old process:', error);
          }
          processMap.delete(terminalId);
        }

        // Determine shell and args
        let shell, args;
        if (os.platform() === 'win32') {
          if (session.shell === 'cmd') {
            shell = 'cmd.exe';
            args = ['/c', command];
          } else if (session.shell === 'bash') {
            shell = 'bash.exe';
            args = ['-c', command];
          } else {
            shell = 'powershell.exe';
            args = ['-NoProfile', '-Command', command];
          }
        } else if (os.platform() === 'darwin') {
          shell = 'zsh';
          args = ['-c', command];
        } else {
          shell = 'bash';
          args = ['-c', command];
        }

        // Spawn process
        const childProcess = spawn(shell, args, {
          cwd: session.cwd,
          env: {
            ...process.env,
            FORCE_COLOR: '1',
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
          },
          detached: os.platform() !== 'win32', // For Unix systems
          windowsHide: true,
        });

        // Store process
        processMap.set(terminalId, childProcess);

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
            output,
          });
        });

        // Handle exit
        childProcess.on('close', (code) => {
          console.log(`[Terminal] Process exited with code: ${code}`);
          processMap.delete(terminalId);
          io.to(`project:${projectId}`).emit('terminal:exit', {
            terminalId,
            code,
          });
        });

        // Handle error
        childProcess.on('error', (error) => {
          console.error('[Terminal] Process error:', error);
          processMap.delete(terminalId);
          io.to(`project:${projectId}`).emit('terminal:error', {
            terminalId,
            error: error.message,
          });
        });

        // Set timeout (2 minutes)
        setTimeout(() => {
          if (processMap.has(terminalId)) {
            const proc = processMap.get(terminalId);
            try {
              if (os.platform() === 'win32') {
                spawn('taskkill', ['/pid', proc.pid.toString(), '/f', '/t']);
              } else {
                process.kill(-proc.pid);
              }
            } catch (error) {
              console.error('[Terminal] Error killing timeout process:', error);
            }
            processMap.delete(terminalId);
            io.to(`project:${projectId}`).emit('terminal:output', {
              terminalId,
              output: '\r\n\x1b[33m[Process killed - 2 minute timeout]\x1b[0m\r\n',
            });
          }
        }, 120000);
      } catch (error) {
        console.error('[Terminal] Error executing command:', error);
        socket.emit('terminal:error', {
          terminalId,
          error: error.message,
        });
      }
    });

    /**
     * Run File - Shortcut to execute file in terminal
     */
    socket.on('terminal:run-file', async ({ projectId, command, fileName, filePath }) => {
      try {
        console.log(`[Terminal] Running file: ${fileName} with command: ${command}`);
        console.log(`[Terminal] File path: ${filePath}`);

        // Find or create a terminal session for this user
        let terminalId = null;
        let session = null;
        
        for (const [id, sess] of terminalSessions.entries()) {
          if (sess.socketId === socket.id && sess.projectId === projectId) {
            terminalId = id;
            session = sess;
            break;
          }
        }

        // If no terminal exists, create one
        if (!terminalId) {
          terminalId = `terminal-run-${Date.now()}`;
          const projectDir = path.join(process.cwd(), 'projects', projectId);
          
          if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true });
          }

          session = {
            socketId: socket.id,
            projectId,
            shell: 'powershell',
            cwd: projectDir,
            createdAt: Date.now(),
          };

          terminalSessions.set(terminalId, session);
          socket.join(`project:${projectId}`);
        }

        // Import File model dynamically to avoid circular dependencies
        const File = (await import('../models/File.js')).default;
        
        // Find file in database
        let fileDoc = await File.findOne({
          projectId,
          path: filePath || fileName,
          isDeleted: false
        });

        if (!fileDoc) {
          console.error(`[Terminal] File not found in database: ${filePath || fileName}`);
          
          // Try alternative search (maybe file was saved with different path format)
          const alternativeFile = await File.findOne({
            projectId,
            name: fileName,
            isDeleted: false
          });
          
          if (alternativeFile) {
            console.log(`[Terminal] Found file with alternative search: ${alternativeFile.path}`);
            // Use the alternative file
            fileDoc = alternativeFile;
          } else {
            io.to(`project:${projectId}`).emit('terminal:output', {
              terminalId,
              output: `\r\n\x1b[31m━━━━━ Error ━━━━━\x1b[0m\r\n\x1b[31mFile not found in project: ${filePath || fileName}\x1b[0m\r\n\x1b[90mPlease make sure the file is saved before running.\x1b[0m\r\n`,
            });
            return;
          }
        }

        // Verify file has content
        if (!fileDoc.content && fileDoc.content !== '') {
          console.warn(`[Terminal] File has no content: ${fileName}`);
        }

        // Create file on filesystem temporarily
        const fileFullPath = path.join(session.cwd, filePath || fileName);
        const fileDir = path.dirname(fileFullPath);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        
        // Write file content to filesystem
        fs.writeFileSync(fileFullPath, fileDoc.content || '', 'utf8');
        console.log(`[Terminal] File written to: ${fileFullPath}`);

        // Emit output header
        io.to(`project:${projectId}`).emit('terminal:output', {
          terminalId,
          output: `\r\n\x1b[36m━━━━━ Running: ${fileName} ━━━━━\x1b[0m\r\n\x1b[90m$ ${command}\x1b[0m\r\n`,
        });

        // Kill any existing process for this terminal
        if (processMap.has(terminalId)) {
          console.log(`[Terminal] Killing existing process for terminal: ${terminalId}`);
          io.to(`project:${projectId}`).emit('terminal:output', {
            terminalId,
            output: '\x1b[33m[Stopping previous process...]\x1b[0m\r\n',
          });
          
          const oldProcess = processMap.get(terminalId);
          try {
            if (os.platform() === 'win32') {
              spawn('taskkill', ['/pid', oldProcess.pid.toString(), '/f', '/t']);
            } else {
              process.kill(-oldProcess.pid);
            }
          } catch (error) {
            console.error('[Terminal] Error killing old process:', error);
          }
          processMap.delete(terminalId);
        }

        // Determine shell and args
        let shell, args;
        if (os.platform() === 'win32') {
          shell = 'powershell.exe';
          args = ['-NoProfile', '-Command', command];
        } else if (os.platform() === 'darwin') {
          shell = 'zsh';
          args = ['-c', command];
        } else {
          shell = 'bash';
          args = ['-c', command];
        }

        console.log(`[Terminal] Executing with shell: ${shell}, args:`, args);
        console.log(`[Terminal] Working directory: ${session.cwd}`);

        // Spawn process
        const childProcess = spawn(shell, args, {
          cwd: session.cwd,
          env: {
            ...process.env,
            FORCE_COLOR: '1',
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
            PYTHONUNBUFFERED: '1', // Important for Python output
            PYTHONIOENCODING: 'utf-8', // Ensure proper encoding
          },
          detached: os.platform() !== 'win32',
          windowsHide: true,
          shell: true, // Use shell to resolve commands
        });

        // Store process
        processMap.set(terminalId, childProcess);

        // Handle stdout
        childProcess.stdout.on('data', (data) => {
          const output = data.toString();
          console.log(`[Terminal] Output from ${fileName}:`, output);
          io.to(`project:${projectId}`).emit('terminal:output', {
            terminalId,
            output,
          });
        });

        // Handle stderr
        childProcess.stderr.on('data', (data) => {
          const output = data.toString();
          console.log(`[Terminal] Error output from ${fileName}:`, output);
          io.to(`project:${projectId}`).emit('terminal:output', {
            terminalId,
            output,
          });
        });

        // Handle exit
        childProcess.on('close', (code) => {
          console.log(`[Terminal] ${fileName} exited with code: ${code}`);
          processMap.delete(terminalId);
          io.to(`project:${projectId}`).emit('terminal:output', {
            terminalId,
            output: `\r\n\x1b[${code === 0 ? '32' : '31'}m━━━━━ Process exited with code ${code} ━━━━━\x1b[0m\r\n`,
          });
          io.to(`project:${projectId}`).emit('terminal:exit', {
            terminalId,
            code,
          });
          
          // Optional: Clean up temporary file after execution
          // Commented out to keep files for debugging/future runs
          // try {
          //   if (fs.existsSync(fileFullPath)) {
          //     fs.unlinkSync(fileFullPath);
          //     console.log(`[Terminal] Cleaned up temporary file: ${fileFullPath}`);
          //   }
          // } catch (cleanupError) {
          //   console.error(`[Terminal] Error cleaning up file:`, cleanupError);
          // }
        });

        // Handle error
        childProcess.on('error', (error) => {
          console.error('[Terminal] Process error:', error);
          processMap.delete(terminalId);
          io.to(`project:${projectId}`).emit('terminal:output', {
            terminalId,
            output: `\r\n\x1b[31mError: ${error.message}\x1b[0m\r\n`,
          });
          io.to(`project:${projectId}`).emit('terminal:error', {
            terminalId,
            error: error.message,
          });
        });

        // Set timeout (2 minutes)
        setTimeout(() => {
          if (processMap.has(terminalId)) {
            const proc = processMap.get(terminalId);
            try {
              if (os.platform() === 'win32') {
                spawn('taskkill', ['/pid', proc.pid.toString(), '/f', '/t']);
              } else {
                process.kill(-proc.pid);
              }
            } catch (error) {
              console.error('[Terminal] Error killing timeout process:', error);
            }
            processMap.delete(terminalId);
            io.to(`project:${projectId}`).emit('terminal:output', {
              terminalId,
              output: '\r\n\x1b[33m[Process killed - 2 minute timeout]\x1b[0m\r\n',
            });
          }
        }, 120000);

      } catch (error) {
        console.error('[Terminal] Error running file:', error);
        socket.emit('terminal:error', {
          error: error.message,
        });
      }
    });

    /**
     * Kill Process
     */
    socket.on('terminal:kill', async ({ terminalId, projectId }) => {
      try {
        console.log(`[Terminal] Killing process: ${terminalId}`);

        if (!processMap.has(terminalId)) {
          console.log(`[Terminal] No running process found for: ${terminalId}`);
          // Don't emit error - process might have already finished
          io.to(`project:${projectId}`).emit('terminal:output', {
            terminalId,
            output: '\r\n\x1b[90m[No running process to kill]\x1b[0m\r\n',
          });
          return;
        }

        const childProcess = processMap.get(terminalId);
        
        try {
          if (os.platform() === 'win32') {
            // Windows: Use taskkill to kill process tree
            spawn('taskkill', ['/pid', childProcess.pid.toString(), '/f', '/t']);
          } else {
            // Unix: Kill process group
            process.kill(-childProcess.pid);
          }
        } catch (error) {
          console.error('[Terminal] Error killing process:', error);
        }

        processMap.delete(terminalId);

        io.to(`project:${projectId}`).emit('terminal:exit', {
          terminalId,
          code: 'SIGKILL',
        });
      } catch (error) {
        console.error('[Terminal] Error killing process:', error);
        socket.emit('terminal:error', {
          terminalId,
          error: error.message,
        });
      }
    });

    /**
     * Close Terminal
     */
    socket.on('terminal:close', async ({ terminalId, projectId }) => {
      try {
        console.log(`[Terminal] Closing terminal: ${terminalId}`);

        // Kill any running process
        if (processMap.has(terminalId)) {
          const childProcess = processMap.get(terminalId);
          try {
            if (os.platform() === 'win32') {
              spawn('taskkill', ['/pid', childProcess.pid.toString(), '/f', '/t']);
            } else {
              process.kill(-childProcess.pid);
            }
          } catch (error) {
            console.error('[Terminal] Error killing process:', error);
          }
          processMap.delete(terminalId);
        }

        // Remove session
        terminalSessions.delete(terminalId);
      } catch (error) {
        console.error('[Terminal] Error closing terminal:', error);
      }
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', () => {
      console.log(`[Terminal] Socket disconnected: ${socket.id}`);

      // Clean up terminals owned by this socket
      const terminalsToClean = [];
      for (const [terminalId, session] of terminalSessions.entries()) {
        if (session.socketId === socket.id) {
          terminalsToClean.push(terminalId);
        }
      }

      // Kill processes and remove sessions
      terminalsToClean.forEach((terminalId) => {
        if (processMap.has(terminalId)) {
          const childProcess = processMap.get(terminalId);
          try {
            if (os.platform() === 'win32') {
              spawn('taskkill', ['/pid', childProcess.pid.toString(), '/f', '/t']);
            } else {
              process.kill(-childProcess.pid);
            }
          } catch (error) {
            console.error('[Terminal] Error killing process on disconnect:', error);
          }
          processMap.delete(terminalId);
        }
        terminalSessions.delete(terminalId);
      });
    });
  });
};

export default setupTerminalSockets;
