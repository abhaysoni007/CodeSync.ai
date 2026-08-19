# CodeSync IDE — Implementation Prompt

Copy this prompt into your coding agent when implementing the checklist.

---

## Prompt

You are working on my GitHub repository:

`https://github.com/abhaysoni007/CodeSync.ai`

The repository contains my real-time collaborative browser-based development environment, CodeSync.ai.

The relevant application is currently organized around:

- `New Project/backend`
- `New Project/frontend-new`

The backend already contains collaboration/terminal-related services including Socket handlers, Yjs management, and terminal socket handling. Do not blindly replace these systems. Inspect the existing implementation first and extend/fix it where appropriate.

## Objective

Turn CodeSync into a practical VS Code-like browser IDE that can normally develop and run a MERN stack project end-to-end.

Do NOT attempt to clone all of VS Code.

The target is:

> A developer should be able to create, edit, save, run, test basic CRUD functionality, collaborate, and persist a normal MERN project without needing VS Code for basic development work.

---

# Mandatory Implementation Rules

### 1. Inspect before changing

Before writing code:

- Inspect the frontend architecture.
- Inspect backend architecture.
- Inspect existing editor implementation.
- Inspect Explorer/file APIs.
- Inspect Yjs collaboration.
- Inspect Socket.IO/socket handling.
- Inspect terminal implementation.
- Inspect filesystem/project management.
- Inspect existing tests.
- Inspect package.json files.
- Identify what already works.
- Identify partial implementations.
- Identify missing functionality.
- Do not duplicate existing functionality.

Create an internal implementation map before making changes.

### 2. Preserve working functionality

Do not rewrite working collaboration, terminal, or project-management systems merely to make the code look cleaner.

Prefer:

```text
existing implementation
        ↓
understand
        ↓
extend
        ↓
test
```

over:

```text
delete existing
        ↓
rewrite everything
```

### 3. Real filesystem must matter

The editor, terminal, Explorer, and collaboration system must converge on the same workspace state.

Do not create a fake IDE where files only exist in frontend state.

### 4. Terminal must be a real persistent shell

It must support:

- commands
- `cd`
- cwd persistence
- stdout
- stderr
- exit codes
- Ctrl+C
- long-running processes
- multiple terminals
- npm commands
- dev servers

`npm run dev` must remain alive until terminated.

### 5. Collaboration must not use last-write-wins document replacement

Use the existing Yjs/collaboration architecture where appropriate.

Simultaneous edits must merge safely.

### 6. Security

Never allow arbitrary filesystem access outside the authorized workspace.

Prevent path traversal such as:

```text
../../etc/passwd
```

Validate all filesystem operations server-side.

Terminal processes must be scoped to the correct workspace/user/session.

Do not expose server secrets to the browser.

---

# Implementation Order

Implement in this order unless repository inspection shows a strong reason otherwise.

## Phase 1 — Workspace/File System

Implement and verify:

- project creation
- project opening
- Explorer
- create file
- create folder
- rename
- delete
- move
- refresh
- filesystem watcher
- editor/file synchronization
- project persistence

## Phase 2 — Editor

Implement/fix:

- file opening
- tabs
- editing
- save
- autosave
- unsaved state
- syntax highlighting
- undo/redo
- find/replace
- code folding
- formatting
- keyboard shortcuts

## Phase 3 — Terminal

Implement/fix:

- persistent shell
- cwd
- streaming output
- stderr
- command history
- Ctrl+C
- multiple terminals
- long-running processes
- process cleanup
- workspace isolation

## Phase 4 — MERN Workflow

Prove:

```bash
npm install
npm run dev
npm start
node
npx
```

and verify:

- React frontend
- Express backend
- MongoDB connection
- environment variables
- CRUD
- two simultaneous dev servers

## Phase 5 — Collaboration

Implement/fix:

- shared file content
- simultaneous editing
- cursors
- selections
- presence
- connection status
- reconnection
- permissions

## Phase 6 — Developer Experience

Implement:

- search across files
- command palette
- problems panel
- ESLint
- Prettier
- port detection
- web preview
- useful keyboard shortcuts

## Phase 7 — Git

First ensure Git works completely through terminal.

Then add:

- Source Control panel
- changes
- staging
- commit
- diff
- push/pull

---

# Do Not Implement Yet

Do not spend time on:

- full extension marketplace
- full VS Code extension API
- advanced debugger
- Docker UI
- Kubernetes
- SSH remote development
- complete TypeScript language server
- advanced refactoring engine
- complete browser DevTools clone
- complex database GUI
- hundreds of VS Code settings

Only implement these after the core MERN workflow is stable.

---

# Required Engineering Behavior

For every feature:

1. Inspect existing code.
2. Identify exact files involved.
3. Implement the smallest clean change.
4. Reuse existing services/components.
5. Add validation and error handling.
6. Test the happy path.
7. Test failure cases.
8. Test reload/reconnect where relevant.
9. Test with two collaborative users where relevant.
10. Update the checklist only after verification.

Do not mark a checkbox simply because code was written.

A feature is complete only after it has been tested.

---

# Required Final Output After Implementation

At the end, provide:

## 1. Changed files

List every important file changed.

## 2. Implemented features

List features that are actually working.

## 3. Partial features

List anything that works only partially.

## 4. Remaining features

List every unchecked item from the master checklist.

## 5. Test results

For every tested feature report:

```text
Feature:
Test:
Expected:
Actual:
Result: PASS / FAIL
```

## 6. Known issues

List real bugs or limitations.

## 7. Manual test instructions

Give exact commands and steps for me to reproduce the important tests locally.

---

# Important

Do not say:

> "Implemented successfully"

unless you actually tested the behavior.

The goal is a functioning browser IDE, not just a visually similar interface.
