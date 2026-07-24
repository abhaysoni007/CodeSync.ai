## ADDED Requirements

### Requirement: Execution disabled by default

The server SHALL NOT execute any user-supplied or agent-supplied command unless code execution is
explicitly enabled via configuration. The default configuration SHALL have execution disabled.

#### Scenario: Terminal command while execution disabled
- **WHEN** a client emits `terminal:execute` or `terminal:run-file` and execution is disabled
- **THEN** the server does not spawn any process and emits an "execution disabled" message to the client

#### Scenario: Agent command while execution disabled
- **WHEN** the AI agent plans a `RUN_COMMAND` action and execution is disabled
- **THEN** the command is not executed and the action is reported as blocked

#### Scenario: Execution explicitly enabled
- **WHEN** the operator sets the execution flag on and a client emits `terminal:execute`
- **THEN** the command runs (unsandboxed, dev-only) — pending M3 isolation

### Requirement: Fail-fast on missing secrets

The server SHALL refuse to start if `MONGODB_URI` or `JWT_SECRET` is not provided, rather than
falling back to a hardcoded default.

#### Scenario: Boot without JWT secret
- **WHEN** the server starts and `JWT_SECRET` is unset
- **THEN** startup fails with a clear error and no insecure default key is used
