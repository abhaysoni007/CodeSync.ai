# CodeSync IDE — Master Implementation Checklist

## Goal

Build CodeSync.ai into a practical, VS Code-like browser IDE for normal MERN development.

The target is **not** to clone every VS Code feature. The target is that a developer can create, edit, run, debug at a basic level, collaborate on, and persist a normal MERN project without needing VS Code for day-to-day development.

Repository:
- GitHub: `https://github.com/abhaysoni007/CodeSync.ai`
- Main application: `New Project/backend` + `New Project/frontend-new`

---

# P0 — Core IDE / Must Work

## Workspace & Project

- [ ] Create project
- [ ] Open project
- [ ] Close project
- [ ] Rename project
- [ ] Delete project with confirmation
- [ ] Persist project data
- [ ] Restore project after reload/login

### Logic

A project must have a stable workspace identity and a real filesystem-backed project directory. Opening a project must restore its files and basic IDE state.

---

## File Explorer

- [ ] Display directory tree
- [ ] Expand folder
- [ ] Collapse folder
- [ ] Create file
- [ ] Create folder
- [ ] Rename file
- [ ] Rename folder
- [ ] Delete file
- [ ] Delete folder
- [ ] Move file
- [ ] Move folder
- [ ] Refresh explorer
- [ ] Detect files created from terminal
- [ ] Detect files deleted/renamed from terminal
- [ ] Keep explorer synchronized with filesystem

### Logic

The Explorer must represent the actual workspace filesystem. Terminal-created, editor-created, renamed, moved, or deleted files must eventually appear consistently for every connected client.

---

## Editor

- [ ] Monaco/editor component
- [ ] Syntax highlighting
- [ ] JavaScript support
- [ ] JSX support
- [ ] JSON support
- [ ] HTML support
- [ ] CSS support
- [ ] Markdown support
- [ ] Line numbers
- [ ] Automatic indentation
- [ ] Bracket matching
- [ ] Auto-closing brackets
- [ ] Code folding
- [ ] Word wrap
- [ ] Undo
- [ ] Redo
- [ ] Multiple cursor
- [ ] Find
- [ ] Replace
- [ ] Go to line
- [ ] Basic autocomplete
- [ ] Editor zoom
- [ ] Format document

---

## Tabs

- [ ] Open file in tab
- [ ] Switch tabs
- [ ] Close tab
- [ ] Unsaved indicator
- [ ] Close all tabs
- [ ] Reopen closed tab
- [ ] Restore open tabs after workspace reload
- [ ] Optional: split editor

---

## Saving

- [ ] Ctrl/Cmd + S
- [ ] Save to real filesystem
- [ ] Autosave
- [ ] Save status
- [ ] Prevent accidental loss of unsaved changes
- [ ] Correctly handle save failures
- [ ] Editor state and filesystem state converge

### Logic

The editor must not treat in-memory React/Yjs state as the only saved copy. A successful save means the actual workspace file contains the latest intended content.

---

# P0 — Terminal

## Terminal Basics

- [ ] Open terminal
- [ ] Execute commands
- [ ] Persistent shell session
- [ ] Persistent working directory
- [ ] `cd` works
- [ ] stdout streaming
- [ ] stderr streaming
- [ ] Exit codes
- [ ] Command history
- [ ] Arrow-up history
- [ ] Ctrl+C
- [ ] Clear terminal
- [ ] Kill terminal
- [ ] Restart terminal
- [ ] Multiple terminal sessions
- [ ] Terminal names
- [ ] Terminal errors are visible

## Long-running Processes

- [ ] `npm run dev` stays alive
- [ ] Vite stays alive
- [ ] Node/Nodemon stays alive
- [ ] Ctrl+C terminates the intended process
- [ ] Process cleanup when workspace closes
- [ ] Processes are isolated between workspaces/users
- [ ] Background processes don't block terminal input

### Logic

A terminal must behave like a real shell, not like a one-shot command API. Commands such as `npm run dev` must keep running and stream output until explicitly terminated.

---

# P0 — MERN Development

The following must work from inside CodeSync:

- [ ] `npm init`
- [ ] `npm install`
- [ ] `npm uninstall`
- [ ] `npm update`
- [ ] `npm run`
- [ ] `npm start`
- [ ] `npm run dev`
- [ ] `node`
- [ ] `npx`
- [ ] package.json editing
- [ ] package-lock updates
- [ ] node_modules creation
- [ ] `.env` files
- [ ] `.gitignore`
- [ ] client/server folders
- [ ] frontend dev server
- [ ] backend dev server
- [ ] MongoDB connection code
- [ ] React API requests
- [ ] CRUD operations

---

# P0 — Filesystem Synchronization

- [ ] Editor → filesystem
- [ ] Terminal → filesystem
- [ ] Filesystem → Explorer
- [ ] Filesystem → open editor
- [ ] Filesystem → collaborators
- [ ] External file changes detected
- [ ] package-lock changes detected
- [ ] New files detected
- [ ] Deleted files detected
- [ ] Renamed files detected
- [ ] Changes do not silently overwrite newer content

### Critical rule

There must be a clear source-of-truth model. Editor changes and terminal changes must converge on the same workspace filesystem.

---

# P1 — Collaboration

## Real-time Editing

- [ ] Real-time file content synchronization
- [ ] Multiple users editing same file
- [ ] Conflict-free simultaneous editing
- [ ] Remote cursor
- [ ] Remote selection
- [ ] User presence
- [ ] User colors
- [ ] Join notification
- [ ] Leave notification
- [ ] Current-file presence
- [ ] Connection status
- [ ] Reconnection
- [ ] Offline/reconnect recovery
- [ ] No document loss during reconnect

## Workspace Access

- [ ] Owner
- [ ] Collaborator
- [ ] Invite collaborator
- [ ] Remove collaborator
- [ ] Basic permission enforcement

### Logic

Shared state such as files/editor content should synchronize collaboratively. Terminal sessions should normally remain per-user unless intentionally designed as shared.

---

# P1 — Search & Navigation

- [ ] Search across files
- [ ] Search result line numbers
- [ ] Click result → open file
- [ ] Click result → jump to line
- [ ] Ctrl/Cmd + P → file search
- [ ] Go to line
- [ ] Go to symbol
- [ ] Basic find references

---

# P1 — Problems / Code Quality

- [ ] Problems panel
- [ ] Error count
- [ ] Warning count
- [ ] Click error → source location
- [ ] ESLint support
- [ ] ESLint output
- [ ] Format document
- [ ] Prettier support
- [ ] Format on save (optional)

---

# P1 — Command Palette & Shortcuts

- [ ] Command palette
- [ ] Save
- [ ] New file
- [ ] New folder
- [ ] Open terminal
- [ ] Toggle Explorer
- [ ] Toggle terminal
- [ ] Format document
- [ ] Search files
- [ ] Ctrl/Cmd + S
- [ ] Ctrl/Cmd + F
- [ ] Ctrl/Cmd + H
- [ ] Ctrl/Cmd + P
- [ ] Ctrl/Cmd + G
- [ ] Ctrl/Cmd + W
- [ ] Ctrl/Cmd + Shift + P
- [ ] Undo/redo
- [ ] Terminal Ctrl+C
- [ ] Terminal Ctrl+L

---

# P1 — Ports & Preview

- [ ] Detect listening ports
- [ ] Display port/process
- [ ] Frontend preview
- [ ] Open running application
- [ ] Refresh preview
- [ ] Handle frontend/backend ports separately
- [ ] Basic port cleanup

Example:

```text
PORTS
5173 → frontend → Running
5000 → backend  → Running
```

---

# P2 — Git

## Terminal Git

- [ ] git init
- [ ] git status
- [ ] git add
- [ ] git commit
- [ ] git branch
- [ ] git checkout
- [ ] git pull
- [ ] git push
- [ ] git clone

## Git UI

- [ ] Source Control panel
- [ ] Changed files
- [ ] Stage
- [ ] Unstage
- [ ] Commit message
- [ ] Commit
- [ ] Push
- [ ] Pull
- [ ] Diff viewer

---

# P2 — Professional IDE Features

- [ ] Split editor
- [ ] Go to definition
- [ ] Go to symbol
- [ ] Find references
- [ ] Better JavaScript/TypeScript autocomplete
- [ ] Terminal error → source line
- [ ] File history
- [ ] Workspace recovery
- [ ] Project templates
- [ ] Better error navigation

---

# P3 — CodeSync Differentiators

Not required for the basic IDE:

- [ ] Shared terminal
- [ ] Collaborative live preview
- [ ] Session replay
- [ ] AI coding assistant
- [ ] AI error fixing
- [ ] AI project understanding
- [ ] Code comments/discussions
- [ ] Voice collaboration
- [ ] Multiplayer debugging

---

# Definition of Done

Do not mark the IDE complete because the UI looks like VS Code.

The IDE is considered MVP-complete only when a developer can:

1. Create a project.
2. Create folders/files.
3. Edit files.
4. Save files.
5. Install npm dependencies.
6. Create a React frontend.
7. Create an Express backend.
8. Connect MongoDB.
9. Implement CRUD.
10. Run frontend and backend simultaneously.
11. View the running application.
12. Modify files from the terminal.
13. See terminal changes in Explorer/editor.
14. Collaborate with another user in real time.
15. Reconnect without losing document state.
16. Persist and reopen the workspace.
17. Use Git through the terminal.
18. Complete a real MERN CRUD application without opening VS Code.
