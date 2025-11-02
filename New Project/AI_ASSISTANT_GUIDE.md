# 🤖 AI Assistant System - Build with Agent Mode

## Overview

A fully functional VS Code-style AI Assistant system integrated into your local project with two powerful modes:

1. **Ask Mode** - Q&A interface for coding questions and help
2. **Agent Mode** - Autonomous code generation and file creation

## 🚀 Features

### Ask Mode
- Natural language Q&A interface
- Code examples with syntax highlighting
- Markdown formatting support
- Response history tracking
- Provider: Free AI (configurable to OpenAI/Claude/Gemini)

### Agent Mode
- **Autonomous code generation**
- **Automatic file creation** in `/src/auto_generated/`
- Component and page scaffolding
- Real-time execution logs
- File operation tracking
- Safe sandbox (prevents overwriting important files)

## 📁 Project Structure

```
frontend-new/
├── src/
│   ├── components/
│   │   └── AIInterface/
│   │       ├── AIPanel.jsx           # Main panel UI
│   │       ├── ModeToggle.jsx        # Switch between modes
│   │       ├── ChatMessage.jsx       # Message display
│   │       ├── AgentLog.jsx          # Agent execution logs
│   │       ├── InputArea.jsx         # Input with auto-resize
│   │       ├── HistoryTab.jsx        # Task history
│   │       ├── AIToggleButton.jsx    # Floating toggle button
│   │       └── index.jsx             # Main export
│   ├── context/
│   │   └── AIContext.jsx             # Global AI state management
│   └── auto_generated/               # AI-generated files
│       ├── components/
│       └── pages/
│
backend/
├── controllers/
│   └── AgentController.js            # Agent logic & file ops
├── routes/
│   ├── ai.js                         # Ask mode routes
│   └── agent.js                      # Agent mode routes
└── agent_logs.json                   # Activity logs
```

## 🎨 UI/UX Features

### Design
- **Dark theme** optimized (matches VS Code)
- **Smooth animations** with Framer Motion
- **Responsive panel** (collapsible, maximizable)
- **Custom scrollbars** for seamless experience
- **Local icons** (dark/light adaptive)

### Interactions
- Blinking cursor animation while loading
- Real-time typing indicators
- Smooth mode transitions
- Auto-scroll to latest message
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)

### Status Indicators
- 🟢 Active connection indicator
- ⏳ Processing animations
- ✅ Success confirmations
- ❌ Error messages with details

## 🔧 How to Use

### 1. Start the System

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend-new
npm run dev
```

### 2. Open AI Assistant

- Click the **floating AI button** (bottom-right corner)
- Or it will auto-appear on protected routes

### 3. Ask Mode Examples

```
"How do I create a React hook?"
"Explain async/await in JavaScript"
"Show me how to use Tailwind CSS"
"What's the difference between let and const?"
```

### 4. Agent Mode Examples

```
"Create a landing page with hero section and footer"
"Generate a login form component with validation"
"Make a navbar component with dark mode toggle"
"Create a dashboard page with cards"
"Build a user profile component"
```

## 📋 Agent Mode Commands

### Component Creation
```
"Create a [ComponentName] component"
"Generate a [feature] component"
"Make a [type] component with [features]"
```

Examples:
- "Create a ProductCard component"
- "Generate a SearchBar component"
- "Make a modal component with close button"

### Page Creation
```
"Create a [PageName] page"
"Generate a [type] landing page"
"Build a [feature] dashboard"
```

Examples:
- "Create a pricing page"
- "Generate a contact page"
- "Build an admin dashboard"

## 🛡️ Security & Safety

### Sandboxing
- Files created in `/src/auto_generated/` by default
- Never overwrites existing important files
- Confirmation required for modifications
- Activity logging for audit trail

### Rate Limiting
- **Agent Mode**: 20 requests/hour
- **Ask Mode**: 30 requests/hour
- User-based rate limits

### File Operations Log
All agent activities logged in `backend/agent_logs.json`:
```json
{
  "userId": "...",
  "command": "Create a navbar",
  "type": "component",
  "success": true,
  "files": ["Navbar.jsx"],
  "timestamp": "2025-11-01T..."
}
```

## 🎯 API Endpoints

### Ask Mode
```
POST /api/ai/request
Body: {
  "provider": "free",
  "prompt": "Your question...",
  "temperature": 0.7,
  "maxTokens": 2000
}
```

### Agent Mode
```
POST /api/ai/agent
Body: {
  "command": "Create a component...",
  "projectRoot": "/src"
}
```

### History
```
GET /api/ai/history
GET /api/ai/agent/logs
```

## 🔑 Environment Variables

Add to `backend/.env`:
```env
# AI Providers (Optional - uses free provider by default)
OPENAI_API_KEY=your_key_here
CLAUDE_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

## 🧩 Code Generation

### Component Template
```jsx
import { useState } from 'react';
import PropTypes from 'prop-types';

const ComponentName = ({ title, onAction }) => {
  const [state, setState] = useState(null);

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Component content */}
    </div>
  );
};

ComponentName.propTypes = {
  title: PropTypes.string,
  onAction: PropTypes.func
};

export default ComponentName;
```

### Page Template
```jsx
import { useState, useEffect } from 'react';

const PageName = () => {
  useEffect(() => {
    console.log('Page mounted');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Page content */}
    </div>
  );
};

export default PageName;
```

## 📊 Features Roadmap

### Current ✅
- [x] Dual mode (Ask + Agent)
- [x] File creation & generation
- [x] Syntax highlighting
- [x] History tracking
- [x] Activity logging
- [x] Rate limiting
- [x] Error handling

### Planned 🚧
- [ ] File modification (safe editing)
- [ ] Multi-file project generation
- [ ] Import auto-resolution
- [ ] Git integration
- [ ] Code review mode
- [ ] Testing generation
- [ ] Documentation generation

## 🐛 Troubleshooting

### Panel not opening?
- Check if `AIProvider` wraps your App
- Verify `AIToggleButton` is rendered
- Check console for errors

### Files not creating?
- Backend must be running on port 5000
- User must be authenticated
- Check rate limits
- Verify permissions on auto_generated folder

### No syntax highlighting?
- Ensure `react-markdown` and `react-syntax-highlighter` installed
- Check ChatMessage component imports

## 🎓 Usage Tips

1. **Be specific** in Agent commands
2. **Use Ask Mode** for learning and explanations
3. **Use Agent Mode** for rapid prototyping
4. **Check history** to reuse previous commands
5. **Review generated code** before using in production

## 📝 License

Part of the Collaborative Code Editor project.

## 🤝 Contributing

Feel free to extend the system:
- Add new AI providers
- Improve code generation templates
- Add more file operation types
- Enhance UI/UX

---

**Built with ❤️ using React, Vite, Tailwind CSS, Framer Motion, and Node.js**
