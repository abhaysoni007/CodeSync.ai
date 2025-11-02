# 🔍 Debug AI Request 500 Error

## Steps to Debug

### 1. Check Backend Console
When you make an AI request, backend console me ye dikhe:

```
🔍 DEBUG: Looking for Gemini API key: { userId: '...' }
🔍 DEBUG: API key found? true/false
```

### 2. Expected Flow

**If API Key Exists:**
```
🔍 DEBUG: Looking for Gemini API key: { userId: '6905236063db0842f8e206cf' }
🔍 DEBUG: API key found? true
✅ Found Gemini API key
```

**If API Key Missing:**
```
🔍 DEBUG: Looking for Gemini API key: { userId: '...' }
🔍 DEBUG: API key found? false
❌ No Gemini API key found for user ...
💡 Hint: Get free API key from https://aistudio.google.com/
```

### 3. Common Issues

#### Issue 1: userId undefined
**Symptom:** `userId: undefined` in logs  
**Cause:** Authentication middleware issue  
**Fix:** Check if token is valid

#### Issue 2: API key not found
**Symptom:** `API key found? false`  
**Causes:**
- Different user logged in
- API key not saved
- Database issue

**Fix:**
```powershell
cd backend
node check-api-keys.js
```

Compare userId in output with userId in request logs.

#### Issue 3: Gemini API error
**Symptom:** Error after "Found Gemini API key"  
**Causes:**
- Invalid API key
- API quota exceeded
- Network issue

**Fix:** Verify API key at https://aistudio.google.com/

### 4. How to Get Error Details

1. **Open Backend Terminal** (where `npm run dev` is running)
2. **Make AI Request** from frontend
3. **Check Console Output:**
   ```
   ❌ AI request error: [Error message here]
   Error stack: [Stack trace here]
   ```

### 5. Quick Tests

#### Test 1: Check if backend is running
```powershell
curl http://localhost:5000
```
Expected: Some response (not connection refused)

#### Test 2: Check authentication
Open browser console, run:
```javascript
localStorage.getItem('token')
```
Should show a JWT token.

#### Test 3: Check API key in DB
```powershell
cd backend
node check-api-keys.js
```

Expected output:
```
📊 Total active API keys: 1
📈 API Keys by Provider:
  - google: 1
```

#### Test 4: Test AI endpoint directly
```powershell
# Get your token from browser localStorage
$token = "your-jwt-token-here"

# Test request
curl -X POST http://localhost:5000/api/ai/request `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $token" `
  -d '{\"prompt\":\"test\",\"model\":\"gemini-2.0-flash-exp\"}'
```

### 6. What to Share for Debugging

Please share:
1. **Backend console logs** when you make AI request
2. **Browser console errors** (full stack trace)
3. **Output of:** `node check-api-keys.js`
4. **User ID** from browser: `localStorage.getItem('user')`

This will help identify the exact issue!

---

## Most Likely Issues

### 1. userId mismatch
- API key saved for one user
- Different user logged in
- Solution: Re-save API key with current user

### 2. Missing @google/generative-ai package
```powershell
cd backend
npm install @google/generative-ai
```

### 3. Invalid Gemini API key
- Key starts with "AIza..."
- Get new one from https://aistudio.google.com/

### 4. MongoDB connection issue
- Check if MongoDB Atlas is accessible
- Connection string in .env or hardcoded

---

**Next:** Share backend console logs after making AI request! 🔍
