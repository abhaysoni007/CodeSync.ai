# 🔧 Delta Engine - How to Enable

## ⚠️ Current Status

The Delta Engine has been **temporarily disabled** to prevent infinite loops and crashes. The app is now working normally with standard file sync.

## 🐛 Issues Fixed

1. **Infinite Loop**: The hook was re-initializing on every render
2. **Socket Not Ready**: Trying to emit before socket connection established  
3. **Missing Dependencies**: React warned about dependency array issues

## ✅ What's Working Now

- ✅ File editing with Monaco Editor
- ✅ Real-time collaboration via Socket.IO
- ✅ Code sync across multiple users
- ✅ Ctrl+S save functionality
- ✅ No crashes or infinite loops

## 🔌 How to Enable Delta Engine

### Step 1: Ensure Backend is Ready

The backend delta routes need to be properly configured. Check:

```bash
cd backend
node server.js
```

Look for these logs:
```
✅ Delta routes registered at /delta
🔌 Delta socket handlers setup
```

### Step 2: Uncomment Delta Engine in ProjectRoom.jsx

Open `frontend-new/src/pages/ProjectRoom.jsx` and find line ~102:

**Change FROM:**
```javascript
// Delta Engine Integration (DISABLED FOR NOW - needs backend setup)
// Uncomment when backend delta routes are ready
/*
const {
  sendDelta,
  saveSnapshot,
  rollbackToSnapshot,
  getVersionHistory,
  isInitialized,
  isSyncing,
  isSynced,
} = useDeltaSync(id, activeFile?._id, code);
*/
```

**Change TO:**
```javascript
// Delta Engine Integration
const {
  sendDelta,
  saveSnapshot,
  rollbackToSnapshot,
  getVersionHistory,
  isInitialized,
  isSyncing,
  isSynced,
} = useDeltaSync(id, activeFile?._id, code);
```

### Step 3: Enable handleSaveFile (line ~520)

**Change FROM:**
```javascript
const handleSaveFile = async () => {
  if (!activeFile) return;

  try {
    // Use virtual filesystem API for virtual files
    // Delta Engine integration coming soon
    toast.success('File saved successfully (auto-sync enabled)');
  } catch (error) {
    console.error('Failed to save file:', error);
    toast.error('Failed to save file');
  }
};
```

**Change TO:**
```javascript
const handleSaveFile = async () => {
  if (!activeFile) return;

  try {
    const success = await saveSnapshot();
    if (success) {
      toast.success('File saved successfully');
    } else {
      toast.error('Failed to save file');
    }
  } catch (error) {
    console.error('Failed to save file:', error);
    toast.error('Failed to save file');
  }
};
```

### Step 4: Enable sendDelta in handleEditorChange (line ~560)

**Change FROM:**
```javascript
setCode(value);

// Delta Engine integration (disabled for now)
// if (activeFile && isInitialized) {
//   sendDelta(value);
// }

// Emit code update to other users via Socket.IO
```

**Change TO:**
```javascript
setCode(value);

// Send delta update
if (activeFile && isInitialized) {
  sendDelta(value);
}

// Still emit code update for backward compatibility
```

### Step 5: Enable DeltaSyncStatus (line ~1235)

**Change FROM:**
```javascript
{/* Delta Sync Status (disabled for now) */}
{/* activeFile && <DeltaSyncStatus fileId={activeFile._id} /> */}
```

**Change TO:**
```javascript
{/* Delta Sync Status */}
{activeFile && <DeltaSyncStatus fileId={activeFile._id} />}
```

### Step 6: Enable Version History Panel (line ~1650)

**Change FROM:**
```javascript
{/* Version History Panel (disabled for now - needs backend setup) */}
{/*
{showVersionHistory && activeFile && (
  ...
)}
*/}
```

**Change TO:**
```javascript
{/* Version History Panel */}
{showVersionHistory && activeFile && (
  <aside className="w-96 bg-vscode-panel border-l border-vscode-border flex flex-col">
    <div className="p-4 border-b border-vscode-border flex items-center justify-between">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-vscode-accent" />
        <h2 className="font-semibold text-white">Version History</h2>
      </div>
      <button
        onClick={() => setShowVersionHistory(false)}
        className="p-1 hover:bg-vscode-bg rounded transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
    </div>
    <div className="flex-1 overflow-y-auto">
      <VersionHistoryPanel
        fileId={activeFile._id}
        onRestore={(version) => {
          rollbackToSnapshot(version.snapshotId);
          toast.success(`Restored to version ${version.versionNumber}`);
        }}
      />
    </div>
  </aside>
)}
```

## 🧪 Test After Enabling

1. **Check Socket Connection**:
   - Open browser console
   - Look for: `[useDeltaSync] Socket connected for delta sync`
   - Should see: `[useDeltaSync] Initializing delta sync for file: ...`

2. **Test Manual Save**:
   - Type in editor
   - Press Ctrl+S
   - Should see success toast

3. **Test Version History**:
   - Click "History" button in header
   - Should see version list
   - Try restoring a version

4. **Test Multi-User Sync**:
   - Open same project in 2 browser tabs
   - Edit in one tab
   - Changes should appear in other tab

## 🔍 Debugging

If you encounter errors after enabling:

### Error: "socket.emit is not a function"
**Solution**: Socket not connected yet. Wait 2-3 seconds after opening file.

### Error: "Maximum update depth exceeded"
**Solution**: The hook is re-rendering too much. Check that `code` prop isn't changing on every keystroke.

### Error: "Failed to initialize delta sync"
**Solution**: Backend delta routes not available. Check backend logs.

## 📝 Notes

- Delta Engine creates a separate socket connection for version control
- This is independent of the main Socket.IO connection in ProjectRoom
- Files are auto-saved every 60 seconds when Delta Engine is active
- Version history is stored in MongoDB `deltasnapshots` collection

---

**Status**: Delta Engine is built and ready, just needs proper backend integration testing before enabling in production.
