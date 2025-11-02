import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import connectDB from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import projectRoutes from './routes/projects.js';
import roomRoutes from './routes/rooms.js';
import fileRoutes from './routes/files.js';
import callRoutes from './routes/calls.js';
import aiRoutes from './routes/ai.js';
import agentRoutes from './routes/agent.js';
import filesystemRoutes from './routes/filesystem.js';
import deltaRoutes from './routes/delta.js';
import terminalRoutes from './routes/terminal.js';

// Import Yjs handlers
import setupYjsHandlers from './services/SocketHandlers.js';
import setupDeltaSockets from './services/DeltaEngine/DeltaSocketHandlers.js';
import setupTerminalSockets from './services/TerminalSocketHandlers.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// ✅ Frontend domains - Remove trailing slashes to ensure exact match
const allowedOrigins = [
  process.env.FRONTEND_URL?.replace(/\/$/, ''),  // from .env, remove trailing slash
  "https://codesyncai.vercel.app",               // production frontend
  "http://localhost:5173",                       // local dev
  "http://localhost:3000",                       // fallback
].filter(Boolean); // removes undefined

// ✅ Centralized CORS logic
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn("❌ Blocked by CORS:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// ✅ Security
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Socket.IO Setup (same origins)
const io = new Server(httpServer, {
  cors: corsOptions,
  maxHttpBufferSize: 1e8, // 100 MB for large Yjs updates
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Setup Yjs collaboration handlers
setupYjsHandlers(io);

// Setup Terminal socket handlers
setupTerminalSockets(io);

// Make io accessible to routes
app.set('io', io);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/auth/', limiter);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Connect to MongoDB
connectDB();

// API Routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/projects', projectRoutes);
app.use('/rooms', roomRoutes);
app.use('/files', fileRoutes);
app.use('/rooms', callRoutes);
app.use('/ai', aiRoutes);
app.use('/ai', agentRoutes);
app.use('/api/filesystem', filesystemRoutes);
app.use('/delta', deltaRoutes);
app.use('/api/terminal', terminalRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Collaborative Code Editor Backend',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection handling is now in SocketHandlers.js

// Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

httpServer.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO server ready (Yjs enabled)`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV ||'development'}`);
  console.log(`✨ Real-time collaboration active`);
  console.log(`🔗 Bound to ${HOST}:${PORT}`);
});

httpServer.on('error', (err) => {
  console.error('❌ Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please free the port or use a different one.`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

export { app, io };
