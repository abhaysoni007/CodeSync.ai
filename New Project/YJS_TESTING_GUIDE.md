# Yjs Collaboration Testing Guide

## 🎯 What was implemented:

### Backend (Node.js + Socket.IO + Yjs)
✅ Yjs document management per room/file
✅ MongoDB persistence for Yjs state
✅ Real-time sync via Socket.IO
✅ JWT authentication for sockets
✅ Cursor/awareness broadcasting
✅ Auto-save with debouncing (5s)

### Frontend (React + Monaco Editor)
✅ EditorRoom.tsx component
✅ Yjs + Monaco binding
✅ Real-time collaboration
✅ User presence indicators
✅ Cursor position tracking

---

## 🚀 How to Test:

### Step 1: Start Backend
```powershell
cd "c:\Users\yuvra\Downloads\Testing 2\New Project\backend"
npm run dev
```

### Step 2: Create Test Data

```powershell
# 1. Signup two users
$user1Body = @{
    username = "alice"
    email = "alice@test.com"
    password = "pass123"
} | ConvertTo-Json

$user1 = Invoke-RestMethod -Uri "http://localhost:5000/auth/signup" `
    -Method Post -Body $user1Body -ContentType "application/json"

$user2Body = @{
    username = "bob"
    email = "bob@test.com"
    password = "pass123"
} | ConvertTo-Json

$user2 = Invoke-RestMethod -Uri "http://localhost:5000/auth/signup" `
    -Method Post -Body $user2Body -ContentType "application/json"

# Save tokens
$token1 = $user1.data.accessToken
$token2 = $user2.data.accessToken

# 2. Create a project (as user1)
$projectBody = @{
    name = "Collab Test"
    description = "Testing Yjs collaboration"
} | ConvertTo-Json

$project = Invoke-RestMethod -Uri "http://localhost:5000/projects" `
    -Method Post -Body $projectBody `
    -ContentType "application/json" `
    -Headers @{Authorization = "Bearer $token1"}

$projectId = $project.data.project._id

# 3. Create a room (as user1)
$roomBody = @{
    name = "Test Room"
    projectId = $projectId
    description = "Yjs test room"
} | ConvertTo-Json

$room = Invoke-RestMethod -Uri "http://localhost:5000/rooms" `
    -Method Post -Body $roomBody `
    -ContentType "application/json" `
    -Headers @{Authorization = "Bearer $token1"}

$roomId = $room.data.room._id

# 4. Create a file (manually in MongoDB or via API)
# For now, use MongoDB Compass or create file API endpoint
```

### Step 3: Test with Frontend

```powershell
cd "c:\Users\yuvra\Downloads\Testing 2\New Project\frontend-new"
npm install
npm run dev
```

Open two browser windows:
- Window 1: http://localhost:5173 (login as alice)
- Window 2: http://localhost:5173 (login as bob)

Both join the same room/file and start editing!

---

## 🧪 Automated Test Simulation

Edit `backend/test/yjs-simulation.js` with your room/file IDs and tokens:

```javascript
const ROOM_ID = 'your-room-id';
const FILE_ID = 'your-file-id';
const USER1_TOKEN = 'alice-token';
const USER2_TOKEN = 'bob-token';
```

Run simulation:
```powershell
cd "c:\Users\yuvra\Downloads\Testing 2\New Project\backend"
node test/yjs-simulation.js
```

**Expected Output:**
```
🧪 STARTING YJS MERGE CONSISTENCY TEST
======================================

👤 USER 1: Connecting...
✅ USER 1: Connected
✅ USER 1: Joined room
👤 USER 2: Connecting...
✅ USER 2: Connected
✅ USER 2: Joined room
✏️  USER 1: Writing "Hello from User 1\n"
📤 USER 1: Sent update
✏️  USER 2: Writing "Hello from User 2\n"
📤 USER 2: Sent update
📥 USER 2: Received update
📥 USER 1: Received update
✏️  USER 1: Writing "This is line 2 from User 1\n"
📤 USER 1: Sent update
📥 USER 2: Received update
✏️  USER 2: Writing "This is line 2 from User 2\n"
📤 USER 2: Sent update
📥 USER 1: Received update

📄 USER 1 FINAL STATE:
------------------------
Hello from User 2
Hello from User 1
This is line 2 from User 1
This is line 2 from User 2
------------------------

📄 USER 2 FINAL STATE:
------------------------
Hello from User 2
Hello from User 1
This is line 2 from User 1
This is line 2 from User 2
------------------------

✅ TEST COMPLETE
================
Both users should have identical final states!
This proves Yjs CRDT conflict-free merging.
```

---

## 📋 Features Implemented:

### ✅ Yjs Integration
- Document per room/file pair
- CRDT-based conflict resolution
- Incremental sync
- Binary protocol optimization

### ✅ MongoDB Persistence
- Auto-save every 5 seconds (debounced)
- Yjs state stored in FileVersion.diff (base64)
- Full content backup in File.content
- Version history maintained

### ✅ Real-time Features
- Live cursor broadcasting
- User presence tracking
- Awareness state sync
- Chat messages

### ✅ Security
- JWT authentication for sockets
- Room access validation
- User permission checks

### ✅ Monaco Editor
- Syntax highlighting
- Multi-cursor support
- Selection syncing
- Scroll sync (via y-monaco)

---

## 🎨 Architecture:

```
Client 1 (Browser)          Server (Node.js)          Client 2 (Browser)
     |                           |                           |
     |-- join-room -------------->|                           |
     |<-- yjs-sync (state) -------|                           |
     |                           |<---- join-room ------------|
     |                           |------ yjs-sync (state) --->|
     |                           |                           |
     |-- edit (type) ------------>|                           |
     |-- yjs-sync (update) ------->|                           |
     |                           |------ yjs-sync (update) -->|
     |                           |                           |
     |                           |<---- edit (type) ----------|
     |                           |<-- yjs-sync (update) ------|
     |<-- yjs-sync (update) ------|                           |
     |                           |                           |
     |   [Both have same state]  |   [MongoDB persisted]     |
```

---

## 🔧 Troubleshooting:

**Socket not connecting:**
- Check JWT token is valid
- Verify backend is running on port 5000
- Check browser console for errors

**Changes not syncing:**
- Verify both users joined same room/file
- Check network tab for socket messages
- Look for "yjs-sync" events

**MongoDB not saving:**
- Check file exists in database
- Verify debounce timer (5s wait)
- Check FileVersion collection

---

## 🎉 Success Criteria:

✅ Two users can edit simultaneously
✅ Changes merge without conflicts
✅ Both see identical final state
✅ Cursors visible to each other
✅ Changes persist to MongoDB
✅ Can reload and see saved state

---

**Phase 2 Complete!** 🚀
