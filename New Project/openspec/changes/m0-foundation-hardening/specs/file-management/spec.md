## ADDED Requirements

### Requirement: Single authoritative file backend

Project files SHALL be served by one backend API and one socket-event contract. Both the file
explorer and the editor room SHALL read and mutate files through that same API and events.

#### Scenario: File created in the explorer appears in the room
- **WHEN** a file is created via the file API
- **THEN** all connected clients (explorer and editor room) receive the same file-change event and see the new file

#### Scenario: No competing file endpoints
- **WHEN** the frontend performs any file operation (list, read, create, rename, delete)
- **THEN** it calls the single authoritative file API and no client code calls a second, divergent file endpoint
