# 🚀 AI Assistant Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies

**Frontend:**
```powershell
cd "c:\Users\yuvra\Downloads\Testing 2\New Project\frontend-new"
npm install
```

**Backend:**
```powershell
cd "c:\Users\yuvra\Downloads\Testing 2\New Project\backend"
npm install
```

### Step 2: Start Servers

**Terminal 1 - Backend:**
```powershell
cd "c:\Users\yuvra\Downloads\Testing 2\New Project\backend"
npm start
```

**Terminal 2 - Frontend:**
```powershell
cd "c:\Users\yuvra\Downloads\Testing 2\New Project\frontend-new"
npm run dev
```

### Step 3: Open Application

1. Navigate to `http://localhost:5173`
2. Login or register an account
3. Look for the **floating AI button** (bottom-right, blue/purple gradient with pulse)

### Step 4: Test the System

#### Ask Mode Test:
1. Click the AI button to open panel
2. Ensure "Ask Mode" is selected (blue highlight)
3. Type: `"How do I create a useState hook?"`
4. Press Enter
5. You should see a formatted response with code examples

#### Agent Mode Test:
1. Click "Agent Mode" button
2. Type: `"Create a ProductCard component"`
3. Press Enter
4. Watch the logs appear in real-time
5. Check `frontend-new/src/auto_generated/components/` for the new file

## 🎯 Common Commands

### Ask Mode Examples:
```
"Explain React hooks"
"How to use Tailwind CSS?"
"What is async/await?"
"Show me axios example"
```

### Agent Mode Examples:
```
"Create a navbar component"
"Generate a pricing page"
"Make a contact form component"
"Build a dashboard layout"
```

## 🎨 UI Features to Try

1. **Mode Toggle** - Switch between Ask and Agent
2. **Maximize** - Click maximize icon in header
3. **History** - Click clock icon to view past tasks
4. **Clear** - Click trash icon to clear current chat
5. **Close** - Click X or press the floating button again

## 🔍 Verify Installation

Check these files exist:
```
✅ frontend-new/src/context/AIContext.jsx
✅ frontend-new/src/components/AIInterface/AIPanel.jsx
✅ frontend-new/src/components/AIInterface/ModeToggle.jsx
✅ frontend-new/src/components/AIInterface/ChatMessage.jsx
✅ frontend-new/src/components/AIInterface/AgentLog.jsx
✅ frontend-new/src/components/AIInterface/InputArea.jsx
✅ frontend-new/src/components/AIInterface/HistoryTab.jsx
✅ frontend-new/src/components/AIInterface/AIToggleButton.jsx
✅ backend/controllers/AgentController.js
✅ backend/routes/agent.js
```

## 🐛 Troubleshooting

### AI Button not visible?
- Make sure you're logged in
- Check browser console for errors
- Verify both frontend and backend are running

### "Failed to get AI response"?
- Backend must be running on port 5000
- Check if you're authenticated (token in localStorage)
- Try Ask Mode first (uses free provider)

### Agent not creating files?
- Check `backend/` console for errors
- Verify write permissions
- Look in `frontend-new/src/auto_generated/`

### No syntax highlighting?
- Clear browser cache
- Restart Vite dev server
- Check if dependencies installed correctly

## 📊 Expected Behavior

### Ask Mode Response Time:
- Usually 2-5 seconds
- Shows "Thinking..." indicator
- Returns formatted markdown

### Agent Mode Response Time:
- Usually 3-7 seconds
- Shows "Agent working..." indicator
- Displays real-time logs
- Creates files automatically

## 🎓 Next Steps

1. ✅ Test both modes
2. ✅ Check generated files
3. ✅ Review agent logs
4. ✅ Try different commands
5. ✅ Customize templates (optional)

## 💡 Pro Tips

1. **Use specific commands** - "Create a navbar with logo and menu items"
2. **Check history** - Reuse successful commands
3. **Monitor logs** - Watch file creation in real-time
4. **Customize generated code** - Templates are in AgentController.js
5. **Rate limits** - 20 agent requests/hour, 30 ask requests/hour

## 🔗 Related Documentation

- Full Guide: `AI_ASSISTANT_GUIDE.md`
- Backend API: Check `backend/routes/agent.js`
- Frontend Context: `src/context/AIContext.jsx`

---

**Ready to build with AI! 🚀**

For issues or questions, check the console logs or the main guide.
