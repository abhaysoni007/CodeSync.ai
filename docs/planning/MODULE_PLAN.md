# MODULE PLAN — CodeSyncAI

> Decomposition into modules with a hard dependency order. Each module is **shippable and
> integrated before the next begins** — no module leaves a half-wired feature behind (we have
> enough of those already; see INVENTORY.md). The skeleton from the project brief is kept as-is;
> any deviation is justified inline. Size estimates are rough and assume one developer.

## Dependency order (why this order, not a flashier one)

```
M0 Foundation ──> M1 Collab core ──> M2 Editor shell ──> M3 Sandboxed exec ──> M4 AI assist
                                                              │                    │
                                                              └────────────────────┘  (M4 needs M3)
M5 WebRTC ── independent, slots after M4 (most self-contained, last)
M6 Deploy/observability/hardening ── continuous, formalized last
```

- **M0 first** because you cannot safely build on a repo with committed live creds, arbitrary
  RCE, no tests, and no lint. Foundation is not optional throat-clearing here — it removes active
  hazards.
- **M1 before M2** because the editor (M2) must bind to the CRDT document model; building the
  editor shell on the naive `code-update` path and re-wiring later is wasted work.
- **M3 before M4** because the AI agent runs commands and writes files; those side effects must
  land in the sandbox, not on the host.
- **M5 last** because video is the most self-contained feature and blocks nothing.
- Flashy-first (e.g. WebRTC or AI before collaboration/sandbox) is explicitly rejected: it would
  demo well and collapse under the unresolved isolation and sync problems.

---

## M0 — Foundation

**Scope:** Make the repo safe, buildable, testable, and legible before feature work.
- Rotate the leaked Atlas password and purge it from git history; delete
  `check-api-keys.js`/`clean-api-keys.js`/`debug-api-keys.js` and scrub the creds from the `.md`
  docs (RISK #0).
- **Gate/disable the unsandboxed terminal + agent `RUN_COMMAND`** until M3 lands (close the RCE
  hole immediately — a feature flag defaulting off, not a rewrite).
- Aggressive cleanup (locked decision): reduce to one deployable app (`backend` + `frontend-new`).
  Delete `video-chat-feature-extracted`, `live-cursor-feature`, `VideoChatPanel_OLD.jsx.bak`, the
  debug scripts; archive the 67 status `.md` files into `docs/legacy/`.
- **Remove dead sync scaffolding** that will fight M1: dead Yjs relay branch
  (`SocketHandlers.js:200-247`), dead Delta transport handlers, unused `useSocket.js`/
  `useDeltaSync`/`VersionHistoryPanel`, fake `RedisCache`. (Keep Yjs *persistence* for now.)
- Tooling from day one: ESLint + Prettier configs (they are declared but missing), applied to both
  packages; a minimal CI workflow (install, lint, test) on push.
- Test harness: Vitest for frontend, Vitest (or node:test) for backend, with one real smoke test
  each so the harness is proven, not just installed.
- `openspec init --tools claude`; author CLAUDE.md (also delivered here).
- **Unify the file model** to a single backend + socket-event contract (kill the second file
  backend) — this unblocks M2.

**2–3 genuinely hard problems:**
1. Git history purge of the secret without breaking collaborators' clones (filter-repo, force-push
   coordination).
2. Deciding the single file model without losing data that currently lives under two schemas.
3. Removing dead sync code without breaking the currently-working naive collaboration before M1
   replaces it (sequence the removal so `main` always runs).

**Definition of done:** creds rotated + purged; RCE path disabled behind a flag; one app builds;
`lint` and `test` pass in CI; one file model; dead sync code gone; CLAUDE.md + `openspec/` present.
Integration: the app still runs end-to-end (login → room → naive edit → terminal disabled message).

**Size:** M (mostly deletion + config; the history purge and file-model unification are the meat).

---

## M1 — Collaboration core (CRDT + live cursors + presence)

**Scope:** Replace naive full-file broadcast with real CRDT. Add `yjs` + `y-monaco` to the
frontend, bind the Monaco model to a `Y.Doc`, implement a **correct** y-protocols relay on the
backend (fix the `Y.applyUpdate` + encoder bugs, or rewrite the handler), persist via the existing
`YjsManager`. Re-express live cursors/presence on Yjs **awareness**, reusing the decoration
renderer (`ProjectRoom.jsx:362-442`) with awareness as the data source. Remove `code-update`.

**2–3 genuinely hard problems:**
1. Correct sync-protocol handling (step1/step2/update, awareness) — the current code got this
   wrong three ways; getting relay + rebroadcast + persistence consistent is the crux.
2. Migration off `code-update` without a flag-day: both must not run at once (double-apply).
3. Reconnect / offline-edit convergence and document GC as sessions churn.

**Definition of done:** two browsers editing the same file converge with no lost keystrokes under
concurrent typing; cursors/selections/presence correct via awareness; edits persist and reload
correctly; naive path deleted. Integration + a CRDT convergence test (simulated concurrent ops).

**Size:** L (correctness-critical).

---

## M2 — Editor shell

**Scope:** Productionize the editor around the CRDT core: Monaco config (language detection,
themes), file tree bound to the single file model (from M0), open-file tabs, real save/persist
(replace the `handleSaveFile` stub), project/file navigation. One coherent editor UI.

**2–3 genuinely hard problems:**
1. Binding multiple open files to multiple `Y.Doc`s with correct lifecycle (open/close/switch).
2. File-tree operations (create/rename/delete/move) staying consistent with CRDT docs and
   persistence.
3. Large-file / many-file performance in the tree and editor.

**Definition of done:** create/open/edit/save/rename/delete across a real project tree, all
persisted, all collaborative (rides M1). No stub saves. Integration + tests for file ops.

**Size:** M.

---

## M3 — Sandboxed execution (HIGHEST RISK)

**Scope:** Docker container per session (locked decision). Build a minimal language image; launch
a hardened container per run/session (non-root user, `--cap-drop=ALL`, read-only root FS with a
writable workspace mount, `--network=none` by default, CPU/memory/pids limits, no host env
inheritance); attach a PTY and stream stdout/stderr over the existing `terminal:*` socket contract
(reuse `TerminalPanel.jsx` unchanged); enforce timeouts and guaranteed teardown. Re-enable the
terminal (disabled in M0) only through this path. Remove the orphaned HTTP terminal controller.

**2–3 genuinely hard problems:**
1. **Escape prevention & resource containment** — the security-critical core (see RISK #1); needs
   an explicit threat model and a security review before it is exposed.
2. Container lifecycle at scale — cold-start latency, cleanup on disconnect/crash, orphan reaping,
   per-user quotas.
3. Stream backpressure and ordering for high-volume output without flooding the socket/UI.

**Definition of done:** arbitrary user code runs only inside a container with the limits above;
network off by default; a documented attempt to break out (fork-bomb, fill-disk, reach host env,
egress) is contained; teardown verified. Integration + security-focused tests (limit enforcement,
teardown, isolation).

**Size:** L–XL. Gate: **security review required before enabling in any shared environment.**

---

## M4 — AI vibe-coding assist

**Scope:** Build on the real Gemini path. Re-enable sensible safety settings (undo `BLOCK_NONE`);
make the agent's file writes and `RUN_COMMAND` route through the M3 sandbox and a real permission
gate (the UI exists); remove dead AI code (`generateCode` template, `createComponent/Page` stubs,
the unused `AIChat/` folder). Stream agent progress/logs to the UI.

**2–3 genuinely hard problems:**
1. Safely applying agent file edits to CRDT documents (M1/M2) without clobbering live collaborators.
2. A trustworthy permission model for destructive/exec actions (approve-before-run, scoped to the
   sandbox).
3. Cost/rate control and prompt-injection resistance for an agent that can act.

**Definition of done:** ask + agent modes work against real Gemini; every side effect is sandboxed
and permission-gated; safety re-enabled; dead AI paths removed. Integration + tests for the
permission gate and sandboxed action routing.

**Size:** M.

---

## M5 — WebRTC video/voice

**Scope:** Harden the existing mesh: add a TURN server (coturn) for NAT traversal; cap mesh
participant count and communicate the limit; fix or remove LiveKit (decide SFU-revival vs
mesh-only). Clean the LiveKit param bug if kept; delete the `.bak` and extracted prototype (done in
M0). Presence/room integration with the collaboration session.

**2–3 genuinely hard problems:**
1. NAT traversal reliability — TURN config, credentials, fallback (see RISK #2).
2. Mesh scaling ceiling vs the complexity of adopting an SFU; making the call explicitly.
3. Media/permission UX and graceful degradation (device denial, reconnect).

**Definition of done:** a call connects reliably across networks (incl. behind NAT via TURN) for
the supported participant count; the scaling decision is documented; no dead video code remains.
Integration + tests where feasible (signaling unit tests; connection is largely manual/E2E).

**Size:** M.

---

## M6 — Deploy + observability + security hardening

**Scope:** Dockerize backend + frontend; docker-compose for local (app + Mongo + coturn + sandbox
runner); CI/CD to the chosen host; real secrets management (no fallbacks); rate limiting across all
routes (not just `/auth`,`/ai`); structured logging + basic metrics/health checks; auth hardening
(re-check user in socket auth, deliver/rotate refresh tokens or drop them, cookie option); finalize
the security review actions from M3.

**2–3 genuinely hard problems:**
1. Running the Docker-based sandbox (M3) safely in the deploy target (privileged access, host
   security).
2. Secrets management that actually removes the weak fallbacks without breaking local dev.
3. Observability for a socket-heavy, container-spawning app (tracing across processes).

**Definition of done:** one-command local bring-up; automated deploy; no secret fallbacks; rate
limiting everywhere; health/metrics live; security review closed. Integration: full E2E in a
staging environment.

**Size:** M–L.

---

# Review lenses (applied before finalizing)

### (a) Frontend / UX — is the UI difficulty real and defensible?

- **Real difficulty, defensible:** collaborative Monaco with live cursors/awareness (M1/M2),
  streaming terminal UI with backpressure (M3), and multi-party video UI (M5) are all genuinely
  hard front-end problems, not CRUD skins.
- **Gaps this lens finds:** (1) the two file backends make the tree/editor UX inconsistent — must
  be resolved in M0 or the editor UX is built on sand. (2) The Save button lies today
  (`handleSaveFile` stub) — user-trust bug, fix in M2. (3) Cursor rendering exists but its data
  source changes under M1 (awareness) — plan the UI to be source-agnostic to avoid a rewrite.

### (b) Backend — isolation, scaling, data integrity

- **Isolation:** the dominant concern; M3's container model needs an explicit threat model and
  review (RISK #1). Until then M0's kill-switch is the only safe posture.
- **Scaling:** naive broadcast is O(doc)/edit (M1 fixes); WebRTC mesh is O(n²) connections (M5
  caps or SFU); single Node process + Socket.IO has no horizontal-scale story yet (defer past M6,
  note it).
- **Data integrity:** three overlapping content stores + two file backends + two API-key stores
  are the integrity risks; M0 unifies the file model, M1/M2 consolidate content history around the
  CRDT + `FileVersion`, and the plaintext `User.apiKeys` store should be dropped.
- **Gap this lens finds:** socket auth trusts the JWT without a DB re-check — a revoked/deleted
  user keeps socket access until token expiry. Fix in M6 (or earlier if cheap).

### (c) Test — strategy and what is hard to test

- **Strategy:** unit tests per module (Vitest) from M0; CRDT convergence via simulated concurrent
  ops (M1); sandbox tests assert *limits and teardown*, not happy-path only (M3); signaling unit
  tests for WebRTC with manual/E2E for actual connections (M5).
- **Hard to test:** real network NAT traversal (M5) — needs manual/staged testing or a TURN test
  rig; container escape scenarios (M3) — adversarial, needs a security review not just unit tests;
  real-time timing/races (M1) — flaky if tested naively, so test convergence at the CRDT layer,
  not the socket timing.
- **Gap this lens finds:** starting from zero tests, the risk is "test theater" — assert behavior
  that matters (convergence, isolation limits, permission gates), not line coverage.
