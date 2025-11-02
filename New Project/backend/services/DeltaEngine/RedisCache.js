/**
 * RedisCache - In-memory caching layer for delta snapshots
 * Simulates Redis functionality with Map (can be replaced with actual Redis client)
 */
class RedisCache {
  constructor() {
    this.cache = new Map();
    this.expiryTimers = new Map();
    this.DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
    this.MAX_DELTAS_PER_FILE = 10;
  }

  /**
   * Set a value in cache
   */
  async set(key, value, ttl = this.DEFAULT_TTL) {
    try {
      // Clear existing expiry timer
      if (this.expiryTimers.has(key)) {
        clearTimeout(this.expiryTimers.get(key));
      }

      // Store value
      this.cache.set(key, {
        value,
        timestamp: Date.now()
      });

      // Set expiry timer
      if (ttl > 0) {
        const timer = setTimeout(() => {
          this.cache.delete(key);
          this.expiryTimers.delete(key);
        }, ttl);
        
        this.expiryTimers.set(key, timer);
      }

      return true;
    } catch (error) {
      console.error('[RedisCache] Set error:', error);
      return false;
    }
  }

  /**
   * Get a value from cache
   */
  async get(key) {
    try {
      const cached = this.cache.get(key);
      
      if (!cached) {
        return null;
      }

      return cached.value;
    } catch (error) {
      console.error('[RedisCache] Get error:', error);
      return null;
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key) {
    try {
      // Clear expiry timer
      if (this.expiryTimers.has(key)) {
        clearTimeout(this.expiryTimers.get(key));
        this.expiryTimers.delete(key);
      }

      return this.cache.delete(key);
    } catch (error) {
      console.error('[RedisCache] Delete error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    return this.cache.has(key);
  }

  /**
   * Add delta to file's delta list (FIFO queue)
   */
  async addDelta(fileId, delta) {
    try {
      const key = `deltas:${fileId}`;
      let deltas = await this.get(key) || [];

      // Add new delta
      deltas.push({
        snapshotId: delta.snapshotId,
        versionNumber: delta.versionNumber,
        checksum: delta.checksum,
        timestamp: delta.createdAt
      });

      // Keep only last N deltas
      if (deltas.length > this.MAX_DELTAS_PER_FILE) {
        deltas = deltas.slice(-this.MAX_DELTAS_PER_FILE);
      }

      await this.set(key, deltas);
      return true;
    } catch (error) {
      console.error('[RedisCache] Add delta error:', error);
      return false;
    }
  }

  /**
   * Get recent deltas for a file
   */
  async getRecentDeltas(fileId, count = 10) {
    try {
      const key = `deltas:${fileId}`;
      const deltas = await this.get(key) || [];
      
      return deltas.slice(-count);
    } catch (error) {
      console.error('[RedisCache] Get recent deltas error:', error);
      return [];
    }
  }

  /**
   * Clear all deltas for a file
   */
  async clearDeltas(fileId) {
    try {
      const key = `deltas:${fileId}`;
      await this.delete(key);
      return true;
    } catch (error) {
      console.error('[RedisCache] Clear deltas error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      totalKeys: this.cache.size,
      totalTimers: this.expiryTimers.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  estimateMemoryUsage() {
    let totalSize = 0;

    for (const [key, data] of this.cache.entries()) {
      const keySize = Buffer.byteLength(key, 'utf8');
      const valueSize = Buffer.byteLength(JSON.stringify(data.value), 'utf8');
      totalSize += keySize + valueSize;
    }

    return {
      bytes: totalSize,
      kb: (totalSize / 1024).toFixed(2),
      mb: (totalSize / 1024 / 1024).toFixed(2)
    };
  }

  /**
   * Clear all cache
   */
  async flush() {
    try {
      // Clear all timers
      for (const timer of this.expiryTimers.values()) {
        clearTimeout(timer);
      }

      this.cache.clear();
      this.expiryTimers.clear();

      console.log('[RedisCache] Cache flushed');
      return true;
    } catch (error) {
      console.error('[RedisCache] Flush error:', error);
      return false;
    }
  }

  /**
   * Set multiple values at once
   */
  async mset(entries) {
    try {
      const promises = entries.map(([key, value, ttl]) => 
        this.set(key, value, ttl)
      );

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('[RedisCache] Multi-set error:', error);
      return false;
    }
  }

  /**
   * Get multiple values at once
   */
  async mget(keys) {
    try {
      const promises = keys.map(key => this.get(key));
      return await Promise.all(promises);
    } catch (error) {
      console.error('[RedisCache] Multi-get error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Increment a counter
   */
  async increment(key, amount = 1) {
    try {
      const current = await this.get(key) || 0;
      const newValue = current + amount;
      await this.set(key, newValue);
      return newValue;
    } catch (error) {
      console.error('[RedisCache] Increment error:', error);
      return null;
    }
  }

  /**
   * Get keys matching pattern
   */
  async keys(pattern) {
    try {
      const allKeys = Array.from(this.cache.keys());
      
      // Simple pattern matching (supports * wildcard)
      const regex = new RegExp(
        '^' + pattern.replace(/\*/g, '.*') + '$'
      );

      return allKeys.filter(key => regex.test(key));
    } catch (error) {
      console.error('[RedisCache] Keys error:', error);
      return [];
    }
  }
}

export default RedisCache;
