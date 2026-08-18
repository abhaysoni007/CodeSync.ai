# CodeSync IDE — Final Audit Prompt

Use this prompt after implementation is supposedly complete.

---

You have implemented features in:

`https://github.com/abhaysoni007/CodeSync.ai`

Now act as a **strict QA engineer and senior software engineer**.

Do not make assumptions.

Your job is to audit whether CodeSync actually works as a practical VS Code-like IDE for normal MERN development.

## Step 1 — Inspect

Inspect the current repository and identify:

- frontend editor
- file explorer
- filesystem APIs
- workspace/project APIs
- terminal implementation
- process management
- Socket.IO
- Yjs
- collaboration
- save flow
- filesystem watcher
- search
- formatting
- linting
- preview/ports
- Git support

## Step 2 — Compare Against Checklist

Use:

`01_IDE_MASTER_CHECKLIST.md`

For every checkbox classify:

```text
PASS
PARTIAL
FAIL
NOT IMPLEMENTED
NOT TESTED
```

Do not mark PASS merely because a function/component exists.

## Step 3 — Execute Tests

Use:

`03_TEST_PLAN.md`

Run real tests wherever possible.

Especially test:

```text
file creation
file editing
file saving
terminal commands
cd
npm install
npm run dev
long-running processes
Ctrl+C
multiple terminals
filesystem watcher
MERN CRUD
two-user collaboration
reconnection
ports
preview
Git
security/path traversal
```

## Step 4 — Find Architectural Problems

Look specifically for:

### Filesystem problems

- editor state differs from filesystem
- terminal changes not reflected in Explorer
- external file changes ignored
- race conditions
- stale file content

### Terminal problems

- shell recreated for every command
- cwd not persistent
- stdout not streamed
- stderr missing
- Ctrl+C doesn't kill child process
- dev servers terminate unexpectedly
- process cleanup missing
- process isolation missing

### Collaboration problems

- last-write-wins document replacement
- lost edits
- duplicate updates
- cursor desync
- reconnect data loss
- stale clients
- workspace authorization bugs

### Security problems

- path traversal
- arbitrary filesystem access
- unauthorized workspace access
- command execution outside workspace
- exposed environment secrets

## Step 5 — MERN Reality Test

Prove that a fresh project can do:

```text
React
+
Express
+
MongoDB
+
CRUD
+
npm
+
two dev servers
```

Do not use a prebuilt fake project as the only test.

## Step 6 — Produce Final Report

Return:

```text
CODE SYNC IDE AUDIT
===================

Overall status:
MVP readiness:

P0:
PASS:
PARTIAL:
FAIL:

P1:
PASS:
PARTIAL:
FAIL:

P2:
PASS:
PARTIAL:
FAIL:

MERN END-TO-END:
PASS / FAIL

COLLABORATION:
PASS / FAIL

TERMINAL:
PASS / FAIL

FILESYSTEM:
PASS / FAIL

SECURITY:
PASS / FAIL
```

Then provide:

### Critical Bugs

Only real blockers.

### Important Bugs

Issues that should be fixed before calling the IDE stable.

### Minor Issues

Polish/improvements.

### Missing Features

Unchecked checklist items.

### Exact Fix Plan

For each blocker:

```text
Problem:
Root cause:
Files involved:
Required change:
How to verify:
```

## Important

Do not praise the implementation unnecessarily.

Be strict.

If something is not tested, say:

`NOT TESTED`

If something only partially works, say:

`PARTIAL`

If the implementation looks correct but behavior was not verified, do NOT call it PASS.

The final question you must answer is:

> Can a developer build and run a normal MERN CRUD project entirely inside CodeSync without needing VS Code?

Answer:

```text
YES
```

or

```text
NO
```

and explain exactly why.
