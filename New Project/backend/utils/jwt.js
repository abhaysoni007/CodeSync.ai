import jwt from 'jsonwebtoken';
import { requireEnv } from '../config/env.js';

/**
 * JWT Utilities for authentication
 */

// WHY: read the secret at call-time, not import-time. There is no hardcoded fallback (a
// well-known default makes every token forgeable), and reading lazily avoids the trap where
// this module is imported before dotenv.config() runs, which would otherwise capture undefined.
const getSecret = () => requireEnv('JWT_SECRET');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

/**
 * Generate JWT access token
 * @param {object} payload - User data to encode
 * @returns {string} - JWT token
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, getSecret(), {
    expiresIn: JWT_EXPIRES_IN
  });
};

/**
 * Generate JWT refresh token
 * @param {object} payload - User data to encode
 * @returns {string} - JWT refresh token
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, getSecret(), {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {object} - Decoded payload
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, getSecret());
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Decode JWT token without verification (for debugging)
 * @param {string} token - JWT token to decode
 * @returns {object} - Decoded payload
 */
export const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Generate tokens for user
 * @param {object} user - User object
 * @returns {object} - { accessToken, refreshToken }
 */
export const generateTokens = (user) => {
  const payload = {
    id: user._id || user.id,
    email: user.email,
    username: user.username
  };

  return {
    accessToken: generateToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
};

export default {
  generateToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  generateTokens
};
