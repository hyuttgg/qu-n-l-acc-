const { getRedisClient, isReady } = require('../config/redis');

// In-Memory Cache Store with TTL Support & Size Cap
class InMemoryCache {
  constructor(maxItems = 5000, defaultTTLMs = 300000) { // 5 mins default TTL
    this.cache = new Map();
    this.maxItems = maxItems;
    this.defaultTTLMs = defaultTTLMs;
  }

  set(key, value, ttlSeconds) {
    if (this.cache.size >= this.maxItems) {
      // Evict oldest item (first key inserted)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    const ttlMs = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTLMs;
    const expiresAt = Date.now() + ttlMs;

    this.cache.set(key, { value, expiresAt });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  del(key) {
    this.cache.delete(key);
  }

  delByPattern(patternStr) {
    const regex = new RegExp('^' + patternStr.replace(/\*/g, '.*') + '$');
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

const localCache = new InMemoryCache();

const cacheManager = {
  /**
   * Get cached item
   */
  async get(key) {
    try {
      if (isReady()) {
        const client = getRedisClient();
        const val = await client.get(key);
        return val ? JSON.parse(val) : null;
      }
    } catch (err) {
      console.warn(`[CacheManager] Redis GET error (${key}): ${err.message}`);
    }
    return localCache.get(key);
  },

  /**
   * Set cached item with TTL in seconds
   */
  async set(key, value, ttlSeconds = 300) {
    try {
      if (isReady()) {
        const client = getRedisClient();
        const strVal = JSON.stringify(value);
        if (ttlSeconds) {
          await client.setex(key, ttlSeconds, strVal);
        } else {
          await client.set(key, strVal);
        }
        return;
      }
    } catch (err) {
      console.warn(`[CacheManager] Redis SET error (${key}): ${err.message}`);
    }
    localCache.set(key, value, ttlSeconds);
  },

  /**
   * Delete specific key
   */
  async del(key) {
    try {
      if (isReady()) {
        const client = getRedisClient();
        await client.del(key);
      }
    } catch (err) {
      console.warn(`[CacheManager] Redis DEL error (${key}): ${err.message}`);
    }
    localCache.del(key);
  },

  /**
   * Delete keys matching a pattern (e.g. "account:user123:*")
   */
  async delByPattern(pattern) {
    try {
      if (isReady()) {
        const client = getRedisClient();
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          await client.del(...keys);
        }
      }
    } catch (err) {
      console.warn(`[CacheManager] Redis DEL pattern error (${pattern}): ${err.message}`);
    }
    localCache.delByPattern(pattern);
  },

  /**
   * Get or set pattern helper for API endpoints
   */
  async getOrSet(key, fetchFn, ttlSeconds = 300) {
    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const freshData = await fetchFn();
    if (freshData !== null && freshData !== undefined) {
      await this.set(key, freshData, ttlSeconds);
    }
    return freshData;
  },

  /**
   * Clear local memory cache (useful in tests)
   */
  clearLocal() {
    localCache.clear();
  }
};

module.exports = cacheManager;
