import jwt from 'jsonwebtoken';

/**
 * JWT Utilities for authentication
 */

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

/**
 * Generate JWT access token
 * @param {object} payload - User data to encode
 * @returns {string} - JWT token
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

/**
 * Generate JWT refresh token
 * @param {object} payload - User data to encode
 * @returns {string} - JWT refresh token
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
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
    return jwt.verify(token, JWT_SECRET);
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
