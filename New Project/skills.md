# CodeSyncAI --- Video Calling Agent Skills / Guardrails

## Mission

Implement project-scoped video calling inside the existing CodeSyncAI
IDE. Work incrementally, reuse existing code, and keep every change
testable.

## Ground truth

Read these before modifying code:

-   `CLAUDE.md`
-   `docs/planning/INVENTORY.md`
-   `docs/planning/GAP_ANALYSIS.md`
-   `docs/planning/MODULE_PLAN.md`
-   `docs/planning/OPENSPEC_PROPOSALS.md`
-   `docs/planning/RISK_REGISTER.md`
-   `docs/planning/`

Then inspect the current video implementation before creating files.

Known integration points from the current code audit:

-   `frontend-new/src/pages/ProjectRoom.jsx`
-   `frontend-new/src/components/VideoChatPanel.jsx`
-   `frontend-new/src/components/VideoChatPanel.css`
-   `backend/services/SocketHandlers.js`

## Working rules

1.  Do not rewrite unrelated code.
2.  Do not create a second video system.
3.  Reuse `ProjectRoom` and `VideoChatPanel`.
4.  Reuse authenticated Socket.IO/project-room infrastructure where
    appropriate.
5.  Keep project room identity as `project:${projectId}`.
6.  Never trust a client-supplied user ID for authorization.
7.  Never put provider API secrets in frontend code.
8.  Do not add an external provider, SDK, API key, URL, TURN server, or
    cloud service unless the implementation plan explicitly selects it
    and the source/configuration has been verified.
9.  Prefer an SFU for the 10--15 participant production target; do not
    silently ship a 10--15 user mesh as production architecture.
10. Do not remove existing WebRTC code until the replacement is working
    and tested.
11. Delete obsolete code only after replacement verification.
12. Keep code readable: small functions, descriptive names, comments
    only for WHY.
13. Follow ponytail/minimalism: reuse before rewrite.
14. Use OpenSpec for the change.
15. Run lint/tests/build after meaningful changes.
16. If something is not verified from the repository, explicitly say
    `UNVERIFIED`.

## Agent workflow

For every implementation step:

### Phase A --- Inspect

-   Read the relevant existing files.
-   Identify the smallest change surface.
-   Explain any architectural conflict before changing it.

### Phase B --- Implement

-   Modify only the required files.
-   Preserve existing interfaces where possible.
-   Add tests with behavior changes.
-   Do not fabricate APIs or package names.

### Phase C --- Verify

Run applicable:

-   backend lint
-   frontend lint
-   backend tests
-   frontend tests
-   frontend build
-   backend startup

Report failures exactly.

### Phase D --- Review

Check:

-   authentication/authorization
-   project isolation
-   call lifecycle
-   cleanup
-   reconnect behavior
-   resource cleanup
-   secret handling
-   regression risk

## Vibe Coding prompt contract

When generating a coding prompt for an agent, every prompt should:

1.  State the exact goal.
2.  List the files to inspect/change.
3.  Tell the agent to inspect existing code first.
4.  Tell the agent not to modify unrelated code.
5.  Specify acceptance criteria.
6.  Require tests/lint/build where applicable.
7.  Require a concise change report.
8.  Require the agent to flag assumptions as `UNVERIFIED`.

## Video-specific acceptance criteria

A complete implementation must satisfy:

-   Each project has exactly one active call state.
-   Start Call appears when no call is active.
-   Join Call appears when a call is active.
-   Starter leaving does not terminate the call.
-   Any participant can leave independently.
-   Last participant leaving ends the call.
-   Project navigation automatically removes the user from the old call.
-   Camera and microphone controls are independent.
-   Active speaker is prominent when supported.
-   Target supports 10--15 participants through an SFU-based media
    architecture.
-   Video remains inside the existing ProjectRoom side panel.
-   No separate video route/tab.
-   Project A participants never appear in Project B.
-   Unauthorized users cannot join a project's call.
-   Media resources are cleaned up on leave/unmount.
-   Reconnect/failure states do not falsely end the project call.

## External-service rule

If the selected architecture needs an external service:

1.  Stop before adding credentials.
2.  Identify exactly:
    -   service
    -   package
    -   server URL
    -   API key
    -   API secret
    -   TURN requirement
    -   local-development setup
    -   production/deployment setup
3.  Tell the developer where each value comes from.
4.  Keep secrets backend-only.
5.  Add environment-variable names to `.env.example`, never real values.
6.  Verify the service is actually required before adding it.

## Do not

-   Do not use a random free WebRTC API.
-   Do not hard-code STUN/TURN credentials.
-   Do not expose SFU secrets to React.
-   Do not create fake call state only in React.
-   Do not make the caller the owner of the call lifecycle.
-   Do not silently increase complexity with unnecessary abstractions.
-   Do not claim production readiness after a two-browser test.
