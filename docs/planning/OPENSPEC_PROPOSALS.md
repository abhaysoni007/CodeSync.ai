# OPENSPEC PROPOSALS — Draft Change Proposals (one per module)

> These are **drafts**, not implemented. They follow the real OpenSpec `spec-driven` schema
> discovered in this repo's toolchain: each change lives at
> `openspec/changes/<change-name>/` with a `proposal.md` (Why / What Changes / Capabilities /
> Impact), a `tasks.md` (numbered task groups), and one `specs/<capability>/spec.md` delta per
> capability using `## ADDED Requirements → ### Requirement → #### Scenario (WHEN/THEN)`.
>
> **Workflow to create them later (after `openspec init --tools claude` in M0):**
> `openspec new change <change-name>` → fill the artifacts → `openspec validate <change-name>`
> → implement tasks → `openspec archive <change-name>`. Do **not** create them now; M0 runs
> `init` first. Each proposal below is scoped to its module in MODULE_PLAN.md.

---

## Change: `m0-foundation-hardening`

**proposal.md**
- **Why:** The repo ships with committed live DB credentials, arbitrary RCE via the terminal, no
  tests, no lint config, and five packages of which two are dead prototypes. Feature work cannot
  safely start on this base.
- **What Changes:** Rotate + purge the leaked secret; disable unsandboxed execution behind a flag;
  consolidate to one app; delete dead sync scaffolding and prototype packages; add ESLint +
  Prettier + Vitest + minimal CI; unify the file model to one backend/event contract; add
  CLAUDE.md; `openspec init`.
- **Capabilities → New:** `dev-tooling` (lint/format/test/CI), `repo-hygiene` (single-app layout).
  **Modified:** `code-execution` (temporarily gated off), `file-management` (unified to one model),
  `realtime-sync` (dead Yjs/Delta paths removed).
- **Impact:** `backend/*` (delete debug scripts, remove dead handlers), `frontend-new/*` (remove
  dead hooks), root layout, git history.

**specs/dev-tooling/spec.md (delta excerpt)**
```
## ADDED Requirements
### Requirement: Continuous integration gate
The project SHALL run lint and tests on every push and block merge on failure.
#### Scenario: A push with a lint error
- WHEN a commit is pushed that violates the ESLint config
- THEN CI fails and the branch is not mergeable until fixed
```

**tasks.md (outline)**
```
## 1. Secret remediation
- [ ] 1.1 Rotate Atlas password; update deployment secret store
- [ ] 1.2 Purge creds from git history (filter-repo) and force-push; delete debug scripts
## 2. Safety gate
- [ ] 2.1 Feature-flag terminal:execute / run-file OFF by default
- [ ] 2.2 Gate agent RUN_COMMAND behind the same flag
## 3. Cleanup + tooling
- [ ] 3.1 Delete prototype packages, .bak, archive .md docs to docs/legacy/
- [ ] 3.2 Remove dead Yjs/Delta transport code
- [ ] 3.3 Add ESLint + Prettier + Vitest configs; one smoke test per package; CI workflow
- [ ] 3.4 Unify file model; add CLAUDE.md; openspec init
```

---

## Change: `m1-crdt-collaboration`

**proposal.md**
- **Why:** Real-time collaboration currently rides on naive full-file broadcast (O(doc)/edit,
  last-writer-wins); the Yjs relay is dead code. Concurrent editing loses work.
- **What Changes:** Implement true CRDT sync with Yjs + y-monaco (frontend) and a correct
  y-protocols relay (backend); re-express cursors/presence on Yjs awareness; remove `code-update`.
- **Capabilities → New:** `crdt-sync`, `presence-awareness`. **Modified:** `realtime-sync` (naive
  broadcast removed).
- **Impact:** `frontend-new` (add yjs/y-monaco, bind Monaco), `backend/services/SocketHandlers.js`
  + `YjsManager.js` (correct relay + persistence).

**specs/crdt-sync/spec.md (delta excerpt)**
```
## ADDED Requirements
### Requirement: Convergent concurrent editing
Concurrent edits from multiple clients SHALL converge to an identical document with no lost input.
#### Scenario: Two users type simultaneously
- WHEN user A and user B insert text at different positions at the same time
- THEN both clients converge to a document containing both insertions
```

**tasks.md (outline)**
```
## 1. Frontend CRDT
- [ ] 1.1 Add yjs + y-monaco; bind editor model to a Y.Doc per file
## 2. Backend relay
- [ ] 2.1 Fix/rewrite the sync handler (Y.applyUpdate, correct rebroadcast encoder)
- [ ] 2.2 Awareness relay for cursors/presence
- [ ] 2.3 Persist via YjsManager; verify reload
## 3. Migration
- [ ] 3.1 Remove code-update path (no dual-run)
- [ ] 3.2 CRDT convergence test (simulated concurrent ops)
```

---

## Change: `m2-editor-shell`

**proposal.md**
- **Why:** The editor needs a coherent shell over the CRDT core: real save (today a no-op stub),
  file tabs, and a tree bound to the single file model.
- **What Changes:** Monaco config + tabs + navigation; file-tree CRUD consistent with CRDT docs;
  real persistence replacing `handleSaveFile`.
- **Capabilities → New:** `editor-shell`, `file-tree`. **Modified:** `file-management`.
- **Impact:** `frontend-new/src/{pages,components,hooks}`, file persistence endpoints.

**specs/editor-shell/spec.md (delta excerpt)**
```
## ADDED Requirements
### Requirement: Durable file save
Saving a file SHALL persist its content and reflect it on reload for all collaborators.
#### Scenario: Save then reload
- WHEN a user edits a file and triggers save
- THEN reopening the file (any user) shows the saved content
```

**tasks.md (outline)**
```
## 1. Editor
- [ ] 1.1 Multi-file tabs bound to per-file Y.Docs with lifecycle
## 2. File tree
- [ ] 2.1 Create/rename/delete/move consistent with CRDT + persistence
- [ ] 2.2 Replace handleSaveFile stub with real persistence
## 3. Tests
- [ ] 3.1 File-ops integration tests
```

---

## Change: `m3-sandboxed-execution`

**proposal.md**
- **Why:** Code execution is unsandboxed host shell-out — arbitrary RCE for any logged-in user.
- **What Changes:** Run all user code in a hardened Docker container per session (non-root,
  cap-drop, read-only FS, no-net default, CPU/mem/pids limits, no host env), streamed over the
  existing `terminal:*` contract; re-enable the terminal (M0-gated) only through this path.
- **Capabilities → New:** `sandboxed-execution`. **Modified:** `code-execution`,
  `terminal-streaming`.
- **Impact:** `backend/services/TerminalSocketHandlers.js` (attach to container PTY), new
  container-lifecycle service, Docker image; removal of orphaned `terminalController.js`.

**specs/sandboxed-execution/spec.md (delta excerpt)**
```
## ADDED Requirements
### Requirement: Contained execution
User code SHALL execute only inside a resource-limited, network-isolated container and SHALL NOT
access the host filesystem, host environment, or network by default.
#### Scenario: Malicious egress attempt
- WHEN executed code attempts an outbound network connection
- THEN the connection fails because the container has no network by default
### Requirement: Guaranteed teardown
Every execution container SHALL be destroyed on completion, timeout, or client disconnect.
#### Scenario: Client disconnects mid-run
- WHEN the client socket disconnects during execution
- THEN the container is killed and reaped within the teardown window
```

**tasks.md (outline)**
```
## 1. Threat model + review gate
- [ ] 1.1 Document threat model; schedule security review before enabling
## 2. Container runtime
- [ ] 2.1 Build language image; launch hardened container per session
- [ ] 2.2 Attach PTY; stream over terminal:* ; timeouts + teardown/reaping
- [ ] 2.3 Per-user quotas / limits
## 3. Tests
- [ ] 3.1 Assert limit enforcement, isolation, teardown (adversarial)
```

---

## Change: `m4-ai-assist`

**proposal.md**
- **Why:** The AI agent can write files and run commands with no sandbox and safety disabled
  (`BLOCK_NONE`); dead AI code paths confuse the surface.
- **What Changes:** Route agent side effects through the M3 sandbox + a real permission gate;
  re-enable safety settings; remove dead AI code (`generateCode` template, stubs, `AIChat/`).
- **Capabilities → New:** `ai-agent-actions`. **Modified:** `ai-assist`.
- **Impact:** `backend/controllers/AgentController.js`, `services/AgentService.js`,
  `AIProviderService.js`; `frontend-new/src/components/AIInterface`.

**specs/ai-agent-actions/spec.md (delta excerpt)**
```
## ADDED Requirements
### Requirement: Sandboxed, gated agent actions
Agent file writes and command execution SHALL run only in the M3 sandbox and SHALL require
explicit user approval before executing destructive or exec actions.
#### Scenario: Agent proposes a shell command
- WHEN the agent plans a RUN_COMMAND action
- THEN the user is prompted to approve, and on approval it runs inside the sandbox, not the host
```

**tasks.md (outline)**
```
## 1. Safety + cleanup
- [ ] 1.1 Re-enable Gemini safety settings; remove dead AI paths
## 2. Gated actions
- [ ] 2.1 Route file writes/RUN_COMMAND through M3 sandbox + permission gate
- [ ] 2.2 Apply agent edits to CRDT docs without clobbering collaborators
## 3. Tests
- [ ] 3.1 Permission-gate + sandboxed-action tests
```

---

## Change: `m5-webrtc-video`

**proposal.md**
- **Why:** Video is mesh-only with no TURN (fails behind symmetric NAT, no scale story); LiveKit
  code is dead and broken.
- **What Changes:** Add a TURN server; cap mesh participants; decide LiveKit-SFU revival vs
  mesh-only and act on it; fix/remove the LiveKit param bug.
- **Capabilities → New:** `video-turn`. **Modified:** `video-call`.
- **Impact:** `frontend-new/src/components/VideoChatPanel.jsx`,
  `backend/services/SocketHandlers.js` (signaling), coturn deployment, LiveKit decision.

**specs/video-turn/spec.md (delta excerpt)**
```
## ADDED Requirements
### Requirement: NAT traversal via relay
Calls SHALL connect for peers behind symmetric NAT by falling back to a TURN relay.
#### Scenario: Two peers behind strict NAT
- WHEN direct/STUN connection fails between two peers
- THEN media is relayed via TURN and the call still connects
```

**tasks.md (outline)**
```
## 1. TURN
- [ ] 1.1 Deploy coturn; configure ICE servers with credentials
## 2. Scaling decision
- [ ] 2.1 Cap mesh participants OR revive LiveKit SFU (fix :id/roomId bug)
## 3. Tests
- [ ] 3.1 Signaling unit tests; manual/E2E cross-network connection
```

---

## Change: `m6-deploy-hardening`

**proposal.md**
- **Why:** No deploy config, no observability, weak secret fallbacks, partial rate limiting.
- **What Changes:** Dockerize app; docker-compose (app + Mongo + coturn + sandbox runner); CI/CD;
  real secrets management (remove fallbacks); rate limiting on all routes; logging/metrics/health;
  socket auth DB re-check; refresh-token decision.
- **Capabilities → New:** `deployment`, `observability`. **Modified:** `auth`, `rate-limiting`,
  `secrets-management`.
- **Impact:** repo root (Docker/compose/CI), `backend/{middleware,utils,services}`.

**specs/deployment/spec.md (delta excerpt)**
```
## ADDED Requirements
### Requirement: Reproducible deployment
The system SHALL build and deploy from committed configuration with no secret hardcoded fallbacks.
#### Scenario: Missing JWT secret at boot
- WHEN JWT_SECRET is not provided
- THEN the server refuses to start (no insecure default) rather than using a hardcoded key
```

**tasks.md (outline)**
```
## 1. Packaging
- [ ] 1.1 Dockerfiles + docker-compose; CI/CD pipeline
## 2. Security
- [ ] 2.1 Remove secret fallbacks; secrets manager; rate limit all routes; socket auth DB re-check
## 3. Observability
- [ ] 3.1 Structured logging, metrics, health checks; staging E2E
```
