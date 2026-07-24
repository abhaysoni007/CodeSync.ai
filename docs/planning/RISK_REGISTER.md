# RISK REGISTER — CodeSyncAI

> Ranked by severity × likelihood. Each entry: the risk, why it matters, evidence (real file),
> and mitigation with the module that owns it. Security-of-execution leads, as instructed.

Severity: 🔴 critical · 🟠 high · 🟡 medium.

---

### RISK #0 🔴 — Committed live database credentials

- **Risk:** A working MongoDB Atlas connection string with a real username and password is
  committed to git and pushed. Anyone with repo access (or anyone the history leaks to) has full
  read/write to the production database.
- **Evidence:** `backend/check-api-keys.js:8`, `backend/clean-api-keys.js:8`,
  `backend/debug-api-keys.js:4`, and leaked again in `GEMINI_API_KEY_FIX.md`,
  `QUICK_START_MANUAL.md`, `TEST_CREDENTIALS.md`. All git-tracked (confirmed).
- **Why it leads:** it is already exploitable *today*, requires no attacker skill, and rotating is
  cheap. This is an active incident, not a future risk.
- **Mitigation (M0, do out-of-band immediately):** rotate the Atlas password now; purge the string
  from git history (`git filter-repo`) and force-push; delete the three debug scripts; scrub the
  `.md` docs; move all secrets to env/secret store only.

### RISK #1 🔴 — Sandbox escape / unsandboxed code execution (isolation security)

- **Risk:** Arbitrary code execution on the host. `terminal:execute` / `terminal:run-file`
  `spawn` a host shell with the unsanitized client command, the **full inherited `process.env`**
  (which includes DB creds and the AES `MASTER_KEY`), and host cwd — gated by nothing more than a
  valid login. The AI agent also `execAsync`s AI-proposed commands.
- **Evidence:** `backend/services/TerminalSocketHandlers.js:66-126` (spawn with client `command`,
  `env: {...process.env}`), `:201-438` (run-file), `backend/services/AgentService.js:185-201`.
- **Why #1 of the design risks:** this is the core security surface of the whole product; a naive
  container will still leak if misconfigured (shared kernel, mounted socket, retained caps).
- **Mitigation:** **M0** — flag the execution path OFF immediately to stop the bleeding. **M3** —
  Docker-per-session with non-root, `--cap-drop=ALL`, read-only root FS + scoped writable mount,
  `--network=none` by default, CPU/mem/pids limits, **no host env inheritance**, timeouts +
  guaranteed teardown. **Gate: explicit threat model + security review before enabling in any
  shared/deployed environment.** Consider gVisor/microVM later if the threat model demands it.

### RISK #2 🟠 — WebRTC NAT traversal, signaling, and mesh scaling

- **Risk:** Calls fail for common network setups and do not scale. There is **no TURN** anywhere,
  so peers behind symmetric NAT/strict firewalls never connect; the full-mesh topology is O(n²)
  connections and degrades past a few participants. LiveKit (the SFU alternative already coded) is
  dead and broken.
- **Evidence:** `VideoChatPanel.jsx:187-189` (STUN only, no `turn:`), mesh signaling
  `SocketHandlers.js:927-981`, broken LiveKit `CallSessionController.js:11` (`:id` vs `roomId`).
- **Mitigation (M5):** deploy coturn (TURN) with credentials; cap mesh participants and surface the
  limit; make an explicit decision to either revive LiveKit SFU (fix the param bug) or stay
  mesh-with-cap. Test cross-network connection manually/E2E.

### RISK #3 🟠 — CRDT correctness & migration

- **Risk:** The new CRDT engine silently loses or diverges edits — the worst failure for a
  collaborative editor because it erodes trust invisibly. Compounded by migrating off a *working*
  naive path: if both run at once, edits double-apply.
- **Evidence:** current relay is provably wrong (`SocketHandlers.js:225` non-existent
  `syncProtocol.applyUpdate`; `:227` empty-buffer rebroadcast), so M1 is a from-scratch build, and
  the naive `code-update` path (`:613-622`) must be removed cleanly.
- **Mitigation (M1):** use Yjs + y-monaco + correct y-protocols relay (don't hand-roll CRDT);
  no dual-run — remove `code-update` in the same change; test convergence with simulated
  concurrent ops; verify persistence/reload and reconnect convergence.

### RISK #4 🟠 — Scope creep vs a full-time-job-sized surface

- **Risk:** Six production-grade subsystems (CRDT, sandbox, editor, AI agent, WebRTC, deploy) is a
  team's roadmap. Attempting them in parallel or gold-plating early modules stalls everything and
  leaves more half-wired features (the repo's existing failure mode — dead Yjs, dead Delta, dead
  LiveKit, stub save).
- **Evidence:** INVENTORY.md §3 — the count of dead/stub features already present.
- **Mitigation:** strict module order (MODULE_PLAN.md); each module shippable + integrated + tested
  before the next; delete dead code rather than accumulate it; use the "definition of done" gates
  as hard checkpoints. Cut features (e.g. SFU) explicitly rather than half-building them.

---

## Secondary risks (track, mitigate in the owning module)

| # | Sev | Risk | Evidence | Mitigation (module) |
|---|-----|------|----------|---------------------|
| 5 | 🟠 | JWT secret hardcoded fallback → forgeable tokens if env unset | `utils/jwt.js:7` | Refuse-to-boot without `JWT_SECRET` (M6) |
| 6 | 🟠 | AI safety fully disabled (`BLOCK_NONE` all categories) | `AIProviderService.js:37-54` | Re-enable sane safety (M4) |
| 7 | 🟡 | Two competing file backends → data desync | `useFileExplorer.js:29` vs `ProjectRoom.jsx:229-243` | Unify to one model (M0) |
| 8 | 🟡 | Socket auth trusts JWT without DB re-check → revoked users keep access | `SocketHandlers.js:74-95` | Re-check user in socket auth (M6) |
| 9 | 🟡 | Split-brain state (2 terminal maps, 2 API-key stores, dup socket handlers) | `terminalController.js:182-218`; `SocketHandlers.js:273,627` | Consolidate (M0/M3) |
| 10 | 🟡 | Plaintext API keys in `User.apiKeys` alongside encrypted store | `routes/auth.js:238` | Drop plaintext store (M4) |
| 11 | 🟡 | LiveKit dev-cred fallback (`devkey`/`secret`) | `CallSessionController.js:39-40` | Remove fallback (M5/M6) |
| 12 | 🟡 | Rate limiting only on `/auth`,`/ai` → terminal/file/project unthrottled | `server.js:90-96` | Rate limit all routes (M6) |
| 13 | 🟡 | No horizontal-scale story (single Node + in-memory maps, fake Redis) | `RedisCache.js:1-11` | Real Redis + sticky sessions if scaling needed (post-M6) |

## Watch list (not risks yet, revisit)

- Git root is the user's home directory, not the app — the app should become its own repo (M0/M6).
- Deploy target (Render) is inferred, not committed — confirm before M6.
