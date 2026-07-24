# INVENTORY — Factual State of CodeSyncAI

> Pre-project audit, verified against source on 2026-07-21. Every claim cites a real file
> that was read. Anything not confirmed in code is marked **UNVERIFIED**. Repo paths are
> relative to the app root `New Project/` unless noted. Line numbers reflect the state at
> audit time and may drift as code changes.

---

## 1. Stack & versions

| Layer | Tech | Version (from manifest) |
|-------|------|--------------------------|
| Backend runtime | Node.js (ESM, `"type":"module"`) | — |
| Backend framework | Express | ^4.18.2 |
| Realtime | Socket.IO | ^4.7.2 |
| DB / ODM | MongoDB Atlas + Mongoose | ^7.6.3 |
| Auth | jsonwebtoken ^9, bcrypt ^5.1.1 | — |
| CRDT libs (present) | yjs ^13.6.10, y-protocols ^1.0.6, lib0 ^0.2.94, pako ^2.1.0 | — |
| Diff (present) | diff ^5.2.0 | — |
| AI | @google/generative-ai ^0.24.1 | — |
| Video | livekit-server-sdk ^2.14.0 | — |
| Frontend build | Vite | ^5.0.8 |
| Frontend UI | React | ^18.2.0 |
| Editor | @monaco-editor/react | ^4.6.0 |
| Terminal | xterm ^5.3.0 (+ fit, web-links addons) | — |
| State | zustand ^4.5.7 | — |
| HTTP client | axios ^1.6.2 | — |

Sources: `backend/package.json`, `frontend-new/package.json`.

**Note:** `yjs`/`y-monaco` are **not** in the *frontend* dependencies — the CRDT libs are
backend-only, and the frontend never imports them (see §4). This is the first sign that the
CRDT story is aspirational, not wired.

---

## 2. Directory structure (real code)

```
CodeSync.ai/
├── New Project/                 <- the actual app repo
│   ├── backend/                 <- Express + Socket.IO API (the product backend)
│   │   ├── server.js            <- entry (172 LOC)
│   │   ├── routes/              <- auth, user, projects, rooms, calls, files, ai, agent, ...
│   │   ├── controllers/         <- HTTP handlers
│   │   ├── models/              <- 12 Mongoose schemas
│   │   ├── services/            <- SocketHandlers (god-file), Terminal, Yjs, DeltaEngine/
│   │   ├── middleware/          <- auth, rate limiting
│   │   ├── utils/               <- jwt, encryption
│   │   ├── check-api-keys.js / clean-api-keys.js / debug-api-keys.js  <- loose scripts (DELETE)
│   │   └── ~67 *.md status docs at project root
│   ├── frontend-new/            <- Vite + React app (the product frontend)
│   │   └── src/{pages,components,context,stores,hooks,services,utils}
│   └── live-cursor-feature/     <- UNMERGED prototype package (not imported anywhere)
└── video-chat-feature-extracted/ <- UNMERGED prototype (own backend+frontend, duplicates mesh video)
```

Five separate Node packages, one git repo (the git root is actually the user's home directory —
the app is not its own repo). **Two of the five packages (`live-cursor-feature`,
`video-chat-feature-extracted`) are unmerged prototypes** not referenced by the app.

---

## 3. What actually works vs stub / dead

| Capability | Status | Evidence |
|-----------|--------|----------|
| Auth (register/login, JWT, bcrypt) | **Works** | `routes/auth.js:43-123`, `models/User.js:60-75` |
| Project / room CRUD | **Works** | `models/Project.js`, `models/Room.js`, routes mounted `server.js:105-115` |
| Live code sync via full-file broadcast | **Works (naive)** | `SocketHandlers.js:613-622` (`code-update` → whole file to `project:<id>`) |
| Live cursors / presence (main app) | **Works** | `ProjectRoom.jsx:148-192,362-442` (Monaco decorations) |
| xterm terminal → backend exec | **Works, unsandboxed** | `TerminalSocketHandlers.js:66-126` (real `spawn`) + `TerminalPanel.jsx:60-96` |
| AI assist (Gemini, ask + agent) | **Works** | `AIProviderService.js:15-74`, `AIController.js:9-160`, `AgentService.js` |
| WebRTC video (mesh) | **Works, no TURN** | `VideoChatPanel.jsx:185-576` + `SocketHandlers.js:927-981` |
| File explorer (backend-backed) | **Works** | `useFileExplorer.js:29,317-320` → `/api/filesystem/*` |
| Yjs CRDT live relay | **DEAD** | `SocketHandlers.js:225` calls non-existent `syncProtocol.applyUpdate`; rebroadcast emits empty buffer (`:227`) |
| "Delta Engine" live sync | **DEAD as transport** | broadcasts full docs to `project:*:file:*`, a room nobody joins (`DeltaSocketHandlers.js:85-96`) |
| Delta version snapshots/rollback | **Works (storage only)** | `DeltaManager.js:104-357`, `diff` + `pako` → `DeltaSnapshot` |
| LiveKit / SFU video | **DEAD** | token endpoint present but unused + broken param (`CallSessionController.js:11`) |
| `handleSaveFile` (frontend) | **STUB** | `ProjectRoom.jsx:465-476` — success toast, no persistence |
| Yjs/Delta frontend hooks | **DEAD** | `useSocket.js` unused; `useDeltaSync`, `VersionHistoryPanel` commented out (`ProjectRoom.jsx:79-91,915-942`) |
| `AgentController.generateCode` | **DEAD** | returns hardcoded template, ignores AI (`AgentController.js:58-183`); `createComponent/Page` stubs (`:434-462`) |
| `RedisCache` | **Fake** | in-memory `Map` labelled "Simulates Redis" (`RedisCache.js:1-11`) |
| HTTP terminal controller | **Orphaned** | safer variant but disjoint session Map (`terminalController.js:182-218`) |
| Automated tests | **NONE** | no `*.test.*`/`*.spec.*`, no jest/vitest config anywhere |

---

## 4. Real-time sync — the actual mechanism (verified)

Three mechanisms coexist; **only one reaches other clients.**

1. **Naive full-document broadcast (the real one).** On every edit the frontend emits the entire
   file (`ProjectRoom.jsx:302-325`); the backend rebroadcasts it to `project:<projectId>`
   (`SocketHandlers.js:613-622`); peers call `editor.setValue(...)` on the whole buffer
   (`ProjectRoom.jsx:118-146`). `project:<id>` is a room clients actually join
   (`join-project`, `SocketHandlers.js:523`). Cost: O(document) per keystroke-batch,
   last-writer-wins, no conflict resolution; manual echo-suppression flag + cursor
   save/restore paper over the churn.

2. **Yjs CRDT (dead at runtime).** `join-room` builds a `Y.Doc` and sends sync-step1
   (`SocketHandlers.js:150-157`), but the update handler calls `syncProtocol.applyUpdate`
   (`:225`) — a symbol `y-protocols/sync` does not export (the correct call is `Y.applyUpdate`,
   used correctly in `YjsManager.js:86`) — so it throws and is swallowed by the surrounding
   `try/catch` (`:245-247`). Even if it didn't throw, the rebroadcast emits an empty encoder
   buffer (`:227`). Net: **Yjs edits never propagate.** Yjs *persistence* to
   `File.content`/`FileVersion` (`YjsManager.js:67-187`) is coherent.

3. **"Delta Engine" (dead as transport).** `delta:update` broadcasts the *entire* `newContent`
   (not a diff) as `delta:sync` (`DeltaSocketHandlers.js:87-96`) to `project:*:file:*` — a room
   **no `socket.join` ever targets** (grep-confirmed). So it reaches no one. What *does* work is
   its storage side: `DeltaManager.createSnapshot` computes line patches (`diffUtils.js:11`),
   checkpoints every 20 versions, `pako`-compresses deltas >1KB, persists to `DeltaSnapshot`,
   and can reconstruct/rollback (`DeltaManager.js:216-357`). It is a **version-history store**,
   not live collaboration.

**Bottom line for planning:** the app's "CRDT/Delta" collaboration is decorative. Real-time
editing rides on plain full-text broadcast. See GAP_ANALYSIS.md for the migration consequence.

---

## 5. Auth model

- JWT HS256 via `jsonwebtoken`; **secret falls back to the hardcoded string
  `'your-secret-key-change-in-production'` if `JWT_SECRET` is unset** (`utils/jwt.js:7`).
  Access 7d / refresh 30d; payload `{id,email,username}`.
- Passwords bcrypt-hashed (`pre('save')`, salt 10) and stripped from `toJSON`
  (`models/User.js:60-82`).
- **Refresh token is generated but never sent to the client and has no endpoint** — dead
  (`routes/auth.js:43-49,116-123`); logout is a no-op (stateless, `:162-178`).
- HTTP auth: `Authorization: Bearer` header **only** (`middleware/auth.js:10-20`), despite
  `cookieParser` being loaded. Loads user, checks `isActive`.
- Socket auth: `io.use` verifies `handshake.auth.token` (`SocketHandlers.js:74-95`), enforced
  for all sockets (including terminal). **But it trusts the JWT payload without re-checking the
  user exists/active in DB** (the HTTP path does re-check).

---

## 6. Data model (12 Mongoose schemas)

`User`, `Project`, `Room`, `RoomMember`, `File`, `FileVersion`, `DeltaSnapshot`,
`AIInteraction`, `UserAPIKey`, `CallSession`, `Message`, `Activity`.

Key relationships and **redundancies flagged for GAP/RISK:**
- **Content history stored in three overlapping places**: `File.content` (full text),
  `FileVersion` (per-version content + Yjs state base64), `DeltaSnapshot` (delta/checkpoint).
- **Two collaboration groupings**: `Project` + embedded `members[]` (grouping `project:*`) vs
  `Room` + `RoomMember` (grouping `room:*`). The live app uses `project:*`.
- **API keys stored twice**: plaintext `User.apiKeys` (written `routes/auth.js:238`) vs
  AES-encrypted `UserAPIKey` (read by AI controllers). Inconsistent; the encrypted one is used
  by the AI path.
- **Frontend has two competing file backends**: FileExplorer uses `/api/filesystem/*` with
  `filesystem:*` socket events (`useFileExplorer.js:29,317-320`); ProjectRoom uses
  `/projects/:id/files` with `file-*` events (`api.js:89-93`, `ProjectRoom.jsx:229-243`). They
  do not share state — guaranteed desync.

---

## 7. Test coverage reality

**Zero automated tests.** No `*.test.*`, `*.spec.*`, `__tests__/`, and no jest/vitest config in
any package (verified by find). The ~10 `*TESTING*.md` / `INTEGRATION_TEST_GUIDE.md` files at
the project root are **manual checklists**, not executable tests. One-off scripts
(`backend/test-simple-server.js`, `backend/test/yjs-simulation.js`) are ad-hoc, not a suite.

---

## 8. Build / deploy / lint state

- **No IaC:** no Dockerfile, docker-compose, `.github/workflows`, `render.yaml`, `vercel.json`,
  `Procfile` anywhere (verified by find).
- **Deploy target** inferred only from `frontend-new/.env.example`
  (`VITE_API_URL=https://codesyncai.onrender.com` → Render). How it is actually deployed is
  **UNVERIFIED** (no committed config).
- **Lint declared but not configured:** `frontend-new` has a `lint` script + eslint plugins but
  **no eslint config file** and no `eslintConfig` key — the script would fail. **No Prettier**
  anywhere. No shared config across packages.
- Env vars required by backend (from `grep process.env` + `.env.example`): `PORT`, `HOST`,
  `NODE_ENV`, `MONGODB_URI`, `FRONTEND_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`,
  `REFRESH_TOKEN_EXPIRES_IN`, `MASTER_KEY`, `LIVEKIT_API_KEY/SECRET/URL`. Frontend: `VITE_API_URL`.
  Note `GEMINI_API_KEY` is **not** an env var — Gemini keys are user-supplied and stored
  encrypted (reasonable). `.env.example` omits the LIVEKIT_* keys the code reads (incomplete).

---

## 9. Top 10 broken / fragile things (ranked)

1. **Committed live database credentials.** A working MongoDB Atlas URI (real user + password,
   redacted here) is git-tracked in `backend/check-api-keys.js:8`, `clean-api-keys.js:8`,
   `debug-api-keys.js:4`, plus three `.md` docs. **Requires immediate password rotation + history
   purge.** (RISK #0.)
2. **Arbitrary remote code execution.** `terminal:execute` / `terminal:run-file`
   `spawn` a host shell with the unsanitized client command and the full inherited
   `process.env`, authorized by nothing more than "logged in" (`TerminalSocketHandlers.js:66-126,
   201-438`). `AgentService.js:185-201` also `execAsync`s AI-proposed commands. No sandbox.
3. **Yjs live relay is dead code** — wrong API symbol + empty-buffer rebroadcast
   (`SocketHandlers.js:225,227`). CRDT collaboration does not work.
4. **Delta `delta:sync` broadcasts to a room nobody joins** and sends full content, not diffs
   (`DeltaSocketHandlers.js:85-96`).
5. **Two competing file backends** (`/api/filesystem/*` vs `/projects/:id/files`) with mismatched
   socket events — the explorer and the room desync (`useFileExplorer.js:29` vs
   `ProjectRoom.jsx:229-243`).
6. **LiveKit endpoints broken** by a route/param mismatch (`:id` route vs `req.params.roomId`,
   `CallSessionController.js:11,127,201,285`) — all four are effectively 404.
7. **`handleSaveFile` is a no-op stub** — the Save button shows success without persisting
   (`ProjectRoom.jsx:465-476`).
8. **Weak security defaults** — JWT secret hardcoded fallback (`jwt.js:7`); LiveKit
   `devkey`/`secret` fallback (`CallSessionController.js:39-40`); all Gemini safety categories
   `BLOCK_NONE` (`AIProviderService.js:37-54`).
9. **Split-brain state** — two disjoint `terminalSessions` maps (socket vs HTTP controller); two
   API-key stores; duplicate socket handlers (`cursor-update` at `SocketHandlers.js:273` and
   `:627`; `typing` twice at `:474`,`:748`).
10. **WebRTC mesh with no TURN** (`VideoChatPanel.jsx:187-189`) — calls fail behind symmetric
    NAT and do not scale past a few peers.

**Dead weight to remove** (repo hygiene, not "broken" but a liability): 67 status `.md` files at
project root, `VideoChatPanel_OLD.jsx.bak`, 6 loose `backend/*.js` debug scripts, the
`live-cursor-feature` and `video-chat-feature-extracted` prototype packages, and the empty
0-byte files inside the extracted prototype (`socketHandlers-videochat.js`, its `models/*.js`).
