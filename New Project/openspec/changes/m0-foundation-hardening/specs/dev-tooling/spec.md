## ADDED Requirements

### Requirement: Lint and format configured

Both the backend and frontend packages SHALL have a working ESLint configuration and a shared
Prettier configuration, and the `lint` script SHALL run without configuration errors.

#### Scenario: Running lint
- **WHEN** the `lint` script is run in either package
- **THEN** ESLint loads its configuration and reports results (no "no configuration found" error)

### Requirement: Test harness present

Each package SHALL have a runnable test command executing at least one real test that exercises
application code.

#### Scenario: Running tests
- **WHEN** the `test` script is run in either package
- **THEN** the test runner executes and the smoke test passes

### Requirement: CI merge gate

The project SHALL run install, lint, and tests on every push, and SHALL fail the check when lint
or tests fail.

#### Scenario: Push with a failing test
- **WHEN** a commit is pushed whose tests fail
- **THEN** CI reports failure and the branch is not mergeable until fixed
