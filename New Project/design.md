# CodeSyncAI --- Project Video Calling Design

## Status

-   Module: M5 --- WebRTC video/voice
-   Goal: production-grade project-scoped video calling inside the
    existing ProjectRoom
-   Current implementation: a partial browser WebRTC mesh already exists
    and must be evolved, not blindly duplicated.
-   External provider credentials: **not required for the current
    browser WebRTC implementation**. If an SFU such as LiveKit is
    selected for the 10--15 participant production target, provider
    credentials/infrastructure will be added only after that decision is
    verified.

## Product behavior

Each CodeSyncAI project is its own video-call room.

### Entry states

1.  No active call:
    -   Show `Start Call`.
2.  Active call:
    -   Show `Join Call`.
3.  A user may join or decline independently.
4.  A user may leave at any time without ending the call for everyone
    else.

### Call lifecycle

-   The person who starts the call is not the owner of the call.
-   If the starter leaves, the call continues while other participants
    remain.
-   Leaving the CodeSyncAI project must automatically leave the video
    call.
-   Leaving the video panel/call must stop that user's camera/microphone
    tracks and disconnect their media session.
-   The call is considered ended only when the last participant leaves.
-   Once the last participant leaves, the next visitor sees
    `Start Call`, not `Join Call`.
-   A project may have at most one active call at a time.

## UI placement

Do not create a separate video route or browser tab.

Video lives in the existing right-side project panel alongside chat,
using the existing `VideoChatPanel` integration point in `ProjectRoom`.

Target layout:

-   Call state header
-   Participant count
-   Main/active-speaker video
-   Participant thumbnails/grid
-   Microphone toggle
-   Camera toggle
-   Leave call
-   Start/Join call state
-   Clear indication when camera/mic permissions are unavailable

## Participant target

The product target is 10--15 simultaneous participants.

The implementation must not assume that peer-to-peer mesh scales
acceptably to 10--15 users.

The media architecture should therefore use an SFU for the production
implementation if the existing infrastructure/deployment plan supports
it. The SFU choice is a separate implementation decision; do not add
provider credentials or SDKs until that choice is explicitly verified.

## Media architecture

Separate application signaling/control from media transport.

### Application layer

Existing Socket.IO project rooms remain responsible for:

-   project presence
-   call state notifications
-   join/leave intent if needed
-   UI state synchronization
-   authorization checks

Use the existing project room naming convention:

`project:${projectId}`

### Media layer

For the production 10--15 participant target:

-   Prefer SFU-based media distribution.
-   WebRTC remains the browser media technology.
-   TURN should be available for networks where direct ICE connectivity
    fails.
-   Do not implement a new custom media server if an established SFU is
    selected.

## Existing-code reuse

Before changing code:

-   Reuse the existing `ProjectRoom` integration.
-   Reuse the existing `VideoChatPanel` UI boundary.
-   Reuse existing authenticated Socket.IO connection and project-room
    membership.
-   Reuse existing project/user identity.
-   Remove or replace only the parts of the current mesh implementation
    that conflict with the selected production media architecture.

Do not create a second video system beside the existing one.

## Call state model

The UI should distinguish:

-   `idle` --- no active call
-   `active` --- call exists, user not connected
-   `joined` --- current user is participating
-   `leaving` --- cleanup in progress
-   `error` --- media/session setup failed

The authoritative active-call state should be project-scoped and should
not depend on the identity of the user who started it.

## Permission behavior

On join/start:

1.  Request camera/microphone according to the user's selected defaults.
2.  If camera permission is denied, allow audio-only participation.
3.  If microphone permission is denied, allow video-only participation.
4.  If both are unavailable, show a useful error and do not create a
    broken participant.
5.  Never expose raw browser errors as the primary UI message.

## Controls

Every participant must have independent:

-   microphone mute/unmute
-   camera on/off

The local user must have:

-   leave call

The UI should clearly distinguish local controls from remote participant
state.

## Active speaker

When supported by the selected media architecture:

-   Show the current active speaker prominently.
-   Keep other participants in a smaller grid/thumbnail area.
-   Fall back gracefully to a grid when active-speaker metadata is
    unavailable.

## Project switching

When `ProjectRoom` changes from project A to project B:

1.  Leave project A's video session.
2.  Stop local media tracks.
3.  Remove old participant subscriptions/listeners.
4.  Join project B's application room.
5.  Show B's current call state.
6.  Never leak A's participants into B.

## Failure handling

Handle:

-   camera permission denied
-   microphone permission denied
-   device unavailable
-   media connection failure
-   signaling disconnect
-   reconnect
-   participant unexpectedly disconnecting
-   project navigation during a call
-   browser/tab cleanup

A temporary network failure must not incorrectly end the project call
for everyone.

## Security

-   Only authenticated project members may obtain/join the project's
    call.
-   Never trust a client-supplied user ID for authorization.
-   Server-side identity comes from the authenticated Socket.IO/JWT
    session.
-   If an external SFU is introduced, its server credentials remain
    backend-only.
-   Never place SFU API secrets in frontend code or committed `.env`
    files.
-   Validate project membership before issuing any media-session
    credential.

## Testing definition

### Functional

-   User A starts call.
-   User B sees Join Call.
-   B joins.
-   A leaves; B remains.
-   C joins after A leaves.
-   B leaves; C remains.
-   Last participant leaves.
-   New visitor sees Start Call.
-   User switches project while joined; they disappear from the old
    call.
-   Camera toggle works independently.
-   Microphone toggle works independently.

### Multi-user

Test at least:

-   2 participants
-   5 participants
-   10 participants
-   target 15 participants where environment permits

### Regression

After each video change:

-   backend lint
-   frontend lint
-   backend tests
-   frontend tests
-   frontend build
-   backend startup
-   existing project collaboration
-   existing chat
-   existing terminal behavior

## Implementation sequence

1.  Audit current video implementation and dependencies.
2.  Define authoritative project call state.
3.  Define/verify media architecture (SFU for production target).
4.  Add server-side call-state lifecycle.
5.  Add secure media-session/token endpoint if the selected SFU requires
    it.
6.  Replace mesh transport with the selected SFU client integration.
7.  Integrate participant grid and active speaker into existing
    `VideoChatPanel`.
8.  Implement project-switch and last-participant cleanup.
9.  Add reconnect/error handling.
10. Test 2/5/10/15 participant scenarios.
11. Document deployment requirements.
12. Remove obsolete mesh signaling/code after replacement is verified.

## Non-goals

-   No separate `/video` page.
-   No duplicate video component.
-   No user-owned call that dies when the starter leaves.
-   No hard-coded participant limit below the 10--15 target.
-   No external API/provider added without an explicit architecture
    decision.
-   No unrelated refactor.
