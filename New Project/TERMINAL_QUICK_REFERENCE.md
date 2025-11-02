# 🚀 Terminal Integration - Quick Reference

## ⚡ Quick Start (3 Steps)

### 1. Install Dependencies
```powershell
cd frontend-new
npm install xterm xterm-addon-fit xterm-addon-web-links
```

### 2. Start Backend
```powershell
cd backend
npm run dev
```

### 3. Start Frontend (New Terminal)
```powershell
cd frontend-new
npm run dev
```

**Access:** http://localhost:5173 → Login → Open Project → Click "Terminal" button

---

## 🎮 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Execute command |
| `Ctrl+C` | Kill running process |
| `Ctrl+L` | Clear terminal |
| `Backspace` | Delete character |

---

## 🧪 Quick Tests

### Basic Commands
```powershell
node --version        # Check Node.js
npm --version         # Check npm
dir                   # List files (Windows)
ls                    # List files (Unix)
```

### Install Package
```powershell
npm install lodash
```

### Run Script
```powershell
echo "console.log('Hello')" > test.js
node test.js
```

---

## 🎨 UI Controls

| Button | Function |
|--------|----------|
| 🗑️ | Clear output |
| 📋 | Copy selection |
| ⏹️ | Kill process |
| ➕ | New terminal |
| 🔲 | Maximize |
| 🔽 | Collapse |
| ❌ | Close |

---

## 🔧 Configuration

### Change Default Shell
**File:** `TerminalPanel.jsx`, Line ~128

```javascript
shell: 'powershell'  // Options: 'powershell', 'cmd', 'bash'
```

### Adjust Panel Height
**File:** `TerminalPanel.jsx`, Line ~46

```javascript
const [panelHeight, setPanelHeight] = useState(300); // pixels
```

### Modify Timeout
**File:** `terminalController.js`, Line ~19

```javascript
const EXECUTION_TIMEOUT = 120000; // milliseconds (2 min)
```

---

## 📡 Socket Events

### Client Emits
- `terminal:create` - Create session
- `terminal:execute` - Run command
- `terminal:kill` - Kill process
- `terminal:close` - Close session

### Server Emits
- `terminal:created` - Session ready
- `terminal:output` - Command output
- `terminal:exit` - Process ended
- `terminal:error` - Error occurred

---

## 🐛 Troubleshooting

### Terminal Not Appearing
1. Check browser console
2. Verify socket connection (green dot)
3. Refresh page

### Commands Not Running
1. Check backend console
2. Verify project directory exists
3. Check file permissions

### Output Issues
1. Click clear button (🗑️)
2. Refresh terminal
3. Check ANSI support

---

## 🔐 Security

### Blocked Commands
- `rm -rf /` - Dangerous deletion
- `format` - Drive formatting
- Fork bombs
- Device manipulation

### Restrictions
- Commands run in project directory only
- Max 3 concurrent processes per user
- 2-minute execution timeout

---

## 📁 Files Created

```
backend/
├── routes/terminal.js
├── controllers/terminalController.js
└── services/TerminalSocketHandlers.js

frontend-new/
└── src/
    ├── components/
    │   ├── TerminalPanel.jsx
    │   └── TerminalPanel.css
    └── stores/
        └── terminalStore.js
```

---

## 🧰 Useful Commands

### Development
```powershell
npm install <package>     # Install package
npm run dev              # Start dev server
npm test                 # Run tests
```

### Git
```powershell
git status               # Check status
git add .               # Stage all
git commit -m "msg"     # Commit
git push                # Push changes
```

### File Operations
```powershell
type file.txt           # Read file (Windows)
cat file.txt            # Read file (Unix)
echo "text" > file.txt  # Write file
del file.txt            # Delete (Windows)
rm file.txt             # Delete (Unix)
```

### System Info
```powershell
node --version          # Node version
npm --version           # npm version
python --version        # Python version
dir                     # Current directory
pwd                     # Print working directory
```

---

## 💡 Pro Tips

1. **Multiple Terminals**: Click "+" to run multiple commands simultaneously
2. **Resize**: Drag top edge to resize panel
3. **Maximize**: Full-screen terminal for complex operations
4. **Copy Output**: Select text, click copy button
5. **Kill Long Tasks**: Ctrl+C or kill button (⏹️)
6. **Clear Screen**: Ctrl+L or clear button (🗑️)

---

## 🎯 Common Use Cases

### Install Dependencies
```powershell
npm install
# Watch real-time progress
```

### Run Dev Server
```powershell
npm run dev
# Use "+" to open another terminal
```

### Execute Python
```powershell
python script.py
```

### Check Package Info
```powershell
npm list --depth=0
```

---

## ✅ Success Checklist

- [ ] Terminal panel opens smoothly
- [ ] Commands execute and show output
- [ ] Multiple terminals work
- [ ] Ctrl+C kills processes
- [ ] Panel can be resized
- [ ] Color-coded output works
- [ ] Status indicators update
- [ ] Socket shows connected (green dot)

---

## 📞 Quick Help

**Full Guide:** See `TERMINAL_INTEGRATION_GUIDE.md`

**Run Tests:** Execute `.\test-terminal.ps1`

**Auto Setup:** Execute `.\setup-terminal.ps1`

---

**🚀 Happy coding with your integrated terminal!**
