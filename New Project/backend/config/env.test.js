import { describe, it, expect, afterEach } from 'vitest';
import { requireEnv } from './env.js';

// WHY: the app previously fell back to a hardcoded JWT secret and DB URI when env was unset,
// which makes tokens forgeable and leaks creds. We want a hard failure instead of a silent
// insecure default. requireEnv is the single choke point that enforces that.
describe('requireEnv', () => {
  afterEach(() => delete process.env.__M0_TEST_VAR__);

  it('returns the value when the variable is set', () => {
    process.env.__M0_TEST_VAR__ = 'present';
    expect(requireEnv('__M0_TEST_VAR__')).toBe('present');
  });

  it('throws, naming the variable, when it is missing', () => {
    delete process.env.__M0_TEST_VAR__;
    expect(() => requireEnv('__M0_TEST_VAR__')).toThrow(/__M0_TEST_VAR__/);
  });

  it('throws when the value is blank', () => {
    process.env.__M0_TEST_VAR__ = '   ';
    expect(() => requireEnv('__M0_TEST_VAR__')).toThrow();
  });
});
