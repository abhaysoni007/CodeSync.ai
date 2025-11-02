# 🎨 Live Cursor Feature - Visual Architecture Guide

## 📐 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COLLABORATIVE SESSION                              │
│                           (Room: "project-123")                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
┌──────────────┐            ┌──────────────┐            ┌──────────────┐
│   User A     │            │   User B     │            │   User C     │
│  (Alice)     │            │   (Bob)      │            │  (Charlie)   │
│  #FF6B6B     │            │  #4ECDC4     │            │  #FFD93D     │
└──────────────┘            └──────────────┘            └──────────────┘
       │                            │                            │
       │ Cursor Move                │ Cursor Move                │ Cursor Move
       │ Line 42, Col 15            │ Line 38, Col 8             │ Line 50, Col 22
       │                            │                            │
       ▼                            ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SOCKET.IO SERVER                                  │
│                         (WebSocket Hub)                                      │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  liveCursorHandler.js                                              │    │
│  │                                                                     │    │
│  │  socket.on('cursor-position-update', (data) => {                  │    │
│  │    // Validate data                                                │    │
│  │    // Broadcast to room except sender                             │    │
│  │    socket.to(roomId).emit('remote-cursor-update', {               │    │
│  │      userId, userName, position, filename                          │    │
│  │    });                                                              │    │
│  │  });                                                                │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
┌──────────────┐            ┌──────────────┐            ┌──────────────┐
│  User A      │            │  User B      │            │  User C      │
│  Receives:   │            │  Receives:   │            │  Receives:   │
│  - Bob's     │            │  - Alice's   │            │  - Alice's   │
│    cursor    │            │    cursor    │            │    cursor    │
│  - Charlie's │            │  - Charlie's │            │  - Bob's     │
│    cursor    │            │    cursor    │            │    cursor    │
└──────────────┘            └──────────────┘            └──────────────┘
       │                            │                            │
       ▼                            ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     RemoteCursorManager (Client-Side)                        │
│                                                                              │
│  updateCursor(userId, userName, position, filename) {                       │
│    1. Get/generate user color                                               │
│    2. Inject dynamic CSS                                                    │
│    3. Create Monaco decoration (cursor line)                                │
│    4. Create content widget (name badge)                                    │
│    5. Mark as typing (pulse animation)                                      │
│  }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MONACO EDITOR RENDERING                               │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │  Line 38:                                                    │           │
│  │  const x = 42;                                               │           │
│  │        ▲                                                      │           │
│  │        │ [B] Bob (Cyan cursor line)                          │           │
│  │                                                               │           │
│  │  Line 42:                                                    │           │
│  │  function hello() {                                          │           │
│  │               ▲                                               │           │
│  │               │ [A] Alice (Red cursor line)                  │           │
│  │                                                               │           │
│  │  Line 50:                                                    │           │
│  │  return true;                                                │           │
│  │                      ▲                                        │           │
│  │                      │ [C] Charlie (Yellow cursor line)      │           │
│  └─────────────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Sequence

### Step 1: User Moves Cursor

```
User A's Monaco Editor
         │
         │ onDidChangeCursorPosition() fires
         ▼
  Cursor Position Event
  { lineNumber: 42, column: 15 }
         │
         │ Throttled (100ms)
         ▼
  createCursorPositionEmitter()
         │
         │ socket.emit()
         ▼
  Socket.IO Client
```

### Step 2: Server Broadcasts

```
Socket.IO Server
         │
         │ socket.on('cursor-position-update')
         ▼
  liveCursorHandler.js
         │
         │ Validate data
         │ Extract: { roomId, userId, userName, position }
         ▼
  socket.to(roomId).emit('remote-cursor-update')
         │
         │ Broadcast to all except sender
         ▼
  User B, User C, User D...
```

### Step 3: Client Renders Cursor

```
User B's Socket.IO Client
         │
         │ socket.on('remote-cursor-update')
         ▼
  { userId: 'socket-123', userName: 'Alice', position: {...} }
         │
         │ Pass to manager
         ▼
  remoteCursorManager.updateCursor()
         │
         ├──► Generate/get user color (#FF6B6B)
         │
         ├──► Inject CSS styles
         │    <style id="remote-cursor-style-socket-123">
         │      .remote-cursor-socket-123 { color: #FF6B6B; }
         │    </style>
         │
         ├──► Create Monaco decoration
         │    editor.deltaDecorations([], [{
         │      range: new Range(42, 15, 42, 15),
         │      options: { className: 'remote-cursor-line' }
         │    }])
         │
         └──► Create content widget (badge)
              ┌────────┐
              │   AL   │ ← Circular badge with initials
              └────────┘
              Positioned at line 42, col 15
```

---

## 🎨 Visual Components Breakdown

### Cursor Line (Monaco Decoration)

```
┌────────────────────────────────────────┐
│  const x = 42;                         │
│        ││                               │  ← 2px colored line
│        ││← User's cursor                │  ← Pulsing glow
│        ││   (animated)                  │  ← Smooth transition
└────────────────────────────────────────┘
```

**CSS Classes:**
- `.remote-cursor` - Base class
- `.remote-cursor-line::before` - The visible line
- `.remote-cursor-socket-123` - User-specific color

**Monaco API Used:**
```javascript
editor.deltaDecorations(oldDecorations, [
  {
    range: new monaco.Range(lineNumber, column, lineNumber, column),
    options: {
      className: 'remote-cursor',
      beforeContentClassName: 'remote-cursor-line',
      glyphMarginClassName: 'remote-cursor-glyph'
    }
  }
]);
```

### Name Badge (Content Widget)

```
        ┌────────────────────────────┐
        │      Alice Johnson         │  ← Hover tooltip (full name)
        └──────────▲───────────────┬─┘
                   │               │
              ┌────┴────┐          └─ Appears on hover
              │   AJ    │  ← Circular badge (28px)
              └─────────┘  ← User initials
                   │
                   └─ Background: User's color (#FF6B6B)
```

**DOM Structure:**
```html
<div 
  class="remote-cursor-widget typing"
  style="background-color: #FF6B6B"
  data-user-id="socket-123"
  data-user-name="Alice Johnson"
>
  AJ
</div>
```

**Monaco API Used:**
```javascript
const widget = {
  getId: () => 'remote-cursor-widget-socket-123',
  getDomNode: () => domNode,
  getPosition: () => ({
    position: { lineNumber, column },
    preference: [
      monaco.editor.ContentWidgetPositionPreference.ABOVE
    ]
  })
};
editor.addContentWidget(widget);
```

### Text Selection (Monaco Decoration)

```
┌────────────────────────────────────────┐
│  const message = "Hello World";        │
│        ████████████████████             │  ← Highlighted selection
│        └──────────────────┘             │  ← User's color (25% opacity)
│         User's selection                │  ← Semi-transparent overlay
└────────────────────────────────────────┘
```

**Monaco API Used:**
```javascript
editor.deltaDecorations(oldDecorations, [
  {
    range: new monaco.Range(
      startLineNumber, startColumn,
      endLineNumber, endColumn
    ),
    options: {
      className: 'remote-selection',
      inlineClassName: 'remote-selection-inline'
    }
  }
]);
```

---

## 🎭 State Management

### RemoteCursorManager Internal State

```javascript
class RemoteCursorManager {
  // Maps storing cursor state
  decorations: Map<userId, decorationIds[]>
  widgets: Map<userId, ContentWidget>
  selections: Map<userId, decorationIds[]>
  userColors: Map<userId, color>
  userNames: Map<userId, userName>
  typingTimers: Map<userId, timeoutId>
}
```

**Example State:**
```javascript
decorations = {
  'socket-123': ['decoration-1'],
  'socket-456': ['decoration-2'],
  'socket-789': ['decoration-3']
}

widgets = {
  'socket-123': { getId, getDomNode, getPosition },
  'socket-456': { getId, getDomNode, getPosition }
}

userColors = {
  'socket-123': '#FF6B6B',
  'socket-456': '#4ECDC4',
  'socket-789': '#FFD93D'
}
```

---

## ⏱️ Throttling Strategy

### Without Throttling (❌ Bad)

```
Cursor Moves:     │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │
Socket Emits:     ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓
Network:          🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
                  (Network flooding, lag, high CPU)
```

### With Throttling (✅ Good)

```
Cursor Moves:     │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │
Socket Emits:     ↓       ↓       ↓       ↓       ↓
Network:          📡      📡      📡      📡      📡
                  (10 updates/sec, smooth, efficient)
```

**Implementation:**
```javascript
const throttle = (func, delay) => {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};
```

---

## 🌈 Color Assignment Strategy

### Sequential Assignment (✅ Used)

```
User 1 joins → #FF6B6B (Red)
User 2 joins → #4ECDC4 (Cyan)
User 3 joins → #FFD93D (Yellow)
User 4 joins → #6BCB77 (Green)
...
User 25 joins → #6A0572 (Purple)
User 26 joins → #FF6B6B (Wraps around)
```

**Benefits:**
- Maximum color distinction between adjacent users
- Predictable and testable
- No color conflicts

### Hash-Based Assignment (❌ Not Used)

```
User "alice" → hash % 25 → Color 7 (#FF6FB5)
User "bob"   → hash % 25 → Color 19 (#FF6F61)
User "carol" → hash % 25 → Color 7 (#FF6FB5) ← Collision!
```

**Problems:**
- Random collisions possible
- Less distinct colors for sequential users

---

## 🔌 Socket Events Flow Chart

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT EVENTS                           │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ cursor-      │   │ selection-   │   │ cursor-      │
│ position-    │   │ change       │   │ clear        │
│ update       │   │              │   │              │
└──────────────┘   └──────────────┘   └──────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   SOCKET.IO SERVER                           │
│                   liveCursorHandler.js                       │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ remote-      │   │ remote-      │   │ user-cursor- │
│ cursor-      │   │ selection-   │   │ removed      │
│ update       │   │ update       │   │              │
└──────────────┘   └──────────────┘   └──────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LISTENERS                         │
│                     (All Users in Room)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎬 Animation Timeline

### Cursor Appears

```
Time:     0ms        100ms       200ms
          │          │           │
          ▼          ▼           ▼
Scale:    0.3 ────── 0.7 ─────── 1.0
Opacity:  0.0 ────── 0.5 ─────── 1.0
          └─────────────────────┘
          cursor-point-appear animation
          (cubic-bezier spring effect)
```

### Typing Pulse

```
Time:     0ms    400ms   800ms   1200ms
          │      │       │       │
          ▼      ▼       ▼       ▼
Scale:    1.0 → 1.1 → 1.0 → 1.1
Shadow:   2px → 4px → 2px → 4px
          └──────────────────────┘
          cursor-point-pulse (infinite loop)
          (stops 1sec after last cursor move)
```

### Cursor Line Pulse

```
Time:     0ms      750ms    1500ms
          │        │        │
          ▼        ▼        ▼
Opacity:  1.0 ──► 0.7 ───► 1.0
Glow:     8px ──► 12px ──► 8px
          └────────────────────┘
          cursor-pulse (infinite loop)
```

---

## 📦 File Dependencies Graph

```
RemoteCursor.css
       │
       │ (styles)
       ▼
remoteCursorUtils.js ◄─────┐
       │                   │
       ├──► throttleUtils.js
       │                   │
       └──► userColorUtils.js
                           │
                           │ (imported by)
                           │
                      ExampleIntegration.jsx
                           │
                           │ (uses)
                           ▼
                      Socket.IO Client
                           │
                           │ (connects to)
                           ▼
                      exampleServer.js
                           │
                           │ (uses)
                           ▼
                      liveCursorHandler.js
                           │
                           │ (uses)
                           ▼
                      Socket.IO Server
```

---

## 🎯 Integration Points

### Where to Hook Into Your App

```
Your Collaborative Editor App
│
├── Authentication ────────────────────────┐
│   (Your existing code)                   │
│                                          │
├── Room Management ───────────────────────┤
│   (Your existing code)                   │
│                                          │
├── Monaco Editor Setup ◄──────────────────┤
│   │                                      │
│   └──► [INTEGRATE HERE] ◄────────────────┤
│       RemoteCursorManager                │
│       - Initialize after editor mounts   │
│       - Listen to cursor events          │
│       - Emit cursor updates              │
│                                          │
├── Socket.IO Client ◄─────────────────────┤
│   │                                      │
│   └──► [INTEGRATE HERE] ◄────────────────┤
│       Event Listeners                    │
│       - remote-cursor-update             │
│       - remote-selection-update          │
│       - user-cursor-removed              │
│                                          │
└── Socket.IO Server ◄─────────────────────┘
    │
    └──► [INTEGRATE HERE]
        liveCursorHandler.js
        - Call initializeLiveCursorHandlers()
        - In connection handler
```

---

## 🎨 CSS Class Hierarchy

```
.remote-cursor (base class)
│
├── .remote-cursor-line (::before pseudo-element)
│   └── Dynamic color via .remote-cursor-socket-123
│
├── .remote-cursor-glyph (gutter marker)
│
└── .remote-cursor-widget (name badge)
    ├── ::after (tooltip with user name)
    ├── ::before (tooltip arrow)
    └── .typing (pulse animation class)

.remote-selection (base class)
│
├── .remote-selection-inline (highlight overlay)
└── Dynamic color via .remote-selection-socket-123
```

---

**This concludes the visual architecture guide! 🎉**

All diagrams are ASCII-art for easy viewing in any text editor.
