import { verifyToken } from '../utils/jwt.js';
import yjsManager from '../services/YjsManager.js';
import RoomMember from '../models/RoomMember.js';
import Room from '../models/Room.js';
import File from '../models/File.js';
import Message from '../models/Message.js';
import Activity from '../models/Activity.js';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import setupDeltaSockets from './DeltaEngine/DeltaSocketHandlers.js';

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

const logFileEdit = async (projectId, userId, username, fileId, fileName, io) => {
  const key = `${projectId}-${fileId}-${userId}`;
  
  // Clear existing timeout
  if (activityDebounce.has(key)) {
    clearTimeout(activityDebounce.get(key));
  }
  
  // Set new timeout - log activity after 5 seconds of no edits
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
  }, 5000); // 5 second debounce
  
  activityDebounce.set(key, timeout);
};

/**
 * Setup Socket.IO handlers for Yjs collaboration
 */
export const setupYjsHandlers = (io) => {
  // Socket.IO middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = verifyToken(token);
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;
      socket.username = decoded.username;
      
      console.log(`🔐 Token decoded: userId=${decoded.id}, username=${decoded.username}, email=${decoded.email}`);
      
      next();
    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.username} (userId: ${socket.userId}, socketId: ${socket.id})`);

    // Setup Delta Sync handlers
    setupDeltaSockets(io, socket);

    /**
     * Join a room for collaboration
     */
    socket.on('join-room', async ({ roomId, fileId }, callback) => {
      try {
        // Verify room access
        const room = await Room.findById(roomId);
        if (!room || !room.isActive) {
          return callback({ success: false, message: 'Room not found' });
        }

        // Check if user is a member
        let member = await RoomMember.findOne({
          roomId,
          userId: socket.userId
        });

        if (!member) {
          // Auto-join if room allows
          member = new RoomMember({
            roomId,
            userId: socket.userId,
            role: 'participant',
            status: 'online',
            socketId: socket.id
          });
          await member.save();
        } else {
          member.status = 'online';
          member.socketId = socket.id;
          member.isActive = true;
          await member.save();
        }

        // Verify file access
        const file = await File.findById(fileId);
        if (!file || file.isDeleted) {
          return callback({ success: false, message: 'File not found' });
        }

        // Join Socket.IO room
        const roomKey = `room:${roomId}:file:${fileId}`;
        socket.join(roomKey);
        socket.currentRoom = roomId;
        socket.currentFile = fileId;

        // Get or create Yjs document
        const ydoc = await yjsManager.getDocument(roomId, fileId);
        const awareness = yjsManager.getAwareness(roomId, fileId);

        // Send initial sync
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, syncProtocol.messageYjsSyncStep1);
        syncProtocol.writeSyncStep1(encoder, ydoc);
        socket.emit('yjs-sync', encoding.toUint8Array(encoder));

        // Setup awareness
        if (awareness) {
          awareness.setLocalState({
            user: {
              id: socket.userId,
              name: socket.username,
              color: generateUserColor(socket.userId)
            }
          });

          // Send awareness state
          const awarenessEncoder = encoding.createEncoder();
          encoding.writeVarUint(awarenessEncoder, awarenessProtocol.messageAwareness);
          encoding.writeVarUint8Array(
            awarenessEncoder,
            awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awareness.getStates().keys()))
          );
          socket.emit('yjs-awareness', encoding.toUint8Array(awarenessEncoder));
        }

        console.log(`👤 ${socket.username} joined room ${roomId}, file ${fileId}`);

        // Notify others
        socket.to(roomKey).emit('user-joined', {
          userId: socket.userId,
          username: socket.username,
          socketId: socket.id
        });

        callback({ success: true, roomKey });
      } catch (error) {
        console.error('Error joining room:', error);
        callback({ success: false, message: error.message });
      }
    });

    /**
     * Handle Yjs sync messages
     */
    socket.on('yjs-sync', async (update) => {
      try {
        const { roomId, fileId } = socket;
        if (!socket.currentRoom || !socket.currentFile) return;

        const ydoc = await yjsManager.getDocument(socket.currentRoom, socket.currentFile);
        const roomKey = `room:${socket.currentRoom}:file:${socket.currentFile}`;

        const decoder = decoding.createDecoder(update);
        const encoder = encoding.createEncoder();
        const messageType = decoding.readVarUint(decoder);

        switch (messageType) {
          case syncProtocol.messageYjsSyncStep1:
            syncProtocol.readSyncStep1(decoder, encoder, ydoc);
            if (encoding.length(encoder) > 1) {
              socket.emit('yjs-sync', encoding.toUint8Array(encoder));
            }
            break;
            
          case syncProtocol.messageYjsSyncStep2:
            syncProtocol.readSyncStep2(decoder, ydoc, null);
            break;
            
          case syncProtocol.messageYjsUpdate:
            const updateData = decoding.readVarUint8Array(decoder);
            // Apply update to document
            syncProtocol.applyUpdate(ydoc, updateData);
            // Broadcast to other clients
            socket.to(roomKey).emit('yjs-sync', encoding.toUint8Array(encoder));
            
            // Log file edit activity (debounced)
            if (socket.currentProject) {
              const file = await File.findById(socket.currentFile);
              if (file) {
                logFileEdit(
                  socket.currentProject,
                  socket.userId,
                  socket.username,
                  socket.currentFile,
                  file.name,
                  io
                );
              }
            }
            break;
        }
      } catch (error) {
        console.error('Error handling Yjs sync:', error);
      }
    });

    /**
     * Handle awareness updates (cursors, selections)
     */
    socket.on('yjs-awareness', async (update) => {
      try {
        if (!socket.currentRoom || !socket.currentFile) return;

        const awareness = yjsManager.getAwareness(socket.currentRoom, socket.currentFile);
        const roomKey = `room:${socket.currentRoom}:file:${socket.currentFile}`;

        if (awareness) {
          awarenessProtocol.applyAwarenessUpdate(awareness, update, socket);
          // Broadcast to others
          socket.to(roomKey).emit('yjs-awareness', update);
        }
      } catch (error) {
        console.error('Error handling awareness:', error);
      }
    });

    /**
     * Update cursor position
     */
    socket.on('cursor-update', async ({ line, column }) => {
      try {
        if (!socket.currentRoom || !socket.currentFile) return;

        const roomKey = `room:${socket.currentRoom}:file:${socket.currentFile}`;

        // Update in database
        await RoomMember.findOneAndUpdate(
          { roomId: socket.currentRoom, userId: socket.userId },
          {
            'cursorPosition.line': line,
            'cursorPosition.column': column,
            'cursorPosition.fileId': socket.currentFile,
            lastSeen: new Date()
          }
        );

        // Broadcast to others
        socket.to(roomKey).emit('cursor-update', {
          userId: socket.userId,
          username: socket.username,
          line,
          column
        });
      } catch (error) {
        console.error('Error updating cursor:', error);
      }
    });

    /**
     * Leave room
     */
    socket.on('leave-room', async () => {
      if (socket.currentRoom && socket.currentFile) {
        const roomKey = `room:${socket.currentRoom}:file:${socket.currentFile}`;
        
        // Update member status
        await RoomMember.findOneAndUpdate(
          { roomId: socket.currentRoom, userId: socket.userId },
          { status: 'offline', lastSeen: new Date() }
        );

        // Notify others
        socket.to(roomKey).emit('user-left', {
          userId: socket.userId,
          username: socket.username
        });

        socket.leave(roomKey);
        socket.currentRoom = null;
        socket.currentFile = null;
      }
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', async () => {
      console.log(`👋 User disconnected: ${socket.username} (${socket.id})`);

      // Handle project room disconnect
      if (socket.currentProject) {
        const projectRoom = `project:${socket.currentProject}`;
        
        // Check if user has other active sockets in the same project
        const sockets = await io.in(projectRoom).fetchSockets();
        const userStillInProject = sockets.some(s => 
          s.userId === socket.userId && s.id !== socket.id
        );

        // Only broadcast user-left if user has no other active connections
        if (!userStillInProject) {
          socket.to(projectRoom).emit('user-left', {
            userId: socket.userId,
            username: socket.username,
          });

          // Get remaining unique online users
          const uniqueUsers = new Map();
          sockets.forEach(s => {
            if (s.id !== socket.id && !uniqueUsers.has(s.userId)) {
              uniqueUsers.set(s.userId, {
                id: s.userId,
                username: s.username,
                socketId: s.id,
              });
            }
          });
          
          const onlineUsers = Array.from(uniqueUsers.values());
          io.to(projectRoom).emit('users-online', onlineUsers);
        }
      }

      if (socket.currentRoom) {
        // Update member status
        await RoomMember.findOneAndUpdate(
          { socketId: socket.id },
          { status: 'offline', lastSeen: new Date() }
        );

        if (socket.currentFile) {
          const roomKey = `room:${socket.currentRoom}:file:${socket.currentFile}`;
          socket.to(roomKey).emit('user-left', {
            userId: socket.userId,
            username: socket.username
          });
        }
      }
    });

    /**
     * Send chat message
     */
    socket.on('send-message', async ({ content, type = 'text' }, callback) => {
      try {
        if (!socket.currentRoom) {
          return callback({ success: false, message: 'Not in a room' });
        }

        // Create message in database
        const message = await Message.create({
          roomId: socket.currentRoom,
          senderId: socket.userId,
          content,
          type,
          metadata: {
            username: socket.username,
            timestamp: new Date()
          }
        });

        // Populate sender details
        await message.populate('senderId', 'username email avatar');

        const roomKey = `room:${socket.currentRoom}:file:${socket.currentFile}`;
        
        // Broadcast to all users in room
        io.to(roomKey).emit('new-message', {
          _id: message._id,
          content: message.content,
          type: message.type,
          sender: {
            _id: message.senderId._id,
            username: message.senderId.username,
            avatar: message.senderId.avatar
          },
          createdAt: message.createdAt,
          isRead: false
        });

        callback({ success: true, message: 'Message sent' });
      } catch (error) {
        console.error('Send message error:', error);
        callback({ success: false, message: error.message });
      }
    });

    /**
     * Get message history
     */
    socket.on('get-messages', async ({ limit = 50, before }, callback) => {
      try {
        if (!socket.currentRoom) {
          return callback({ success: false, message: 'Not in a room' });
        }

        const query = { roomId: socket.currentRoom };
        
        if (before) {
          query.createdAt = { $lt: new Date(before) };
        }

        const messages = await Message.find(query)
          .populate('senderId', 'username email avatar')
          .sort({ createdAt: -1 })
          .limit(limit);

        const formattedMessages = messages.reverse().map(msg => ({
          _id: msg._id,
          content: msg.content,
          type: msg.type,
          sender: {
            _id: msg.senderId._id,
            username: msg.senderId.username,
            avatar: msg.senderId.avatar
          },
          createdAt: msg.createdAt,
          isRead: msg.readBy?.includes(socket.userId) || false
        }));

        callback({ success: true, messages: formattedMessages });
      } catch (error) {
        console.error('Get messages error:', error);
        callback({ success: false, message: error.message });
      }
    });

    /**
     * Typing indicator
     */
    socket.on('typing', ({ isTyping }) => {
      if (!socket.currentRoom) return;

      const roomKey = `room:${socket.currentRoom}:file:${socket.currentFile}`;
      socket.to(roomKey).emit('user-typing', {
        userId: socket.userId,
        username: socket.username,
        isTyping
      });
    });

    /**
     * Mark messages as read
     */
    socket.on('mark-read', async ({ messageIds }, callback) => {
      try {
        if (!socket.currentRoom) {
          return callback({ success: false, message: 'Not in a room' });
        }

        await Message.updateMany(
          {
            _id: { $in: messageIds },
            roomId: socket.currentRoom
          },
          {
            $addToSet: { readBy: socket.userId }
          }
        );

        const roomKey = `room:${socket.currentRoom}:file:${socket.currentFile}`;
        socket.to(roomKey).emit('messages-read', {
          userId: socket.userId,
          messageIds
        });

        callback({ success: true });
      } catch (error) {
        console.error('Mark read error:', error);
        callback({ success: false, message: error.message });
      }
    });

    /**
     * Join a project (not a specific room)
     */
    socket.on('join-project', async ({ projectId, userId }) => {
      try {
        const projectRoom = `project:${projectId}`;
        socket.join(projectRoom);
        socket.currentProject = projectId;

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
        });

        // Get online users in this project (unique by userId)
        const sockets = await io.in(projectRoom).fetchSockets();
        const uniqueUsers = new Map();
        
        sockets.forEach(s => {
          if (!uniqueUsers.has(s.userId)) {
            uniqueUsers.set(s.userId, {
              id: s.userId,
              username: s.username,
              socketId: s.id,
            });
          }
        });
        
        const onlineUsers = Array.from(uniqueUsers.values());

        // Send online users to the joining user
        socket.emit('users-online', onlineUsers);

        // Broadcast updated user list
        io.to(projectRoom).emit('users-online', onlineUsers);

        console.log(`User ${socket.username} joined project ${projectId}. Online users:`, onlineUsers.map(u => u.username).join(', '));
      } catch (error) {
        console.error('Join project error:', error);
      }
    });

    /**
     * Leave a project
     */
    socket.on('leave-project', async ({ projectId }) => {
      try {
        const projectRoom = `project:${projectId}`;
        socket.leave(projectRoom);

        // Broadcast user left
        socket.to(projectRoom).emit('user-left', {
          userId: socket.userId,
          username: socket.username,
        });

        // Get remaining online users (unique by userId)
        const sockets = await io.in(projectRoom).fetchSockets();
        const uniqueUsers = new Map();
        
        sockets.forEach(s => {
          if (!uniqueUsers.has(s.userId)) {
            uniqueUsers.set(s.userId, {
              id: s.userId,
              username: s.username,
              socketId: s.id,
            });
          }
        });
        
        const onlineUsers = Array.from(uniqueUsers.values());

        // Broadcast updated user list
        io.to(projectRoom).emit('users-online', onlineUsers);

        socket.currentProject = null;
        console.log(`User ${socket.username} left project ${projectId}`);
      } catch (error) {
        console.error('Leave project error:', error);
      }
    });

    /**
     * Real-time code updates
     */
    socket.on('code-update', ({ projectId, fileId, code, userId }) => {
      const projectRoom = `project:${projectId}`;
      socket.to(projectRoom).emit('code-update', {
        fileId,
        code,
        userId,
        username: socket.username,
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * Cursor position updates
     */
    socket.on('cursor-update', ({ projectId, fileId, position, userId, username, color }) => {
      const projectRoom = `project:${projectId}`;
      socket.to(projectRoom).emit('cursor-update', {
        fileId,
        position,
        userId,
        username: username || socket.username,
        color: color || generateUserColor(userId),
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * Chat messages - Project-based with database persistence
     */
    socket.on('chat-message', async ({ projectId, userId, username, message }, callback) => {
      try {
        if (!projectId || !message?.trim()) {
          if (callback) callback({ success: false, message: 'Invalid message data' });
          return;
        }

        const projectRoom = `project:${projectId}`;
        
        // Save message to database
        const newMessage = await Message.create({
          projectId,
          senderId: socket.userId,
          content: message.trim(),
          type: 'text'
        });

        // Populate sender details
        await newMessage.populate('senderId', 'username email avatar');

        const messageData = {
          _id: newMessage._id,
          userId: socket.userId,
          username: socket.username,
          message: newMessage.content,
          sender: {
            _id: newMessage.senderId._id,
            username: newMessage.senderId.username,
            email: newMessage.senderId.email,
            avatar: newMessage.senderId.avatar
          },
          timestamp: newMessage.createdAt.toISOString(),
          createdAt: newMessage.createdAt
        };

        // Log activity and broadcast in real-time
        await logAndBroadcastActivity(io, {
          projectId,
          userId: socket.userId,
          type: 'chat_message',
          action: `${socket.username} sent a message`,
          metadata: {
            message: message.substring(0, 200), // Store first 200 chars
            messageId: newMessage._id
          }
        });

        // Broadcast to all users in the project (including sender)
        io.to(projectRoom).emit('chat-message', messageData);

        if (callback) callback({ success: true, message: messageData });
      } catch (error) {
        console.error('Chat message error:', error);
        if (callback) callback({ success: false, message: error.message });
      }
    });

    /**
     * Get message history for a project
     */
    socket.on('get-project-messages', async ({ projectId, limit = 50, before }, callback) => {
      try {
        if (!projectId) {
          return callback({ success: false, message: 'Project ID required' });
        }

        const query = { 
          projectId,
          isDeleted: false
        };
        
        if (before) {
          query.createdAt = { $lt: new Date(before) };
        }

        const messages = await Message.find(query)
          .populate('senderId', 'username email avatar')
          .sort({ createdAt: -1 })
          .limit(limit);

        const formattedMessages = messages.reverse().map(msg => ({
          _id: msg._id,
          userId: msg.senderId._id,
          username: msg.senderId.username,
          message: msg.content,
          sender: {
            _id: msg.senderId._id,
            username: msg.senderId.username,
            email: msg.senderId.email,
            avatar: msg.senderId.avatar
          },
          timestamp: msg.createdAt.toISOString(),
          createdAt: msg.createdAt,
          isRead: msg.readBy?.includes(socket.userId) || false
        }));

        callback({ success: true, messages: formattedMessages });
      } catch (error) {
        console.error('Get project messages error:', error);
        callback({ success: false, message: error.message });
      }
    });

    /**
     * Typing indicator for project chat
     */
    socket.on('typing', ({ projectId, isTyping }) => {
      if (!projectId) return;

      const projectRoom = `project:${projectId}`;
      socket.to(projectRoom).emit('user-typing', {
        userId: socket.userId,
        username: socket.username,
        isTyping
      });
    });

    /**
     * Mark messages as read
     */
    socket.on('mark-messages-read', async ({ projectId, messageIds }, callback) => {
      try {
        if (!projectId || !messageIds || !messageIds.length) {
          return callback({ success: false, message: 'Invalid request' });
        }

        await Message.updateMany(
          {
            _id: { $in: messageIds },
            projectId
          },
          {
            $addToSet: { readBy: socket.userId }
          }
        );

        const projectRoom = `project:${projectId}`;
        socket.to(projectRoom).emit('messages-read', {
          userId: socket.userId,
          messageIds
        });

        callback({ success: true });
      } catch (error) {
        console.error('Mark messages read error:', error);
        callback({ success: false, message: error.message });
      }
    });

    /**
     * File created event
     */
    socket.on('file-created', async ({ projectId, file }) => {
      const projectRoom = `project:${projectId}`;
      
      // Log activity and broadcast in real-time
      await logAndBroadcastActivity(io, {
        projectId,
        userId: socket.userId,
        type: 'file_created',
        action: `${socket.username} created file ${file.name}`,
        metadata: {
          fileName: file.name,
          fileId: file._id
        }
      });
      
      socket.to(projectRoom).emit('file-created', file);
    });

    /**
     * File deleted event
     */
    socket.on('file-deleted', async ({ projectId, fileId, fileName }) => {
      const projectRoom = `project:${projectId}`;
      
      // Log activity and broadcast in real-time
      await logAndBroadcastActivity(io, {
        projectId,
        userId: socket.userId,
        type: 'file_deleted',
        action: `${socket.username} deleted file ${fileName || 'a file'}`,
        metadata: {
          fileName,
          fileId
        }
      });
      
      socket.to(projectRoom).emit('file-deleted', fileId);
    });

    /**
     * File renamed event
     */
    socket.on('file-renamed', async ({ projectId, fileId, oldName, newName }) => {
      const projectRoom = `project:${projectId}`;
      
      // Log activity and broadcast in real-time
      await logAndBroadcastActivity(io, {
        projectId,
        userId: socket.userId,
        type: 'file_renamed',
        action: `${socket.username} renamed file from ${oldName} to ${newName}`,
        metadata: {
          fileName: newName,
          oldName,
          newName,
          fileId
        }
      });
      
      socket.to(projectRoom).emit('file-renamed', { fileId, newName });
    });

    /**
     * File Explorer - File/Folder created
     */
    socket.on('filesystem:created', ({ projectId, node, parentPath }) => {
      const projectRoom = `project:${projectId}`;
      socket.to(projectRoom).emit('filesystem:created', {
        node,
        parentPath,
        userId: socket.userId,
        username: socket.username,
        timestamp: new Date().toISOString()
      });
    });

    /**
     * File Explorer - File/Folder renamed
     */
    socket.on('filesystem:renamed', ({ projectId, path, oldName, newName }) => {
      const projectRoom = `project:${projectId}`;
      socket.to(projectRoom).emit('filesystem:renamed', {
        path,
        oldName,
        newName,
        userId: socket.userId,
        username: socket.username,
        timestamp: new Date().toISOString()
      });
    });

    /**
     * File Explorer - File/Folder deleted
     */
    socket.on('filesystem:deleted', ({ projectId, path, deletedNode }) => {
      const projectRoom = `project:${projectId}`;
      socket.to(projectRoom).emit('filesystem:deleted', {
        path,
        deletedNode,
        userId: socket.userId,
        username: socket.username,
        timestamp: new Date().toISOString()
      });
    });

    /**
     * File Explorer - File content updated
     */
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
     * File Explorer - Structure sync request
     */
    socket.on('filesystem:request-sync', ({ projectId }) => {
      const projectRoom = `project:${projectId}`;
      // Request the most recent structure from any online client
      socket.to(projectRoom).emit('filesystem:sync-requested', {
        requestingUser: socket.userId
      });
    });

    /**
     * WebRTC Signaling Events
     */
    socket.on('webrtc:call-started', ({ projectId }) => {
      const projectRoom = `project:${projectId}`;
      socket.to(projectRoom).emit('webrtc:call-started', {
        from: socket.userId,
        username: socket.username
      });
    });

    socket.on('webrtc:offer', ({ to, offer }) => {
      console.log(`WebRTC offer from ${socket.username} to ${to}`);
      // Find target socket by userId
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
      console.log(`WebRTC answer from ${socket.username} to ${to}`);
      // Find target socket by userId
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
      console.log(`ICE candidate from ${socket.username} to ${to}`);
      // Find target socket by userId
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
      const projectRoom = `project:${projectId}`;
      socket.to(projectRoom).emit('webrtc:call-ended', {
        userId: userId || socket.userId,
        username: username || socket.username
      });
    });
  });
};

/**
 * Generate consistent color for user based on ID
 */
function generateUserColor(userId) {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B739', '#52C41A', '#1890FF', '#722ED1'
  ];
  
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
}

export default setupYjsHandlers;
