/**
 * Example Integration: Live Cursor Feature with Monaco Editor and Socket.IO
 * 
 * This file demonstrates how to integrate the live cursor feature into
 * your collaborative code editor application.
 */

import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import io from 'socket.io-client';
import RemoteCursorManager, {
  createCursorPositionEmitter,
  createSelectionEmitter
} from './utils/remoteCursorUtils';
import './styles/RemoteCursor.css';

const CollaborativeEditor = ({ roomId, userId, userName }) => {
  const editorRef = useRef(null);
  const socketRef = useRef(null);
  const remoteCursorManagerRef = useRef(null);
  const cursorPositionEmitterRef = useRef(null);
  const selectionEmitterRef = useRef(null);

  const [code, setCode] = useState('// Start coding...');
  const [filename, setFilename] = useState('index.js');

  // Initialize Socket.IO connection
  useEffect(() => {
    socketRef.current = io('http://localhost:3000', {
      transports: ['websocket'],
      reconnection: true
    });

    // Join the room
    socketRef.current.emit('join-room', { roomId, userName });

    // Listen for remote cursor updates
    socketRef.current.on('remote-cursor-update', ({ userId, userName, filename, position }) => {
      if (remoteCursorManagerRef.current) {
        remoteCursorManagerRef.current.updateCursor(userId, userName, position, filename);
      }
    });

    // Listen for remote selection updates
    socketRef.current.on('remote-selection-update', ({ userId, userName, filename, selection }) => {
      if (remoteCursorManagerRef.current) {
        remoteCursorManagerRef.current.updateSelection(userId, userName, selection, filename);
      }
    });

    // Listen for user cursor removal (disconnect)
    socketRef.current.on('user-cursor-removed', ({ userId }) => {
      if (remoteCursorManagerRef.current) {
        remoteCursorManagerRef.current.clearUser(userId);
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId, userName]);

  // Handle editor mount
  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;

    // Initialize Remote Cursor Manager
    remoteCursorManagerRef.current = new RemoteCursorManager(
      editor,
      socketRef.current.id
    );

    // Create throttled emitters
    cursorPositionEmitterRef.current = createCursorPositionEmitter(
      socketRef.current,
      roomId,
      userId,
      userName,
      filename
    );

    selectionEmitterRef.current = createSelectionEmitter(
      socketRef.current,
      roomId,
      userId,
      userName,
      filename
    );

    // Track cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      if (cursorPositionEmitterRef.current) {
        cursorPositionEmitterRef.current({
          lineNumber: e.position.lineNumber,
          column: e.position.column
        });
      }
    });

    // Track selection changes
    editor.onDidChangeCursorSelection((e) => {
      if (selectionEmitterRef.current) {
        selectionEmitterRef.current({
          startLineNumber: e.selection.startLineNumber,
          startColumn: e.selection.startColumn,
          endLineNumber: e.selection.endLineNumber,
          endColumn: e.selection.endColumn
        });
      }
    });
  };

  // Handle code changes
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    // Emit code changes to other users (not part of cursor feature)
    socketRef.current.emit('code-change', { roomId, code: newCode });
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <Editor
        height="100%"
        defaultLanguage="javascript"
        value={code}
        onChange={handleCodeChange}
        onMount={handleEditorMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true
        }}
      />
    </div>
  );
};

export default CollaborativeEditor;
