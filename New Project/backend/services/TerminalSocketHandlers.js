/**
 * Terminal socket handlers.
 *
 * WHY a PTY: the previous version ran one `spawn()` per submitted line, which cannot support a
 * shell the way VS Code does - `cd` did not persist, nothing could read stdin, there was no
 * history/completion, no window size, and interactive programs (python, node, vim) hung. A
 * pseudo-terminal gives the shell a real terminal device, so we only relay bytes: keystrokes in,
 * rendered output out. All line editing now belongs to the shell, not to our JS.
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import pty from 'node-pty';
import { executionBlockedNotice } from '../config/execution.js';
import { mirrorProjectToDisk } from '../controllers/FileSystemController.js';
import Project from '../models/Project.js';

// terminalId -> { socketId, projectId, proc, cwd }
const sessions = new Map();

// WHY a cap: each session is a real OS process. Without a limit a client loop can fork-bomb the host.
const MAX_SESSIONS_PER_SOCKET = 8;

const projectDir = (projectId) => path.join(process.cwd(), 'projects', projectId);

/**
 * A terminal is a shell on the host, so being logged in is not enough - the caller has to belong to
 * the project whose directory they are asking for.
 */
const canUseProject = async (projectId, userId) => {
  if (!userId) return false;
  const project = await Project.findOne({
    _id: projectId,
    $or: [{ ownerId: userId }, { 'members.userId': userId }],
  }).select('_id');
  return Boolean(project);
};

// The shell a user expects on this platform. Windows gets PowerShell unless they asked otherwise.
const shellFor = (requested) => {
  if (os.platform() === 'win32') {
    if (requested === 'cmd') return { file: 'cmd.exe', args: [] };
    if (requested === 'bash') return { file: 'bash.exe', args: ['-l'] };
    return { file: 'powershell.exe', args: ['-NoLogo'] };
  }
  const file = process.env.SHELL || (os.platform() === 'darwin' ? '/bin/zsh' : '/bin/bash');
  return { file, args: ['-l'] };
};

const countSessions = (socketId) => {
  let count = 0;
  for (const session of sessions.values()) {
    if (session.socketId === socketId) count += 1;
  }
  return count;
};

// Only the socket that created a terminal may type into it or resize it.
const ownedSession = (terminalId, socket) => {
  const session = sessions.get(terminalId);
  if (!session || session.socketId !== socket.id) return null;
  return session;
};

const destroySession = (terminalId) => {
  const session = sessions.get(terminalId);
  if (!session) return;
  try {
    session.proc.kill();
  } catch (error) {
    console.error('[Terminal] Error killing pty:', error.message);
  }
  sessions.delete(terminalId);
};

export const setupTerminalSockets = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Terminal] Socket connected: ${socket.id}`);

    /**
     * Create a terminal: spawn a shell in a PTY rooted at the project directory.
     */
    socket.on('terminal:create', async ({ terminalId, projectId, shell, cols = 80, rows = 24 }) => {
      try {
        const blocked = executionBlockedNotice();
        if (blocked) {
          socket.emit('terminal:error', { terminalId, error: blocked.message });
          return;
        }

        if (!terminalId || !projectId) {
          socket.emit('terminal:error', {
            terminalId,
            error: 'terminal:create needs both terminalId and projectId',
          });
          return;
        }

        if (!(await canUseProject(projectId, socket.userId))) {
          socket.emit('terminal:error', {
            terminalId,
            error: 'You do not have access to this project.',
          });
          return;
        }

        // A reconnect or hot reload can re-create an id we already hold; replace the old pty
        // instead of leaking it.
        destroySession(terminalId);

        if (countSessions(socket.id) >= MAX_SESSIONS_PER_SOCKET) {
          socket.emit('terminal:error', {
            terminalId,
            error: `Terminal limit reached (${MAX_SESSIONS_PER_SOCKET} per connection).`,
          });
          return;
        }

        const cwd = projectDir(projectId);
        fs.mkdirSync(cwd, { recursive: true });

        // The editor keeps files in a JSON tree; put them on disk so the shell can run them.
        await mirrorProjectToDisk(projectId);

        const { file, args } = shellFor(shell);
        const proc = pty.spawn(file, args, {
          name: 'xterm-256color',
          cols,
          rows,
          cwd,
          env: {
            ...process.env,
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
            FORCE_COLOR: '1',
            PYTHONUNBUFFERED: '1',
            PYTHONIOENCODING: 'utf-8',
          },
        });

        sessions.set(terminalId, { socketId: socket.id, projectId, proc, cwd });

        // Output goes to the creating socket only: a shell on the host is not something to
        // broadcast to every collaborator in the room.
        proc.onData((data) => socket.emit('terminal:output', { terminalId, output: data }));

        proc.onExit(({ exitCode }) => {
          sessions.delete(terminalId);
          socket.emit('terminal:exit', { terminalId, code: exitCode });
        });

        socket.emit('terminal:created', { terminalId, cwd, shell: file, pid: proc.pid });
        console.log(`[Terminal] ${terminalId} -> ${file} (pid ${proc.pid}) in ${cwd}`);
      } catch (error) {
        console.error('[Terminal] Error creating terminal:', error);
        socket.emit('terminal:error', { terminalId, error: error.message });
      }
    });

    /**
     * Raw keystrokes from xterm: Enter, Ctrl+C, arrows, Tab. The shell interprets them, we do not.
     */
    socket.on('terminal:input', ({ terminalId, data }) => {
      const session = ownedSession(terminalId, socket);
      if (!session || typeof data !== 'string') return;
      session.proc.write(data);
    });

    /**
     * Window size. Without this the shell wraps at the wrong column and full-screen apps misdraw.
     */
    socket.on('terminal:resize', ({ terminalId, cols, rows }) => {
      const session = ownedSession(terminalId, socket);
      if (!session) return;
      try {
        session.proc.resize(Math.max(2, cols | 0), Math.max(2, rows | 0));
      } catch (error) {
        console.error('[Terminal] Resize failed:', error.message);
      }
    });

    /**
     * Type a whole command at once (Run button, or any programmatic caller).
     */
    socket.on('terminal:execute', ({ terminalId, command }) => {
      if (!command) return;
      const session = ownedSession(terminalId, socket);
      if (!session) {
        socket.emit('terminal:error', { terminalId, error: 'Terminal session not found' });
        return;
      }
      session.proc.write(`${command}\r`);
    });

    /**
     * Run the file the user clicked. The mirror already put it on disk, so this is exactly what a
     * user typing the command themselves would do.
     */
    socket.on('terminal:run-file', async ({ projectId, command, fileName }) => {
      try {
        const blocked = executionBlockedNotice();
        if (blocked) {
          socket.emit('terminal:error', { error: blocked.message });
          return;
        }

        // Owning a session for this project is itself the access check - terminal:create made it.
        const entry = [...sessions.entries()].find(
          ([, session]) => session.socketId === socket.id && session.projectId === projectId
        );
        if (!entry) {
          socket.emit('terminal:error', {
            error: 'No terminal open. Open the terminal panel, then run again.',
          });
          return;
        }

        // Refresh the mirror: the file may have been saved a moment ago.
        await mirrorProjectToDisk(projectId);

        const [terminalId, session] = entry;
        socket.emit('terminal:output', {
          terminalId,
          output: `\r\n\x1b[36m> Running ${fileName}\x1b[0m\r\n`,
        });
        session.proc.write(`${command}\r`);
      } catch (error) {
        console.error('[Terminal] Error running file:', error);
        socket.emit('terminal:error', { error: error.message });
      }
    });

    /**
     * Interrupt the foreground program - the same byte Ctrl+C sends.
     */
    socket.on('terminal:kill', ({ terminalId }) => {
      const session = ownedSession(terminalId, socket);
      if (session) session.proc.write('\x03');
    });

    socket.on('terminal:close', ({ terminalId }) => {
      if (ownedSession(terminalId, socket)) destroySession(terminalId);
    });

    socket.on('disconnect', () => {
      console.log(`[Terminal] Socket disconnected: ${socket.id}`);
      for (const [terminalId, session] of sessions.entries()) {
        if (session.socketId === socket.id) destroySession(terminalId);
      }
    });
  });
};

export default setupTerminalSockets;
