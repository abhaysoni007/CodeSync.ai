# 🧪 File Explorer Testing Checklist

## ✅ Pre-Testing Setup

- [x] Backend setup script executed successfully
- [x] Test project structure created (ID: test-project-123)
- [ ] Backend server is running (`npm run dev` in backend folder)
- [ ] Frontend dev server is running (`npm run dev` in frontend-new folder)
- [ ] You have a valid authentication token

---

## 🔧 Backend Testing

### API Endpoints

**1. Get File Structure**
```bash
# Test with curl (Windows PowerShell):
$token = "YOUR_TOKEN_HERE"
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:5000/api/filesystem/test-project-123" -Headers $headers
```

**Expected:** JSON structure with root folder and children

**2. Create New File**
```bash
$body = @{
  name = "test.js"
  type = "file"
  parentPath = @("root")
  content = "console.log('test');"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/filesystem/test-project-123/create" -Method POST -Headers $headers -Body $body -ContentType "application/json"
```

**Expected:** Success response with created file data

**3. Create New Folder**
```bash
$body = @{
  name = "components"
  type = "folder"
  parentPath = @("root", "src")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/filesystem/test-project-123/create" -Method POST -Headers $headers -Body $body -ContentType "application/json"
```

**Expected:** Success response with created folder data

**4. Rename File**
```bash
$body = @{
  path = @("root", "test.js")
  newName = "renamed.js"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/filesystem/test-project-123/rename" -Method PUT -Headers $headers -Body $body -ContentType "application/json"
```

**Expected:** Success response with old and new names

**5. Delete File**
```bash
$body = @{
  path = @("root", "renamed.js")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/filesystem/test-project-123/delete" -Method DELETE -Headers $headers -Body $body -ContentType "application/json"
```

**Expected:** Success response confirming deletion

### Socket.io Events

**Test in browser console:**

```javascript
// Connect to server
const socket = io('http://localhost:5000', {
  auth: { token: localStorage.getItem('token') }
});

// Join project
socket.emit('join-project', { 
  projectId: 'test-project-123' 
});

// Listen for file system events
socket.on('filesystem:created', (data) => {
  console.log('✅ File/Folder Created:', data);
});

socket.on('filesystem:renamed', (data) => {
  console.log('✅ File/Folder Renamed:', data);
});

socket.on('filesystem:deleted', (data) => {
  console.log('✅ File/Folder Deleted:', data);
});

// Test emit
socket.emit('filesystem:created', {
  projectId: 'test-project-123',
  node: { id: 'test', name: 'test.js', type: 'file' },
  parentPath: ['root']
});
```

**Expected:** Console logs showing received events

---

## 🎨 Frontend Testing

### Component Rendering

**1. Basic Render**
- [ ] FileExplorer component loads without errors
- [ ] Loading spinner appears initially
- [ ] File tree renders after data loads
- [ ] Icons display correctly
- [ ] Theme (dark/light) is applied correctly

**2. File Tree Display**
- [ ] Root folder is visible
- [ ] Nested folders display with correct indentation
- [ ] Files show appropriate icons based on extension
- [ ] Folder icons change color with theme
- [ ] File icons maintain original colors

**3. Expand/Collapse**
- [ ] Click folder to expand/collapse
- [ ] Chevron icon rotates correctly
- [ ] Children appear/disappear smoothly
- [ ] Folder icon updates (if open/closed icons implemented)
- [ ] Animation is smooth

### User Interactions

**4. File Selection**
- [ ] Click file to select
- [ ] Selected file highlights
- [ ] Double-click triggers `onFileSelect` callback
- [ ] Selection persists until another file is clicked

**5. Context Menu**
- [ ] Right-click on file shows context menu
- [ ] Right-click on folder shows context menu with "New File/Folder"
- [ ] Context menu positions correctly
- [ ] Click outside closes context menu
- [ ] Actions in context menu work

**6. Create File/Folder**
- [ ] Header "New File" button opens dialog
- [ ] Header "New Folder" button opens dialog
- [ ] Context menu "New File" works
- [ ] Context menu "New Folder" works
- [ ] Dialog input focuses automatically
- [ ] Enter key submits form
- [ ] Escape key cancels
- [ ] Created item appears in tree
- [ ] Parent folder auto-expands

**7. Rename**
- [ ] Context menu "Rename" starts inline edit
- [ ] Input shows current name
- [ ] Input is focused and selected
- [ ] Enter key confirms rename
- [ ] Escape key cancels
- [ ] Name updates in tree
- [ ] Empty name shows error
- [ ] Duplicate name shows error

**8. Delete**
- [ ] Context menu "Delete" shows confirmation
- [ ] Cancel keeps the item
- [ ] Confirm removes item
- [ ] Item disappears from tree
- [ ] Can't delete root folder

### Real-Time Sync

**9. Multi-User Testing (2 Browser Windows)**

**Window 1:**
- [ ] Open dashboard with test project
- [ ] Create a new file "user1.js"

**Window 2:**
- [ ] Open same dashboard (different user or incognito)
- [ ] See "user1.js" appear automatically
- [ ] Create a new folder "shared"

**Window 1:**
- [ ] See "shared" folder appear

**Both Windows:**
- [ ] Rename file in Window 1 → updates in Window 2
- [ ] Delete folder in Window 2 → disappears in Window 1
- [ ] No page refresh needed
- [ ] All changes are instant

### Error Handling

**10. Error States**
- [ ] Invalid project ID shows error
- [ ] Network failure shows error
- [ ] Duplicate file name shows toast error
- [ ] Empty name shows validation error
- [ ] Unauthorized access handled gracefully

### Performance

**11. Large File Tree**
- [ ] Create 50+ files in different folders
- [ ] Scrolling is smooth
- [ ] Expand/collapse remains fast
- [ ] No lag when typing in rename input
- [ ] Real-time updates don't cause flickering

### Theme Switching

**12. Dark/Light Theme**
- [ ] Switch to light theme
  - Background changes to light
  - Text becomes dark
  - Folder icons turn black
  - File icons stay same color
  - Context menu updates
  - Dialogs update
- [ ] Switch back to dark theme
  - Everything reverses correctly
  - No visual glitches

### Accessibility

**13. Keyboard Navigation**
- [ ] Tab through interactive elements
- [ ] Enter/Escape work in dialogs
- [ ] Enter/Escape work in rename input
- [ ] All buttons are keyboard accessible

### Responsive Design

**14. Different Screen Sizes**
- [ ] Desktop (1920x1080) - Full layout
- [ ] Tablet (768px) - Adjusted layout
- [ ] Mobile (375px) - Sidebar hidden/collapsible

---

## 🔍 Visual Testing

### Icons

- [ ] JavaScript (.js) - Yellow JS icon
- [ ] Python (.py) - Blue Python icon
- [ ] HTML (.html) - Orange HTML5 icon
- [ ] CSS (.css) - Blue CSS3 icon
- [ ] JSON (.json) - Gray JSON icon
- [ ] Markdown (.md) - Text file icon
- [ ] Folder (closed) - Folder icon (theme-colored)
- [ ] Folder (open) - Folder icon (theme-colored)

### Animations

- [ ] Fade in on file tree load
- [ ] Slide in on file/folder create
- [ ] Smooth expand/collapse
- [ ] Context menu fade in
- [ ] Modal dialog scale in
- [ ] Hover effects on all interactive elements

### Styling

- [ ] Proper spacing/padding
- [ ] Aligned icons and text
- [ ] Consistent colors
- [ ] No overlapping elements
- [ ] Scrollbar styled correctly
- [ ] Selected state clearly visible

---

## 🐛 Edge Cases

**15. Unusual Scenarios**
- [ ] Create file with very long name
- [ ] Create file with special characters
- [ ] Create file with emoji in name
- [ ] Rapidly create/delete multiple files
- [ ] Delete folder with many nested items
- [ ] Rename while another user is creating
- [ ] Network disconnection during operation
- [ ] Refresh page during file operation

---

## 📊 Performance Metrics

**16. Benchmark (Optional)**
- [ ] Time to load 100 files: < 500ms
- [ ] Time to expand folder: < 100ms
- [ ] Time to create file: < 200ms
- [ ] Socket event latency: < 50ms
- [ ] Memory usage stable over time

---

## ✅ Final Checklist

Before considering testing complete:

- [ ] All core features work
- [ ] Real-time sync works perfectly
- [ ] No console errors
- [ ] No visual glitches
- [ ] Responsive on all devices
- [ ] Theme switching works
- [ ] Error handling is graceful
- [ ] Performance is acceptable
- [ ] Code is documented
- [ ] Integration guide is clear

---

## 📝 Bug Report Template

If you find bugs, report using this format:

```
**Bug Title:** [Short description]

**Steps to Reproduce:**
1. Go to...
2. Click on...
3. See error

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Environment:**
- OS: [e.g., Windows 11]
- Browser: [e.g., Chrome 120]
- Node version: [e.g., 18.17.0]

**Console Errors:**
[Paste any errors from console]

**Screenshots:**
[If applicable]
```

---

## 🎉 Success Criteria

Your File Explorer is working perfectly when:

✅ You can create, rename, and delete files/folders  
✅ Changes sync instantly across all connected users  
✅ Icons display correctly for all file types  
✅ Theme switching works smoothly  
✅ No errors in console  
✅ Smooth animations and transitions  
✅ Context menu and dialogs work  
✅ Loading and error states display properly  

---

**Good luck with testing! 🚀**
