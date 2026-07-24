## ADDED Requirements

### Requirement: Single deployable app layout

The repository SHALL contain exactly one deployable application (a backend and a frontend). Unmerged
prototype packages and backup/dead files SHALL NOT be present in the tree.

#### Scenario: Prototype packages removed
- **WHEN** the repository is inspected after M0
- **THEN** `video-chat-feature-extracted`, `live-cursor-feature`, and any `*.bak` files are absent

### Requirement: No secrets or dead sync code in the tree

The working tree SHALL NOT contain hardcoded credentials, the leaked-credential debug scripts, or
dead real-time-sync scaffolding.

#### Scenario: Credential scripts removed
- **WHEN** the repository is searched for the leaked connection string or the debug scripts
- **THEN** no match is found in tracked files

#### Scenario: Dead sync code removed while app still works
- **WHEN** the dead Yjs relay branch, Delta transport handlers, and unused frontend sync hooks are removed
- **THEN** the application still runs collaborative editing on the naive `code-update` path
