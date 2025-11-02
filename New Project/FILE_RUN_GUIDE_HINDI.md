# 🎯 Terminal में File Run करने की Guide

## ✨ Features

### 1. **File Explorer में Run Button**
- जब आप किसी executable file के ऊपर hover करेंगे, तो एक **green play button** (▶️) दिखाई देगा
- Button click करने पर file automatically terminal में execute हो जाएगी

### 2. **Context Menu से Run**
- File पर **right-click** करें
- "Run File in Terminal" option select करें
- File का output terminal में दिखेगा

---

## 🎮 Supported File Types

| Extension | Command | Example |
|-----------|---------|---------|
| `.js` | `node filename.js` | Node.js scripts |
| `.jsx` | `node filename.jsx` | React components |
| `.ts` | `ts-node filename.ts` | TypeScript files |
| `.tsx` | `ts-node filename.tsx` | TypeScript React |
| `.py` | `python filename.py` | Python scripts |
| `.java` | `javac + java` | Java programs |
| `.cpp` | `g++ + execute` | C++ programs |
| `.c` | `gcc + execute` | C programs |
| `.sh` | `bash filename.sh` | Shell scripts |
| `.bat` | Direct execution | Batch files |
| `.ps1` | `powershell -File` | PowerShell |

---

## 📖 कैसे Use करें?

### Method 1: Hover Button
```
1. File Explorer में जाएं
2. किसी .js, .py, या दूसरी executable file के ऊपर mouse ले जाएं
3. Green play button (▶️) दिखेगा
4. Button click करें
5. Terminal automatically खुलेगा और output दिखेगा
```

### Method 2: Right-Click Menu
```
1. File पर right-click करें
2. "Run File in Terminal" option click करें
3. Terminal में output देखें
```

---

## 🧪 Example Usage

### JavaScript File
```javascript
// test.js
console.log('Hello from Terminal!');
console.log('File run feature working!');
```

**Steps:**
1. `test.js` file create करें
2. Code लिखें और save करें
3. File पर hover करें → Play button click करें
4. Terminal में देखें:
   ```
   > Running: test.js
   $ node test.js
   Hello from Terminal!
   File run feature working!
   ```

### Python File
```python
# hello.py
print("Hello from Python!")
print("Terminal integration works!")
```

**Steps:**
1. `hello.py` file create करें
2. Play button click करें
3. Terminal output:
   ```
   > Running: hello.py
   $ python hello.py
   Hello from Python!
   Terminal integration works!
   ```

---

## 🎨 Visual Indicators

### File Explorer में:
- **Green Play Button (▶️)**: File executable है
- **Hover Effect**: Button highlight होगा
- **Click Animation**: Scale animation

### Terminal में:
- **Cyan Header**: File name और command
- **Gray Command**: Actual command being run
- **Colored Output**: ANSI colors supported
- **Exit Code**: Process completion status

---

## ⚡ Automatic Terminal Opening

अगर terminal पहले से open नहीं है:
1. File run करने पर terminal automatically create होगा
2. Command execute होगा
3. Output real-time में दिखेगा

---

## 🔧 Advanced Features

### Multiple Files Run करना
```
1. First file run करें
2. Terminal में "+" button click करें (new terminal)
3. Second file दूसरे terminal में run करें
4. Both outputs parallel में देख सकते हैं
```

### Output देखना
```
- Terminal panel resize कर सकते हैं (drag top edge)
- Scroll करके पुराना output देख सकते हैं
- Copy button से output copy कर सकते हैं
```

### Process Kill करना
```
अगर program infinite loop में फंस गया:
1. Kill button (⏹️) click करें
या
2. Ctrl+C press करें
```

---

## 🎯 Use Cases

### 1. Quick Testing
```javascript
// quick-test.js
const arr = [1, 2, 3, 4, 5];
console.log('Sum:', arr.reduce((a, b) => a + b, 0));
```
→ Play button → Instant result

### 2. Python Scripts
```python
# data-analysis.py
import pandas as pd
print("Script running...")
```
→ Right-click → Run → See output

### 3. Build Commands
```javascript
// build.js
const { execSync } = require('child_process');
console.log('Building project...');
execSync('npm run build');
```
→ Click play → Watch build process

---

## 💡 Tips

1. **Terminal Auto-Opens**: पहली बार file run करने पर terminal automatically खुलेगा

2. **Real-Time Output**: Output instantly दिखता है (streaming)

3. **Multiple Terminals**: अलग-अलग files अलग terminals में run करें

4. **History**: Terminal में command history save रहती है

5. **Error Display**: Errors red color में दिखते हैं

---

## 🐛 Troubleshooting

### Play Button नहीं दिख रहा?
- Check करें file extension supported है या नहीं
- File पर properly hover करें
- Browser refresh करें

### Command Execute नहीं हो रहा?
- Backend server running है check करें
- Socket connection green है verify करें
- Browser console में errors देखें

### Python/Node Not Found?
- System में Python/Node.js installed होना चाहिए
- PATH environment variable set होना चाहिए
- Terminal में manually test करें: `node --version`, `python --version`

---

## 🚀 Quick Start

```
1. Project open करें
2. JavaScript/Python file create करें
3. Code लिखें
4. File पर hover करें
5. Green play button click करें
6. Terminal में output देखें!
```

---

## 🎊 Success Indicators

✅ Play button दिखता है executable files पर  
✅ Right-click menu में "Run File" option है  
✅ Terminal automatically खुलता है  
✅ Output real-time में दिखता है  
✅ Multiple files parallel में run हो सकती हैं  
✅ ANSI colors properly display होते हैं  

---

**🎉 अब आप files को directly File Explorer से run कर सकते हैं!**

Enjoy coding with instant feedback! 🚀
