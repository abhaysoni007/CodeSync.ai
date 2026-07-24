/**
 * Execution safety gate.
 *
 * WHY: terminal and AI-agent commands currently spawn a host shell with no sandbox — arbitrary
 * RCE for any authenticated user. Until M3 provides container isolation, execution must be
 * default-deny and only turn on when an operator explicitly opts in for local development.
 * Centralising the decision here means the guard lives in one place instead of being copied
 * into every handler.
 */

// Fail closed: only the exact string "true" enables execution; anything else stays off.
export const isExecutionEnabled = () => process.env.EXECUTION_ENABLED === 'true';

/**
 * Returns a notice payload to send to the client when execution is blocked, or null when
 * execution is allowed. Callers do: `const n = executionBlockedNotice(); if (n) { emit(n); return; }`
 */
export const executionBlockedNotice = () => {
  if (isExecutionEnabled()) return null;
  return {
    disabled: true,
    message:
      'Code execution is disabled on this server. It runs unsandboxed today, so it stays off ' +
      'until the M3 container sandbox lands. Set EXECUTION_ENABLED=true only for local dev.',
  };
};
