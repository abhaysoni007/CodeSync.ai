import { describe, it, expect, afterEach } from 'vitest';
import { isExecutionEnabled, executionBlockedNotice } from './execution.js';

// WHY: code execution is currently an unsandboxed host shell-out (RCE). Until M3 adds
// container isolation, it must be OFF unless an operator explicitly opts in. These tests
// pin that default-deny behaviour so it can't silently regress.
describe('execution safety gate', () => {
  const original = process.env.EXECUTION_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.EXECUTION_ENABLED;
    else process.env.EXECUTION_ENABLED = original;
  });

  it('is disabled by default when the flag is unset', () => {
    delete process.env.EXECUTION_ENABLED;
    expect(isExecutionEnabled()).toBe(false);

    const notice = executionBlockedNotice();
    expect(notice).not.toBeNull();
    expect(notice.disabled).toBe(true);
    expect(notice.message).toMatch(/disabled/i);
  });

  it('is enabled only when the flag is exactly "true"', () => {
    process.env.EXECUTION_ENABLED = 'true';
    expect(isExecutionEnabled()).toBe(true);
    expect(executionBlockedNotice()).toBeNull();
  });

  it('treats any other value as disabled (fail closed)', () => {
    process.env.EXECUTION_ENABLED = '1';
    expect(isExecutionEnabled()).toBe(false);
    expect(executionBlockedNotice()).not.toBeNull();
  });
});
