/**
 * Which dev servers are up.
 *
 * WHY: the whole point of running `npm run dev` inside the IDE is to open the app afterwards, and
 * a user should not have to remember whether Vite picked 5173 or 5174. This answers "what is
 * listening right now" so the UI can offer a link.
 *
 * ponytail: probes a fixed list of well-known dev ports with a TCP connect instead of parsing
 * `netstat`/`lsof` per platform, or tracking child PIDs of every PTY. That means it reports what
 * is listening on the host, not strictly what this project started - fine for single-tenant local
 * dev, and the honest upgrade is per-workspace containers (each with its own network namespace),
 * not smarter parsing.
 */

import net from 'net';

const CANDIDATE_PORTS = [
  3000, 3001, 3002, 4000, 4173, 4200, 5000, 5001, 5173, 5174, 5175, 7000, 8000, 8080, 8081, 9000,
];

// What a port usually means, so the panel can say "frontend" instead of just a number.
const ROLE = {
  3000: 'frontend', 3001: 'frontend', 3002: 'frontend', 4200: 'frontend',
  5173: 'frontend', 5174: 'frontend', 5175: 'frontend', 4173: 'preview',
  4000: 'backend', 5000: 'backend', 5001: 'backend', 7000: 'backend',
  8000: 'backend', 8080: 'backend', 8081: 'backend', 9000: 'backend',
};

const PROBE_TIMEOUT_MS = 300;

const isListening = (port) =>
  new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(PROBE_TIMEOUT_MS);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, '127.0.0.1');
  });

/**
 * GET /api/terminal/:projectId/ports
 */
export const listPorts = async (req, res) => {
  try {
    const open = await Promise.all(
      CANDIDATE_PORTS.map(async (port) => ((await isListening(port)) ? port : null))
    );

    const ports = open
      .filter((port) => port !== null)
      .map((port) => ({
        port,
        role: ROLE[port] || 'service',
        url: `http://localhost:${port}`,
        status: 'running',
      }));

    res.json({ success: true, data: { ports } });
  } catch (error) {
    console.error('Port scan error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export default { listPorts };
