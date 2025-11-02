/**
 * RemoteCursor Utilities
 * Handles rendering and managing remote user cursors and selections in Monaco Editor
 * 
 * Features:
 * - Colored cursor indicators with name badges
 * - Selection highlighting
 * - Smooth animations with throttling
 * - Efficient decoration management
 * - Real-time position tracking
 * 
 * @module remoteCursorUtils
 */

import * as monaco from 'monaco-editor';
import { throttle } from './throttleUtils';
import { generateColorFromString, getInitials, removeUserColor } from './userColorUtils';

/**
 * RemoteCursorManager Class
 * Manages all remote user cursors and selections in the Monaco Editor
 * 
 * @class
 * @param {monaco.editor.IStandaloneCodeEditor} editor - Monaco editor instance
 * @param {string} currentUserId - Current user's socket ID
 */
export class RemoteCursorManager {
  constructor(editor, currentUserId) {
    this.editor = editor;
    this.currentUserId = currentUserId;
    this.decorations = new Map(); // userId -> decoration IDs
    this.widgets = new Map(); // userId -> content widgets
    this.selections = new Map(); // userId -> selection decoration IDs
    this.userColors = new Map(); // userId -> color
    this.userNames = new Map(); // userId -> display name
    this.typingTimers = new Map(); // userId -> timeout for typing indicator
  }

  /**
   * Set user color explicitly (from server or user list)
   * @param {string} userId - User's unique identifier
   * @param {string} color - Hex color code
   */
  setUserColor(userId, color) {
    if (color) {
      this.userColors.set(userId, color);
    }
  }

  /**
   * Generate a consistent color for a user
   * @param {string} userId - User's unique identifier
   * @returns {string} Hex color code
   */
  getUserColor(userId) {
    if (this.userColors.has(userId)) {
      return this.userColors.get(userId);
    }

    const color = generateColorFromString(userId);
    this.userColors.set(userId, color);
    return color;
  }

  /**
   * Set or update user display name
   * @param {string} userId - User's unique identifier
   * @param {string} name - User's display name
   */
  setUserName(userId, name) {
    this.userNames.set(userId, name);
  }

  /**
   * Update cursor position for a remote user
   * @param {string} userId - User's unique identifier
   * @param {string} userName - User's display name
   * @param {Object} position - Cursor position {lineNumber, column}
   * @param {string} filename - Current file name
   */
  updateCursor(userId, userName, position, filename) {
    if (!this.editor || userId === this.currentUserId) return;

    const model = this.editor.getModel();
    if (!model) return;

    // Store user name
    if (userName) {
      this.setUserName(userId, userName);
    }

    const color = this.getUserColor(userId);
    const displayName = this.userNames.get(userId) || userName || 'User';

    // Inject dynamic CSS for this user's cursor color
    this.injectCursorColorCSS(userId, color);

    // Mark user as typing
    this.markUserTyping(userId);

    // Create cursor decoration
    const range = new monaco.Range(
      position.lineNumber,
      position.column,
      position.lineNumber,
      position.column
    );

    const decorationOptions = {
      className: `remote-cursor remote-cursor-${userId}`,
      stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      beforeContentClassName: 'remote-cursor-line',
      glyphMarginClassName: 'remote-cursor-glyph',
      overviewRuler: {
        color: this.hexToRgba(color, 0.8),
        position: monaco.editor.OverviewRulerLane.Center
      }
    };

    // Update decoration
    const oldDecorations = this.decorations.get(userId) || [];
    const newDecorations = this.editor.deltaDecorations(
      oldDecorations,
      [{ range, options: decorationOptions }]
    );
    this.decorations.set(userId, newDecorations);

    // Update/create cursor widget (name badge)
    this.updateCursorWidget(userId, displayName, color, position);
  }

  /**
   * Inject CSS for user-specific cursor color
   * @param {string} userId - User's unique identifier
   * @param {string} color - Hex color code
   * @private
   */
  injectCursorColorCSS(userId, color) {
    const styleId = `remote-cursor-style-${userId}`;
    
    // Check if style already exists
    if (document.getElementById(styleId)) return;
    
    // Create style element
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .remote-cursor-${userId} {
        color: ${color} !important;
      }
      .remote-cursor-${userId} .remote-cursor-line::before {
        background: ${color} !important;
        box-shadow: 0 0 8px ${color} !important;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Update selection for a remote user
   * @param {string} userId - User's unique identifier
   * @param {string} userName - User's display name
   * @param {Object} selection - Selection range {startLineNumber, startColumn, endLineNumber, endColumn}
   * @param {string} filename - Current file name
   */
  updateSelection(userId, userName, selection, filename) {
    if (!this.editor || userId === this.currentUserId) return;

    const model = this.editor.getModel();
    if (!model) return;

    const color = this.getUserColor(userId);

    // If selection is empty (just cursor), clear selection decorations
    if (!selection || (
      selection.startLineNumber === selection.endLineNumber &&
      selection.startColumn === selection.endColumn
    )) {
      this.clearSelection(userId);
      return;
    }

    // Create selection decoration
    const range = new monaco.Range(
      selection.startLineNumber,
      selection.startColumn,
      selection.endLineNumber,
      selection.endColumn
    );

    const decorationOptions = {
      className: `remote-selection remote-selection-${userId}`,
      stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      inlineClassName: 'remote-selection-inline',
      isWholeLine: false
    };

    // Inject dynamic CSS for this user's selection color
    this.injectSelectionStyle(userId, color);

    // Update decoration
    const oldDecorations = this.selections.get(userId) || [];
    const newDecorations = this.editor.deltaDecorations(
      oldDecorations,
      [{ range, options: decorationOptions }]
    );
    this.selections.set(userId, newDecorations);
  }

  /**
   * Update cursor widget (name badge) - Small cursor badge with initials and hover tooltip
   * @param {string} userId - User's unique identifier
   * @param {string} displayName - User's display name
   * @param {string} color - Hex color code
   * @param {Object} position - Cursor position {lineNumber, column}
   * @private
   */
  updateCursorWidget(userId, displayName, color, position) {
    const widgetId = `remote-cursor-widget-${userId}`;
    
    // Remove old widget if exists
    if (this.widgets.has(userId)) {
      try {
        this.editor.removeContentWidget(this.widgets.get(userId));
      } catch (e) {
        console.warn('Error removing widget:', e);
      }
    }

    // Get initials using shared utility
    const initials = getInitials(displayName);

    // Create widget DOM node - circular badge with initials
    const domNode = document.createElement('div');
    domNode.className = 'remote-cursor-widget';
    domNode.style.backgroundColor = color;
    domNode.textContent = initials;
    domNode.setAttribute('data-user-id', userId);
    domNode.setAttribute('data-user-name', displayName);

    // Create widget
    const widget = {
      getId: () => widgetId,
      getDomNode: () => domNode,
      getPosition: () => ({
        position: {
          lineNumber: position.lineNumber,
          column: position.column
        },
        preference: [
          monaco.editor.ContentWidgetPositionPreference.ABOVE,
          monaco.editor.ContentWidgetPositionPreference.BELOW
        ]
      })
    };

    // Add widget
    this.widgets.set(userId, widget);
    this.editor.addContentWidget(widget);
    this.editor.layoutContentWidget(widget);
  }

  /**
   * Clear cursor for a specific user
   * @param {string} userId - User's unique identifier
   */
  clearCursor(userId) {
    // Clear decorations
    if (this.decorations.has(userId)) {
      this.editor.deltaDecorations(this.decorations.get(userId), []);
      this.decorations.delete(userId);
    }

    // Clear widget
    if (this.widgets.has(userId)) {
      try {
        this.editor.removeContentWidget(this.widgets.get(userId));
      } catch (e) {
        console.warn('Error removing widget:', e);
      }
      this.widgets.delete(userId);
    }
  }

  /**
   * Clear selection for a specific user
   * @param {string} userId - User's unique identifier
   */
  clearSelection(userId) {
    if (this.selections.has(userId)) {
      this.editor.deltaDecorations(this.selections.get(userId), []);
      this.selections.delete(userId);
    }
  }

  /**
   * Clear all cursors and selections for a user
   * @param {string} userId - User's unique identifier
   */
  clearUser(userId) {
    this.clearCursor(userId);
    this.clearSelection(userId);
    
    // Remove color assignment for this user
    removeUserColor(userId);
    this.userColors.delete(userId);
    this.userNames.delete(userId);
    
    // Clear typing timer
    if (this.typingTimers.has(userId)) {
      clearTimeout(this.typingTimers.get(userId));
      this.typingTimers.delete(userId);
    }
    
    // Remove CSS styles
    const cursorStyleId = `remote-cursor-style-${userId}`;
    const selectionStyleId = `remote-selection-style-${userId}`;
    const cursorStyle = document.getElementById(cursorStyleId);
    const selectionStyle = document.getElementById(selectionStyleId);
    if (cursorStyle) cursorStyle.remove();
    if (selectionStyle) selectionStyle.remove();
  }

  /**
   * Clear all remote cursors and selections
   */
  clearAll() {
    // Clear all decorations
    this.decorations.forEach((decorations) => {
      this.editor.deltaDecorations(decorations, []);
    });
    this.decorations.clear();

    // Clear all selections
    this.selections.forEach((decorations) => {
      this.editor.deltaDecorations(decorations, []);
    });
    this.selections.clear();

    // Clear all widgets
    this.widgets.forEach((widget) => {
      try {
        this.editor.removeContentWidget(widget);
      } catch (e) {
        console.warn('Error removing widget:', e);
      }
    });
    this.widgets.clear();
  }

  /**
   * Inject dynamic CSS for user selection color
   * @param {string} userId - User's unique identifier
   * @param {string} color - Hex color code
   * @private
   */
  injectSelectionStyle(userId, color) {
    const styleId = `remote-selection-style-${userId}`;
    
    // Check if style already exists
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .remote-selection-${userId} {
        background-color: ${this.hexToRgba(color, 0.2)} !important;
      }
      .remote-selection-inline-${userId} {
        background-color: ${this.hexToRgba(color, 0.2)} !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Convert hex color to rgba
   * @param {string} hex - Hex color code
   * @param {number} alpha - Alpha value (0-1)
   * @returns {string} RGBA color string
   * @private
   */
  hexToRgba(hex, alpha = 1) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(100, 100, 100, ${alpha})`;
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Mark a user as actively typing
   * @param {string} userId - User's unique identifier
   * @private
   */
  markUserTyping(userId) {
    // Clear existing timer
    if (this.typingTimers.has(userId)) {
      clearTimeout(this.typingTimers.get(userId));
    }

    // Add typing class to widget
    const widget = this.widgets.get(userId);
    if (widget && widget.getDomNode) {
      const domNode = widget.getDomNode();
      domNode.classList.add('typing');
    }

    // Set timer to remove typing indicator after 1 second of inactivity
    const timer = setTimeout(() => {
      const widget = this.widgets.get(userId);
      if (widget && widget.getDomNode) {
        const domNode = widget.getDomNode();
        domNode.classList.remove('typing');
      }
      this.typingTimers.delete(userId);
    }, 1000);

    this.typingTimers.set(userId, timer);
  }

  /**
   * Cleanup on destroy
   */
  destroy() {
    this.clearAll();
    this.userColors.clear();
    this.userNames.clear();
    
    // Clear all typing timers
    this.typingTimers.forEach(timer => clearTimeout(timer));
    this.typingTimers.clear();
    
    // Remove injected CSS styles
    this.userColors.forEach((color, userId) => {
      const styleId = `remote-cursor-style-${userId}`;
      const styleElement = document.getElementById(styleId);
      if (styleElement) {
        styleElement.remove();
      }
    });
  }
}

/**
 * Create throttled cursor position emitter
 * @param {Socket} socket - Socket.IO client instance
 * @param {string} roomId - Room identifier
 * @param {string} userId - User's unique identifier
 * @param {string} userName - User's display name
 * @param {string} filename - Current file name
 * @returns {Function} Throttled emitter function
 */
export const createCursorPositionEmitter = (socket, roomId, userId, userName, filename) => {
  return throttle((position) => {
    if (!socket || !roomId) return;
    
    socket.emit('cursor-position-update', {
      roomId,
      userId,
      userName,
      filename,
      position: {
        lineNumber: position.lineNumber,
        column: position.column
      }
    });
  }, 100); // Throttle to max 10 updates per second
};

/**
 * Create throttled selection emitter
 * @param {Socket} socket - Socket.IO client instance
 * @param {string} roomId - Room identifier
 * @param {string} userId - User's unique identifier
 * @param {string} userName - User's display name
 * @param {string} filename - Current file name
 * @returns {Function} Throttled emitter function
 */
export const createSelectionEmitter = (socket, roomId, userId, userName, filename) => {
  return throttle((selection) => {
    if (!socket || !roomId) return;
    
    socket.emit('selection-change', {
      roomId,
      userId,
      userName,
      filename,
      selection: {
        startLineNumber: selection.startLineNumber,
        startColumn: selection.startColumn,
        endLineNumber: selection.endLineNumber,
        endColumn: selection.endColumn
      }
    });
  }, 150); // Throttle to ~6-7 updates per second
};

export default RemoteCursorManager;
