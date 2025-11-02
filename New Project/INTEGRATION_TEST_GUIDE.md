# 🧪 Full Integration Test Guide

## Services Running

✅ **Backend:** http://localhost:5000  
✅ **Frontend:** http://localhost:5173  
✅ **MongoDB:** Atlas Cloud (Connected)

---

## 🎯 Test Sequence

### Phase 1: User Authentication ✅

#### 1.1 Create Test User
```powershell
$signupBody = @{
    username = "testuser1"
    email = "test1@example.com"
    password = "SecurePass123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/auth/signup" `
    -Method Post `
    -Body $signupBody `
    -ContentType "application/json"

$TOKEN = $response.data.accessToken
Write-Host "✅ Token: $TOKEN"
```

#### 1.2 Login
```powershell
$loginBody = @{
    email = "test1@example.com"
    password = "SecurePass123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/auth/login" `
    -Method Post `
    -Body $loginBody `
    -ContentType "application/json"

$TOKEN = $response.data.accessToken
Write-Host "✅ Logged in! Token: $TOKEN"
```

---

### Phase 2: Project Setup ✅

#### 2.1 Create Project
```powershell
$projectBody = @{
    name = "Integration Test Project"
    description = "Testing real-time collaboration"
    isPublic = $true
} | ConvertTo-Json

$project = Invoke-RestMethod -Uri "http://localhost:5000/projects" `
    -Method Post `
    -Headers @{Authorization = "Bearer $TOKEN"} `
    -Body $projectBody `
    -ContentType "application/json"

$PROJECT_ID = $project.data._id
Write-Host "✅ Project ID: $PROJECT_ID"
```

---

### Phase 3: Room & File Creation ✅

#### 3.1 Create Room
```powershell
$roomBody = @{
    projectId = $PROJECT_ID
    name = "Main Editor Room"
    description = "Primary coding room"
} | ConvertTo-Json

$room = Invoke-RestMethod -Uri "http://localhost:5000/rooms" `
    -Method Post `
    -Headers @{Authorization = "Bearer $TOKEN"} `
    -Body $roomBody `
    -ContentType "application/json"

$ROOM_ID = $room.data._id
$ROOM_CODE = $room.data.roomCode
Write-Host "✅ Room ID: $ROOM_ID"
Write-Host "✅ Room Code: $ROOM_CODE"
```

#### 3.2 Create File
```powershell
# First, we need to create a file in MongoDB
# For now, let's manually create one using MongoDB or backend endpoint
# Assuming you have a files endpoint, otherwise create via MongoDB directly
```

**Note:** You'll need to create a File document in MongoDB first. Here's the manual approach:

```javascript
// In MongoDB Compass or Shell
use collaborative-editor

db.files.insertOne({
  projectId: ObjectId("YOUR_PROJECT_ID"),
  name: "test.js",
  language: "javascript",
  content: "// Welcome to collaborative editing!",
  path: "/test.js",
  size: 35,
  currentVersion: 1,
  createdBy: ObjectId("YOUR_USER_ID"),
  createdAt: new Date(),
  updatedAt: new Date()
})

// Copy the returned _id as FILE_ID
```

---

### Phase 4: Real-time Collaboration Test 🔥

#### 4.1 Open Frontend
1. Open browser: http://localhost:5173
2. You'll see login form with fields:
   - Room ID: `[paste $ROOM_ID]`
   - File ID: `[paste $FILE_ID]`
   - Access Token: `[paste $TOKEN]`

#### 4.2 Test Single User
1. Click "Join Room"
2. Monaco Editor should load
3. Type some code:
   ```javascript
   console.log("Hello World");
   function greet(name) {
     return `Hello, ${name}!`;
   }
   ```
4. Check console - should see:
   - ✅ Connected to server
   - ✅ Joined room successfully
   - ✅ Yjs sync active

#### 4.3 Test Multi-User Collaboration
1. Open **INCOGNITO/PRIVATE** window
2. Go to http://localhost:5173
3. Create **second user**:
   ```powershell
   $signup2 = @{
       username = "testuser2"
       email = "test2@example.com"
       password = "SecurePass123"
   } | ConvertTo-Json
   
   $response2 = Invoke-RestMethod -Uri "http://localhost:5000/auth/signup" `
       -Method Post `
       -Body $signup2 `
       -ContentType "application/json"
   
   $TOKEN2 = $response2.data.accessToken
   ```

4. In incognito window, enter:
   - Same Room ID
   - Same File ID
   - TOKEN2

5. **Expected Results:**
   - ✅ Both users see same code in real-time
   - ✅ Changes from User 1 appear instantly in User 2's editor
   - ✅ Changes from User 2 appear instantly in User 1's editor
   - ✅ Cursor positions visible in bottom-right panel
   - ✅ User avatars shown in header (2 online)

---

### Phase 5: Version Control Test 📝

#### 5.1 Save Snapshot
```powershell
$snapshotBody = @{
    content = "console.log('Version 1');"
    message = "Initial version"
    tags = @("v1", "initial")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/files/$FILE_ID/save-snapshot" `
    -Method Post `
    -Headers @{Authorization = "Bearer $TOKEN"} `
    -Body $snapshotBody `
    -ContentType "application/json"
```

#### 5.2 Make Changes & Save v2
```powershell
$snapshot2 = @{
    content = @"
console.log('Version 2');
function greet(name) {
  return ``Hello, `${name}!``;
}
"@
    message = "Added greet function"
    tags = @("v2", "feature")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/files/$FILE_ID/save-snapshot" `
    -Method Post `
    -Headers @{Authorization = "Bearer $TOKEN"} `
    -Body $snapshot2 `
    -ContentType "application/json"
```

#### 5.3 Get Version History
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/files/$FILE_ID/versions" `
    -Method Get `
    -Headers @{Authorization = "Bearer $TOKEN"}
```

#### 5.4 Compare Versions
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/files/$FILE_ID/compare/1/2" `
    -Method Get `
    -Headers @{Authorization = "Bearer $TOKEN"}
```

#### 5.5 Revert to v1
```powershell
$revertBody = @{
    createSnapshot = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/files/$FILE_ID/revert/1" `
    -Method Post `
    -Headers @{Authorization = "Bearer $TOKEN"} `
    -Body $revertBody `
    -ContentType "application/json"
```

**Expected:** Editor should update with v1 content in real-time!

---

### Phase 6: Cursor & Awareness Test 👆

#### 6.1 Test Cursor Broadcasting
1. User 1: Move cursor to line 5
2. User 2: Should see in bottom panel: "testuser1: Line 5, Col X"
3. User 2: Type at line 10
4. User 1: Should see: "testuser2: Line 10, Col Y"

#### 6.2 Test Selection Sync
1. User 1: Select multiple lines
2. User 2: Should see highlighted selection (Yjs awareness)
3. Different colors for each user

---

## 🔍 Expected Console Logs

### Backend Console
```
✅ MongoDB Connected
🚀 Server running on port 5000
📡 Socket.IO server ready (Yjs enabled)

[Socket Event] User connected: <socketId>
[Socket Event] User joined room: <roomId>
[Yjs] Document loaded for room: <roomId>, file: <fileId>
[Yjs] Sync message received (type: 0)
[Yjs] Update applied to document
[Yjs] Auto-saving document...
[Yjs] Document saved to MongoDB
```

### Frontend Console
```
✅ Connected to server
✅ Joined room successfully
Yjs document initialized
Monaco binding created
Awareness active
User joined: testuser2
Cursor update received: {userId: '...', line: 5, column: 10}
```

---

## 🐛 Troubleshooting

### Issue: Can't connect to backend
```powershell
# Check if backend is running
netstat -ano | findstr :5000

# Restart backend
cd "c:\Users\yuvra\Downloads\Testing 2\New Project\backend"
npm run dev
```

### Issue: CORS errors
- Backend already has CORS enabled for `http://localhost:5173`
- Check browser console for exact error

### Issue: WebSocket connection failed
- Verify Socket.IO proxy in `vite.config.js`
- Check firewall settings
- Ensure backend Socket.IO is running (check for "Socket.IO server ready" message)

### Issue: Yjs not syncing
1. Check MongoDB connection
2. Verify JWT token is valid
3. Check browser console for Yjs errors
4. Ensure both users joined same roomId + fileId

### Issue: No real-time updates
1. Check network tab for WebSocket connection (ws://localhost:5173/socket.io/)
2. Verify both users authenticated
3. Check backend logs for sync messages
4. Try refreshing both browsers

---

## ✅ Success Criteria

- [ ] User signup/login works
- [ ] Project created successfully
- [ ] Room created with unique code
- [ ] File created in MongoDB
- [ ] Frontend loads Monaco Editor
- [ ] Socket.IO connection established
- [ ] Yjs document initialized
- [ ] Single user can type in editor
- [ ] Two users see same content in real-time
- [ ] Cursor positions broadcast correctly
- [ ] Snapshots save to MongoDB
- [ ] Version history retrieves correctly
- [ ] File comparison shows diff
- [ ] Revert updates editor in real-time
- [ ] Auto-save persists changes

---

## 📊 Complete Test Script

Save as `test-integration.ps1`:

```powershell
# Integration Test Script
$ErrorActionPreference = "Stop"

Write-Host "🧪 Starting Integration Test..." -ForegroundColor Cyan

# 1. Signup
Write-Host "`n1️⃣ Creating user..." -ForegroundColor Yellow
$signup = @{
    username = "integrationtest"
    email = "integration@test.com"
    password = "TestPass123"
} | ConvertTo-Json

try {
    $authResponse = Invoke-RestMethod -Uri "http://localhost:5000/auth/signup" `
        -Method Post -Body $signup -ContentType "application/json"
    $TOKEN = $authResponse.data.accessToken
    Write-Host "✅ User created! Token: $($TOKEN.Substring(0,20))..." -ForegroundColor Green
} catch {
    Write-Host "⚠️  User exists, logging in..." -ForegroundColor Yellow
    $login = @{
        email = "integration@test.com"
        password = "TestPass123"
    } | ConvertTo-Json
    $authResponse = Invoke-RestMethod -Uri "http://localhost:5000/auth/login" `
        -Method Post -Body $login -ContentType "application/json"
    $TOKEN = $authResponse.data.accessToken
    Write-Host "✅ Logged in!" -ForegroundColor Green
}

# 2. Create Project
Write-Host "`n2️⃣ Creating project..." -ForegroundColor Yellow
$projectBody = @{
    name = "Integration Test Project $(Get-Date -Format 'HH:mm:ss')"
    description = "Automated integration test"
    isPublic = $true
} | ConvertTo-Json

$project = Invoke-RestMethod -Uri "http://localhost:5000/projects" `
    -Method Post -Headers @{Authorization = "Bearer $TOKEN"} `
    -Body $projectBody -ContentType "application/json"

$PROJECT_ID = $project.data._id
Write-Host "✅ Project created: $PROJECT_ID" -ForegroundColor Green

# 3. Create Room
Write-Host "`n3️⃣ Creating room..." -ForegroundColor Yellow
$roomBody = @{
    projectId = $PROJECT_ID
    name = "Test Room"
    description = "Integration test room"
} | ConvertTo-Json

$room = Invoke-RestMethod -Uri "http://localhost:5000/rooms" `
    -Method Post -Headers @{Authorization = "Bearer $TOKEN"} `
    -Body $roomBody -ContentType "application/json"

$ROOM_ID = $room.data._id
$ROOM_CODE = $room.data.roomCode
Write-Host "✅ Room created: $ROOM_CODE" -ForegroundColor Green

# 4. Display Info
Write-Host "`n📋 Test Environment Ready!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:5000" -ForegroundColor White
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "Room ID: $ROOM_ID" -ForegroundColor White
Write-Host "Room Code: $ROOM_CODE" -ForegroundColor White
Write-Host "Token: $($TOKEN.Substring(0,30))..." -ForegroundColor White
Write-Host "================================" -ForegroundColor Cyan

Write-Host "`n⚠️  NOTE: Create a File manually in MongoDB:" -ForegroundColor Yellow
Write-Host "   - Collection: files" -ForegroundColor Gray
Write-Host "   - projectId: ObjectId('$PROJECT_ID')" -ForegroundColor Gray
Write-Host "   - name: 'test.js'" -ForegroundColor Gray
Write-Host "   - Then use the file _id for testing" -ForegroundColor Gray

Write-Host "`n✅ All Done! Ready for manual frontend testing." -ForegroundColor Green
```

Run with: `.\test-integration.ps1`

---

**🚀 Integration Test Ready!**

Open http://localhost:5173 and start testing!
