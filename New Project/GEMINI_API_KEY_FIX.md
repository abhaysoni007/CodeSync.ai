# 🔧 Gemini API Key Issue - Fix & Debugging Guide

## Problem
After setting the Gemini API key in Profile Settings, the AI Assistant still shows the "free AI assistant" message instead of using the Gemini model.

## Root Cause Analysis

The system has the correct flow:
1. ✅ Frontend sends API key with provider: `'google'`
2. ✅ Backend saves to database with provider: `'google'`
3. ✅ When asking questions, frontend sends provider: `'gemini'`
4. ✅ Backend maps `'gemini' → 'google'` for database lookup
5. ❓ **Issue:** API key not being found or not being saved

## Changes Made

### 1. Enhanced Debugging in AIController.js
```javascript
// Added detailed logging when looking for API key
console.log('🔍 DEBUG: Looking for API key:', {
  userId,
  provider,
  effectiveProvider,
  dbProviderName
});

console.log('🔍 DEBUG: API key found?', !!userApiKey);
```

### 2. Better Error Messages
When no API key is found, the response now includes:

```
⚠️ **API Key Not Found**

You selected **Gemini** but no API key is configured. To use Gemini:

1. Go to **Profile Settings** (top right menu)
2. Click on **API Keys** tab
3. Enter your Gemini API key
4. Click **Save**

For now, I'm using the free AI assistant with limited capabilities.
```

### 3. Added Logging to API Key Save Endpoint
```javascript
// Logs when saving API key
console.log('🔑 API Key Update Request:', {
  userId: req.userId,
  provider,
  action,
  hasApiKey: !!apiKey,
  apiKeyLength: apiKey?.length
});

// Logs after successful save
console.log('✅ API Key saved successfully:', {
  userId: req.userId,
  provider,
  keyId: result._id,
  isNew: !result.lastUsed
});
```

## Testing Steps

### Step 1: Restart Backend Server
```powershell
# Stop current backend process
Get-Process -Name node | Where-Object {$_.MainWindowTitle -eq ''} | Stop-Process

# Navigate to backend directory
cd "c:\Users\yuvra\Downloads\Testing 2\New Project\backend"

# Start backend
node server.js
```

### Step 2: Save Gemini API Key
1. Open frontend: http://localhost:5173
2. Login with your account
3. Click Profile icon (top right)
4. Go to **API Keys** tab
5. Find "Google (Gemini)" section
6. Paste your API key: `AIzaSyDBvAM_AtobMOd_Wk4zmZbEqsQ6ouFwBAo`
7. Click the **Save** button (💾 icon)

**Watch backend console for:**
```
🔑 API Key Update Request: {
  userId: '...',
  provider: 'google',
  action: 'set',
  hasApiKey: true,
  apiKeyLength: 39
}
✅ API Key saved successfully: { ... }
```

### Step 3: Test AI Assistant
1. Open any project
2. Click AI icon to open AI panel
3. Switch to **Ask Mode**
4. Select **Gemini** from provider dropdown
5. Ask: "tell me how to make a landing page of cafe website"

**Watch backend console for:**
```
🔍 DEBUG: Looking for API key: {
  userId: '...',
  provider: 'gemini',
  effectiveProvider: 'gemini',
  dbProviderName: 'google'
}
🔍 DEBUG: API key found? true
✅ Found API key for provider: google
```

### Step 4: Verify Response
If API key is found:
- ✅ Response should be detailed and specific
- ✅ Should NOT show "free AI assistant" message
- ✅ Metadata should show `provider: 'gemini'`

If API key NOT found:
- ❌ Shows free AI response
- ❌ Shows helpful error message about configuring API key
- ❌ Metadata shows `provider: 'free'` and `isFallback: true`

## Possible Issues & Solutions

### Issue 1: Backend Not Running
**Symptom:** No console logs appear  
**Solution:**
```powershell
cd "c:\Users\yuvra\Downloads\Testing 2\New Project\backend"
node server.js
```

### Issue 2: MongoDB Not Connected
**Symptom:** Error saving API key  
**Solution:** Check backend console for MongoDB connection status

### Issue 3: Authentication Error
**Symptom:** "Unauthorized" error  
**Solution:** 
- Clear localStorage
- Login again
- Check if JWT token is being sent

### Issue 4: Wrong Provider Name
**Symptom:** API key saved but not found  
**Solution:** 
- Check database directly using MongoDB Compass
- Connection string: `mongodb+srv://hackerabhay007_db_user:Abh%40y%24oni007@cluster0.qwqlkbg.mongodb.net/`
- Database: `collaborative-editor`
- Collection: `userapikeys`
- Look for document with your userId and `provider: 'google'`

## Database Query to Check API Keys

Connect to MongoDB and run:
```javascript
// Find all API keys for a user
db.userapikeys.find({ 
  userId: ObjectId("YOUR_USER_ID"), 
  isActive: true 
})

// Count active Gemini keys
db.userapikeys.countDocuments({ 
  provider: 'google', 
  isActive: true 
})
```

## Expected Behavior After Fix

### When API Key EXISTS:
1. User selects Gemini
2. Backend finds API key in database
3. Calls Google Gemini API
4. Returns detailed, specific response
5. Shows provider: 'gemini' in metadata

### When API Key MISSING:
1. User selects Gemini
2. Backend doesn't find API key
3. Falls back to free provider
4. Returns basic response with helpful instructions
5. Shows provider: 'free' and isFallback: true

## Next Steps

1. ✅ Restart backend to apply changes
2. ✅ Save Gemini API key in profile
3. ✅ Test AI Assistant with Gemini
4. ✅ Check backend console logs
5. ✅ Verify response quality

If still not working:
- Check browser console for errors
- Check network tab for API request/response
- Verify MongoDB connection
- Check if userId is correct

## Quick Debug Command

Run this in backend terminal to check if API key exists:
```javascript
// Create a test file: test-api-key.js
import mongoose from 'mongoose';
import UserAPIKey from './models/UserAPIKey.js';

mongoose.connect('mongodb+srv://hackerabhay007_db_user:Abh%40y%24oni007@cluster0.qwqlkbg.mongodb.net/collaborative-editor')
  .then(async () => {
    const keys = await UserAPIKey.find({ provider: 'google', isActive: true });
    console.log('Gemini API Keys:', keys.length);
    keys.forEach(k => {
      console.log(`User ID: ${k.userId}, Provider: ${k.provider}, Active: ${k.isActive}`);
    });
    process.exit();
  });
```

Then run:
```powershell
cd "c:\Users\yuvra\Downloads\Testing 2\New Project\backend"
node test-api-key.js
```

## Summary

The code flow is **correct**. The issue is likely:
1. Backend not running with latest code
2. MongoDB connection issue
3. Authentication/userId mismatch
4. API key not being saved due to error

The enhanced logging will help identify the exact issue!
