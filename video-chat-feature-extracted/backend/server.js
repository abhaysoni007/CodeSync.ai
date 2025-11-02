const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory messages store per project (demo only)
const messagesByProject = new Map();

// Simple auth middleware: if socket.handshake.auth.token provided, use it as userId
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (token) {
      socket.userId = token; // demo: token === userId
      socket.username = `user-${token}`;
    } else {
      // fallback to socket id (anonymous)
      socket.userId = socket.id;
      socket.username = `anon-${socket.id.slice(0,6)}`;
    }
    next();
  } catch (err) {
    next(err);
  }
});

io.on('connection', (socket) => {
  console.log(`Connected: ${socket.username} (${socket.id})`);

  socket.on('join-project', ({ projectId }, cb) => {
    try {
      const room = `project:${projectId}`;
      socket.join(room);
      socket.currentProject = projectId;
      if (!messagesByProject.has(projectId)) messagesByProject.set(projectId, []);
      console.log(`${socket.username} joined ${room}`);
      cb && cb({ success: true });
    } catch (err) {
      cb && cb({ success: false, message: err.message });
    }
  });

  // Chat: send-message => store and broadcast
  socket.on('send-message', ({ content, type = 'text' }, cb) => {
    try {
      const projectId = socket.currentProject;
      if (!projectId) return cb && cb({ success: false, message: 'Not in project' });

      const msg = {
        _id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
        content,
        type,
        sender: { _id: socket.userId, username: socket.username },
        createdAt: new Date().toISOString()
      };
      messagesByProject.get(projectId).push(msg);

      const room = `project:${projectId}`;
      io.to(room).emit('new-message', msg);
      cb && cb({ success: true });
    } catch (err) {
      console.error('send-message error', err);
      cb && cb({ success: false, message: err.message });
    }
  });

  socket.on('get-messages', ({ limit = 50 }, cb) => {
    try {
      const projectId = socket.currentProject;
      if (!projectId) return cb && cb({ success: false, message: 'Not in project' });
      const arr = messagesByProject.get(projectId) || [];
      const msgs = arr.slice(-limit);
      cb && cb({ success: true, messages: msgs });
    } catch (err) {
      cb && cb({ success: false, message: err.message });
    }
  });

  // Typing indicator
  socket.on('typing', ({ isTyping }) => {
    const projectId = socket.currentProject;
    if (!projectId) return;
    const room = `project:${projectId}`;
    socket.to(room).emit('user-typing', { userId: socket.userId, username: socket.username, isTyping });
  });

  // WebRTC signaling events
  socket.on('webrtc:call-started', ({ projectId }) => {
    const room = `project:${projectId}`;
    socket.to(room).emit('webrtc:call-started', { from: socket.userId, username: socket.username });
  });

  socket.on('webrtc:offer', ({ to, offer }) => {
    const sockets = Array.from(io.sockets.sockets.values());
    const target = sockets.find(s => s.userId === to);
    if (target) target.emit('webrtc:offer', { from: socket.userId, offer, username: socket.username });
  });

  socket.on('webrtc:answer', ({ to, answer }) => {
    const sockets = Array.from(io.sockets.sockets.values());
    const target = sockets.find(s => s.userId === to);
    if (target) target.emit('webrtc:answer', { from: socket.userId, answer });
  });

  socket.on('webrtc:ice-candidate', ({ to, candidate }) => {
    const sockets = Array.from(io.sockets.sockets.values());
    const target = sockets.find(s => s.userId === to);
    if (target) target.emit('webrtc:ice-candidate', { from: socket.userId, candidate });
  });

  socket.on('webrtc:end-call', ({ projectId, userId, username }) => {
    const room = `project:${projectId}`;
    socket.to(room).emit('webrtc:call-ended', { userId, username });
  });

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.username} (${socket.id})`);
  });
});

const PORT = process.env.PORT || 4001;
server.listen(PORT, () => console.log(`Video-chat demo backend listening on ${PORT}`));
