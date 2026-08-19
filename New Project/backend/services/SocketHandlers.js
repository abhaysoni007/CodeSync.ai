import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import { verifyToken } from '../utils/jwt.js';
import yjsManager, { normalizeKey } from '../services/YjsManager.js';
import Message from '../models/Message.js';
import Activity from '../models/Activity.js';
import RoomMember from '../models/RoomMember.js';
import Room from '../models/Room.js';
import File from '../models/File.js';
import { startWatching, stopWatching } from './ProjectWatcher.js';

// Debounce helper for activity logging
const activityDebounce = new Map();

/**
 * Helper function to log activity and broadcast in real-time
 */
const logAndBroadcastActivity = async (io, activityData) => {
  try {
    const activity = await Activity.logActivity(activityData);
    
    if (activity && io && activityData.projectId) {
      const populatedActivity = await Activity.findById(activity._id)
        .populate('userId', 'username email avatar');
      
      io.to(`project:${activityData.projectId}`).emit('activity:new', {
        activity: populatedActivity
      });
      
      console.log(`[Activity] Broadcasted ${activityData.type} activity to project:${activityData.projectId}`);
    }
    
    return activity;
  } catch (error) {
    console.error('[Activity] Error logging and broadcasting:', error);
    return null;
  }
};

const logFileEdit = (projectId, userId, username, filePath, fileName, io) => {
  const key = `${projectId}-${filePath}-${userId}`;
  
  if (activityDebounce.has(key)) {
    clearTimeout(activityDebounce.get(key));
  }
  
  const timeout = setTimeout(async () => {
    await logAndBroadcastActivity(io, {
      projectId,
      userId,
      type: 'file_edited',
      action: `${username} edited file ${fileName}`,
      metadata: {
        fileName,
        filePath
      }
    });
    activityDebounce.delete(key);
  }, 5000);

  activityDebounce.set(key, timeout);
};

/**
 * Generate consistent color for user based on ID
 */
export function generateUserColor(userId) {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B739', '#52C41A', '#1890FF', '#722ED1'
  ];
  
  if (!userId) return colors[0];
  const hash = String(userId).split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Socket.IO Handler for Yjs CRDT Collaboration, Project Rooms, Presence, and Chat
 */
export default function setupYjsHandlers(io) {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error('Invalid token'));
      }

      socket.userId = decoded.id;
      socket.username = decoded.username || 'Anonymous';
      socket.userEmail = decoded.email;
      next();
    } catch (error) {
      console.error('Socket auth error:', error.message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.username} (${socket.userId})`);

    // Store active rooms
    socket.currentProjects = new Set();
    socket.activeYjsRooms = new Set();

    /**
     * Join project room (Presence, Chat, File Events, Timeline)
     */
    socket.on('join-project', async ({ projectId }) => {
      try {
        if (!projectId) return;

        const projectRoom = `project:${projectId}`;
        socket.join(projectRoom);
        socket.currentProjects.add(projectId);

        // Watch the workspace while anyone is in it
        startWatching(io, projectId);

        // Log activity and broadcast in real-time
        await logAndBroadcastActivity(io, {
          projectId,
          userId: socket.userId,
          type: 'user_joined',
          action: `${socket.username} joined the project`,
          metadata: {}
        });

        // Broadcast user joined
        socket.to(projectRoom).emit('user-joined', {
          userId: socket.userId,
          username: socket.username,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });

        console.log(`[Project] ${socket.username} joined project:${projectId}`);
      } catch (error) {
        console.error('[Project] Error joining project:', error);
      }
    });

    /**
     * Leave project room
     */
    socket.on('leave-project', ({ projectId }) => {
      try {
        if (!projectId) return;
        const projectRoom = `project:${projectId}`;
        socket.leave(projectRoom);
        socket.currentProjects.delete(projectId);
        stopWatching(projectId);

        socket.to(projectRoom).emit('user-left', {
          userId: socket.userId,
          username: socket.username,
          socketId: socket.id
        });
      } catch (error) {
        console.error('[Project] Error leaving project:', error);
      }
    });

    /**
     * Yjs CRDT: Join collaborative file document
     */
    socket.on('yjs:join-file', async ({ projectId, filePath, initialContent }, callback) => {
      try {
        if (!projectId || !filePath) {
          if (callback) callback({ success: false, message: 'Invalid projectId or filePath' });
          return;
        }

        const pathStr = Array.isArray(filePath) ? filePath.join('/') : String(filePath);
        const fileRoom = `project:${projectId}:file:${pathStr}`;
        
        socket.join(fileRoom);
        socket.activeYjsRooms.add(fileRoom);

        const ydoc = await yjsManager.getDocument(projectId, filePath, initialContent);
        const awareness = yjsManager.getAwareness(projectId, filePath);

        // Send Step 1 to client so client syncs its state
        const encoder = encoding.createEncoder();
        syncProtocol.writeSyncStep1(encoder, ydoc);
        
        socket.emit('yjs:sync', {
          projectId,
          filePath,
          update: encoding.toUint8Array(encoder)
        });

        // Send awareness state to the joining client
        if (awareness) {
          const awarenessEncoder = encoding.createEncoder();
          encoding.writeVarUint8Array(
            awarenessEncoder,
            awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awareness.getStates().keys()))
          );
          socket.emit('yjs:awareness', {
            projectId,
            filePath,
            update: encoding.toUint8Array(awarenessEncoder)
          });
        }

        console.log(`[Yjs] ${socket.username} joined doc ${projectId}:${pathStr}`);
        if (callback) callback({ success: true, fileRoom });
      } catch (error) {
        console.error('[Yjs] Error joining file doc:', error);
        if (callback) callback({ success: false, message: error.message });
      }
    });

    /**
     * Yjs CRDT: Binary sync message relay
     */
    socket.on('yjs:sync', async ({ projectId, filePath, update }) => {
      try {
        if (!projectId || !filePath || !update) return;

        const pathStr = Array.isArray(filePath) ? filePath.join('/') : String(filePath);
        const fileRoom = `project:${projectId}:file:${pathStr}`;
        const ydoc = await yjsManager.getDocument(projectId, filePath);

        const uint8 = update instanceof Uint8Array ? update : new Uint8Array(update);
        const decoder = decoding.createDecoder(uint8);
        const encoder = encoding.createEncoder();

        const messageType = syncProtocol.readSyncMessage(decoder, encoder, ydoc, socket);

        // If a sync reply is needed (e.g. Step 2 in response to Step 1), send back to client
        if (encoding.length(encoder) > 0) {
          socket.emit('yjs:sync', {
            projectId,
            filePath,
            update: encoding.toUint8Array(encoder)
          });
        }

        // If an update was received, broadcast it to all other peers in this file room
        if (messageType === syncProtocol.messageYjsUpdate || messageType === syncProtocol.messageYjsSyncStep2) {
          socket.to(fileRoom).emit('yjs:sync', {
            projectId,
            filePath,
            update: uint8
          });

          const fileName = pathStr.split('/').pop() || pathStr;
          logFileEdit(projectId, socket.userId, socket.username, pathStr, fileName, io);
        }
      } catch (error) {
        console.error('[Yjs] Error handling yjs:sync:', error);
      }
    });

    /**
     * Yjs CRDT: Awareness (Cursor & Selection sync)
     */
    socket.on('yjs:awareness', ({ projectId, filePath, update }) => {
      try {
        if (!projectId || !filePath || !update) return;

        const pathStr = Array.isArray(filePath) ? filePath.join('/') : String(filePath);
        const fileRoom = `project:${projectId}:file:${pathStr}`;
        const awareness = yjsManager.getAwareness(projectId, filePath);

        if (awareness) {
          const uint8 = update instanceof Uint8Array ? update : new Uint8Array(update);
          awarenessProtocol.applyAwarenessUpdate(awareness, uint8, socket);
          
          // Relay awareness update to other peers in this file room
          socket.to(fileRoom).emit('yjs:awareness', {
            projectId,
            filePath,
            update: uint8
          });
        }
      } catch (error) {
        console.error('[Yjs] Error handling yjs:awareness:', error);
      }
    });

    /**
     * Yjs CRDT: Leave collaborative file document
     */
    socket.on('yjs:leave-file', ({ projectId, filePath }) => {
      try {
        if (!projectId || !filePath) return;
        const pathStr = Array.isArray(filePath) ? filePath.join('/') : String(filePath);
        const fileRoom = `project:${projectId}:file:${pathStr}`;
        
        socket.leave(fileRoom);
        socket.activeYjsRooms.delete(fileRoom);

        // Check if any clients remain in this file room
        const room = io.sockets.adapter.rooms.get(fileRoom);
        if (!room || room.size === 0) {
          yjsManager.closeDocument(projectId, filePath);
        }
      } catch (error) {
        console.error('[Yjs] Error leaving file doc:', error);
      }
    });

    /**
     * Project Chat: Message sending
     */
    socket.on('chat-message', async (data, callback) => {
      try {
        const { projectId, message } = data;
        
        if (!projectId || !message?.trim()) {
          if (callback) callback({ success: false, message: 'Project ID and message are required' });
          return;
        }

        // Save message to MongoDB
        const newMessage = new Message({
          projectId,
          userId: socket.userId,
          username: socket.username,
          message: message.trim(),
          timestamp: new Date()
        });

        await newMessage.save();

        const messageData = {
          id: newMessage._id,
          projectId,
          userId: socket.userId,
          username: socket.username,
          message: message.trim(),
          timestamp: newMessage.timestamp.toISOString()
        };

        // Broadcast to everyone in project room
        io.to(`project:${projectId}`).emit('chat-message', messageData);

        // Log activity
        await logAndBroadcastActivity(io, {
          projectId,
          userId: socket.userId,
          type: 'chat_message',
          action: `${socket.username} sent a message`,
          metadata: {
            message: message.trim()
          }
        });

        if (callback) callback({ success: true, message: messageData });
      } catch (error) {
        console.error('[Chat] Error sending message:', error);
        if (callback) callback({ success: false, message: error.message });
      }
    });

    /**
     * Typing indicator
     */
    socket.on('user-typing', ({ projectId, isTyping }) => {
      if (!projectId) return;
      socket.to(`project:${projectId}`).emit('user-typing', {
        userId: socket.userId,
        username: socket.username,
        isTyping
      });
    });

    /**
     * Disconnection handling
     */
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.username} (${socket.userId})`);

      // Leave project rooms
      socket.currentProjects.forEach(projectId => {
        stopWatching(projectId);
        socket.to(`project:${projectId}`).emit('user-left', {
          userId: socket.userId,
          username: socket.username,
          socketId: socket.id
        });
      });

      // Clean up empty Yjs file rooms
      socket.activeYjsRooms.forEach(fileRoom => {
        const room = io.sockets.adapter.rooms.get(fileRoom);
        if (!room || room.size === 0) {
          const parts = fileRoom.split(':file:');
          if (parts.length === 2) {
            const projectId = parts[0].replace('project:', '');
            const filePath = parts[1];
            yjsManager.closeDocument(projectId, filePath);
          }
        }
      });
    });
  });
}
