# 🚀 Delta Engine - Quick Implementation Example

## Complete Editor Integration Example

Here's a complete example of how to integrate the Delta Engine into your Monaco editor component:

```jsx
import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import useDeltaSync from '../hooks/useDeltaSync';
import VersionHistoryPanel from '../components/DeltaEngine/VersionHistoryPanel';
import DeltaSyncStatus from '../components/DeltaEngine/DeltaSyncStatus';
import { Clock, Save, GitBranch } from 'lucide-react';

export default function CodeEditorWithDeltaSync({ 
  projectId, 
  fileId, 
  fileName,
  initialContent = '',
  language = 'javascript'
}) {
  const [content, setContent] = useState(initialContent);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const editorRef = useRef(null);

  // Initialize Delta Sync
  const {
    isInitialized,
    isSyncing,
    sendDelta,
    saveSnapshot,
    rollbackToSnapshot,
    handleFocusLoss,
    handleUndoRedo,
    currentContent,
    isSynced
  } = useDeltaSync(projectId, fileId, initialContent);

  // Handle editor content change
  const handleEditorChange = (value, event) => {
    setContent(value);
    
    // Get cursor position
    const position = editorRef.current?.getPosition();
    
    // Send delta update
    sendDelta(value, {
      line: position?.lineNumber,
      column: position?.column
    });
  };

  // Handle Ctrl+S / Cmd+S
  const handleSave = async () => {
    try {
      const snapshot = await saveSnapshot('Manual save');
      setLastSaved(new Date());
      console.log('Snapshot created:', snapshot);
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  // Handle manual snapshot creation
  const handleCreateSnapshot = async () => {
    const message = prompt('Enter snapshot message:');
    if (!message) return;

    try {
      const snapshot = await saveSnapshot(message);
      alert(`Snapshot created: v${snapshot.versionNumber}`);
    } catch (error) {
      alert('Failed to create snapshot: ' + error.message);
    }
  };

  // Handle version rollback
  const handleRollback = (newContent, snapshot) => {
    setContent(newContent);
    editorRef.current?.setValue(newContent);
    setShowVersionHistory(false);
    alert(`Restored to version ${snapshot.versionNumber}`);
  };

  // Focus loss handler
  useEffect(() => {
    const handleBlur = () => {
      console.log('Editor lost focus - creating snapshot');
      handleFocusLoss();
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [handleFocusLoss]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      
      // Ctrl+H / Cmd+H for history
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setShowVersionHistory(true);
      }
      
      // Ctrl+Z / Ctrl+Y (track undo/redo)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y')) {
        setTimeout(() => handleUndoRedo(), 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          {/* File name */}
          <h2 className="text-white font-medium">{fileName}</h2>
          
          {/* Sync Status */}
          <DeltaSyncStatus fileId={fileId} />
        </div>

        <div className="flex items-center gap-2">
          {/* Last saved indicator */}
          {lastSaved && (
            <span className="text-xs text-gray-400">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!isInitialized}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            Save
          </button>

          {/* Create snapshot button */}
          <button
            onClick={handleCreateSnapshot}
            disabled={!isInitialized}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <GitBranch className="w-4 h-4" />
            Snapshot
          </button>

          {/* Version history button */}
          <button
            onClick={() => setShowVersionHistory(true)}
            disabled={!isInitialized}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Clock className="w-4 h-4" />
            History
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 relative">
        <MonacoEditor
          language={language}
          value={content}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on'
          }}
          onMount={(editor, monaco) => {
            editorRef.current = editor;

            // Add custom commands
            editor.addCommand(
              monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S,
              () => handleSave()
            );

            editor.addCommand(
              monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_H,
              () => setShowVersionHistory(true)
            );

            console.log('Monaco editor mounted with Delta Sync');
          }}
        />

        {/* Syncing indicator overlay */}
        {isSyncing && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-xs text-blue-400">Syncing...</span>
          </div>
        )}
      </div>

      {/* Version History Panel */}
      <VersionHistoryPanel
        projectId={projectId}
        fileId={fileId}
        fileName={fileName}
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        onRollback={handleRollback}
      />

      {/* Keyboard shortcuts help */}
      <div className="px-4 py-2 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center gap-6 text-xs text-gray-400">
          <span><kbd className="px-2 py-1 bg-gray-700 rounded">Ctrl+S</kbd> Save</span>
          <span><kbd className="px-2 py-1 bg-gray-700 rounded">Ctrl+H</kbd> History</span>
          <span><kbd className="px-2 py-1 bg-gray-700 rounded">Ctrl+Z/Y</kbd> Undo/Redo</span>
        </div>
      </div>
    </div>
  );
}
```

## Using in Your Project

### 1. In your ProjectRoom or Editor component:

```jsx
import CodeEditorWithDeltaSync from './components/CodeEditorWithDeltaSync';

function ProjectRoom() {
  const { projectId } = useParams();
  const [currentFile, setCurrentFile] = useState(null);

  return (
    <div>
      {currentFile && (
        <CodeEditorWithDeltaSync
          projectId={projectId}
          fileId={currentFile._id}
          fileName={currentFile.name}
          initialContent={currentFile.content}
          language={currentFile.language}
        />
      )}
    </div>
  );
}
```

### 2. Monitor Sync Status Globally:

```jsx
import useDeltaStore from './stores/useDeltaStore';

function GlobalSyncIndicator() {
  const { syncStatus } = useDeltaStore();
  
  const allSynced = Object.values(syncStatus).every(s => s.synced);
  
  return (
    <div className="fixed bottom-4 right-4">
      {allSynced ? (
        <div className="text-green-500">All files synced ✓</div>
      ) : (
        <div className="text-yellow-500">Syncing...</div>
      )}
    </div>
  );
}
```

### 3. Access Version History Anywhere:

```jsx
import { useDeltaSync } from './hooks/useDeltaSync';

function FileMenu({ projectId, fileId }) {
  const { getVersionHistory } = useDeltaSync(projectId, fileId);
  
  const handleShowHistory = async () => {
    const history = await getVersionHistory(20);
    console.log('Recent versions:', history);
  };
  
  return (
    <button onClick={handleShowHistory}>
      View History
    </button>
  );
}
```

## Testing the Integration

### 1. Test Real-time Sync

1. Open same file in two browser tabs
2. Type in tab 1
3. See updates appear in tab 2 immediately
4. Check sync status indicator

### 2. Test Snapshot Creation

1. Edit file
2. Press Ctrl+S
3. Check version history panel
4. Verify snapshot appears with version number

### 3. Test Rollback

1. Create several snapshots
2. Open version history
3. Select an older version
4. Click "Restore"
5. Verify content reverts

### 4. Test Offline Mode

1. Disconnect internet
2. Continue editing
3. Reconnect
4. Verify changes sync automatically

## Performance Tips

1. **Batch Updates**: Updates are automatically batched with 200ms debounce
2. **Compression**: Deltas >1KB are automatically compressed
3. **Checkpoints**: Full snapshots created every 20 versions for fast rollback
4. **Cache**: Last 10 deltas cached in memory for instant access
5. **Cleanup**: Old versions auto-archived after 100 snapshots

## Troubleshooting

### Problem: Updates not syncing

**Check:**
- Socket connection: `socket.connected`
- Delta initialized: Check console for "Delta sync initialized"
- Network tab for socket frames

### Problem: Slow version history loading

**Solution:**
- Reduce limit in `getVersionHistory(limit)`
- Archive old snapshots more frequently
- Check MongoDB query performance

### Problem: Memory issues

**Solution:**
- Clear old snapshots: `cleanupOldDeltas(fileId, 50)`
- Reduce cache size in `RedisCache`
- Enable compression for all deltas

## Next Steps

1. ✅ Install dependencies (`npm install`)
2. ✅ Integrate into your editor component
3. ✅ Test with multiple users
4. ✅ Monitor performance metrics
5. ✅ Deploy to production

**You're all set!** The Delta Engine is ready to power your real-time collaborative editing experience! 🚀
