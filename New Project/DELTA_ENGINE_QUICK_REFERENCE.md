# 🚀 Delta Engine - Quick Reference

## 📋 Quick Commands

### User Actions
| Action | Keyboard Shortcut | Result |
|--------|------------------|--------|
| Save File | `Ctrl+S` (Windows) / `Cmd+S` (Mac) | Creates snapshot immediately |
| Open History | Click "History" button | Opens version timeline |
| Rollback | Click "Restore" in history | Restores to that version |
| View Changes | Click "View Diff" in history | Shows what changed |

### Automatic Snapshots
| Trigger | Condition | When It Fires |
|---------|-----------|---------------|
| Time-Based | Every 60 seconds | Auto-save while editing |
| Edit Count | 50+ edits | After many changes |
| Idle Detection | 10 seconds of no typing | After you stop typing |
| Cursor Jump | Move cursor 30+ lines | When you jump around code |
| Focus Loss | Switch tab/window | When you leave the editor |
| Undo/Redo | Use undo/redo | After undo/redo operations |
| Manual | Press Ctrl+S | Immediate save |

---

## 🎯 UI Components

### 1. **Sync Status** (Bottom Status Bar)
```
┌─────────────────────────────────────┐
│ Line 42, Col 15  javascript         │
│ 🟢 Synced (v12)                     │ ← Shows sync state
└─────────────────────────────────────┘
```

**States:**
- 🟢 **Synced** - All changes saved
- 🔄 **Syncing** - Currently saving
- ⚙️ **Initializing** - Setting up Delta Engine
- ❌ **Error** - Something went wrong

### 2. **History Button** (Top Header)
```
┌───────────────────────────────────────┐
│ [AI Assistant] [Activity] [History]  │ ← Click to open
└───────────────────────────────────────┘
```

### 3. **Version History Panel** (Right Sidebar)
```
┌─────────────────────────────────────┐
│ Version History               [×]   │
├─────────────────────────────────────┤
│ 📝 v12 - Manual Save                │
│    by John Doe • 2 minutes ago      │
│    +15 -3 lines                     │
│    [Restore] [View Diff]            │
├─────────────────────────────────────┤
│ ⏱️ v11 - Auto-save                  │
│    by Jane Smith • 5 minutes ago    │
│    +8 -2 lines                      │
│    [Restore] [View Diff]            │
└─────────────────────────────────────┘
```

---

## 🔧 Developer API

### In ProjectRoom Component

```javascript
// Already integrated - just use these:

// 1. Manual save
await saveSnapshot();

// 2. Rollback to version
await rollbackToSnapshot(snapshotId);

// 3. Get version history
const history = await getVersionHistory();

// 4. Check sync status
console.log(syncStatus); // 'synced', 'syncing', 'error', 'initializing'

// 5. Get current version
console.log(currentVersion); // e.g., 12

// 6. Check if initialized
console.log(isInitialized); // true/false
```

---

## 🔍 How It Works (Under the Hood)

### 1. **You Type**
```
Your keystroke → sendDelta() → Creates diff → Compresses → Sends to server
```

### 2. **Server Receives**
```
Delta received → Stores in cache → Broadcasts to other users → Triggers snapshot?
```

### 3. **Smart Snapshot Decision**
```
Check triggers:
- Time passed? (60s)
- Many edits? (50+)
- Idle? (10s)
- Cursor jump? (30+ lines)
- Focus lost?
- Undo/redo?
- Manual save?

If YES → Create snapshot → Store in MongoDB → Update version number
```

### 4. **Other Users Receive**
```
Delta arrives → Apply patch → Update editor → Show sync status
```

---

## 📊 Data Flow

```
┌──────────────┐
│ Monaco Editor│
└──────┬───────┘
       │ onChange
       ▼
┌──────────────┐
│ sendDelta()  │ ← Calculates diff from last content
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Socket.IO    │ ← Sends delta to server
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ DeltaManager     │ ← Buffers delta
│ (Backend)        │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ DeltaScheduler   │ ← Checks triggers
└──────┬───────────┘
       │
       ▼ (if triggered)
┌──────────────────┐
│ Create Snapshot  │ ← Compresses & saves to MongoDB
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Broadcast Update │ ← Notify all connected users
└──────────────────┘
```

---

## 🗄️ Database Schema

### DeltaSnapshot Collection
```javascript
{
  _id: ObjectId,
  snapshotId: "uuid-v4",
  projectId: ObjectId,
  fileId: "file-path-or-id",
  userId: ObjectId,
  
  // Delta data
  delta: {
    data: "base64-compressed-diff",
    format: "diff"
  },
  
  // Version info
  versionNumber: 12,
  baseVersion: 11,
  
  // Metadata
  checksum: "sha256-hash",
  metadata: {
    originalSize: 1024,
    compressedSize: 256,
    compressionRatio: 0.75,
    linesAdded: 15,
    linesRemoved: 3
  },
  
  // Trigger info
  trigger: "manual", // or "time", "edit-count", etc.
  
  // Full snapshot (every 10th version)
  fullSnapshot: "full-file-content",
  
  // Timestamps
  createdAt: ISODate,
  expiresAt: ISODate // Auto-delete after 90 days
}
```

---

## ⚡ Performance Tips

### 1. **Reduce Network Usage**
- Delta Engine already sends only diffs (not full content)
- Typical delta size: 10-100 bytes vs 1-10 KB full file

### 2. **Optimize Snapshot Frequency**
Adjust in `backend/services/DeltaEngine/DeltaScheduler.js`:
```javascript
const DEFAULT_CONFIG = {
  timeInterval: 60000,        // 60s → Change to 120000 for 2 minutes
  editCountThreshold: 50,     // Change to 100 for less frequent saves
  idleThreshold: 10000,       // 10s → Change to 20000 for 20 seconds
  // ...
};
```

### 3. **Cleanup Old Snapshots**
Run manually or set up a cron job:
```javascript
// Delete snapshots older than 30 days
await deltaManager.cleanupOldDeltas(fileId, 30);
```

### 4. **Disable Specific Triggers**
In `DeltaScheduler.js`, comment out unwanted triggers:
```javascript
// Disable cursor jump trigger
// this.registerTrigger('cursor-jump', () => this.checkCursorJump(context));
```

---

## 🐛 Debug Mode

### Enable Verbose Logging

**Frontend** (`useDeltaSync.js`):
```javascript
const DEBUG = true; // Set to true at top of file
```

**Backend** (`DeltaManager.js`):
```javascript
const DEBUG = true; // Set to true at top of file
```

### Monitor Real-Time Events

**Browser Console:**
```javascript
// Listen to all delta events
window.addEventListener('delta:*', (e) => console.log('Delta Event:', e));
```

**Backend Terminal:**
```bash
# Enable debug logs
DEBUG=delta:* node server.js
```

---

## 🎯 Common Use Cases

### 1. **Collaborative Editing**
- Multiple users edit simultaneously
- Changes merge automatically
- No conflicts (CRDT-based)

### 2. **Code Review**
- Review version history
- See what changed between versions
- Restore to specific points

### 3. **Undo/Redo (Extended)**
- Standard Ctrl+Z works for recent changes
- Version history provides unlimited undo
- Restore from hours/days ago

### 4. **Audit Trail**
- See who changed what and when
- Track all edits with timestamps
- User attribution for each change

### 5. **Disaster Recovery**
- Accidental deletions? Rollback!
- Bad merge? Restore previous version!
- Lost work? Check version history!

---

## 🔒 Security Notes

- All deltas are authenticated (JWT required)
- User attribution prevents spoofing
- Checksums verify data integrity
- MongoDB stores encrypted snapshots

---

## 📞 Support

If something doesn't work:

1. Check browser console for errors
2. Check backend logs
3. Verify MongoDB connection
4. Test with a simple file first
5. See `DELTA_ENGINE_INTEGRATION_COMPLETE.md` for troubleshooting

---

**Happy Time Traveling Through Your Code! ⏰🚀**
