# CLAUDE.md — CodeSyncAI Build Context

> Persistent context for every build session. Re-ground from THIS file instead of relying on long
> conversation history. Update the "Current status" section at the end of each module.

## Project thesis

CodeSyncAI is a browser-based collaborative IDE with sandboxed code execution: a Monaco editor,
an xterm.js terminal with live log streaming, real-time CRDT collaboration with live multi-user
cursors + presence, an AI "vibe coding" assist, and WebRTC video/voice — production-grade and
deployable. We are evolving an existing MERN prototype, not starting fresh; a big part of the work
is **removing dead/half-wired code** (see `docs/planning/INVENTORY.md`) so features are real, not
decorative.

## Stack

- **Backend:** Node.js (ESM), Express 4, Socket.IO 4, MongoDB + Mongoose 7, JWT + bcrypt auth.
- **Frontend:** Vite 5, React 18, `@monaco-editor/react`, xterm, zustand, socket.io-client, axios.
- **Feature libs:** Yjs (CRDT), Docker (sandbox, M3), `@google/generative-ai` (AI), WebRTC mesh +
  coturn (video, M5).
- **One deployable app** = `backend/` + `frontend-new/`. Everything else was deleted in M0.

## Module order (build one, ship+integrate+test, then next — never in parallel)

`docs/planning/MODULE_PLAN.md` is the source of truth. Summary:

- **M0 Foundation** — safety + tooling + cleanup (secret purge, RCE kill-switch, lint/format/test/
  CI, single file model, remove dead sync code, `openspec init`, this file).
- **M1 Collaboration core** — real CRDT (Yjs + y-monaco + correct relay) + awareness cursors;
  remove naive `code-update`.
- **M2 Editor shell** — Monaco + file tree + real save, bound to CRDT docs.
- **M3 Sandboxed execution (HIGHEST RISK)** — Docker per session; re-enable terminal only here.
- **M4 AI assist** — sandbox + permission-gate agent actions; re-enable AI safety.
- **M5 WebRTC video/voice** — add TURN; decide mesh-cap vs LiveKit SFU.
- **M6 Deploy + observability + security hardening.**

Dependency rules: M2 needs M1; M4 needs M3; M5 is independent (last). Do **not** reorder to do
flashy features first.

## Conventions (non-negotiable — enforced from M0)

- **Readable code first.** Write as if a fellow student must understand it cold: clear names,
  small single-purpose functions, no clever one-liners that hurt readability.
- **Comments explain WHY** (intent, tradeoffs, non-obvious decisions), not WHAT the line does.
- **Simple, self-explanatory repo structure.** A newcomer navigates without a guide. Keep the
  README's setup / architecture / folder-map current.
- **Lint + format from M0.** ESLint + Prettier configured and passing in CI; no un-linted merges.
- **No half-wired features.** A feature is either working + tested + integrated, or not merged.
  Delete dead code; do not accumulate it (that is the mistake we are undoing).

### API structure (required — not one monolithic file)

- **One central registry: `endpoints.js`** — a single readable manifest of the entire API surface:
  every route's method, path, and a reference to its handler, in one place, understandable at a
  glance.
- **Handlers live in thin, domain-split route modules** (e.g. `routes/collab`, `routes/exec`,
  `routes/ai`, `routes/webrtc`). `endpoints.js` wires them together.
- Rationale: one-glance visibility **and** modular structure. (Note: the current backend mounts
  routes ad hoc in `server.js:105-115` with double-mounts; migrate to the registry pattern.)

## Skills & tools policy

- **caveman** — token-saver. Use ONLY for verbose progress logs / status output. Architecture,
  specs, risks, and the module plan stay in plain, human-readable English.
- **ponytail** — laziness/minimalism discipline for code: climb the ladder (does it need to exist?
  → reuse what's here → stdlib → native → one line → minimal code). Reuse before rewriting.
- **OpenSpec** — spec-driven workflow. Per change: `openspec new change <name>` → fill
  `proposal.md` / `tasks.md` / `specs/<capability>/spec.md` → `openspec validate <name>` →
  implement → `openspec archive <name>`. Draft proposals live in `docs/planning/OPENSPEC_PROPOSALS.md`.
- Verify a skill is actually installed before invoking it; do not assume by name.

## Anti-hallucination rule

Every claim about the code cites a real file path that was read. If unverified, say **UNVERIFIED**.
Distinguish working code from stubs/dead code/TODOs. The `docs/planning/` audit was built this way;
keep that discipline.

## Planning docs (read before building)

- `docs/planning/INVENTORY.md` — verified current state.
- `docs/planning/GAP_ANALYSIS.md` — build-on vs net-new vs what fights the new design.
- `docs/planning/MODULE_PLAN.md` — modules, hard problems, definitions of done, review lenses.
- `docs/planning/OPENSPEC_PROPOSALS.md` — draft change proposals per module.
- `docs/planning/RISK_REGISTER.md` — ranked risks + mitigations.

---

## Current status

- **Current module:** M0 — Foundation (substantially complete; one item carved out).
- **Done in M0:**
  - Atlas password rotated (new cluster); working tree scrubbed of the leaked URI (0 matches).
  - RCE closed by default: `EXECUTION_ENABLED` flag (off) gates `terminal:execute`,
    `terminal:run-file`, and agent `RUN_COMMAND` via `config/execution.js` (TDD, 6 tests).
  - Fail-fast on missing `MONGODB_URI`/`JWT_SECRET` (`config/env.js`); jwt.js reads the secret at
    call-time (no hardcoded fallback).
  - Aggressive cleanup: deleted 2 prototype packages, `.bak`, 3 leaked-cred scripts; archived 67
    status docs to `docs/legacy/`.
  - Removed the live-wired Delta engine (backend dir + route + wiring) and dead frontend sync hooks;
    kept the Yjs relay branch (M1's concern) and the naive `code-update` path.
  - ESLint + Prettier + Vitest in both packages; CI at `.github/workflows/ci.yml`.
  - Verified: backend boots on the new cluster; frontend builds; lint + tests green both packages.
  - OpenSpec change `m0-foundation-hardening` authored + valid (4/4 artifacts).
- **File-backend unification (tasks §6): implemented.** One identity (tree path, via
  `utils/fileIdentity.js`, TDD), `ProjectRoom` reads/writes through `/api/filesystem/*` +
  `filesystem:*` events, old `/projects/:id/files` demo route + `file-*` handlers + dead `api.*`
  file methods removed, `authenticate` added to `routes/filesystem.js`, activity-timeline logging
  ported into the `filesystem:*` relays. Lint/tests/build/boot all verified green.
  **Pending:** user click-test of the live file lifecycle (open/save/create/delete/rename) — mark
  tasks §7.4 done and archive the change once confirmed.
- **Then:** M1 — Collaboration core (real CRDT).
- **Optional hygiene:** the dead (rotated) old creds still exist in git history; purge only if
  desired (the git root is the user's home dir, so scope any `filter-repo` carefully).
