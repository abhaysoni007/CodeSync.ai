# 🔧 AI Assistant Troubleshooting Guide

## Quick Diagnostics

### 1. Check Server Status

```powershell
# Check if backend is running
curl http://localhost:5000/health

# Expected output:
# {"status":"ok","mongodb":"connected","uptime":...}
```

### 2. Check Frontend

```powershell
# Navigate to frontend
cd "c:\Users\yuvra\Downloads\Testing 2\New Project\frontend-new"

# Check if dev server running
# Should see: "Local: http://localhost:5173" or 5174
```

### 3. Browser Console

Open DevTools (F12) and check:
- No red errors in Console tab
- Network tab shows successful API calls
- React DevTools shows AIProvider in component tree

---

## Common Issues

### ❌ AI Button Not Visible

**Symptoms:**
- Floating button doesn't appear at bottom-right
- Even when logged in

**Causes & Solutions:**

1. **Not Authenticated**
   ```javascript
   // Check localStorage
   console.log(localStorage.getItem('token'));
   // Should show JWT token, not null
   ```
   **Fix:** Login again

2. **AIProvider Missing**
   - Check `App.jsx` has `<AIProvider>` wrapping content
   - Verify import: `import { AIProvider } from './context/AIContext';`
   
3. **AIToggleButton Not Rendered**
   - Check `App.jsx` includes `<AIToggleButton />`
   - Verify import path correct
   
4. **CSS Issue**
   ```powershell
   # Restart dev server
   cd frontend-new
   npm run dev
   ```

### ❌ Panel Won't Open

**Symptoms:**
- Click button but panel doesn't appear
- No animation

**Causes & Solutions:**

1. **State Issue**
   - Open React DevTools
   - Find AIProvider context
   - Check `isPanelOpen` value
   - Try toggling manually: `togglePanel()`

2. **Animation Blocked**
   - Check browser hardware acceleration enabled
   - Disable browser extensions that affect CSS

3. **Error in Component**
   ```javascript
   // Check console for errors in:
   // - AIPanel.jsx
   // - AIInterface/index.jsx
   ```

### ❌ No Response from Ask Mode

**Symptoms:**
- Type question and press send
- Loading indicator shows
- But no response appears

**Causes & Solutions:**

1. **Backend Not Running**
   ```powershell
   # Check backend
   curl http://localhost:5000/api/ai/request
   # Should return 401 (needs auth), not connection refused
   ```
   **Fix:**
   ```powershell
   cd backend
   npm start
   ```

2. **Authentication Failed**
   - Token might be expired
   - **Fix:** Logout and login again
   
3. **CORS Issue**
   - Check backend console for CORS errors
   - Verify `backend/.env` has correct FRONTEND_URL
   ```env
   FRONTEND_URL=http://localhost:5173
   ```

4. **API Error**
   - Check backend console logs
   - Look for error messages from AIController

5. **Network Error**
   ```javascript
   // Check browser Network tab
   // Look for failed /api/ai/request call
   // Check response status and error message
   ```

### ❌ Agent Not Creating Files

**Symptoms:**
- Agent mode runs
- Shows success message
- But no files in `auto_generated/`

**Causes & Solutions:**

1. **Wrong Directory**
   ```powershell
   # Check if auto_generated exists
   ls "c:\Users\yuvra\Downloads\Testing 2\New Project\frontend-new\src\auto_generated"
   
   # If not, create it:
   mkdir "c:\Users\yuvra\Downloads\Testing 2\New Project\frontend-new\src\auto_generated\components"
   mkdir "c:\Users\yuvra\Downloads\Testing 2\New Project\frontend-new\src\auto_generated\pages"
   ```

2. **Permission Denied**
   - Check file permissions
   - Run VS Code as administrator (if needed)
   - Check backend has write access

3. **Path Issue in Controller**
   - Check `AgentController.js`
   - Verify FRONTEND_ROOT path:
   ```javascript
   const FRONTEND_ROOT = path.join(__dirname, '../../frontend-new/src');
   ```

4. **Backend Error**
   ```powershell
   # Check backend console
   # Look for errors in AgentController
   ```

### ❌ Syntax Highlighting Not Working

**Symptoms:**
- Code blocks appear
- But no colors/syntax highlighting

**Causes & Solutions:**

1. **Missing Dependencies**
   ```powershell
   cd frontend-new
   npm install react-markdown react-syntax-highlighter
   ```

2. **Import Error**
   - Check `ChatMessage.jsx`
   - Verify imports:
   ```javascript
   import ReactMarkdown from 'react-markdown';
   import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
   import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
   ```

3. **Cache Issue**
   ```powershell
   # Clear cache and restart
   cd frontend-new
   rm -r node_modules/.vite
   npm run dev
   ```

### ❌ Rate Limit Errors

**Symptoms:**
- "Too many requests" error
- After 20-30 requests

**Causes & Solutions:**

1. **Expected Behavior**
   - Ask Mode: 30 requests/hour
   - Agent Mode: 20 requests/hour
   - **Fix:** Wait 1 hour

2. **Bypass for Testing** (Development only)
   - Edit `backend/routes/agent.js`
   - Temporarily increase max:
   ```javascript
   max: 100, // Instead of 20
   ```

3. **Production**
   - Rate limits are intentional
   - Consider upgrading limits for paid users
   - Implement request queuing

### ❌ MongoDB Connection Failed

**Symptoms:**
- Backend error: "MongoDB connection failed"
- Health check shows `mongodb: "disconnected"`

**Causes & Solutions:**

1. **MongoDB Not Running**
   ```powershell
   # Start MongoDB service
   net start MongoDB
   ```

2. **Wrong Connection String**
   - Check `backend/.env`
   - Verify MONGODB_URI:
   ```env
   MONGODB_URI=mongodb://localhost:27017/your-db-name
   ```

3. **Network Issue**
   - Check MongoDB is accessible
   - Verify port 27017 not blocked

### ❌ Import Errors in Console

**Symptoms:**
- Console shows: "Failed to resolve import..."
- Components not rendering

**Causes & Solutions:**

1. **Alias Not Configured**
   - Check `vite.config.js` has:
   ```javascript
   resolve: {
     alias: {
       '@': path.resolve(__dirname, './src'),
     },
   },
   ```

2. **Wrong Import Path**
   - Use `@/` for absolute imports
   - Example: `import { useAI } from '@/context/AIContext';`

3. **Missing File**
   - Verify file exists at import path
   - Check spelling and case sensitivity

### ❌ Animations Not Smooth

**Symptoms:**
- Panel slides in jerky
- Buttons lag on hover

**Causes & Solutions:**

1. **Hardware Acceleration**
   - Enable in browser settings
   - Chrome: Settings > System > Use hardware acceleration

2. **Too Many DOM Elements**
   - Clear old messages
   - Use Clear button in panel
   - Limit history items

3. **CSS Performance**
   - Reduce shadow complexity
   - Simplify animations in `framer-motion`

### ❌ Token Expired

**Symptoms:**
- 401 Unauthorized errors
- Redirected to login

**Causes & Solutions:**

1. **Session Timeout**
   - **Fix:** Login again
   - Token stored in localStorage expires

2. **Backend Restarted**
   - JWT secret might have changed
   - **Fix:** Login again

### ❌ Messages Not Appearing

**Symptoms:**
- Send message
- No error
- But message doesn't show in chat

**Causes & Solutions:**

1. **State Not Updating**
   - Check React DevTools
   - Verify `messages` array in AIContext
   
2. **Component Not Re-rendering**
   - Check `ChatMessage` component
   - Verify key prop unique: `key={message.id}`

3. **CSS Display Issue**
   - Check element not `display: none`
   - Verify z-index not hidden

---

## Debug Mode

### Enable Verbose Logging

**Frontend:**
```javascript
// In AIContext.jsx, add logging:
console.log('Sending request:', { prompt, mode });
console.log('Response received:', response.data);
```

**Backend:**
```javascript
// In AgentController.js:
console.log('Agent request:', req.body);
console.log('Files created:', filesCreated);
```

### Network Debugging

1. Open DevTools > Network tab
2. Filter: "Fetch/XHR"
3. Click request to see:
   - Request headers (check Authorization)
   - Request payload
   - Response data
   - Status code

### State Inspection

```javascript
// Add to any component:
import { useAI } from '@/context/AIContext';

const { mode, messages, isLoading } = useAI();
console.log({ mode, messages, isLoading });
```

---

## Emergency Reset

### Complete System Reset

```powershell
# 1. Stop all servers
# Press Ctrl+C in backend and frontend terminals

# 2. Clear caches
cd "c:\Users\yuvra\Downloads\Testing 2\New Project\frontend-new"
rm -r node_modules/.vite
rm -r dist

cd ../backend
rm -r node_modules

# 3. Reinstall dependencies
cd frontend-new
npm install

cd ../backend
npm install

# 4. Clear browser data
# Browser > DevTools > Application > Clear Storage > Clear site data

# 5. Restart servers
cd backend
npm start

# New terminal:
cd frontend-new
npm run dev

# 6. Login fresh
# Navigate to http://localhost:5173
# Login with credentials
```

---

## Contact & Support

### Check Logs

**Backend logs:**
- Console where `npm start` is running
- Check for error stack traces

**Frontend logs:**
- Browser DevTools > Console
- React errors appear here

### File Issues

```powershell
# Check auto_generated folder
ls "c:\Users\yuvra\Downloads\Testing 2\New Project\frontend-new\src\auto_generated"

# Check permissions
icacls "c:\Users\yuvra\Downloads\Testing 2\New Project\frontend-new\src\auto_generated"
```

### Still Stuck?

1. ✅ Checked all common issues above
2. ✅ Reviewed error messages carefully
3. ✅ Checked browser console
4. ✅ Checked backend console
5. ✅ Tried emergency reset

**Next Steps:**
- Review `AI_ARCHITECTURE.md` for system overview
- Check `AI_TESTING_CHECKLIST.md` for verification
- Examine code in `AgentController.js` and `AIContext.jsx`

---

**Most issues are authentication or path-related. Double-check these first!**
