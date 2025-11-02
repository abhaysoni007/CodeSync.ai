# 🎯 AI Assistant - Quick Reference Card

## Instant Test Command

### Ask Mode Test
```
Open http://localhost:5173
Login → Click AI button → Ask Mode → Type:

"Tell me how to create a Flappy Bird game in Python"
```

### Agent Mode Test
```
Agent Mode → Type:

"Create a ProductCard component"
```

---

## Server Commands

### Start Backend
```powershell
cd "c:\Users\yuvra\Downloads\Testing 2\New Project\backend"
npm start
```
**Runs on:** `http://localhost:5000`

### Start Frontend
```powershell
cd "c:\Users\yuvra\Downloads\Testing 2\New Project\frontend-new"
npm run dev
```
**Runs on:** `http://localhost:5173`

---

## API Endpoints

### Ask Mode
```
POST http://localhost:5000/ai/request
Body: {
  "provider": "free",
  "prompt": "Your question here"
}
```

### Agent Mode
```
POST http://localhost:5000/ai/agent
Body: {
  "command": "Create a component"
}
```

### Project Files
```
GET http://localhost:5000/projects/:id/files
```

### Project Messages
```
GET http://localhost:5000/projects/:id/messages
```

---

## File Locations

### Frontend API
```
frontend-new/src/utils/api.js
```

### AI Context
```
frontend-new/src/context/AIContext.jsx
```

### AI Panel Components
```
frontend-new/src/components/AIInterface/
├── AIPanel.jsx
├── ModeToggle.jsx
├── ChatMessage.jsx
├── AgentLog.jsx
├── InputArea.jsx
├── HistoryTab.jsx
└── AIToggleButton.jsx
```

### Backend Controllers
```
backend/controllers/
├── AIController.js
└── AgentController.js
```

### Backend Routes
```
backend/routes/
├── ai.js
├── agent.js
└── projects.js
```

### Generated Files
```
frontend-new/src/auto_generated/
├── components/
└── pages/
```

---

## Common Issues & Fixes

### Issue: AI button not visible
```javascript
// Check localStorage in browser console:
localStorage.getItem('token')
// Should return JWT token, not null
```
**Fix:** Login again

### Issue: "api.get is not a function"
**Fix:** ✅ Already fixed in `utils/api.js`

### Issue: Backend not responding
```powershell
# Check if backend is running:
curl http://localhost:5000/health
```
**Fix:** Run `npm start` in backend folder

### Issue: Frontend errors
```powershell
# Clear cache and restart:
cd frontend-new
rm -r node_modules/.vite
npm run dev
```

---

## Key Features

### ✅ Working Now
- Ask Mode (Q&A)
- Agent Mode (Code Generation)
- Free AI Provider (no API key needed)
- File creation in auto_generated/
- Real-time logs
- Syntax highlighting
- History tracking
- Error handling

### 🔧 Optional Upgrades
- Add OpenAI API key → Better responses
- Add Claude API key → Advanced reasoning
- Add Gemini API key → Google AI
- Add Groq API key → Fast inference

---

## Rate Limits

- **Ask Mode:** 30 requests/hour
- **Agent Mode:** 20 requests/hour
- Per user (IP-based)

---

## Quick Debugging

### Check Backend Status
```powershell
curl http://localhost:5000/health
```

### Check Frontend API Config
```javascript
// In browser console:
import api from './utils/api.js';
console.log(api);
// Should show object with get, post, etc.
```

### View Generated Files
```powershell
ls "c:\Users\yuvra\Downloads\Testing 2\New Project\frontend-new\src\auto_generated\components\"
```

### Check Agent Logs
```powershell
cat "c:\Users\yuvra\Downloads\Testing 2\New Project\backend\agent_logs.json"
```

---

## Example Commands

### Ask Mode Questions
```
"How do I use React hooks?"
"Explain async/await in JavaScript"
"What's the difference between let and const?"
"Show me Tailwind CSS examples"
```

### Agent Mode Commands
```
"Create a Navbar component"
"Generate a pricing page"
"Make a contact form"
"Build a dashboard layout"
"Create a footer component"
```

---

## URLs

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:5000
- **Health Check:** http://localhost:5000/health
- **API Base:** http://localhost:5000/api

---

## Documentation Files

- `AI_SYSTEM_COMPLETE.md` - Full implementation details
- `AI_QUICK_START.md` - 5-minute setup guide
- `AI_ASSISTANT_GUIDE.md` - Complete feature guide
- `AI_ARCHITECTURE.md` - System architecture
- `AI_TESTING_CHECKLIST.md` - Testing procedures
- `AI_TROUBLESHOOTING.md` - Problem solving

---

## Status Check

**Backend:** ✅ Running on port 5000
**Frontend:** ✅ Running on port 5173
**MongoDB:** ✅ Connected
**AI System:** ✅ Fully operational

---

**Ready to use! Click the floating AI button and start asking questions! 🚀**
