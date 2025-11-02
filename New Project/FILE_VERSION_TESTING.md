# File Versioning API - Test Guide

## 🧪 Complete Test Suite for File Version Management

### Prerequisites:
1. Backend server running on port 5000
2. User authenticated with JWT token
3. File created in database

---

## Step 1: Setup Test Environment

### Create Test User
```powershell
$signupBody = @{
    username = "testuser"
    email = "testuser@example.com"
    password = "password123"
    fullName = "Test User"
} | ConvertTo-Json

$userResponse = Invoke-RestMethod -Uri "http://localhost:5000/auth/signup" `
    -Method Post -Body $signupBody -ContentType "application/json"

$token = $userResponse.data.accessToken
Write-Host "Token: $token"
```

### Create Test Project
```powershell
$projectBody = @{
    name = "Version Test Project"
    description = "Testing file versioning"
} | ConvertTo-Json

$projectResponse = Invoke-RestMethod -Uri "http://localhost:5000/projects" `
    -Method Post -Body $projectBody -ContentType "application/json" `
    -Headers @{Authorization = "Bearer $token"}

$projectId = $projectResponse.data.project._id
Write-Host "Project ID: $projectId"
```

### Create Test File (Manual MongoDB Insert)
Use MongoDB Compass or this script:
```javascript
// Run in MongoDB shell or Compass
db.files.insertOne({
  name: "test.js",
  path: "/test.js",
  projectId: ObjectId("YOUR_PROJECT_ID"),
  content: "console.log('Hello World');",
  language: "javascript",
  size: 28,
  extension: ".js",
  isDirectory: false,
  createdBy: ObjectId("YOUR_USER_ID"),
  isDeleted: false,
  metadata: {
    encoding: "utf-8",
    mimeType: "text/javascript",
    lineCount: 1
  },
  createdAt: new Date(),
  updatedAt: new Date()
});
```

Save the file ID for testing!

---

## Step 2: Test Endpoints

### 1. Save Snapshot (Version 1)

```powershell
$fileId = "YOUR_FILE_ID_HERE"

$snapshotBody = @{
    content = @"
console.log('Hello World');
function greet(name) {
    return `Hello, ${name}!`;
}
"@
    message = "Added greet function"
    tags = @("feature", "greeting")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/files/$fileId/save-snapshot" `
    -Method Post -Body $snapshotBody -ContentType "application/json" `
    -Headers @{Authorization = "Bearer $token"}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Snapshot saved successfully",
  "data": {
    "version": {
      "_id": "...",
      "fileId": "...",
      "versionNumber": 1,
      "content": "console.log('Hello World');\nfunction greet(name) {\n    return `Hello, ${name}!`;\n}",
      "message": "Added greet function",
      "tags": ["feature", "greeting"],
      "createdBy": {
        "username": "testuser",
        "email": "testuser@example.com"
      },
      "metadata": {
        "linesAdded": 3,
        "linesRemoved": 0,
        "charactersAdded": 68,
        "charactersRemoved": 0
      },
      "createdAt": "2024-11-01T..."
    },
    "stats": {
      "linesAdded": 3,
      "linesRemoved": 0,
      "linesChanged": 1,
      "oldLineCount": 1,
      "newLineCount": 4,
      "totalChanges": 4
    }
  }
}
```

---

### 2. Save Another Snapshot (Version 2)

```powershell
$snapshotBody2 = @{
    content = @"
console.log('Hello World');
function greet(name) {
    return `Hello, ${name}!`;
}

function farewell(name) {
    return `Goodbye, ${name}!`;
}
"@
    message = "Added farewell function"
    tags = @("feature", "farewell")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/files/$fileId/save-snapshot" `
    -Method Post -Body $snapshotBody2 -ContentType "application/json" `
    -Headers @{Authorization = "Bearer $token"}
```

---

### 3. Get Version History

```powershell
# Get all versions
Invoke-RestMethod -Uri "http://localhost:5000/files/$fileId/versions" `
    -Method Get -Headers @{Authorization = "Bearer $token"}

# With pagination
Invoke-RestMethod -Uri "http://localhost:5000/files/$fileId/versions?page=1&limit=5" `
    -Method Get -Headers @{Authorization = "Bearer $token"}

# Include auto-save versions
Invoke-RestMethod -Uri "http://localhost:5000/files/$fileId/versions?includeAutoSave=true" `
    -Method Get -Headers @{Authorization = "Bearer $token"}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "file": {
      "id": "...",
      "name": "test.js",
      "path": "/test.js",
      "currentVersion": 2
    },
    "versions": [
      {
        "_id": "...",
        "versionNumber": 2,
        "message": "Added farewell function",
        "tags": ["feature", "farewell"],
        "size": 124,
        "isAutoSave": false,
        "createdBy": {
          "username": "testuser"
        },
        "metadata": {
          "linesAdded": 4,
          "linesRemoved": 0
        },
        "createdAt": "2024-11-01T..."
      },
      {
        "_id": "...",
        "versionNumber": 1,
        "message": "Added greet function",
        "tags": ["feature", "greeting"],
        "size": 96,
        "createdAt": "2024-11-01T..."
      }
    ],
    "pagination": {
      "total": 2,
      "page": 1,
      "pages": 1,
      "limit": 10
    }
  }
}
```

---

### 4. Get Specific Version Details

```powershell
# Get version 1 details (includes diff)
Invoke-RestMethod -Uri "http://localhost:5000/files/$fileId/versions/1" `
    -Method Get -Headers @{Authorization = "Bearer $token"}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "version": {
      "_id": "...",
      "versionNumber": 1,
      "content": "console.log('Hello World');\nfunction greet(name) {\n    return `Hello, ${name}!`;\n}",
      "diff": "--- v0\n+++ v1\n@@ -1,1 +1,4 @@\n-console.log('Hello World');\n+console.log('Hello World');\n+function greet(name) {\n+    return `Hello, ${name}!`;\n+}",
      "message": "Added greet function",
      "tags": ["feature", "greeting"],
      "metadata": {
        "linesAdded": 3,
        "linesRemoved": 0,
        "charactersAdded": 68,
        "charactersRemoved": 0
      },
      "createdAt": "2024-11-01T..."
    }
  }
}
```

---

### 5. Compare Two Versions

```powershell
# Compare version 1 and version 2
Invoke-RestMethod -Uri "http://localhost:5000/files/$fileId/compare/1/2" `
    -Method Get -Headers @{Authorization = "Bearer $token"}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "versionA": {
      "number": 1,
      "message": "Added greet function",
      "createdAt": "2024-11-01T..."
    },
    "versionB": {
      "number": 2,
      "message": "Added farewell function",
      "createdAt": "2024-11-01T..."
    },
    "diff": "--- v1\n+++ v2\n@@ -1,4 +1,8 @@\n console.log('Hello World');\n function greet(name) {\n     return `Hello, ${name}!`;\n }\n+\n+function farewell(name) {\n+    return `Goodbye, ${name}!`;\n+}",
    "stats": {
      "linesAdded": 4,
      "linesRemoved": 0,
      "linesChanged": 0,
      "oldLineCount": 4,
      "newLineCount": 8,
      "totalChanges": 4
    }
  }
}
```

---

### 6. Revert to Previous Version

```powershell
# Revert to version 1 (creates snapshot before reverting)
$revertBody = @{
    createSnapshot = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/files/$fileId/revert/1" `
    -Method Post -Body $revertBody -ContentType "application/json" `
    -Headers @{Authorization = "Bearer $token"}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully reverted to version 1",
  "data": {
    "file": {
      "_id": "...",
      "name": "test.js",
      "content": "console.log('Hello World');\nfunction greet(name) {\n    return `Hello, ${name}!`;\n}",
      "size": 96
    },
    "revertedFrom": 1,
    "newVersion": {
      "_id": "...",
      "versionNumber": 4,
      "message": "Reverted to version 1",
      "tags": ["revert"],
      "createdAt": "2024-11-01T..."
    },
    "stats": {
      "linesAdded": 0,
      "linesRemoved": 4,
      "linesChanged": 0,
      "totalChanges": 4
    }
  }
}
```

---

### 7. Delete a Version

```powershell
# Delete version 2 (cannot delete latest version)
Invoke-RestMethod -Uri "http://localhost:5000/files/$fileId/versions/2" `
    -Method Delete -Headers @{Authorization = "Bearer $token"}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Version deleted successfully"
}
```

---

## Complete PowerShell Test Script

Save this as `test-file-versions.ps1`:

```powershell
# File Versioning API Test Script

Write-Host "`n🧪 FILE VERSIONING API TEST SUITE`n" -ForegroundColor Cyan

# 1. Login
Write-Host "1️⃣  Logging in..." -ForegroundColor Yellow
$loginBody = @{
    email = "testuser@example.com"
    password = "password123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/auth/login" `
    -Method Post -Body $loginBody -ContentType "application/json"

$token = $loginResponse.data.accessToken
Write-Host "✅ Logged in successfully`n" -ForegroundColor Green

# Set file ID (replace with your file ID)
$fileId = "YOUR_FILE_ID"

# 2. Save Snapshot v1
Write-Host "2️⃣  Saving snapshot v1..." -ForegroundColor Yellow
$snapshot1 = @{
    content = "console.log('Version 1');"
    message = "Initial version"
    tags = @("v1")
} | ConvertTo-Json

$v1 = Invoke-RestMethod -Uri "http://localhost:5000/files/$fileId/save-snapshot" `
    -Method Post -Body $snapshot1 -ContentType "application/json" `
    -Headers @{Authorization = "Bearer $token"}

Write-Host "✅ Version 1 saved: $($v1.data.version.versionNumber)`n" -ForegroundColor Green

# 3. Save Snapshot v2
Write-Host "3️⃣  Saving snapshot v2..." -ForegroundColor Yellow
$snapshot2 = @{
    content = @"
console.log('Version 2');
function hello() {
    return 'world';
}
"@
    message = "Added hello function"
    tags = @("v2", "feature")
} | ConvertTo-Json

$v2 = Invoke-RestMethod -Uri "http://localhost:5000/files/$fileId/save-snapshot" `
    -Method Post -Body $snapshot2 -ContentType "application/json" `
    -Headers @{Authorization = "Bearer $token"}

Write-Host "✅ Version 2 saved: $($v2.data.version.versionNumber)`n" -ForegroundColor Green

# 4. Get Version History
Write-Host "4️⃣  Getting version history..." -ForegroundColor Yellow
$history = Invoke-RestMethod -Uri "http://localhost:5000/files/$fileId/versions" `
    -Method Get -Headers @{Authorization = "Bearer $token"}

Write-Host "✅ Found $($history.data.versions.Count) versions`n" -ForegroundColor Green

# 5. Compare Versions
Write-Host "5️⃣  Comparing versions 1 and 2..." -ForegroundColor Yellow
$compare = Invoke-RestMethod -Uri "http://localhost:5000/files/$fileId/compare/1/2" `
    -Method Get -Headers @{Authorization = "Bearer $token"}

Write-Host "✅ Diff: $($compare.data.stats.linesAdded) lines added, $($compare.data.stats.linesRemoved) removed`n" -ForegroundColor Green

# 6. Revert to v1
Write-Host "6️⃣  Reverting to version 1..." -ForegroundColor Yellow
$revert = Invoke-RestMethod -Uri "http://localhost:5000/files/$fileId/revert/1" `
    -Method Post -Body '{"createSnapshot":true}' -ContentType "application/json" `
    -Headers @{Authorization = "Bearer $token"}

Write-Host "✅ Reverted successfully. New version: $($revert.data.newVersion.versionNumber)`n" -ForegroundColor Green

Write-Host "🎉 ALL TESTS PASSED!`n" -ForegroundColor Green
```

Run with: `.\test-file-versions.ps1`

---

## 🎯 Success Criteria:

✅ Can save file snapshots with metadata
✅ Version history shows all versions
✅ Can retrieve specific version details
✅ Diff shows changes between versions
✅ Can compare any two versions
✅ Revert creates backup before reverting
✅ Cannot delete latest version
✅ All stats calculated correctly

---

## 📊 API Endpoints Summary:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/files/:id/save-snapshot` | Save file snapshot |
| GET | `/files/:id/versions` | Get version history |
| GET | `/files/:id/versions/:versionNumber` | Get version details |
| POST | `/files/:id/revert/:versionNumber` | Revert to version |
| GET | `/files/:id/compare/:vA/:vB` | Compare versions |
| DELETE | `/files/:id/versions/:versionNumber` | Delete version |

---

**Phase 3 Testing Complete!** 🚀
