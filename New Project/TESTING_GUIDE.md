# Backend Testing Guide - No Docker Required! 🚀

## ✅ Backend Successfully Running!

**Status**: Server is live on http://localhost:5000  
**MongoDB**: Connected to Atlas  
**Socket.IO**: Ready for real-time communication

---

## 🧪 Testing Commands

### 1. Health Check (PowerShell)
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get
```

**Expected Output:**
```json
{
  "status": "ok",
  "mongodb": "connected",
  "uptime": 123.45,
  "timestamp": "2024-11-01T..."
}
```

---

### 2. User Signup (PowerShell)
```powershell
$body = @{
    username = "testuser"
    email = "test@example.com"
    password = "password123"
    fullName = "Test User"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/auth/signup" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

**Expected Output:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "...",
      "username": "testuser",
      "email": "test@example.com",
      "fullName": "Test User"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**💡 Important**: Copy the `accessToken` - you'll need it for authenticated requests!

---

### 3. User Login (PowerShell)
```powershell
$body = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/auth/login" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

---

### 4. Get Current User Profile (PowerShell)
```powershell
# Replace YOUR_TOKEN with the accessToken from signup/login
$token = "YOUR_TOKEN_HERE"

Invoke-RestMethod -Uri "http://localhost:5000/auth/me" `
    -Method Get `
    -Headers @{Authorization = "Bearer $token"}
```

---

### 5. Get Projects (PowerShell)
```powershell
$token = "YOUR_TOKEN_HERE"

Invoke-RestMethod -Uri "http://localhost:5000/projects" `
    -Method Get `
    -Headers @{Authorization = "Bearer $token"}
```

**Expected Output:**
```json
{
  "success": true,
  "data": {
    "projects": [],
    "pagination": {
      "total": 0,
      "page": 1,
      "pages": 0
    }
  }
}
```

---

### 6. Create a Project (PowerShell)
```powershell
$token = "YOUR_TOKEN_HERE"

$body = @{
    name = "My First Project"
    description = "A collaborative coding project"
    tags = @("javascript", "react", "nodejs")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/projects" `
    -Method Post `
    -Body $body `
    -ContentType "application/json" `
    -Headers @{Authorization = "Bearer $token"}
```

---

### 7. Get Rooms (PowerShell)
```powershell
$token = "YOUR_TOKEN_HERE"

Invoke-RestMethod -Uri "http://localhost:5000/rooms" `
    -Method Get `
    -Headers @{Authorization = "Bearer $token"}
```

---

### 8. Create a Room (PowerShell)
```powershell
$token = "YOUR_TOKEN_HERE"

# First get a project ID from step 6
$projectId = "YOUR_PROJECT_ID"

$body = @{
    name = "Coding Session Room"
    projectId = $projectId
    description = "Real-time collaboration room"
    maxMembers = 10
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/rooms" `
    -Method Post `
    -Body $body `
    -ContentType "application/json" `
    -Headers @{Authorization = "Bearer $token"}
```

---

## 🎯 Complete Test Workflow

```powershell
# Step 1: Check if server is healthy
Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get

# Step 2: Create a new user
$signupBody = @{
    username = "abhay007"
    email = "abhay@example.com"
    password = "secure123"
    fullName = "Abhay Soni"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/auth/signup" `
    -Method Post `
    -Body $signupBody `
    -ContentType "application/json"

# Step 3: Save the token
$token = $response.data.accessToken
Write-Host "Token saved: $token"

# Step 4: Create a project
$projectBody = @{
    name = "Awesome Project"
    description = "My collaborative project"
    tags = @("nodejs", "express", "mongodb")
} | ConvertTo-Json

$project = Invoke-RestMethod -Uri "http://localhost:5000/projects" `
    -Method Post `
    -Body $projectBody `
    -ContentType "application/json" `
    -Headers @{Authorization = "Bearer $token"}

Write-Host "Project created with ID: $($project.data.project._id)"

# Step 5: Create a room in that project
$roomBody = @{
    name = "Dev Session"
    projectId = $project.data.project._id
    description = "Daily coding session"
} | ConvertTo-Json

$room = Invoke-RestMethod -Uri "http://localhost:5000/rooms" `
    -Method Post `
    -Body $roomBody `
    -ContentType "application/json" `
    -Headers @{Authorization = "Bearer $token"}

Write-Host "Room created with code: $($room.data.room.roomCode)"
Write-Host "Join at: http://localhost:5173/room/$($room.data.room.roomCode)"
```

---

## 📡 Available API Endpoints

### Public Routes
- ✅ `GET /` - API info
- ✅ `GET /health` - Health check
- ✅ `POST /auth/signup` - Register new user
- ✅ `POST /auth/login` - Login user

### Protected Routes (Require Bearer Token)
- 🔒 `GET /auth/me` - Get current user
- 🔒 `POST /auth/logout` - Logout
- 🔒 `GET /projects` - Get all projects
- 🔒 `GET /projects/:id` - Get project details
- 🔒 `POST /projects` - Create project
- 🔒 `PUT /projects/:id` - Update project
- 🔒 `DELETE /projects/:id` - Archive project
- 🔒 `GET /rooms` - Get all rooms
- 🔒 `GET /rooms/:id` - Get room details
- 🔒 `POST /rooms` - Create room
- 🔒 `POST /rooms/:id/join` - Join room

---

## 🛠️ Server Commands

```powershell
# Start development server (auto-reload)
cd "c:\Users\yuvra\Downloads\Testing 2\New Project\backend"
npm run dev

# Start production server
npm start

# Stop server (if running in background)
taskkill /F /IM node.exe
```

---

## 🔐 Environment Variables

Located in: `backend/.env`

```env
PORT=5000
MONGODB_URI=mongodb+srv://...
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d
MASTER_KEY=your-master-encryption-key-32-chars-minimum-change-in-production
```

---

## 🎨 Features Implemented

✅ **Authentication System**
- JWT-based authentication
- Secure password hashing (bcrypt)
- Token refresh mechanism
- Protected routes with middleware

✅ **Advanced Schemas**
- User, UserAPIKey, Project, Room, RoomMember
- File, FileVersion (version control)
- Message (chat with reactions)
- CallSession (video/audio calls)
- AIInteraction (AI features)

✅ **Security Features**
- AES-256-GCM encryption for API keys
- Helmet.js security headers
- Rate limiting on auth endpoints
- CORS protection
- Input validation

✅ **Real-time Ready**
- Socket.IO configured
- MongoDB Atlas connected
- Health monitoring

---

## 🚀 What's Next?

Backend is ready! Ab frontend banao aur connect karo:

1. Frontend ko backend se connect karo (http://localhost:5000)
2. Socket.IO client setup karo
3. Auth flow implement karo (signup/login)
4. Real-time collaboration features add karo

---

## 📊 Database Models

All models created and ready:
- ✅ User (with password hashing)
- ✅ UserAPIKey (encrypted)
- ✅ Project (multi-user)
- ✅ Room (real-time sessions)
- ✅ RoomMember (user presence)
- ✅ File (with versioning)
- ✅ FileVersion (git-like history)
- ✅ Message (chat system)
- ✅ CallSession (video calls)
- ✅ AIInteraction (AI features)

---

**Backend is LIVE and ready! 🎉**
