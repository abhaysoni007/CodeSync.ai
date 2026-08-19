# CodeSync.ai — End-to-End Version Control Audit, Repair & Playwright Test Plan

## Mission

You are working on the repository:

`https://github.com/abhaysoni007/CodeSync.ai`

The active application is under:

- `New Project/backend`
- `New Project/frontend-new`

The goal is to make **version control a real end-to-end product feature**, not just a set of unused backend endpoints.

Do not assume the current implementation is correct. First audit it, then repair it where necessary, then test it thoroughly.

---

## 1. Important findings from the current repository audit

The current repository contains a versioning implementation:

- `New Project/backend/controllers/FileVersionController.js`
- `New Project/backend/models/FileVersion.js`
- `New Project/backend/routes/files.js`

The version controller currently exposes:

- save snapshot
- list versions
- get version details
- revert to a version
- compare two versions
- delete a version

However, the active editor save path in `ProjectRoom.jsx` uses:

```js
fileAPI.updateFileContent(id, {
  path: activeFile.path,
  content: code
});
```

and `fileAPI.js` points to:

```js
/api/filesystem
```

The active filesystem controller stores the project file tree in JSON under:

```text
backend/uploads/file-structures/<projectId>.json
```

The version controller instead operates on the Mongo `File` model and expects a Mongo `File._id`.

Therefore, **do not blindly keep the existing architecture**. Verify whether the file being edited in the UI is actually represented by the Mongo `File` model. If not, unify the data model.

The existing version controller also has correctness concerns:

1. Permission comments exist, but ownership/project-membership authorization is not enforced inside the controller.
2. `saveSnapshot` reads the old content from `File.content`, which may not be the same source of truth used by the active editor.
3. `revertToVersion()` can create a "pre-revert" snapshot and then another revert version for one user action, producing confusing duplicate history.
4. `getVersionHistory()` reports `currentVersion` from the returned page rather than the actual latest version.
5. `deleteVersion()` physically deletes a version despite the comment saying "soft delete."
6. Validation middleware is present, but verify that validation errors are actually returned consistently.
7. The frontend package currently has Vitest but no Playwright dependency.
8. The repository has a version-history state/icon in `ProjectRoom`, but verify that a complete version-history UI and API integration actually exists before assuming it is functional.
9. The version system must not create history entries for every keystroke or every realtime Socket.IO update.
10. Version numbers must remain correct under concurrent saves.

Treat these findings as audit leads, not as the only possible bugs.

---

# 2. Definition of "correct version control"

For CodeSync.ai, version control means:

### Core

A user can:

- edit a file collaboratively
- save a named version
- see version history
- see who created each version
- see when each version was created
- inspect the exact content of a historical version
- compare two versions
- restore a historical version
- continue editing after restoration
- save another version after restoration

### History semantics

A version is an immutable snapshot.

Example:

```text
v1   initial code
v2   added authentication
v3   fixed validation
v4   restored v2
v5   added new feature after restoration
```

Restoring v2 must NOT erase v3.

It must create a new head version whose content equals v2.

Therefore:

```text
v4.content === v2.content
```

but:

```text
v4.versionNumber > v3.versionNumber
```

and v3 must remain readable.

### Save semantics

Saving identical content twice must not create a new version.

### Realtime semantics

Realtime collaboration updates are NOT versions.

A version should be produced only by an explicit save/version action or another clearly defined product event such as a deliberate manual checkpoint.

Do not turn every editor change into a database version.

---

# 3. Phase A — Audit before modifying code

Start by inspecting the entire repository.

Commands:

```bash
git status
git branch --show-current
git log --oneline -20
find "New Project/backend" -maxdepth 3 -type f | sort
find "New Project/frontend-new/src" -maxdepth 3 -type f | sort
```

Search for every reference to:

```text
File
FileVersion
saveSnapshot
getVersionHistory
getVersionDetails
revertToVersion
compareVersions
versions
revert
history
save
updateFileContent
filesystem
fileAPI
activeFile
projectId
```

Trace the complete path:

```text
Editor
  -> save action
  -> frontend service
  -> HTTP endpoint
  -> auth middleware
  -> controller
  -> database/storage
  -> version creation
  -> file update
  -> response
  -> UI refresh
```

Also identify the actual source of truth for project files.

Do not proceed until you can answer:

> "What exact database/document/file is the current editor editing?"

Write this answer into the implementation notes.

---

# 4. Phase B — Select ONE source of truth

Choose one architecture and use it consistently.

## Preferred architecture

Use MongoDB `File` as the canonical persistent representation of files.

Each file should have:

```text
File
- _id
- projectId
- parentId
- name
- path
- content
- language
- isDirectory
- createdBy
- lastModifiedBy
- timestamps
```

Then version history references:

```text
FileVersion
- _id
- fileId
- versionNumber
- content
- contentHash
- message
- createdBy
- createdAt
- diff
- metadata
- isAutoSave
- optional restoredFromVersion
- optional parentVersionNumber
```

If the existing JSON filesystem is required by the terminal or legacy functionality, it may remain as a **derived mirror**, but it must not become a second independent source of truth.

The safe data flow is:

```text
Editor
   |
   v
Canonical File document
   |
   +----> FileVersion snapshot
   |
   +----> filesystem mirror / terminal files
   |
   +----> Socket.IO notification
```

Do not maintain two independently editable copies.

---

# 5. Phase C — Backend implementation requirements

## 5.1 Authorization

Every version endpoint must verify:

1. the user is authenticated;
2. the target file exists;
3. the file belongs to the requested project;
4. the user has access to the project.

Do NOT authorize access merely because the caller knows a Mongo ObjectId.

Reject unauthorized access with an appropriate 403 or 404 policy.

Do the same for the underlying file read/update routes if needed.

---

## 5.2 Save version endpoint

Implement:

```http
POST /files/:fileId/versions
```

Suggested body:

```json
{
  "content": "current file content",
  "message": "Add login validation"
}
```

The backend must:

1. authenticate;
2. authorize project/file access;
3. load the canonical current file;
4. compare incoming content to canonical content;
5. calculate a stable content hash;
6. return `409` or an equivalent no-op response when content is unchanged;
7. allocate the next version safely;
8. generate a diff against the previous version/current state;
9. persist an immutable `FileVersion`;
10. update the canonical `File.content`;
11. update `lastModifiedBy`;
12. return the newly created version.

### Concurrency

Do NOT rely on:

```js
findOne().sort({versionNumber:-1})
```

followed by:

```js
latest + 1
```

without concurrency protection.

Two simultaneous saves can otherwise both create the same version number.

Use an approach that is safe under concurrent requests. Acceptable approaches include:

- transaction + unique compound index + retry;
- atomic counter per file;
- another robust atomic version allocation mechanism.

The existing unique index:

```js
{ fileId: 1, versionNumber: 1 }
```

must remain.

---

# 6. Version history endpoint

Implement:

```http
GET /files/:fileId/versions
```

Return:

```json
{
  "success": true,
  "data": {
    "versions": [],
    "currentVersion": 5,
    "pagination": {}
  }
}
```

Important:

`currentVersion` must always mean the actual latest version for the file, not merely the first version on the current page.

List items should include at least:

- version number
- message
- creator
- createdAt
- size
- diff stats
- tags

Do not return full version content for every history-list request unless explicitly requested.

---

# 7. Version details

Implement:

```http
GET /files/:fileId/versions/:versionNumber
```

Return complete immutable version information, including content.

Do not accidentally return the current file instead of the requested historical version.

---

# 8. Compare versions

Implement:

```http
GET /files/:fileId/compare/:versionA/:versionB
```

Requirements:

- same file only;
- both versions must belong to that file;
- return both version metadata;
- return diff;
- return diff statistics;
- preserve correct ordering;
- comparing a version with itself should return an empty diff / zero stats rather than an error.

---

# 9. Revert / restore semantics

Implement:

```http
POST /files/:fileId/versions/:versionNumber/restore
```

Preferred request:

```json
{
  "message": "Restore stable implementation"
}
```

Requirements:

1. Read target immutable version.
2. Verify authorization.
3. Create ONE new version representing the restore result.
4. Set the canonical file content to target content.
5. Preserve every previous version.
6. The new version must have a new monotonically increasing version number.
7. New version content hash equals target version content hash.
8. New version metadata should indicate it was restored from the target version.
9. Emit a realtime event so collaborators refresh the file.
10. The restore must be atomic.

Example:

```text
v1 A
v2 B
v3 C
restore v2
v4 B
```

NOT:

```text
v4 C snapshot
v5 B restored
```

unless the product explicitly defines that behavior. Prefer the simpler single-version restore model.

---

# 10. Delete semantics

Do not physically delete historical versions by default.

Version history is an audit trail.

Preferred behavior:

- disable delete entirely, OR
- implement explicit soft deletion with an audit field.

Do not silently violate the model comment.

If delete is retained, tests must prove:

- users cannot delete the current head;
- authorization is enforced;
- deleted versions are handled consistently;
- version numbering never reuses the deleted number.

---

# 11. Diff/hash requirements

Use a stable hash such as SHA-256.

Normalize nothing silently unless the product explicitly requires it.

These must produce different hashes:

```text
"hello"
"hello\n"
```

Diff statistics must be deterministic.

Add unit tests around:

- new file
- empty -> non-empty
- non-empty -> empty
- line insertion
- line deletion
- line replacement
- unicode
- CRLF vs LF
- identical content

---

# 12. Frontend integration

Create/repair a dedicated version-control API service, for example:

```text
src/services/versionAPI.js
```

with methods such as:

```js
saveVersion(fileId, payload)
getVersions(fileId, params)
getVersion(fileId, versionNumber)
compareVersions(fileId, versionA, versionB)
restoreVersion(fileId, versionNumber, payload)
```

Do not hide version API calls inside random components.

---

# 13. Version History UI

Integrate version control into `ProjectRoom`.

The UI should expose a clear:

```text
Version History
```

panel.

Each version row should show:

```text
v5
Add authentication
Sunidhi
2 min ago
+8 -2
```

Actions:

```text
View
Compare
Restore
```

A version detail/preview should show:

- version number
- message
- author
- date/time
- content
- diff where appropriate

Restore must ask for confirmation.

After restore:

- editor updates immediately;
- collaborators receive the updated content;
- history refreshes;
- the restored version appears as the newest version;
- the old target version remains unchanged.

---

# 14. Save UX

Separate:

### Realtime collaboration

```text
Typing -> Socket.IO/Yjs -> collaborators
```

from:

### Version save

```text
Save Version -> HTTP API -> FileVersion
```

The normal editor Save button should be clearly defined.

Do not silently create a version on every keystroke.

Recommended UI:

```text
Save
Save Version
Version History
```

At minimum, the product needs an obvious action that creates a version.

---

# 15. Realtime behavior

When a version is saved or restored:

Emit an event such as:

```text
version:created
```

Payload should contain enough information for peers to refresh safely:

```json
{
  "projectId": "...",
  "fileId": "...",
  "versionNumber": 7,
  "action": "save"
}
```

For restore:

```json
{
  "projectId": "...",
  "fileId": "...",
  "versionNumber": 8,
  "action": "restore",
  "restoredFromVersion": 3
}
```

Do not transmit full file contents unnecessarily if the existing realtime file-update mechanism already handles synchronization.

---

# 16. Error handling

Implement consistent responses for:

```text
401 unauthenticated
403 unauthorized
404 file/version not found
409 duplicate/unchanged content or version conflict
422 invalid input
500 unexpected error
```

The frontend should show meaningful toast/error states.

Avoid exposing stack traces or sensitive internal errors in production responses.

---

# 17. Tests to add before Playwright

Add backend/unit/integration tests for:

### Version creation

- creates v1
- creates v2 after content change
- identical save does not create a version
- correct creator is stored
- correct hash is stored
- correct diff is stored

### History

- newest version first
- pagination works
- currentVersion is accurate
- version details return correct immutable content

### Compare

- A vs B
- B vs A
- A vs A
- missing version

### Restore

- restores exact historical content
- creates exactly one new version
- old history remains intact
- new head is correct
- restore metadata is correct

### Authorization

- authenticated but wrong project
- authenticated but wrong file
- unauthenticated
- invalid file id
- invalid version number

### Concurrency

Create two simultaneous saves for the same file and verify:

- no duplicate version number is persisted;
- no data corruption;
- both valid versions survive, or conflict is reported cleanly;
- latest canonical file state is deterministic.

---

# 18. Playwright setup

Before running browser tests:

Check whether Playwright exists.

Commands:

```bash
npm ls @playwright/test
npx playwright --version
```

If missing, install it in the frontend project:

```bash
cd "New Project/frontend-new"
npm install -D @playwright/test
npx playwright install
```

If browser dependencies are needed on Linux:

```bash
npx playwright install --with-deps
```

Do NOT add a second unrelated test framework if Playwright is already configured.

Create/configure:

```text
playwright.config.js
tests/e2e/version-control.spec.js
```

Use environment variables for:

```text
BASE_URL
TEST_USER_EMAIL
TEST_USER_PASSWORD
```

Never hardcode real credentials.

---

# 19. Playwright test strategy

Use real browser interactions whenever practical.

Avoid testing only internal React state.

The tests must verify observable product behavior.

## Test 1 — create first version

Flow:

1. open app;
2. login;
3. open/create project;
4. open a source file;
5. enter deterministic code;
6. save version with message `"Initial stable version"`;
7. open Version History;
8. assert v1 exists;
9. assert message exists;
10. assert author is visible.

---

## Test 2 — create second version

1. edit the same file;
2. save version `"Add second change"`;
3. open history;
4. assert v2 exists;
5. assert v1 still exists;
6. assert v2 is newer.

---

## Test 3 — unchanged content

1. keep content unchanged;
2. trigger Save Version again;
3. verify no extra version appears;
4. verify an appropriate no-op message appears if the UX exposes one.

---

## Test 4 — inspect historical version

1. open history;
2. click v1;
3. verify its content is the v1 content;
4. verify current editor content has not accidentally been replaced merely by viewing it.

---

## Test 5 — compare versions

1. choose v1 and v2;
2. click Compare;
3. assert the diff UI opens;
4. assert changed content is visible;
5. assert statistics are displayed when supported.

---

## Test 6 — restore version

1. create v3 with intentionally different content;
2. restore v1;
3. confirm restoration;
4. assert the editor now contains exactly v1 content;
5. assert a new version exists;
6. assert the new version is the latest;
7. assert v2 and v3 still exist;
8. assert the new version is marked as restored.

---

## Test 7 — continue editing after restore

1. change restored content;
2. save another version;
3. assert version numbering continues monotonically;
4. assert restored version remains immutable.

---

## Test 8 — refresh persistence

After creating several versions:

1. reload browser;
2. reopen the same file;
3. open history;
4. verify all versions are still present;
5. verify current editor content equals the latest canonical file content.

---

## Test 9 — unauthorized access

Use a second test user/project.

Verify user B cannot inspect or mutate user A's file versions.

The browser test should assert the visible error behavior.

If API-level setup is easier, use Playwright's APIRequestContext for creating test fixtures, but still use browser interaction for the actual version-control experience.

---

## Test 10 — two-browser collaboration

Use two Playwright browser contexts.

### Context A
- login as user A
- open project/file

### Context B
- login as user B
- open same project/file

Then:

1. A saves a version.
2. B should observe an appropriate realtime update or be able to refresh history.
3. B restores a historical version.
4. A should receive the restored file state.
5. Both users should converge on the same content.

Do not rely on arbitrary timeouts.

Prefer:

```js
await expect(locator).toHaveText(...)
```

or event-driven waits.

---

# 20. Test selectors

Do not make tests depend heavily on fragile CSS classes.

Add stable accessibility/test selectors where useful:

```html
data-testid="version-history"
data-testid="save-version"
data-testid="version-item-1"
data-testid="restore-version-1"
data-testid="compare-version"
data-testid="version-content"
```

Prefer accessible roles and labels first.

Example:

```js
page.getByRole('button', { name: /version history/i })
```

instead of:

```js
page.locator('.some-random-css-class')
```

---

# 21. Playwright configuration

Use:

```js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: [
    {
      command: 'npm run dev -- --host 0.0.0.0',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      cwd: '.'
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5000/health',
      reuseExistingServer: !process.env.CI,
      cwd: '../backend'
    }
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
```

Adjust commands to match the actual backend scripts after inspection.

Do not break the existing dev workflow.

---

# 22. Package scripts

Add only what is necessary.

Recommended:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report"
  }
}
```

Keep existing Vitest scripts intact.

---

# 23. CI

If the repository already has CI, add version-control tests there.

At minimum:

```bash
npm test
npm run build
npx playwright test
```

Ensure the backend tests and frontend tests run in the correct working directories.

Do not put secrets into Git.

---

# 24. Safety rules for implementation

Do NOT:

- rewrite unrelated collaboration logic;
- remove existing realtime features;
- replace Monaco;
- remove Socket.IO/Yjs;
- change authentication behavior without reason;
- delete existing project data;
- migrate production data destructively;
- introduce a second competing version-control system.

Do:

- make the smallest coherent architecture change;
- preserve existing features;
- add migrations/backfill only when required;
- document any migration;
- keep version history immutable.

---

# 25. Final acceptance checklist

The task is NOT complete until all of these are true:

- [ ] Version storage and active editor storage use one canonical source of truth.
- [ ] Every version endpoint is authenticated.
- [ ] Project/file authorization is enforced.
- [ ] Saving changed content creates exactly one new version.
- [ ] Saving identical content does not create a new version.
- [ ] Version numbers are concurrency-safe.
- [ ] Version history is immutable.
- [ ] Historical version content can be viewed.
- [ ] Two versions can be compared.
- [ ] Restore creates exactly one new head version.
- [ ] Restore never deletes old versions.
- [ ] Editing after restore works.
- [ ] Realtime typing does not create versions automatically.
- [ ] Version save/restore integrates with collaboration.
- [ ] Frontend has a real Version History UI.
- [ ] Current version number is accurate.
- [ ] Delete behavior is consistent with immutable history.
- [ ] Error states are handled cleanly.
- [ ] Unit/integration tests pass.
- [ ] Playwright is installed.
- [ ] Playwright browsers are installed.
- [ ] Playwright version-control suite passes.
- [ ] Build passes.
- [ ] Lint passes where configured.
- [ ] No secrets are added.
- [ ] No unrelated features are broken.

---

# 26. Required Playwright evidence

After implementation, run:

```bash
npx playwright test
```

Then inspect failures and rerun the full suite.

Generate:

```text
playwright-report/
test-results/
```

For failed tests, preserve traces/screenshots.

The final implementation report must include:

```text
Version Control Status: PASS / FAIL

Architecture:
<one paragraph>

Backend:
<what changed>

Frontend:
<what changed>

Tests:
- Unit: PASS/FAIL
- Integration: PASS/FAIL
- Playwright: PASS/FAIL
- Build: PASS/FAIL

Playwright scenarios:
1. Create v1
2. Create v2
3. No-op identical save
4. View historical version
5. Compare
6. Restore
7. Continue editing
8. Reload persistence
9. Authorization
10. Two-browser collaboration

Known limitations:
<only if any remain>
```

Do not claim success unless the commands actually pass.

---

# 27. Execution order

Follow this exact order:

1. Audit repository.
2. Identify canonical file source of truth.
3. Map current editor save flow.
4. Fix architecture if versioning and editing use different stores.
5. Fix backend authorization.
6. Fix version creation and concurrency.
7. Fix history.
8. Fix compare.
9. Fix restore semantics.
10. Fix delete/immutability semantics.
11. Wire frontend API.
12. Build Version History UI.
13. Wire realtime version events.
14. Add unit/integration tests.
15. Install Playwright if missing.
16. Add Playwright tests.
17. Run tests.
18. Fix all failures.
19. Run tests again from a clean state.
20. Run build/lint.
21. Produce the final implementation report.

Do not stop after adding endpoints. The feature must be proven from editor -> API -> database -> history -> restore -> editor again.
