## Why

The CodeSyncAI repo is not a safe base for feature work: it shipped committed live DB
credentials, arbitrary remote code execution through the terminal, zero automated tests, no
lint/format config, and five packages of which two are dead prototypes. Before building any target
capability we must remove the active hazards and make the repo buildable, testable, and legible.

## What Changes

- **BREAKING**: Disable unsandboxed code execution by default. Gate `terminal:execute`,
  `terminal:run-file`, and the AI agent's `RUN_COMMAND` behind a feature flag that is OFF unless
  explicitly enabled. (Real isolation arrives in M3; until then the RCE hole stays closed.)
- Remove the leaked-credential debug scripts and scrub the credential string from tracked docs.
  (Rotation already done out-of-band; this removes the dead string from the working tree.)
- Consolidate to one deployable app (`backend/` + `frontend-new/`). Delete
  `video-chat-feature-extracted`, `live-cursor-feature`, `VideoChatPanel_OLD.jsx.bak`, and the
  loose debug scripts; archive the ~67 status `.md` files to `docs/legacy/`.
- Remove dead real-time-sync scaffolding that will fight the M1 CRDT rebuild: the broken Yjs relay
  branch, the Delta live-transport handlers, unused frontend hooks
  (`useSocket.js`/`useDeltaSync`/`VersionHistoryPanel`), and the fake `RedisCache`. Keep the app
  running on the working naive `code-update` path until M1 replaces it.
- Add ESLint + Prettier + Vitest to both packages with one real smoke test each, and a minimal CI
  workflow (install, lint, test) on push.
- Unify the two competing file backends (`/api/filesystem/*` vs `/projects/:id/files`) into a
  single model and socket-event contract.

## Capabilities

### New Capabilities
- `execution-safety`: server refuses to run user/agent commands unless execution is explicitly
  enabled, closing the default RCE surface until M3 provides isolation.
- `dev-tooling`: lint, format, and test tooling wired into CI as a merge gate.
- `file-management`: a single authoritative file model and socket-event contract for project files.
- `repo-hygiene`: one deployable app layout; no leaked secrets, dead prototypes, or dead sync code
  in the tree.

### Modified Capabilities
<!-- None: openspec/specs/ is empty at M0, so all behavior is introduced as new capabilities. -->

## Impact

- Backend: `services/TerminalSocketHandlers.js`, `services/AgentService.js`,
  `services/SocketHandlers.js`, `services/DeltaEngine/*`, `services/RedisCache.js`, route/file
  controllers; delete `check/clean/debug-api-keys.js`.
- Frontend: `src/hooks/useSocket.js`, `useDeltaSync`, `stores/useDeltaStore.js`,
  `components/VersionHistoryPanel`, the file-explorer vs project-room file paths.
- Repo: delete two packages + `.bak`; archive `.md` docs; add ESLint/Prettier/Vitest configs and
  `.github/workflows/ci.yml`.
- Config/env: server fails fast without required secrets; `EXECUTION_ENABLED` flag introduced.
