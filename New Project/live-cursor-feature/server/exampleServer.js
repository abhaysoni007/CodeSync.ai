/**
 * Example Server Integration: Socket.IO with Live Cursor Handlers
 * 
 * This file demonstrates how to set up the server-side handlers
 * for the live cursor feature.
 */

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import initializeLiveCursorHandlers from './liveCursorHandler.js';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*', // Configure this for production
    methods: ['GET', 'POST']
  }
});

// Track active rooms and users (simple in-memory store)
const rooms = new Map();

// Handle socket connections
io.on('connection', (socket) => {
  console.log(`[Server] User connected: ${socket.id}`);

  /**
   * Handle room joining
   */
  socket.on('join-room', ({ roomId, userName }) => {
    try {
      // Join the socket.io room
      socket.join(roomId);

      // Track user in room
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }
      rooms.get(roomId).set(socket.id, { userName, socketId: socket.id });

      // Notify other users
      socket.to(roomId).emit('user-joined', {
        userId: socket.id,
        userName
      });

      console.log(`[Server] User ${userName} (${socket.id}) joined room ${roomId}`);
    } catch (error) {
      console.error('[Server] Error joining room:', error);
    }
  });

  /**
   * Initialize live cursor handlers
   * This handles all cursor-position-update, selection-change, and cursor-clear events
   */
  initializeLiveCursorHandlers(io, socket);

  /**
   * Handle code changes (example - not part of cursor feature)
   */
  socket.on('code-change', ({ roomId, code }) => {
    socket.to(roomId).emit('code-updated', { code });
  });

  /**
   * Handle disconnect
   */
  socket.on('disconnect', () => {
    console.log(`[Server] User disconnected: ${socket.id}`);

    // Remove user from all rooms
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        const user = users.get(socket.id);
        users.delete(socket.id);

        // Notify other users
        socket.to(roomId).emit('user-left', {
          userId: socket.id,
          userName: user.userName
        });

        // Clean up empty rooms
        if (users.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[Server] Live Cursor Server running on port ${PORT}`);
  console.log(`[Server] WebSocket endpoint: ws://localhost:${PORT}`);
});

export default app;
