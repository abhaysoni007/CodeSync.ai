## Context

M0 hardens an existing prototype. The tricky parts are not the individual edits but their
sequencing: the app must keep running on its working naive-sync path while we delete the dead
code around it, and we must close the RCE hole without ripping out the terminal UI (M3 will attach
it to a sandbox). Verified current state lives in `docs/planning/INVENTORY.md`.

## Key decisions

### 1. Execution kill-switch via a single flag

Introduce `EXECUTION_ENABLED` (default `false`). One guard helper, checked at the entry of every
execution path, so the check lives in one place rather than being duplicated per handler
(ponytail: root-cause guard, not per-caller patches):

- `services/TerminalSocketHandlers.js` — `terminal:execute`, `terminal:run-file`
- `services/AgentService.js` — `RUN_COMMAND` action

When disabled, the handler emits a clear "execution disabled" message to the client rather than
spawning anything. Rationale: reversible, demonstrable, and it leaves the terminal UI intact for
M3 to re-enable through the sandbox.

### 2. Fail-fast on required secrets

The server refuses to boot if `MONGODB_URI` or `JWT_SECRET` is missing, instead of using the
current hardcoded fallbacks (`jwt.js:7`). Rationale: a hardcoded default secret is a forgeable-token
risk (RISK #5); failing fast surfaces misconfiguration immediately in dev and deploy.

### 3. Deletion sequencing (keep main green)

Order matters so the app runs at every commit:
1. Delete leaf dead code with no live importers first (prototype packages, `.bak`, debug scripts,
   fake `RedisCache` once unreferenced).
2. Remove dead sync branches (Yjs relay case, Delta transport handlers) — verify no live caller
   depends on them; the naive `code-update` path stays untouched.
3. Remove unused frontend hooks (`useSocket.js`, `useDeltaSync`, `VersionHistoryPanel`,
   `useDeltaStore`) after confirming `ProjectRoom.jsx` does not import them.

### 4. File-model unification

Two backends exist: `/api/filesystem/*` (`filesystem:*` events, backend-backed tree, used by
`FileExplorer`) and `/projects/:id/files` (`file-*` events, used by `ProjectRoom`). Keep
`/api/filesystem/*` as the single source of truth (it is the more complete, tree-aware, real-time
one — `useFileExplorer.js`) and route `ProjectRoom`'s file operations through it, retiring the
`/projects/:id/files` path and the `file-*` events. Rationale: reuse the more capable existing
implementation instead of rewriting; one event contract removes the desync class of bugs.

## Testing approach

- TDD for behavior changes: the execution guard (disabled → no spawn, emits disabled event) and
  the unified file API (one contract) get failing tests first.
- Deletions and config files are not TDD-driven (dead-code removal has no behavior; config is a
  skill-noted exception), but the smoke tests + CI prove the app still boots and the suite runs.

## Risks / trade-offs

- Retiring `/projects/:id/files` may touch several `ProjectRoom.jsx` call sites; mitigate by
  changing the data source behind the same UI, not the UI.
- History purge of the (now-dead) leaked secret is intentionally out of scope here because the git
  root is the user's home directory; it is handled as a separate, explicit operation.
