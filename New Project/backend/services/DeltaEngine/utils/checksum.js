import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create SHA256 checksum for content
 */
export function createChecksum(content) {
  if (!content) return '';
  
  return crypto
    .createHash('sha256')
    .update(content, 'utf8')
    .digest('hex');
}

/**
 * Verify content against checksum
 */
export function verifyChecksum(content, checksum) {
  const computed = createChecksum(content);
  return computed === checksum;
}

/**
 * Generate unique snapshot ID
 */
export function generateSnapshotId() {
  return `snap_${uuidv4().replace(/-/g, '')}`;
}

/**
 * Create MD5 hash (faster, for delta hashing)
 */
export function createDeltaHash(delta) {
  if (!delta) return '';
  
  return crypto
    .createHash('md5')
    .update(delta, 'utf8')
    .digest('hex');
}

/**
 * Generate consistent color hash for user
 */
export function generateUserColorHash(userId) {
  const hash = crypto
    .createHash('md5')
    .update(userId.toString(), 'utf8')
    .digest('hex');
  
  return `#${hash.substring(0, 6)}`;
}
