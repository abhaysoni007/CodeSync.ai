## 1. Security gate (RISK #0 / #1 / #5)

- [x] 1.1 Confirm Atlas password rotated out-of-band (done) and new URI lives only in `backend/.env`
- [x] 1.2 Make server fail-fast when `MONGODB_URI` or `JWT_SECRET` is missing (remove hardcoded fallbacks) — `config/env.js`, wired in `server.js`, jwt.js reads secret at call-time
- [x] 1.3 Provide scoped git-history purge command for the dead leaked string (operator runs it) — see summary; creds already dead post-rotation

## 2. Execution kill-switch (RCE)

- [x] 2.1 Write failing test: execution disabled → no spawn + disabled notice (`config/execution.test.js`, watched RED)
- [x] 2.2 Add `EXECUTION_ENABLED` flag (default false) + one guard helper (`config/execution.js`)
- [x] 2.3 Guard `terminal:execute`, `terminal:run-file`, and agent `RUN_COMMAND`; tests green (6/6)

## 3. Aggressive cleanup

- [x] 3.1 Delete `check/clean/debug-api-keys.js`; redact the string from the 3 archived `.md` (ripgrep: 0 matches remain)
- [x] 3.2 Delete `video-chat-feature-extracted/`, `live-cursor-feature/`, `VideoChatPanel_OLD.jsx.bak`
- [x] 3.3 Archive the 67 status `.md` files to `docs/legacy/`

## 4. Remove dead sync scaffolding (keep naive path working)

- [x] 4.1 Remove live-wired Delta transport (route + `services/DeltaEngine/` + 4 wiring points). NOTE: the Yjs relay branch is KEPT (it belongs to the CRDT/persistence path M1 rebuilds, not Delta).
- [x] 4.2 Remove fake `RedisCache` (inside DeltaEngine) + unused frontend `useSocket.js`, `useDeltaSync`, `useDeltaStore`, `DeltaEngine/` components
- [x] 4.3 Verify app still works: frontend builds (exit 0), backend boots on the new cluster; naive `code-update` path untouched

## 5. Tooling + CI

- [x] 5.1 ESLint config both packages; lint passes (fixed one real `no-undef` bug in `terminalController.js:298`)
- [x] 5.2 Shared Prettier config (`.prettierrc.json` + `.prettierignore`)
- [x] 5.3 Vitest both packages with real tests (backend 6, frontend 3)
- [x] 5.4 `.github/workflows/ci.yml` (install, lint, test, build) — fails on lint/test failure

## 6. Unify file backends — IMPLEMENTED, pending live click-test

- [x] 6.1 TDD `fileIdentity.js` (`fileIdFromPath`, `makeActiveFile`) — RED→GREEN, 4 tests; single id = joined tree path
- [x] 6.2 `ProjectRoom` rewired: `openFile` fetches content via `fileAPI.getFileContent(id, path)`; save via `fileAPI.updateFileContent` + `filesystem:file-updated` emit; deleted `files` state, `loadFiles`, `handleCreateFile/DeleteFile/FileClick`, fabricated temp-file hack; `onFileSelect={openFile}`
- [x] 6.3 Removed `GET /projects/:id/files` (demo route) + old `file-created/deleted/renamed` handlers + dead `api.getFiles/createFile/getFile/updateFile/deleteFile`; ported `logAndBroadcastActivity` into `filesystem:created/renamed/deleted`; added `authenticate` middleware to `routes/filesystem.js` (previously unauthenticated)

## 7. Definition of done

- [x] 7.1 Backend boots end-to-end (env assertion → Atlas connect → routes mounted → listening); terminal execution now returns the disabled notice
- [x] 7.2 `lint` and `test` green locally (CI configured to enforce)
- [x] 7.3 `openspec validate m0-foundation-hardening` passes; root `CLAUDE.md` status updated
- [ ] 7.4 Full file-lifecycle click-through in the running app (open/save/create/delete/rename) — awaiting user confirmation
