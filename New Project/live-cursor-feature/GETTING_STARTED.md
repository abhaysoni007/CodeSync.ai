# 🚀 Getting Started with Live Cursor Feature

Welcome! This guide will help you integrate the live cursor feature into your collaborative code editor in **under 30 minutes**.

---

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js** 14+ installed
- ✅ **npm** or **yarn** package manager
- ✅ Basic knowledge of **React** (or your frontend framework)
- ✅ Basic knowledge of **Socket.IO**
- ✅ An existing **Monaco Editor** setup (or ready to add one)

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Install Dependencies

```bash
# Install required packages
npm install monaco-editor @monaco-editor/react socket.io-client socket.io express
```

### Step 2: Copy Files to Your Project

```bash
# Option A: Copy everything
cp -r live-cursor-feature/client/utils/* your-project/src/utils/
cp -r live-cursor-feature/client/styles/* your-project/src/styles/
cp live-cursor-feature/server/liveCursorHandler.js your-project/backend/handlers/

# Option B: Manual copy (Windows)
# Copy client/utils folder to your-project/src/utils
# Copy client/styles folder to your-project/src/styles
# Copy server/liveCursorHandler.js to your-project/backend/handlers
```

### Step 3: Run the Example Server

```bash
# Terminal 1 - Start server
cd live-cursor-feature
node server/exampleServer.js

# Server runs on http://localhost:3000
```

### Step 4: Test with Multiple Browsers

1. Open **Chrome**: `http://localhost:3000`
2. Open **Firefox**: `http://localhost:3000`
3. Type in one browser → See cursor in the other! ✨

---

## 🎯 Full Integration Guide (30 Minutes)

### Part 1: Client-Side Setup (15 min)

#### 1.1: Import Dependencies

```javascript
// In your main App.jsx or Editor component
import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import io from 'socket.io-client';

// Import live cursor utilities
import RemoteCursorManager, {
  createCursorPositionEmitter,
  createSelectionEmitter
} from './utils/remoteCursorUtils';

// Import styles (IMPORTANT!)
import './styles/RemoteCursor.css';
```

#### 1.2: Initialize Socket Connection

```javascript
function CollaborativeEditor() {
  // Socket connection
  const socketRef = useRef(null);
  const [roomId] = useState('demo-room-123');
  const [userId] = useState(Math.random().toString(36));
  const [userName] = useState('User' + Math.floor(Math.random() * 1000));

  useEffect(() => {
    // Connect to server
    socketRef.current = io('http://localhost:3000', {
      transports: ['websocket'],
      reconnection: true
    });

    // Join room
    socketRef.current.emit('join-room', { roomId, userName });

    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId, userName]);

  // ... continue below
}
```

#### 1.3: Set Up Editor and Cursor Manager

```javascript
function CollaborativeEditor() {
  // ... socket setup from above

  // Refs for editor and cursor manager
  const editorRef = useRef(null);
  const remoteCursorManagerRef = useRef(null);
  const cursorEmitterRef = useRef(null);
  const selectionEmitterRef = useRef(null);

  // Handle editor mount
  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;

    // Initialize Remote Cursor Manager
    remoteCursorManagerRef.current = new RemoteCursorManager(
      editor,
      socketRef.current.id
    );

    // Create throttled emitters
    cursorEmitterRef.current = createCursorPositionEmitter(
      socketRef.current,
      roomId,
      userId,
      userName,
      'index.js'
    );

    selectionEmitterRef.current = createSelectionEmitter(
      socketRef.current,
      roomId,
      userId,
      userName,
      'index.js'
    );

    // Track cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      if (cursorEmitterRef.current) {
        cursorEmitterRef.current({
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

  // ... continue below
}
```

#### 1.4: Listen for Remote Cursor Updates

```javascript
function CollaborativeEditor() {
  // ... previous code

  useEffect(() => {
    if (!socketRef.current) return;

    // Listen for remote cursor updates
    socketRef.current.on('remote-cursor-update', ({ userId, userName, position, filename }) => {
      if (remoteCursorManagerRef.current) {
        remoteCursorManagerRef.current.updateCursor(
          userId,
          userName,
          position,
          filename
        );
      }
    });

    // Listen for remote selection updates
    socketRef.current.on('remote-selection-update', ({ userId, userName, selection, filename }) => {
      if (remoteCursorManagerRef.current) {
        remoteCursorManagerRef.current.updateSelection(
          userId,
          userName,
          selection,
          filename
        );
      }
    });

    // Clean up when user disconnects
    socketRef.current.on('user-cursor-removed', ({ userId }) => {
      if (remoteCursorManagerRef.current) {
        remoteCursorManagerRef.current.clearUser(userId);
      }
    });

    return () => {
      socketRef.current.off('remote-cursor-update');
      socketRef.current.off('remote-selection-update');
      socketRef.current.off('user-cursor-removed');
    };
  }, []);

  // Render editor
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <Editor
        height="100%"
        defaultLanguage="javascript"
        defaultValue="// Start coding..."
        onMount={handleEditorMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          wordWrap: 'on'
        }}
      />
    </div>
  );
}

export default CollaborativeEditor;
```

---

### Part 2: Server-Side Setup (15 min)

#### 2.1: Create Server File

Create `server.js` in your backend:

```javascript
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import initializeLiveCursorHandlers from './handlers/liveCursorHandler.js';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // Configure for production!
    methods: ['GET', 'POST']
  }
});

// Track active rooms (simple in-memory store)
const rooms = new Map();

// Handle socket connections
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle room joining
  socket.on('join-room', ({ roomId, userName }) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(socket.id);

    console.log(`${userName} joined room ${roomId}`);
  });

  // Initialize live cursor handlers
  initializeLiveCursorHandlers(io, socket);

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove from rooms
    rooms.forEach((users, roomId) => {
      users.delete(socket.id);
      if (users.size === 0) {
        rooms.delete(roomId);
      }
    });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### 2.2: Run the Server

```bash
node server.js
```

---

## ✅ Verification Checklist

After integration, test these scenarios:

### Basic Functionality
- [ ] Open 2 browser tabs
- [ ] Join same room in both tabs
- [ ] Move cursor in tab 1
- [ ] See colored cursor line in tab 2
- [ ] See name badge with initials above cursor
- [ ] Hover over badge to see full name
- [ ] Select text in tab 1
- [ ] See highlighted selection in tab 2

### Advanced Functionality
- [ ] Open 3+ tabs
- [ ] Each user has different color
- [ ] Cursors update smoothly without lag
- [ ] Close one tab → cursor disappears in others
- [ ] Type quickly → see typing pulse animation
- [ ] Switch files → cursors clear and re-appear

---

## 🐛 Common Issues and Solutions

### Issue 1: Cursors Not Showing

**Symptom:** No colored cursors appear for remote users

**Solutions:**
```javascript
// 1. Check if CSS is imported
import './styles/RemoteCursor.css';

// 2. Verify manager is initialized
console.log('Manager:', remoteCursorManagerRef.current);

// 3. Check socket events
socketRef.current.on('remote-cursor-update', (data) => {
  console.log('Received cursor update:', data);
});

// 4. Verify users are in same room
console.log('Room ID:', roomId);
```

### Issue 2: Socket Connection Errors

**Symptom:** "Connection refused" or "ERR_CONNECTION_REFUSED"

**Solutions:**
```javascript
// 1. Check server is running
// Terminal: node server.js

// 2. Verify port
const socket = io('http://localhost:3000'); // Match server port

// 3. Check CORS settings (server-side)
cors: {
  origin: 'http://localhost:5173', // Your frontend URL
  methods: ['GET', 'POST']
}

// 4. Use correct transport
io('http://localhost:3000', {
  transports: ['websocket', 'polling']
});
```

### Issue 3: Performance Lag

**Symptom:** Editor becomes slow with multiple users

**Solutions:**
```javascript
// 1. Increase throttle delay
const cursorEmitter = createCursorPositionEmitter(
  socket, roomId, userId, userName, filename
);
// Change throttle from 100ms to 150ms in remoteCursorUtils.js

// 2. Limit room size
if (rooms.get(roomId).size > 15) {
  socket.emit('error', 'Room full');
  return;
}

// 3. Use RAF throttle for visual updates
import { rafThrottle } from './utils/throttleUtils';
```

### Issue 4: Colors Not Distinct

**Symptom:** Multiple users have same/similar colors

**Solutions:**
```javascript
// 1. Explicitly set colors from server
socket.emit('join-room', { roomId, userName });
socket.on('user-color-assigned', ({ color }) => {
  remoteCursorManagerRef.current.setUserColor(socket.id, color);
});

// 2. Increase color palette (userColorUtils.js)
const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFD93D', // ... add more
];
```

---

## 🎨 Customization Guide

### Change Badge Size

```css
/* In RemoteCursor.css */
.remote-cursor-widget {
  width: 32px !important;    /* Default: 28px */
  height: 32px !important;
  font-size: 12px !important; /* Default: 11px */
}
```

### Change Cursor Line Width

```css
/* In RemoteCursor.css */
.remote-cursor-line::before {
  width: 3px !important; /* Default: 2px */
}
```

### Change Throttle Rate

```javascript
// In remoteCursorUtils.js
export const createCursorPositionEmitter = (socket, roomId, userId, userName, filename) => {
  return throttle((position) => {
    // ... emit logic
  }, 50); // Default: 100ms, Change to 50ms for 20 updates/sec
};
```

### Add Custom Colors

```javascript
// In userColorUtils.js
const USER_COLORS = [
  '#FF6B6B', // Your custom colors
  '#4ECDC4',
  '#YOUR_COLOR_HERE',
  // ... add more
];
```

---

## 📚 Next Steps

Now that you have the basics working:

1. **Read Full Documentation** → `README.md`
2. **Understand Architecture** → `ARCHITECTURE_VISUAL.md`
3. **Explore Examples** → `ExampleIntegration.jsx`
4. **Optimize Performance** → Adjust throttle settings
5. **Customize Styling** → Edit `RemoteCursor.css`
6. **Add Features** → Implement follow user, cursor history, etc.

---

## 🎓 Learning Resources

### Monaco Editor
- [Monaco Playground](https://microsoft.github.io/monaco-editor/playground.html)
- [API Documentation](https://microsoft.github.io/monaco-editor/api/)
- [Decorations Guide](https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.IModelDecorationOptions.html)

### Socket.IO
- [Official Docs](https://socket.io/docs/v4/)
- [Rooms & Namespaces](https://socket.io/docs/v4/rooms/)
- [Emit Cheatsheet](https://socket.io/docs/v4/emit-cheatsheet/)

### React (if using)
- [React Hooks](https://react.dev/reference/react)
- [useRef Hook](https://react.dev/reference/react/useRef)
- [useEffect Hook](https://react.dev/reference/react/useEffect)

---

## 💡 Pro Tips

1. **Always throttle** cursor updates - prevents network flooding
2. **Clear cursors on file switch** - prevents ghost cursors
3. **Use unique room IDs** - prevents cross-room leakage
4. **Test with 5+ users** - catch performance issues early
5. **Monitor network traffic** - optimize throttle delays
6. **Implement reconnection** - handle temporary disconnects
7. **Add error boundaries** - catch rendering errors gracefully

---

## 🎉 You're Done!

Congratulations! You now have a fully functional live cursor feature.

**Next:** Open multiple browser tabs and watch the magic happen! ✨

Need help? Check the troubleshooting section above or review the full documentation.

**Happy Coding! 🚀**
