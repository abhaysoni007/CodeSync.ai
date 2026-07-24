# GAP ANALYSIS — Target Capabilities vs Current Reality

> For each target capability: what exists to build on, what is net-new, and what in the current
> code will **actively fight** the new design. Grounded in INVENTORY.md (read it first). The
> recurring theme: several features have dependencies installed and scaffolding written, but the
> scaffolding is dead or wrong, so "there's already code for it" is usually a trap, not a head start.

Legend: 🟢 solid base · 🟡 partial/needs rework · 🔴 net-new or must-be-replaced · ⚔️ will fight the new design.

---

## 1. Monaco editor + file tree + project/file model

- 🟢 **Build on:** Monaco is really integrated (`ProjectRoom.jsx:5,784-852`); file explorer is
  backend-backed with real-time events (`useFileExplorer.js:29,317-320`); project/room/file
  schemas exist (`models/`).
- 🔴 **Net-new:** a **single** file/project model. Today there are two: `/api/filesystem/*`
  (explorer) and `/projects/:id/files` (room), with different socket events.
- ⚔️ **Fights us:** the two file backends will desync any editor bound to one of them. ProjectRoom
  even fabricates a temp file from tree-node content when no `/projects` record exists
  (`ProjectRoom.jsx:735-744`). `handleSaveFile` persists nothing (`:465-476`). Must unify to one
  model **before** binding the editor to CRDT (M2 depends on this).
- **Cost:** medium — mostly consolidation and deleting one path, not new invention.

## 2. xterm.js terminal + live log streaming

- 🟢 **Build on:** the terminal is genuinely wired end-to-end. Frontend streams
  `terminal:output/error/exit` into xterm (`TerminalPanel.jsx:60-96`); backend spawns a real
  process and pipes stdout/stderr back (`TerminalSocketHandlers.js:132-...`). The streaming
  contract already exists and works.
- 🔴 **Net-new:** the isolation boundary underneath it (see §3). The stream is fine; *what it
  streams from* must change.
- ⚔️ **Fights us:** the current handler assumes a host shell with host `cwd` and host env. The
  Docker-per-session model (M3) replaces the spawn target, so the socket handler is rewritten to
  attach to a container's PTY rather than deleted. Also the orphaned HTTP `terminalController.js`
  (disjoint session map) should be removed to avoid two terminal code paths.
- **Cost:** the streaming plumbing is cheap to keep; the isolation swap is the expensive part (M3).

## 3. Sandboxed execution backend

- 🔴 **Net-new (essentially everything).** There is **no isolation today** — execution is a direct
  host `spawn` (`TerminalSocketHandlers.js:116-126`) and `execAsync` (`AgentService.js:185-201`).
  No Docker, vm, wasm, or external runner exists (grep-confirmed).
- ⚔️ **Fights us — and is a live security hole, not just a gap:** the current unsandboxed
  execution must be **gated/disabled** the moment it is reachable, because it is arbitrary RCE for
  any authenticated user. The decision (locked) is **Docker container per session** (hardened:
  non-root, dropped caps, read-only FS, no-net default, CPU/mem/pids limits). This is the
  **HIGHEST-RISK** module.
- **Cost:** high — new infra (Docker daemon access, image build, lifecycle mgmt, resource limits,
  PTY attach, backpressure), plus a security review. See RISK #1.

## 4. CRDT real-time collaboration + live cursors + presence

- 🟡 **Build on (thin):** the CRDT *dependencies* are installed backend-side (yjs, y-protocols,
  lib0, pako) and Yjs *persistence* works (`YjsManager.js:67-187`). Live cursors/presence in the
  main app work today over the naive path (`ProjectRoom.jsx:148-192,362-442`).
- 🔴 **Net-new:** an actually-working CRDT transport. The live relay is dead
  (`SocketHandlers.js:225,227`), `yjs`/`y-monaco` are **not** in the frontend deps, and the
  editor binds to nothing CRDT.
- ⚔️ **Fights us (the big one):** the app currently *works* on naive full-file broadcast
  (`code-update`, `SocketHandlers.js:613-622`). That path, plus the dead Yjs relay, the dead
  Delta transport, the unused `useSocket.js`/`useDeltaSync` hooks, and the fake `RedisCache`, are
  all **liabilities to remove**, not a base to evolve. Keeping them means two sync systems racing.
  **M1 is effectively a net-new CRDT build** (Yjs + y-monaco on the frontend, a correct
  y-protocols relay on the backend, awareness-based cursors) that *replaces* `code-update`.
- **Migration honesty:** "we already have Yjs" is false comfort. The realistic cost is a from-
  scratch CRDT integration plus deletion of three dead sync mechanisms. Cursors/presence can be
  re-expressed on Yjs **awareness**, reusing the existing decoration-rendering code
  (`ProjectRoom.jsx:362-442`) but changing its data source.
- **Cost:** high (correctness-critical). See RISK #3.

## 5. AI "vibe coding" assist

- 🟢 **Build on:** real Gemini integration (`AIProviderService.js:15-74`), ask + agent flows
  (`AIController.js:9-160`, `AgentService.js`), user-supplied encrypted keys (good design), a
  permission-modal UI (`components/AIInterface/`).
- 🔴 **Net-new:** safe execution of agent actions. The agent can create/edit/delete files and run
  commands — those must route through the M3 sandbox and a real permission gate.
- ⚔️ **Fights us:** all Gemini safety categories are `BLOCK_NONE` (`AIProviderService.js:37-54`);
  `AgentController.generateCode` returns hardcoded template code ignoring the AI
  (`:58-183`); `createComponent/createPage` are stubs (`:434-462`); a second unused AI UI folder
  (`components/AIChat/`) exists. Clean these up so the real path (`AIInterface/` + `AgentService`)
  is the only one.
- **Cost:** medium — the hard part is gating agent side effects behind M3, not the LLM call.
- **Dependency note:** M4 depends on M3 (agent `RUN_COMMAND`/file writes must be sandboxed).

## 6. WebRTC video/voice discussion

- 🟢 **Build on:** a working full-mesh implementation exists (frontend `VideoChatPanel.jsx:185-576`,
  backend signaling relay `SocketHandlers.js:927-981`). This is the most self-contained feature.
- 🔴 **Net-new:** a TURN relay (none exists — `turn:` grep = 0 hits) and a scaling decision
  (mesh-with-participant-cap vs revive LiveKit SFU).
- ⚔️ **Fights us (mildly):** LiveKit server code exists but is dead and **broken** (`:id` vs
  `req.params.roomId`, `CallSessionController.js:11`), with only an unused frontend stub and no
  `livekit-client` dep. Either fix+adopt LiveKit (SFU, scales) or delete it and harden mesh with a
  cap. Also `VideoChatPanel_OLD.jsx.bak` and the entire `video-chat-feature-extracted` package are
  redundant copies to delete. LiveKit dev-cred fallback is a security smell.
- **Cost:** medium; genuinely last because it does not block other modules. See RISK #2.

---

## Cross-cutting gaps (fold into M0/M6)

| Gap | Reality | Where it lands |
|-----|---------|----------------|
| Tests | none | M0 harness, then per-module |
| Lint/format | declared, not configured | M0 |
| CI | none | M0 (minimal), M6 (full CD) |
| Secrets mgmt | live creds committed; weak default fallbacks | M0 (rotate/purge), M6 (hardening) |
| Deploy config | none committed | M6 |
| Repo hygiene | 5 packages, 67 md docs, .bak, debug scripts | M0 (aggressive cleanup) |
| Rate limiting | only `/auth`, `/ai`, `/ai/agent` | M6 |

## Summary: where "existing code" helps vs hurts

- **Genuine head starts:** Monaco integration, the xterm streaming contract, the WebRTC mesh, the
  Gemini AI path, and Yjs *persistence*. Reuse these.
- **Traps (dead/wrong code that looks like a head start):** Yjs live relay, Delta live transport,
  the frontend Yjs/Delta hooks, `RedisCache`, LiveKit endpoints, the second file backend, the
  duplicate AI UI, and the two prototype packages. **Removing these is part of the work**, and
  M1's CRDT build must not try to "fix" the dead relay in place — it should replace it.
