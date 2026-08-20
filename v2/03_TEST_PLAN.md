# CodeSync IDE — Implementation Verification & Test Plan

Use this document after implementation.

The purpose is to prove that CodeSync can actually function as a normal MERN development environment.

---

# Test Rules

- [ ] Do not test only the UI.
- [ ] Test actual filesystem behavior.
- [ ] Test actual terminal execution.
- [ ] Test long-running processes.
- [ ] Test reload/reconnect.
- [ ] Test with two browser sessions for collaboration.
- [ ] Test both success and failure paths.
- [ ] Do not mark PASS because code appears correct.
- [ ] Record actual observed behavior.

---

# 1. Workspace Tests

## Create Project

- [ ] Create a new project.
- [ ] Verify workspace directory exists.
- [ ] Verify project opens automatically.
- [ ] Reload browser.
- [ ] Reopen project.
- [ ] Verify files still exist.

Expected:

```text
PASS = Project survives reload and can be reopened.
```

## Rename Project

- [ ] Rename project.
- [ ] Reload.
- [ ] Verify new name remains.

## Delete Project

- [ ] Create test project.
- [ ] Delete it.
- [ ] Verify confirmation appears.
- [ ] Confirm deletion.
- [ ] Verify workspace is removed.
- [ ] Verify deleted project cannot be reopened.

---

# 2. Explorer CRUD Tests

## Create File

- [ ] Create `test.js`.
- [ ] Verify it appears immediately.
- [ ] Open it.
- [ ] Add code.
- [ ] Save.
- [ ] Verify actual filesystem contains content.

## Create Folder

- [ ] Create `services`.
- [ ] Verify folder appears.
- [ ] Create `services/userService.js`.

## Rename

- [ ] Rename `userService.js` → `user.service.js`.
- [ ] Verify editor/tab state updates correctly.
- [ ] Verify filesystem has new name.

## Delete

- [ ] Delete test file.
- [ ] Verify Explorer removes it.
- [ ] Verify filesystem removes it.

## Move

- [ ] Create `components/Test.jsx`.
- [ ] Move it to another folder.
- [ ] Verify both Explorer and filesystem.

---

# 3. Editor Tests

- [ ] Open JavaScript file.
- [ ] Type JavaScript.
- [ ] Verify syntax highlighting.
- [ ] Test indentation.
- [ ] Test auto-closing brackets.
- [ ] Test bracket matching.
- [ ] Test undo.
- [ ] Test redo.
- [ ] Test find.
- [ ] Test replace.
- [ ] Test go-to-line.
- [ ] Test code folding.
- [ ] Test multiple cursor.
- [ ] Test formatting.
- [ ] Test keyboard shortcuts.

---

# 4. Save Tests

## Normal Save

- [ ] Open file.
- [ ] Modify file.
- [ ] Verify unsaved indicator.
- [ ] Press Ctrl/Cmd + S.
- [ ] Verify saved indicator.
- [ ] Close file.
- [ ] Reopen file.
- [ ] Verify changes remain.

## Reload

- [ ] Modify file.
- [ ] Save.
- [ ] Reload browser.
- [ ] Reopen file.
- [ ] Verify content.

## Unsaved Protection

- [ ] Modify file.
- [ ] Do not save.
- [ ] Attempt destructive action.
- [ ] Verify user receives appropriate warning.

---

# 5. Terminal Tests

Run:

```bash
pwd
```

- [ ] Correct workspace path is shown.

Run:

```bash
mkdir terminal-test
```

- [ ] Folder appears in Explorer.

Run:

```bash
cd terminal-test
```

then:

```bash
pwd
```

- [ ] cwd remains changed.

Run:

```bash
cd ..
```

- [ ] cwd changes correctly.

Run:

```bash
echo "hello" > terminal-file.txt
```

- [ ] File appears in Explorer.

Run:

```bash
cat terminal-file.txt
```

- [ ] Correct content appears.

Run a failing command:

```bash
command-that-does-not-exist
```

- [ ] Error appears.
- [ ] Terminal remains usable.

---

# 6. Long-Running Process Test

Create a test Node process:

```js
setInterval(() => {
  console.log("running");
}, 1000);
```

Run:

```bash
node test.js
```

Verify:

- [ ] Process remains alive.
- [ ] Output streams every second.
- [ ] Terminal remains responsive.
- [ ] Ctrl+C stops the process.
- [ ] Process actually exits.

---

# 7. Multiple Terminal Test

Open:

```text
Terminal 1
Terminal 2
```

- [ ] Both sessions exist independently.
- [ ] Changing cwd in Terminal 1 does not change Terminal 2.
- [ ] Commands can run independently.
- [ ] Killing Terminal 1 does not kill Terminal 2.

---

# 8. MERN End-to-End Test

Create a fresh test project.

Target structure:

```text
mern-test/
├── client/
│   ├── src/
│   └── package.json
├── server/
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── server.js
│   └── package.json
├── package.json
└── README.md
```

## Backend

- [ ] Install Express.
- [ ] Install Mongoose.
- [ ] Install CORS.
- [ ] Install dotenv.
- [ ] Create `.env`.
- [ ] Create Express server.
- [ ] Connect MongoDB.
- [ ] Create model.
- [ ] Create controller.
- [ ] Create CRUD routes.
- [ ] Start backend.

Example:

```bash
npm run dev
```

Expected:

```text
Server running on port 5000
```

## Frontend

- [ ] Create React app.
- [ ] Install Axios.
- [ ] Create component.
- [ ] Call backend API.
- [ ] Display data.
- [ ] Start frontend.

Example:

```bash
npm run dev
```

Expected:

```text
Vite running on port 5173
```

---

# 9. MERN CRUD Test

The test application should support:

## Create

- [ ] Submit form.
- [ ] POST request reaches backend.
- [ ] MongoDB record is created.
- [ ] UI updates.

## Read

- [ ] Load page.
- [ ] GET request executes.
- [ ] Records appear.

## Update

- [ ] Edit record.
- [ ] PUT/PATCH request executes.
- [ ] Database updates.
- [ ] UI updates.

## Delete

- [ ] Delete record.
- [ ] DELETE request executes.
- [ ] Database record disappears.
- [ ] UI updates.

This is the most important functional test for a MERN-focused CodeSync.

---

# 10. Filesystem Watcher Test

Open Explorer.

In terminal:

```bash
mkdir watcher-test
```

Verify:

- [ ] Folder appears automatically.

Then:

```bash
touch watcher-test/file.js
```

Verify:

- [ ] File appears automatically.

Then:

```bash
mv watcher-test/file.js watcher-test/renamed.js
```

Verify:

- [ ] Explorer reflects rename.

Then:

```bash
rm watcher-test/renamed.js
```

Verify:

- [ ] Explorer removes file.

---

# 11. Collaboration Test

Open CodeSync in:

```text
Browser A
Browser B
```

Join the same workspace.

## Presence

- [ ] User A sees User B.
- [ ] User B sees User A.
- [ ] Join/leave status works.

## Same File

Open `App.jsx` in both.

User A types:

```js
const test = "hello";
```

Verify:

- [ ] User B sees the change.
- [ ] No manual refresh required.

## Simultaneous Editing

User A and B edit different positions simultaneously.

Verify:

- [ ] Both edits survive.
- [ ] One user's entire document is not overwritten.

## Cursor

- [ ] User A cursor is visible to B.
- [ ] User B cursor is visible to A.

## Reconnect

- [ ] Disconnect one client temporarily.
- [ ] Make changes where appropriate.
- [ ] Reconnect.
- [ ] Verify state converges.
- [ ] Verify no document loss.

---

# 12. Terminal + Collaboration Test

Important:

- [ ] User A creates file from terminal.
- [ ] User B sees it in Explorer.
- [ ] User B opens it.
- [ ] User A edits it.
- [ ] User B receives edit.

Also verify terminal sessions remain isolated unless explicitly designed as shared.

---

# 13. Port / Preview Test

Start frontend:

```bash
npm run dev
```

Start backend:

```bash
npm run dev
```

Verify:

- [ ] Both processes remain alive.
- [ ] Different ports are detected.
- [ ] Frontend can be opened in preview.
- [ ] Frontend can call backend.
- [ ] Stopping backend does not kill frontend.
- [ ] Stopping frontend does not kill backend.

---

# 14. Git Test

Inside a test project:

```bash
git init
git status
git add .
git commit -m "test CodeSync IDE"
```

Verify:

- [ ] Commands work.
- [ ] `.gitignore` works.
- [ ] node_modules is ignored.
- [ ] `.env` is ignored.

If remote is configured:

```bash
git push
```

- [ ] Push works.

---

# 15. Error Handling Tests

Test:

- [ ] Invalid file path
- [ ] Missing file
- [ ] Duplicate file
- [ ] Duplicate folder
- [ ] Rename to invalid name
- [ ] Delete nonexistent file
- [ ] Terminal command failure
- [ ] npm install failure
- [ ] Server crash
- [ ] Network disconnect
- [ ] WebSocket reconnect
- [ ] Unauthorized workspace access
- [ ] Path traversal attempt
- [ ] Invalid project ID

The application should show useful errors and remain usable.

---

# 16. Security Tests

Attempt:

```text
../../
../../../
```

through filesystem APIs.

- [ ] Path traversal blocked.

Attempt to access another workspace's files.

- [ ] Access denied.

Attempt terminal access outside permitted workspace.

- [ ] Blocked according to the project's security model.

Verify:

- [ ] Secrets are not sent unnecessarily to frontend.
- [ ] Workspace authorization is checked server-side.
- [ ] User cannot manipulate another user's workspace by changing IDs.

---

# 17. Reload / Recovery Test

- [ ] Open project.
- [ ] Open multiple tabs.
- [ ] Start terminals.
- [ ] Edit and save files.
- [ ] Reload browser.
- [ ] Reopen workspace.
- [ ] Verify files.
- [ ] Verify project state.
- [ ] Verify collaboration can reconnect.

---

# 18. Final Acceptance Test

Create a fresh MERN CRUD application entirely inside CodeSync.

The developer must be able to complete:

```text
Create workspace
      ↓
Create folders/files
      ↓
Install dependencies
      ↓
Write React frontend
      ↓
Write Express backend
      ↓
Connect MongoDB
      ↓
Create CRUD API
      ↓
Connect frontend to API
      ↓
Run backend
      ↓
Run frontend
      ↓
Open preview
      ↓
Create record
      ↓
Read record
      ↓
Update record
      ↓
Delete record
      ↓
Collaborate with second user
      ↓
Modify files from terminal
      ↓
See Explorer update
      ↓
Save/reload
      ↓
Git commit
```

## FINAL PASS CONDITION

- [ ] Entire workflow completes without opening VS Code.
- [ ] No data loss.
- [ ] No unexplained synchronization issues.
- [ ] Terminal processes behave correctly.
- [ ] Filesystem and editor remain consistent.
- [ ] Two users can collaborate reliably.
- [ ] MERN CRUD application works end-to-end.
