# 🎯 Live Cursor Feature - Real-Time Cursor Tracking for Collaborative Code Editors

A production-ready, self-contained live cursor tracking module for collaborative code editors built with **Monaco Editor** and **Socket.IO**. This module provides **Figma-like** real-time cursor positioning, user name badges, and selection highlighting.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Dependencies](#-dependencies)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Integration Guide](#-integration-guide)
- [API Reference](#-api-reference)
- [Common Pitfalls](#-common-pitfalls)
- [Performance Optimization](#-performance-optimization)
- [Browser Support](#-browser-support)
- [License](#-license)

---

## 🎨 Overview

The **Live Cursor Feature** enables real-time visualization of remote user cursors and text selections in a collaborative Monaco Editor environment. Each user's cursor is represented by:

- **Animated cursor line** with pulsing effect
- **Circular name badge** displaying user initials
- **Hover tooltip** showing full user name
- **Highlighted text selections** with user-specific colors
- **Typing indicators** showing active editing

**Visual Style:** Inspired by Figma's collaborative cursor design with smooth animations and high contrast.

---

## ✨ Features

### Core Functionality
- ✅ **Real-time cursor position tracking** (10 updates/second, throttled)
- ✅ **Text selection highlighting** (6-7 updates/second, throttled)
- ✅ **User color generation** (25 distinct colors, sequential assignment)
- ✅ **Name badge widgets** (circular badges with initials + hover tooltips)
- ✅ **Automatic cleanup** on user disconnect
- ✅ **Multi-file support** (cursors only visible on same file)
- ✅ **Typing indicators** (pulse animation when actively typing)

### Advanced Features
- ✅ **Throttling/debouncing** to prevent network flooding
- ✅ **Dynamic CSS injection** for per-user cursor colors
- ✅ **Monaco decorations API** for efficient rendering
- ✅ **Content widgets** for name badges
- ✅ **Accessibility support** (high contrast, reduced motion)
- ✅ **Responsive design** (mobile-friendly)

---

## 📦 Dependencies

### Client-Side (Frontend)
```json
{
  "monaco-editor": "^0.44.0",
  "@monaco-editor/react": "^4.6.0",
  "socket.io-client": "^4.6.0",
  "react": "^18.2.0" // (optional, if using React)
}
```

### Server-Side (Backend)
```json
{
  "socket.io": "^4.6.0",
  "express": "^4.18.2",
  "cors": "^2.8.5"
}
```

### Install Dependencies
```bash
# Client
npm install monaco-editor @monaco-editor/react socket.io-client

# Server
npm install socket.io express cors
```

---

## 🏗️ Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (User A)                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Monaco Editor                                       │  │
│  │  ┌────────────────────────────────────────────┐     │  │
│  │  │ onDidChangeCursorPosition                  │     │  │
│  │  │   ↓                                         │     │  │
│  │  │ createCursorPositionEmitter (throttled)    │     │  │
│  │  │   ↓                                         │     │  │
│  │  │ socket.emit('cursor-position-update', {    │     │  │
│  │  │   roomId, userId, userName, position       │     │  │
│  │  │ })                                          │     │  │
│  │  └────────────────────────────────────────────┘     │  │
│  └─────────────────────────────────────────────────────┘  │
│                         ↓                                  │
└─────────────────────────|──────────────────────────────────┘
                          ↓
       ┌──────────────────────────────────────┐
       │    SOCKET.IO SERVER                  │
       │                                      │
       │  socket.on('cursor-position-update') │
       │     ↓                                 │
       │  Validate data                       │
       │     ↓                                 │
       │  socket.to(roomId).emit(             │
       │    'remote-cursor-update', {         │
       │      userId, userName, position      │
       │    }                                  │
       │  )                                    │
       └──────────────────────────────────────┘
                          ↓
┌─────────────────────────|──────────────────────────────────┐
│                    CLIENT (User B, C, D...)                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Socket Event Listener                              │  │
│  │  ┌────────────────────────────────────────────┐     │  │
│  │  │ socket.on('remote-cursor-update')          │     │  │
│  │  │   ↓                                         │     │  │
│  │  │ remoteCursorManager.updateCursor()         │     │  │
│  │  │   ↓                                         │     │  │
│  │  │ - Generate user color (if new)             │     │  │
│  │  │ - Inject dynamic CSS                       │     │  │
│  │  │ - Create Monaco decoration                 │     │  │
│  │  │ - Create/update widget (name badge)        │     │  │
│  │  │ - Mark as typing                           │     │  │
│  │  └────────────────────────────────────────────┘     │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### **Client-Side Components**

1. **RemoteCursorManager** (`remoteCursorUtils.js`)
   - Central class managing all remote cursors
   - Maintains Maps for decorations, widgets, colors, names
   - Handles cursor creation, updates, and cleanup

2. **Throttle Utils** (`throttleUtils.js`)
   - Prevents network flooding
   - Ensures smooth updates without lag
   - Configurable throttle delays

3. **User Color Utils** (`userColorUtils.js`)
   - Generates consistent colors per user
   - Sequential color assignment (not hash-based)
   - Extracts user initials for badges

4. **CSS Styles** (`RemoteCursor.css`)
   - Figma-inspired cursor animations
   - Responsive and accessible
   - Supports high contrast and reduced motion

#### **Server-Side Components**

1. **Live Cursor Handler** (`liveCursorHandler.js`)
   - Socket event handlers
   - Data validation
   - Broadcast logic
   - Cleanup on disconnect

---

## 🚀 Installation

### Step 1: Copy Files to Your Project

```bash
# Copy client files
cp -r live-cursor-feature/client/utils/* your-project/src/utils/
cp -r live-cursor-feature/client/styles/* your-project/src/styles/

# Copy server files
cp live-cursor-feature/server/liveCursorHandler.js your-project/backend/handlers/
```

### Step 2: Import CSS in Your App

```javascript
// In your main App.jsx or index.js
import './styles/RemoteCursor.css';
```

### Step 3: Install Dependencies (if not already installed)

```bash
npm install monaco-editor @monaco-editor/react socket.io-client
```

---

## ⚡ Quick Start

### Client Example (React + Monaco Editor)

```javascript
import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import io from 'socket.io-client';
import RemoteCursorManager, {
  createCursorPositionEmitter,
  createSelectionEmitter
} from './utils/remoteCursorUtils';
import './styles/RemoteCursor.css';

const socket = io('http://localhost:3000');

function CollaborativeEditor({ roomId, userId, userName }) {
  const editorRef = useRef(null);
  const cursorManagerRef = useRef(null);
  const cursorEmitterRef = useRef(null);
  const selectionEmitterRef = useRef(null);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;

    // Initialize cursor manager
    cursorManagerRef.current = new RemoteCursorManager(editor, socket.id);

    // Create throttled emitters
    cursorEmitterRef.current = createCursorPositionEmitter(
      socket, roomId, userId, userName, 'index.js'
    );
    selectionEmitterRef.current = createSelectionEmitter(
      socket, roomId, userId, userName, 'index.js'
    );

    // Track cursor changes
    editor.onDidChangeCursorPosition((e) => {
      cursorEmitterRef.current({
        lineNumber: e.position.lineNumber,
        column: e.position.column
      });
    });

    // Track selection changes
    editor.onDidChangeCursorSelection((e) => {
      selectionEmitterRef.current({
        startLineNumber: e.selection.startLineNumber,
        startColumn: e.selection.startColumn,
        endLineNumber: e.selection.endLineNumber,
        endColumn: e.selection.endColumn
      });
    });
  };

  useEffect(() => {
    // Listen for remote cursor updates
    socket.on('remote-cursor-update', ({ userId, userName, position, filename }) => {
      cursorManagerRef.current?.updateCursor(userId, userName, position, filename);
    });

    // Listen for remote selection updates
    socket.on('remote-selection-update', ({ userId, userName, selection, filename }) => {
      cursorManagerRef.current?.updateSelection(userId, userName, selection, filename);
    });

    // Clean up on user disconnect
    socket.on('user-cursor-removed', ({ userId }) => {
      cursorManagerRef.current?.clearUser(userId);
    });

    return () => {
      socket.off('remote-cursor-update');
      socket.off('remote-selection-update');
      socket.off('user-cursor-removed');
    };
  }, []);

  return (
    <Editor
      height="100vh"
      defaultLanguage="javascript"
      onMount={handleEditorMount}
      theme="vs-dark"
    />
  );
}

export default CollaborativeEditor;
```

### Server Example (Node.js + Socket.IO)

```javascript
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import initializeLiveCursorHandlers from './handlers/liveCursorHandler.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join room
  socket.on('join-room', ({ roomId }) => {
    socket.join(roomId);
  });

  // Initialize cursor handlers
  initializeLiveCursorHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

---

## 📚 Integration Guide

### Step-by-Step Integration

#### **1. Initialize Socket.IO Connection**

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5
});

// Join a collaborative room
socket.emit('join-room', { roomId: 'room-123', userName: 'Alice' });
```

#### **2. Set Up Monaco Editor**

```javascript
import Editor from '@monaco-editor/react';
import RemoteCursorManager from './utils/remoteCursorUtils';

function MyEditor() {
  const editorRef = useRef(null);
  const cursorManagerRef = useRef(null);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    cursorManagerRef.current = new RemoteCursorManager(editor, socket.id);
  };

  return <Editor onMount={handleEditorMount} />;
}
```

#### **3. Emit Cursor Position Updates**

```javascript
import { createCursorPositionEmitter } from './utils/remoteCursorUtils';

const cursorEmitter = createCursorPositionEmitter(
  socket,
  'room-123',
  socket.id,
  'Alice',
  'index.js'
);

editor.onDidChangeCursorPosition((e) => {
  cursorEmitter({
    lineNumber: e.position.lineNumber,
    column: e.position.column
  });
});
```

#### **4. Listen for Remote Cursor Updates**

```javascript
socket.on('remote-cursor-update', ({ userId, userName, position, filename }) => {
  cursorManagerRef.current.updateCursor(userId, userName, position, filename);
});
```

#### **5. Handle User Disconnect**

```javascript
socket.on('user-cursor-removed', ({ userId }) => {
  cursorManagerRef.current.clearUser(userId);
});
```

### Server-Side Integration

#### **Option 1: Use Provided Handler (Recommended)**

```javascript
import initializeLiveCursorHandlers from './liveCursorHandler.js';

io.on('connection', (socket) => {
  initializeLiveCursorHandlers(io, socket);
});
```

#### **Option 2: Manual Integration**

```javascript
socket.on('cursor-position-update', (data) => {
  const { roomId, position } = data;
  socket.to(roomId).emit('remote-cursor-update', {
    userId: socket.id,
    userName: data.userName,
    position
  });
});
```

---

## 📖 API Reference

### Client-Side API

#### **RemoteCursorManager**

```javascript
class RemoteCursorManager {
  constructor(editor: monaco.editor.IStandaloneCodeEditor, currentUserId: string)
  
  // Update remote user cursor
  updateCursor(userId: string, userName: string, position: Position, filename: string): void
  
  // Update remote user selection
  updateSelection(userId: string, userName: string, selection: Selection, filename: string): void
  
  // Set user color explicitly
  setUserColor(userId: string, color: string): void
  
  // Set user display name
  setUserName(userId: string, name: string): void
  
  // Clear specific user cursor
  clearCursor(userId: string): void
  
  // Clear specific user selection
  clearSelection(userId: string): void
  
  // Clear all data for a user
  clearUser(userId: string): void
  
  // Clear all remote cursors
  clearAll(): void
  
  // Cleanup and destroy
  destroy(): void
}
```

#### **Helper Functions**

```javascript
// Create throttled cursor emitter
createCursorPositionEmitter(
  socket: Socket,
  roomId: string,
  userId: string,
  userName: string,
  filename: string
): Function

// Create throttled selection emitter
createSelectionEmitter(
  socket: Socket,
  roomId: string,
  userId: string,
  userName: string,
  filename: string
): Function
```

#### **Type Definitions**

```typescript
interface Position {
  lineNumber: number;
  column: number;
}

interface Selection {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}
```

### Server-Side API

#### **initializeLiveCursorHandlers**

```javascript
initializeLiveCursorHandlers(io: Socket.IO.Server, socket: Socket): void
```

Automatically sets up all cursor-related event handlers.

#### **Socket Events**

**Client → Server:**
- `cursor-position-update` - Cursor moved
- `selection-change` - Text selected
- `cursor-clear` - Hide cursor manually

**Server → Client:**
- `remote-cursor-update` - Remote user cursor moved
- `remote-selection-update` - Remote user selected text
- `user-cursor-removed` - User disconnected, remove cursor

---

## ⚠️ Common Pitfalls

### 1. **Cursor Not Visible**

**Problem:** Remote cursors don't appear.

**Solutions:**
- ✅ Ensure CSS file is imported: `import './styles/RemoteCursor.css'`
- ✅ Check that `remoteCursorManager` is initialized after editor mount
- ✅ Verify socket events are being received (check browser console)
- ✅ Confirm users are in the same `roomId`

### 2. **Performance Issues / Lag**

**Problem:** Editor becomes slow with many users.

**Solutions:**
- ✅ Increase throttle delay: Change `100ms` to `150ms` in `createCursorPositionEmitter`
- ✅ Limit room size (recommended: max 15-20 simultaneous users)
- ✅ Use `rafThrottle` for visual updates instead of `throttle`
- ✅ Disable cursor tracking when user is inactive

### 3. **Color Conflicts**

**Problem:** Multiple users have the same color.

**Solutions:**
- ✅ Use server-assigned colors: Send color from server in user list
- ✅ Call `remoteCursorManager.setUserColor(userId, color)` explicitly
- ✅ Ensure `userColorUtils.js` is imported correctly

### 4. **Cursors Not Clearing on Disconnect**

**Problem:** Stale cursors remain after user leaves.

**Solutions:**
- ✅ Ensure disconnect handler emits `user-cursor-removed`
- ✅ Call `remoteCursorManager.clearUser(userId)` on disconnect event
- ✅ Implement server-side room cleanup

### 5. **Multi-File Issues**

**Problem:** Cursors appear on wrong files.

**Solutions:**
- ✅ Pass correct `filename` in emit events
- ✅ Check filename in `updateCursor()` before rendering
- ✅ Clear cursors when switching files: `remoteCursorManager.clearAll()`

### 6. **Memory Leaks**

**Problem:** Browser memory grows over time.

**Solutions:**
- ✅ Call `remoteCursorManager.destroy()` on unmount
- ✅ Clear timeout timers in `typingTimers` Map
- ✅ Remove injected CSS styles on cleanup

---

## 🚀 Performance Optimization

### Throttling Configuration

```javascript
// Conservative (low network usage, slight delay)
createCursorPositionEmitter(socket, roomId, userId, userName, filename, 200);

// Balanced (recommended)
createCursorPositionEmitter(socket, roomId, userId, userName, filename, 100);

// Aggressive (high responsiveness, more bandwidth)
createCursorPositionEmitter(socket, roomId, userId, userName, filename, 50);
```

### Disable Cursors When Inactive

```javascript
let isActive = true;

window.addEventListener('blur', () => {
  isActive = false;
  socket.emit('cursor-clear', { roomId });
});

window.addEventListener('focus', () => {
  isActive = true;
});

editor.onDidChangeCursorPosition((e) => {
  if (isActive) {
    cursorEmitter(e.position);
  }
});
```

### Use RAF Throttle for Smooth Animations

```javascript
import { rafThrottle } from './utils/throttleUtils';

const cursorEmitter = rafThrottle((position) => {
  socket.emit('cursor-position-update', { roomId, position });
});
```

---

## 🌐 Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Android)

**Requirements:**
- WebSocket support
- CSS animations
- ES6+ JavaScript

---

## 📄 License

MIT License - Feel free to use in commercial and open-source projects.

---

## 🤝 Contributing

This module is extracted from a production collaborative editor. Contributions welcome!

---

## 📞 Support

For issues, questions, or feature requests, please refer to the example integration files included in this package.

---

## 🎉 Acknowledgments

Inspired by **Figma**, **VSCode Live Share**, and **Replit** collaborative features.

---

**Happy Coding! 🚀**
