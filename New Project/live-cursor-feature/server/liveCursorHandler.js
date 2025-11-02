/**
 * Live Cursor Server Handler
 * Socket.IO event handlers for real-time cursor and selection tracking
 * 
 * This module handles:
 * - Cursor position updates
 * - Text selection broadcasting
 * - User disconnection cleanup
 * 
 * @module liveCursorHandler
 */

/**
 * Initialize live cursor socket handlers
 * 
 * @param {Socket.IO.Server} io - Socket.IO server instance
 * @param {Socket} socket - Individual socket connection
 * 
 * @example
 * io.on('connection', (socket) => {
 *   initializeLiveCursorHandlers(io, socket);
 * });
 */
export function initializeLiveCursorHandlers(io, socket) {
  
  /**
   * Handle cursor position updates
   * Broadcasts cursor position to all other users in the same room
   * 
   * Event: 'cursor-position-update'
   * Payload: {
   *   roomId: string,
   *   userId: string,
   *   userName: string,
   *   filename: string,
   *   position: { lineNumber: number, column: number }
   * }
   */
  socket.on('cursor-position-update', (data) => {
    try {
      const { roomId, userId, userName, filename, position } = data;
      
      // Validate required fields
      if (!roomId || !position) {
        console.warn('[Cursor] Missing required fields:', data);
        return;
      }

      // Validate position structure
      if (typeof position.lineNumber !== 'number' || typeof position.column !== 'number') {
        console.warn('[Cursor] Invalid position format:', position);
        return;
      }

      // Broadcast to all other users in the room (not the sender)
      socket.to(roomId).emit('remote-cursor-update', {
        userId: socket.id,
        userName: userName || 'Anonymous',
        filename: filename || '',
        position: {
          lineNumber: position.lineNumber,
          column: position.column
        }
      });

      // Optional: Log for debugging (can be removed in production)
      // console.log(`[Cursor] ${userName} moved to ${position.lineNumber}:${position.column} in ${filename}`);
      
    } catch (error) {
      console.error('[Cursor] Error handling cursor position update:', error);
    }
  });

  /**
   * Handle text selection changes
   * Broadcasts selection range to all other users in the same room
   * 
   * Event: 'selection-change'
   * Payload: {
   *   roomId: string,
   *   userId: string,
   *   userName: string,
   *   filename: string,
   *   selection: {
   *     startLineNumber: number,
   *     startColumn: number,
   *     endLineNumber: number,
   *     endColumn: number
   *   }
   * }
   */
  socket.on('selection-change', (data) => {
    try {
      const { roomId, userId, userName, filename, selection } = data;
      
      // Validate required fields
      if (!roomId || !selection) {
        console.warn('[Selection] Missing required fields:', data);
        return;
      }

      // Validate selection structure
      const { startLineNumber, startColumn, endLineNumber, endColumn } = selection;
      if (
        typeof startLineNumber !== 'number' ||
        typeof startColumn !== 'number' ||
        typeof endLineNumber !== 'number' ||
        typeof endColumn !== 'number'
      ) {
        console.warn('[Selection] Invalid selection format:', selection);
        return;
      }

      // Broadcast to all other users in the room (not the sender)
      socket.to(roomId).emit('remote-selection-update', {
        userId: socket.id,
        userName: userName || 'Anonymous',
        filename: filename || '',
        selection: {
          startLineNumber,
          startColumn,
          endLineNumber,
          endColumn
        }
      });

      // Optional: Log for debugging (can be removed in production)
      // console.log(`[Selection] ${userName} selected text in ${filename}`);
      
    } catch (error) {
      console.error('[Selection] Error handling selection change:', error);
    }
  });

  /**
   * Handle user disconnect
   * Cleans up cursor and selection data for disconnected user
   * Notifies other users to remove the cursor
   * 
   * This should be called in your main disconnect handler
   */
  socket.on('disconnect', () => {
    try {
      // Get all rooms this socket was in
      const rooms = Array.from(socket.rooms);
      
      // Broadcast cursor cleanup to all rooms
      rooms.forEach(roomId => {
        if (roomId !== socket.id) { // Skip the socket's own room
          socket.to(roomId).emit('user-cursor-removed', {
            userId: socket.id
          });
        }
      });

      // Optional: Log for debugging
      // console.log(`[Cursor] User ${socket.id} disconnected, cursors cleaned up`);
      
    } catch (error) {
      console.error('[Cursor] Error handling disconnect cleanup:', error);
    }
  });

  /**
   * Handle explicit cursor clear request
   * Allows a user to manually hide their cursor
   * 
   * Event: 'cursor-clear'
   * Payload: { roomId: string }
   */
  socket.on('cursor-clear', (data) => {
    try {
      const { roomId } = data;
      
      if (!roomId) {
        console.warn('[Cursor] Missing roomId for cursor clear');
        return;
      }

      socket.to(roomId).emit('user-cursor-removed', {
        userId: socket.id
      });
      
    } catch (error) {
      console.error('[Cursor] Error handling cursor clear:', error);
    }
  });
}

/**
 * Export standalone handlers for custom integration
 */
export const liveCursorHandlers = {
  /**
   * Handle cursor position update
   * @param {Socket} socket - Socket instance
   * @param {Object} data - Cursor data
   */
  handleCursorPositionUpdate(socket, data) {
    const { roomId, userId, userName, filename, position } = data;
    
    if (!roomId || !position) {
      return { success: false, error: 'Missing required fields' };
    }

    socket.to(roomId).emit('remote-cursor-update', {
      userId: socket.id,
      userName,
      filename,
      position
    });

    return { success: true };
  },

  /**
   * Handle selection change
   * @param {Socket} socket - Socket instance
   * @param {Object} data - Selection data
   */
  handleSelectionChange(socket, data) {
    const { roomId, userId, userName, filename, selection } = data;
    
    if (!roomId || !selection) {
      return { success: false, error: 'Missing required fields' };
    }

    socket.to(roomId).emit('remote-selection-update', {
      userId: socket.id,
      userName,
      filename,
      selection
    });

    return { success: true };
  },

  /**
   * Handle cursor clear
   * @param {Socket} socket - Socket instance
   * @param {Object} data - Clear data
   */
  handleCursorClear(socket, data) {
    const { roomId } = data;
    
    if (!roomId) {
      return { success: false, error: 'Missing roomId' };
    }

    socket.to(roomId).emit('user-cursor-removed', {
      userId: socket.id
    });

    return { success: true };
  }
};

export default initializeLiveCursorHandlers;
