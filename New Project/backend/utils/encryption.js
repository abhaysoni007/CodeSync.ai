import crypto from 'crypto';

/**
 * AES-256-GCM Encryption Helper for API Keys
 */

class EncryptionHelper {
  constructor(masterKey) {
    // Master key should be 32 bytes for AES-256
    this.masterKey = masterKey || process.env.MASTER_KEY;
    
    // Don't throw error in constructor - allow lazy initialization
    if (this.masterKey) {
      // Ensure master key is 32 bytes
      this.key = crypto.createHash('sha256').update(this.masterKey).digest();
    }
  }

  /**
   * Ensure key is initialized
   */
  _ensureKey() {
    if (!this.key) {
      const masterKey = this.masterKey || process.env.MASTER_KEY;
      if (!masterKey) {
        throw new Error('MASTER_KEY is required for encryption. Please set it in .env file');
      }
      this.key = crypto.createHash('sha256').update(masterKey).digest();
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param {string} plaintext - Data to encrypt
   * @returns {object} - { encryptedData, iv, authTag }
   */
  encrypt(plaintext) {
    try {
      this._ensureKey();
      
      // Generate random IV (12 bytes recommended for GCM)
      const iv = crypto.randomBytes(12);
      
      // Create cipher
      const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
      
      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param {string} encryptedData - Encrypted data in hex
   * @param {string} ivHex - IV in hex
   * @param {string} authTagHex - Auth tag in hex
   * @returns {string} - Decrypted plaintext
   */
  decrypt(encryptedData, ivHex, authTagHex) {
    try {
      this._ensureKey();
      
      // Convert hex strings back to buffers
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate a cryptographically secure API key
   * @param {number} length - Length of the key (default: 32)
   * @returns {string} - Generated API key
   */
  generateAPIKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Create a hash of the API key for storage/lookup
   * @param {string} apiKey - The API key to hash
   * @returns {string} - SHA-256 hash of the key
   */
  hashAPIKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Encrypt and prepare API key for storage
   * @param {string} apiKey - The API key to encrypt
   * @returns {object} - { keyHash, encryptedKey, iv, authTag }
   */
  encryptAPIKey(apiKey) {
    const { encryptedData, iv, authTag } = this.encrypt(apiKey);
    const keyHash = this.hashAPIKey(apiKey);
    
    return {
      keyHash,
      encryptedKey: encryptedData,
      iv,
      authTag
    };
  }

  /**
   * Decrypt stored API key
   * @param {string} encryptedKey - Encrypted key data
   * @param {string} iv - IV used for encryption
   * @param {string} authTag - Auth tag from encryption
   * @returns {string} - Decrypted API key
   */
  decryptAPIKey(encryptedKey, iv, authTag) {
    return this.decrypt(encryptedKey, iv, authTag);
  }
}

// Create singleton instance
const encryptionHelper = new EncryptionHelper();

export default encryptionHelper;
export { EncryptionHelper };
