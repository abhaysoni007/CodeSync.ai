# 🚀 Quick Start Guide (Manual Testing)

## Current Status
✅ Backend: Started (but HTTP not responding - investigating)  
✅ Frontend: Running on http://localhost:5173  
✅ MongoDB: Connected to Atlas

---

## Issue Found
Backend shows "Server running" but doesn't respond to HTTP requests. This might be:
1. CORS configuration issue
2. Route registration timing problem
3. Async startup race condition

---

## Workaround: Manual Testing Steps

### Step 1: Create Test Data in MongoDB Compass

1. **Open MongoDB Compass**
2. **Connect to:** `mongodb+srv://hackerabhay007_db_user:Abh%40y%24oni007@cluster0.qwqlkbg.mongodb.net/`
3. **Select Database:** `collaborative-editor`

#### Create User
```javascript
// Switch to database
use collaborative-editor

// Insert user
db.users.insertOne({
  username: "testuser",
  email: "test@example.com",
  passwordHash: "$2b$10$YourHashedPasswordHere", // Use bcrypt to hash "password123"
  createdAt: new Date(),
  updatedAt: new Date()
})

// Copy the returned _id as USER_ID
```

#### Create Project
```javascript
db.projects.insertOne({
  name: "Test Project",
  description: "Manual test project",
  ownerId: ObjectId("USER_ID_FROM_ABOVE"),
  members: [
    {
      userId: ObjectId("USER_ID_FROM_ABOVE"),
      role: "owner",
      joinedAt: new Date()
    }
  ],
  isPublic: true,
  createdAt: new Date(),
  updatedAt: new Date()
})

// Copy the returned _id as PROJECT_ID
```

#### Create Room
```javascript
db.rooms.insertOne({
  projectId: ObjectId("PROJECT_ID_FROM_ABOVE"),
  name: "Main Room",
  description: "Test collaboration room",
  roomCode: "TEST123",
  createdBy: ObjectId("USER_ID"),
  createdAt: new Date(),
  updatedAt: new Date()
})

// Copy the returned _id as ROOM_ID
```

#### Create File
```javascript
db.files.insertOne({
  projectId: ObjectId("PROJECT_ID"),
  name: "test.js",
  language: "javascript",
  content: "// Welcome to collaborative editing!\nconsole.log('Hello World');",
  path: "/test.js",
  size: 60,
  currentVersion: 1,
  createdBy: ObjectId("USER_ID"),
  createdAt: new Date(),
  updatedAt: new Date()
})

// Copy the returned _id as FILE_ID
```

### Step 2: Generate JWT Token

Since backend isn't responding, we need to generate token manually:

```javascript
// Run this in Node.js REPL or create a temp script
import jwt from 'jsonwebtoken';

const payload = {
  userId: "YOUR_USER_ID_HERE",
  email: "test@example.com"
};

const token = jwt.sign(
  payload,
  "your-secret-key-from-env", // Use the JWT_SECRET from .env
  { expiresIn: "7d" }
);

console.log("Token:", token);
```

**Or use online JWT generator:**
- Go to https://jwt.io
- Payload:
  ```json
  {
    "userId": "YOUR_USER_ID",
    "email": "test@example.com",
    "iat": 1730419200,
    "exp": 1731024000
  }
  ```
- Secret: Your JWT_SECRET from `.env`

### Step 3: Test Frontend

1. **Open:** http://localhost:5173
2. **Enter Details:**
   - Room ID: `[ROOM_ID from MongoDB]`
   - File ID: `[FILE_ID from MongoDB]`
   - Access Token: `[JWT token generated above]`
3. **Click:** "Join Room"

---

## Fix Backend HTTP Issue

Let me create a simplified test server to diagnose the issue:

```javascript
// test-server.js
import express from 'express';

const app = express();
const PORT = 5000;

app.get('/', (req, res) => {
  res.json({ message: 'Test server working!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on http://localhost:${PORT}`);
});
```

Test with:
```powershell
node test-server.js
curl http://localhost:5000
```

If this works, the issue is in our main server.js file.

---

## Alternative: Fix Server Issue

The problem might be that `httpServer.listen()` needs explicit host binding:

```javascript
// In server.js, change:
httpServer.listen(PORT, () => {

// To:
httpServer.listen(PORT, '0.0.0.0', () => {
```

Or check if there's an error being swallowed silently.

---

## Next Steps

1. **Diagnose backend issue** - Why HTTP not responding despite "Server running" message
2. **Test with simple server** - Verify port 5000 can be bound
3. **Check firewall** - Windows Defender might be blocking
4. **Alternative port** - Try 3000 or 8000 instead of 5000

---

**Current Priority:** Fix backend HTTP connectivity before proceeding with integration test.
