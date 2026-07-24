/**
 * Environment validation.
 *
 * WHY: the app used to fall back to hardcoded defaults (a well-known JWT secret, a committed DB
 * URI) when env vars were missing. That makes tokens forgeable and leaks credentials. We prefer
 * a loud startup failure over a silent insecure default.
 */

// Returns the value of a required env var, or throws naming the missing variable.
export const requireEnv = (name) => {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

// Call once at startup, before connecting to anything, so misconfiguration fails fast.
export const assertRequiredEnv = () => {
  ['MONGODB_URI', 'JWT_SECRET'].forEach(requireEnv);
};
