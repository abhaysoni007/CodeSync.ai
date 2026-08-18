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

const logFileEdit = (projectId, userId, username, fileId, fileName, io) => {
  const key = `${projectId}-${fileId}-${userId}`;
  
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
        fileId
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
 * Socket.IO Handlers for Real-Time Collaboration & Yjs CRDT
 */
export const setupYjsHandlers = (io) => {
  // Socket.IO middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = verifyToken(token);
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;
      socket.username = decoded.username;
      
      next();
    } catch (error) {
      console.error('❌ Token verification failed in socket:', error.message);
      next(new Error('Invalid authentication token'));
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
     * Yjs CRDT: Awareness (Remote cursors, selections, nametags)
     */
    socket.on('yjs:awareness', async ({ projectId, filePath, update }) => {
      try {
        if (!projectId || !filePath || !update) return;

        const pathStr = Array.isArray(filePath) ? filePath.join('/') : String(filePath);
        const fileRoom = `project:${projectId}:file:${pathStr}`;
        const awareness = yjsManager.getAwareness(projectId, filePath);

        if (awareness) {
          const uint8 = update instanceof Uint8Array ? update : new Uint8Array(update);
          awarenessProtocol.applyAwarenessUpdate(awareness, uint8, socket);
          
          // Broadcast awareness update to other peers in this file room
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
        const pathStr = Array.isArray(filePath) ? filePath.join('/') : String(filePath || '');
        const fileRoom = `project:${projectId}:file:${pathStr}`;
        socket.leave(fileRoom);
        socket.activeYjsRooms.delete(fileRoom);
      } catch (error) {
        console.error('[Yjs] Error leaving file doc:', error);
      }
    });

    /**
     * Real-time cursor coordinates (General presence)
     */
    socket.on('cursor-update', ({ projectId, fileId, position, userId, username, color }) => {
      const projectRoom = `project:${projectId}`;
      socket.to(projectRoom).emit('cursor-update', {
        fileId,
        position,
        userId: userId || socket.userId,
        username: username || socket.username,
        color: color || generateUserColor(socket.userId),
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * Project Real-Time Chat
     */
    socket.on('chat-message', async ({ projectId, message }, callback) => {
      try {
        if (!projectId || !message?.trim()) {
          if (callback) callback({ success: false, message: 'Invalid message data' });
          return;
        }

        const projectRoom = `project:${projectId}`;
        
        const newMessage = await Message.create({
          projectId,
          senderId: socket.userId,
          content: message.trim(),
          type: 'text'
        });

        await newMessage.populate('senderId', 'username email avatar');

        const messageData = {
          _id: newMessage._id,
          userId: socket.userId,
          username: socket.username,
          avatar: newMessage.senderId?.avatar,
          message: newMessage.content,
          timestamp: newMessage.createdAt,
          type: 'text'
        };

        io.to(projectRoom).emit('chat-message', messageData);

        await logAndBroadcastActivity(io, {
          projectId,
          userId: socket.userId,
          type: 'chat_message',
          action: `${socket.username} sent a message`,
          metadata: {
            messageId: newMessage._id,
            preview: message.trim().substring(0, 50)
          }
        });

        if (callback) callback({ success: true, message: messageData });
      } catch (error) {
        console.error('[Chat] Error sending message:', error);
        if (callback) callback({ success: false, message: error.message });
      }
    });

    /**
     * Typing indicators
     */
    socket.on('typing', ({ projectId, isTyping }) => {
      const projectRoom = `project:${projectId}`;
      socket.to(projectRoom).emit('user-typing', {
        userId: socket.userId,
        username: socket.username,
        isTyping
      });
    });

    /**
     * Unified Filesystem Real-Time Broadcasts
     */
    socket.on('filesystem:create', async ({ projectId, item }) => {
      const projectRoom = `project:${projectId}`;
      socket.to(projectRoom).emit('filesystem:created', { item });

      await logAndBroadcastActivity(io, {
        projectId,
        userId: socket.userId,
        type: `${item?.type || 'file'}_created`,
        action: `${socket.username} created ${item?.type || 'file'} ${item?.name || 'new item'}`,
        metadata: { fileName: item?.name, path: item?.path }
      });
    });

    socket.on('filesystem:rename', async ({ projectId, oldPath, newPath, newName }) => {
      const projectRoom = `project:${projectId}`;
      socket.to(projectRoom).emit('filesystem:renamed', { oldPath, newPath, newName });

      await logAndBroadcastActivity(io, {
        projectId,
        userId: socket.userId,
        type: 'file_renamed',
        action: `${socket.username} renamed to ${newName}`,
        metadata: { oldPath, newPath, newName }
      });
    });

    socket.on('filesystem:delete', async ({ projectId, path, deletedNode }) => {
      const projectRoom = `project:${projectId}`;
      socket.to(projectRoom).emit('filesystem:deleted', { path });

      await logAndBroadcastActivity(io, {
        projectId,
        userId: socket.userId,
        type: `${deletedNode?.type || 'file'}_deleted`,
        action: `${socket.username} deleted ${deletedNode?.type || 'file'} ${deletedNode?.name || 'an item'}`,
        metadata: { fileName: deletedNode?.name, nodeId: deletedNode?.id }
      });
    });

    socket.on('filesystem:file-updated', ({ projectId, path, content }) => {
      const projectRoom = `project:${projectId}`;
      socket.to(projectRoom).emit('filesystem:file-updated', {
        path,
        content,
        userId: socket.userId,
        username: socket.username,
        timestamp: new Date().toISOString()
      });
    });

    /**
     * WebRTC Signaling
     */
    socket.on('webrtc:call-started', ({ projectId }) => {
      socket.to(`project:${projectId}`).emit('webrtc:call-started', {
        from: socket.userId,
        username: socket.username
      });
    });

    socket.on('webrtc:offer', ({ to, offer }) => {
      const sockets = Array.from(io.sockets.sockets.values());
      const target = sockets.find(s => s.userId === to);
      if (target) {
        target.emit('webrtc:offer', {
          from: socket.userId,
          offer,
          username: socket.username
        });
      }
    });

    socket.on('webrtc:answer', ({ to, answer }) => {
      const sockets = Array.from(io.sockets.sockets.values());
      const target = sockets.find(s => s.userId === to);
      if (target) {
        target.emit('webrtc:answer', {
          from: socket.userId,
          answer
        });
      }
    });

    socket.on('webrtc:ice-candidate', ({ to, candidate }) => {
      const sockets = Array.from(io.sockets.sockets.values());
      const target = sockets.find(s => s.userId === to);
      if (target) {
        target.emit('webrtc:ice-candidate', {
          from: socket.userId,
          candidate
        });
      }
    });

    socket.on('webrtc:end-call', ({ projectId, userId, username }) => {
      socket.to(`project:${projectId}`).emit('webrtc:call-ended', {
        userId: userId || socket.userId,
        username: username || socket.username
      });
    });

    /**
     * Socket Disconnect
     */
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.username} (${socket.userId})`);
      
      for (const projectId of socket.currentProjects) {
        socket.to(`project:${projectId}`).emit('user-left', {
          userId: socket.userId,
          username: socket.username,
          socketId: socket.id
        });
      }

      socket.currentProjects.clear();
      socket.activeYjsRooms.clear();
    });
  });
};

export default setupYjsHandlers;
