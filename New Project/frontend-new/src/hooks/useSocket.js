import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const useSocket = (roomId, token) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roomId || !token) return;

    // Create socket connection
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      setConnected(true);
      setError(null);

      // Join room
      socket.emit('join-room', { roomId });
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError(err.message);
      setConnected(false);
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.emit('leave-room', { roomId });
        socket.disconnect();
      }
    };
  }, [roomId, token]);

  // Send Yjs update
  const sendYjsUpdate = (update) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('yjs-update', update);
    }
  };

  // Listen for Yjs updates
  const onYjsUpdate = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('yjs-update', callback);
      return () => socketRef.current.off('yjs-update', callback);
    }
  };

  // Send chat message
  const sendMessage = (message) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('send-message', { roomId, message });
    }
  };

  // Listen for chat messages
  const onMessage = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('new-message', callback);
      return () => socketRef.current.off('new-message', callback);
    }
  };

  // Typing indicators
  const sendTyping = (isTyping) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', { roomId, isTyping });
    }
  };

  const onTyping = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('user-typing', callback);
      return () => socketRef.current.off('user-typing', callback);
    }
  };

  // User presence
  const onUserJoined = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('user-joined', callback);
      return () => socketRef.current.off('user-joined', callback);
    }
  };

  const onUserLeft = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('user-left', callback);
      return () => socketRef.current.off('user-left', callback);
    }
  };

  // Cursor position
  const sendCursor = (position) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('cursor-move', { roomId, position });
    }
  };

  const onCursorMove = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('cursor-update', callback);
      return () => socketRef.current.off('cursor-update', callback);
    }
  };

  return {
    socket: socketRef.current,
    connected,
    error,
    // Yjs collaboration
    sendYjsUpdate,
    onYjsUpdate,
    // Chat
    sendMessage,
    onMessage,
    sendTyping,
    onTyping,
    // Presence
    onUserJoined,
    onUserLeft,
    // Cursor
    sendCursor,
    onCursorMove,
  };
};

export default useSocket;
