# File Versioning API - CURL Commands

## Quick Reference for Testing with CURL

### Environment Variables
```bash
export TOKEN="your-jwt-token-here"
export FILE_ID="your-file-id-here"
export BASE_URL="http://localhost:5000"
```

---

## 1. Save Snapshot

```bash
curl -X POST "$BASE_URL/files/$FILE_ID/save-snapshot" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "console.log(\"Hello World\");\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}",
    "message": "Added greet function",
    "tags": ["feature", "greeting"]
  }'
```

---

## 2. Get Version History

```bash
# Get all versions
curl -X GET "$BASE_URL/files/$FILE_ID/versions" \
  -H "Authorization: Bearer $TOKEN"

# With pagination
curl -X GET "$BASE_URL/files/$FILE_ID/versions?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN"

# Include auto-save versions
curl -X GET "$BASE_URL/files/$FILE_ID/versions?includeAutoSave=true" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 3. Get Specific Version Details

```bash
curl -X GET "$BASE_URL/files/$FILE_ID/versions/1" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 4. Compare Two Versions

```bash
curl -X GET "$BASE_URL/files/$FILE_ID/compare/1/2" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5. Revert to Version

```bash
# With snapshot before revert
curl -X POST "$BASE_URL/files/$FILE_ID/revert/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"createSnapshot": true}'

# Without snapshot
curl -X POST "$BASE_URL/files/$FILE_ID/revert/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"createSnapshot": false}'
```

---

## 6. Delete Version

```bash
curl -X DELETE "$BASE_URL/files/$FILE_ID/versions/2" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Complete Test Sequence

```bash
#!/bin/bash

# Configuration
BASE_URL="http://localhost:5000"
FILE_ID="your-file-id"

# 1. Login and get token
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
echo "Token: $TOKEN"
echo ""

# 2. Save version 1
echo "2. Saving version 1..."
curl -s -X POST "$BASE_URL/files/$FILE_ID/save-snapshot" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "console.log(\"v1\");",
    "message": "Version 1"
  }' | jq
echo ""

# 3. Save version 2
echo "3. Saving version 2..."
curl -s -X POST "$BASE_URL/files/$FILE_ID/save-snapshot" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "console.log(\"v2\");\nfunction test() {}",
    "message": "Version 2"
  }' | jq
echo ""

# 4. Get version history
echo "4. Getting version history..."
curl -s -X GET "$BASE_URL/files/$FILE_ID/versions" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# 5. Compare versions
echo "5. Comparing versions 1 and 2..."
curl -s -X GET "$BASE_URL/files/$FILE_ID/compare/1/2" \
  -H "Authorization: Bearer $TOKEN" | jq
echo ""

# 6. Revert to version 1
echo "6. Reverting to version 1..."
curl -s -X POST "$BASE_URL/files/$FILE_ID/revert/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"createSnapshot": true}' | jq
echo ""

echo "✅ Test complete!"
```

Save as `test-versions.sh` and run: `chmod +x test-versions.sh && ./test-versions.sh`

---

## Windows PowerShell Equivalent

```powershell
# Configuration
$BASE_URL = "http://localhost:5000"
$FILE_ID = "your-file-id"

# 1. Login
Write-Host "1. Logging in..."
$loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" `
  -Method Post `
  -Body '{"email":"test@example.com","password":"password123"}' `
  -ContentType "application/json"

$TOKEN = $loginResponse.data.accessToken
Write-Host "Token: $TOKEN`n"

# 2. Save version 1
Write-Host "2. Saving version 1..."
Invoke-RestMethod -Uri "$BASE_URL/files/$FILE_ID/save-snapshot" `
  -Method Post `
  -Headers @{Authorization = "Bearer $TOKEN"} `
  -Body '{"content":"console.log(\"v1\");","message":"Version 1"}' `
  -ContentType "application/json"

# 3. Save version 2
Write-Host "`n3. Saving version 2..."
Invoke-RestMethod -Uri "$BASE_URL/files/$FILE_ID/save-snapshot" `
  -Method Post `
  -Headers @{Authorization = "Bearer $TOKEN"} `
  -Body '{"content":"console.log(\"v2\");\nfunction test() {}","message":"Version 2"}' `
  -ContentType "application/json"

# 4. Get version history
Write-Host "`n4. Getting version history..."
Invoke-RestMethod -Uri "$BASE_URL/files/$FILE_ID/versions" `
  -Method Get `
  -Headers @{Authorization = "Bearer $TOKEN"}

# 5. Compare versions
Write-Host "`n5. Comparing versions..."
Invoke-RestMethod -Uri "$BASE_URL/files/$FILE_ID/compare/1/2" `
  -Method Get `
  -Headers @{Authorization = "Bearer $TOKEN"}

# 6. Revert
Write-Host "`n6. Reverting to version 1..."
Invoke-RestMethod -Uri "$BASE_URL/files/$FILE_ID/revert/1" `
  -Method Post `
  -Headers @{Authorization = "Bearer $TOKEN"} `
  -Body '{"createSnapshot":true}' `
  -ContentType "application/json"

Write-Host "`n✅ Test complete!"
```

---

## Example Responses

### Save Snapshot Success
```json
{
  "success": true,
  "message": "Snapshot saved successfully",
  "data": {
    "version": {
      "_id": "673e5f1234567890abcdef12",
      "versionNumber": 1,
      "message": "Added greet function",
      "size": 96,
      "metadata": {
        "linesAdded": 3,
        "linesRemoved": 0,
        "charactersAdded": 68,
        "charactersRemoved": 0
      }
    },
    "stats": {
      "linesAdded": 3,
      "linesRemoved": 0,
      "totalChanges": 4
    }
  }
}
```

### Version History Success
```json
{
  "success": true,
  "data": {
    "file": {
      "id": "673e5f...",
      "name": "test.js",
      "currentVersion": 2
    },
    "versions": [
      {
        "versionNumber": 2,
        "message": "Version 2",
        "createdAt": "2024-11-01T12:00:00.000Z"
      },
      {
        "versionNumber": 1,
        "message": "Version 1",
        "createdAt": "2024-11-01T11:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 2,
      "page": 1,
      "pages": 1
    }
  }
}
```

### Compare Versions Success
```json
{
  "success": true,
  "data": {
    "versionA": {
      "number": 1,
      "message": "Version 1"
    },
    "versionB": {
      "number": 2,
      "message": "Version 2"
    },
    "diff": "--- v1\n+++ v2\n@@ -1,1 +1,2 @@\n-console.log(\"v1\");\n+console.log(\"v2\");\n+function test() {}",
    "stats": {
      "linesAdded": 1,
      "linesRemoved": 0,
      "linesChanged": 1
    }
  }
}
```

### Error Response (No Changes)
```json
{
  "success": false,
  "message": "No changes detected. Content is identical to last version."
}
```

### Error Response (Not Found)
```json
{
  "success": false,
  "message": "File not found"
}
```

---

## Quick Tips

### Get Token
```bash
TOKEN=$(curl -s -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.data.accessToken')
```

### Pretty Print JSON
```bash
curl ... | jq '.'
```

### Save Response to File
```bash
curl ... > response.json
```

### Check HTTP Status
```bash
curl -w "\nHTTP Status: %{http_code}\n" ...
```

---

**CURL Commands Ready for Testing!** 🚀
