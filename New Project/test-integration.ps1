# 🧪 Quick Integration Test Script
# PowerShell automation for testing all features

$ErrorActionPreference = "Stop"
$BASE_URL = "http://localhost:5000"

Write-Host "🧪 Starting Full Integration Test..." -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# 1. Signup/Login
Write-Host "`n1️⃣ Authentication Test..." -ForegroundColor Yellow
$signup = @{
    username = "integrationtest"
    email = "integration@test.com"
    password = "TestPass123"
} | ConvertTo-Json

try {
    $authResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/signup" `
        -Method Post -Body $signup -ContentType "application/json"
    $TOKEN = $authResponse.data.accessToken
    Write-Host "   ✅ User created!" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  User exists, logging in..." -ForegroundColor Yellow
    $login = @{
        email = "integration@test.com"
        password = "TestPass123"
    } | ConvertTo-Json
    $authResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" `
        -Method Post -Body $login -ContentType "application/json"
    $TOKEN = $authResponse.data.accessToken
    Write-Host "   ✅ Logged in successfully!" -ForegroundColor Green
}

# 2. Create Project
Write-Host "`n2️⃣ Project Creation Test..." -ForegroundColor Yellow
$projectBody = @{
    name = "Integration Test $(Get-Date -Format 'HH:mm:ss')"
    description = "Automated integration test project"
    isPublic = $true
} | ConvertTo-Json

$project = Invoke-RestMethod -Uri "$BASE_URL/projects" `
    -Method Post -Headers @{Authorization = "Bearer $TOKEN"} `
    -Body $projectBody -ContentType "application/json"

$PROJECT_ID = $project.data._id
Write-Host "   ✅ Project ID: $PROJECT_ID" -ForegroundColor Green

# 3. Create Room
Write-Host "`n3️⃣ Room Creation Test..." -ForegroundColor Yellow
$roomBody = @{
    projectId = $PROJECT_ID
    name = "Integration Test Room"
    description = "Real-time collaboration test"
} | ConvertTo-Json

$room = Invoke-RestMethod -Uri "$BASE_URL/rooms" `
    -Method Post -Headers @{Authorization = "Bearer $TOKEN"} `
    -Body $roomBody -ContentType "application/json"

$ROOM_ID = $room.data._id
$ROOM_CODE = $room.data.roomCode
Write-Host "   ✅ Room Code: $ROOM_CODE" -ForegroundColor Green
Write-Host "   ✅ Room ID: $ROOM_ID" -ForegroundColor Green

# 4. Summary
Write-Host "`n📋 Integration Test Results" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Backend URL:  http://localhost:5000" -ForegroundColor White
Write-Host "Frontend URL: http://localhost:5173" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "🎫 Credentials for Frontend:" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Gray
Write-Host "Room ID:      $ROOM_ID" -ForegroundColor White
Write-Host "Room Code:    $ROOM_CODE" -ForegroundColor White
Write-Host "Access Token: $($TOKEN.Substring(0,40))..." -ForegroundColor White
Write-Host "-----------------------------------" -ForegroundColor Gray

# 5. Next Steps
Write-Host "`n📝 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Create File in MongoDB (Manual):" -ForegroundColor White
Write-Host "   db.files.insertOne({" -ForegroundColor Gray
Write-Host "     projectId: ObjectId('$PROJECT_ID')," -ForegroundColor Gray
Write-Host "     name: 'test.js'," -ForegroundColor Gray
Write-Host "     language: 'javascript'," -ForegroundColor Gray
Write-Host "     content: '// Start coding!'," -ForegroundColor Gray
Write-Host "     path: '/test.js'," -ForegroundColor Gray
Write-Host "     size: 17," -ForegroundColor Gray
Write-Host "     currentVersion: 1," -ForegroundColor Gray
Write-Host "     createdBy: ObjectId('$(($authResponse.data.user._id))' )," -ForegroundColor Gray
Write-Host "     createdAt: new Date()," -ForegroundColor Gray
Write-Host "     updatedAt: new Date()" -ForegroundColor Gray
Write-Host "   })" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Copy the returned _id as FILE_ID" -ForegroundColor White
Write-Host ""
Write-Host "3. Open Frontend:" -ForegroundColor White
Write-Host "   - Go to http://localhost:5173" -ForegroundColor Gray
Write-Host "   - Paste Room ID, File ID, Token" -ForegroundColor Gray
Write-Host "   - Click 'Join Room'" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Test Real-time (Open 2 browser windows):" -ForegroundColor White
Write-Host "   - Type in one window" -ForegroundColor Gray
Write-Host "   - See changes instantly in other window" -ForegroundColor Gray

Write-Host "`n✅ Integration Test Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan

# Save credentials to file
$credentials = @"
# Integration Test Credentials
# Generated: $(Get-Date)

## Backend
http://localhost:5000

## Frontend  
http://localhost:5173

## Auth Token
$TOKEN

## Room Details
Room ID: $ROOM_ID
Room Code: $ROOM_CODE
Project ID: $PROJECT_ID
User ID: $($authResponse.data.user._id)

## MongoDB File Creation Command
db.files.insertOne({
  projectId: ObjectId('$PROJECT_ID'),
  name: 'test.js',
  language: 'javascript',
  content: '// Start coding!',
  path: '/test.js',
  size: 17,
  currentVersion: 1,
  createdBy: ObjectId('$($authResponse.data.user._id)'),
  createdAt: new Date(),
  updatedAt: new Date()
})

## Frontend Login
1. Open: http://localhost:5173
2. Enter:
   - Room ID: $ROOM_ID
   - File ID: [Copy from MongoDB after creating file]
   - Token: $TOKEN
3. Click "Join Room"

## Multi-User Test
1. Open incognito window
2. Signup as different user
3. Join same Room ID + File ID
4. Type in one window → See in other window!
"@

$credentials | Out-File -FilePath "test-credentials.txt" -Encoding UTF8
Write-Host "`n💾 Credentials saved to: test-credentials.txt" -ForegroundColor Magenta
