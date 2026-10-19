import Redis from 'ioredis';
import { getEnv } from '../config/env.js';
import logger from '../utils/logger.js';
import CacheEntry from '../models/CacheEntry.js';

let redisClient = null;
let redisAvailable = false;

function initRedis() {
  const env = getEnv();
  if (env.REDIS_URL && !redisClient) {
    try {
      redisClient = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        lazyConnect: true
      });

      redisClient.on('connect', () => {
        redisAvailable = true;
        logger.info('Connected to Redis Cache');
      });

      redisClient.on('error', (err) => {
        redisAvailable = false;
        logger.warn({ error: err.message }, 'Redis error, falling back to MongoDB cache');
      });

      redisClient.connect().catch((err) => {
        redisAvailable = false;
        logger.warn({ error: err.message }, 'Redis connection failed, falling back to MongoDB cache');
      });
    } catch (err) {
      redisAvailable = false;
      logger.warn({ error: err.message }, 'Redis initialization error');
    }
  }
}

// Attempt initialization once module is loaded
initRedis();

class CacheService {
  /**
   * Calculate dynamic TTL based on query popularity/hits
   * High demand products cache longer, niche searches cache shorter.
   */
  calculatePopularityTtl(hits = 0, baseTtl = 3600) {
    if (hits > 100) return baseTtl * 4; // 4 hours
    if (hits > 20) return baseTtl * 2;  // 2 hours
    return baseTtl;                     // 1 hour
  }

  /**
   * Retrieve item from cache
   * @param {string} key
   * @returns {Promise<{ value: any, isStale: boolean } | null>}
   */
  async get(key) {
    const now = new Date();

    // 1. Try Redis first if available
    if (redisAvailable && redisClient) {
      try {
        const raw = await redisClient.get(key);
        if (raw) {
          const entry = JSON.parse(raw);
          const staleAt = new Date(entry.staleAt);
          const isStale = now > staleAt;
          return { value: entry.value, isStale };
        }
      } catch (err) {
        logger.warn({ key, error: err.message }, 'Redis get error, falling back to MongoDB');
      }
    }

    // 2. Fallback to MongoDB TTL Collection
    try {
      const entry = await CacheEntry.findOneAndUpdate(
        { key, expiresAt: { $gt: now } },
        { $inc: { hits: 1 }, $set: { lastAccessedAt: now } },
        { new: true }
      ).lean();

      if (!entry) return null;

      const isStale = entry.staleAt ? now > new Date(entry.staleAt) : false;
      return { value: entry.value, isStale, hits: entry.hits };
    } catch (err) {
      logger.warn({ key, error: err.message }, 'Cache read error');
      return null;
    }
  }

  /**
   * Set item in cache
   * @param {string} key
   * @param {any} value
   * @param {Object} options - { ttlSeconds, staleSeconds, tags, hits }
   */
  async set(key, value, options = {}) {
    const hits = options.hits || 0;
    const ttlSeconds = options.ttlSeconds || this.calculatePopularityTtl(hits, 3600);
    const staleSeconds = options.staleSeconds || Math.floor(ttlSeconds * 0.5); // Stale at 50% of TTL
    const tags = options.tags || [];

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    const staleAt = new Date(now.getTime() + staleSeconds * 1000);

    const payload = {
      value,
      staleAt: staleAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      tags
    };

    // 1. Write to Redis if available
    if (redisAvailable && redisClient) {
      try {
        await redisClient.set(key, JSON.stringify(payload), 'EX', ttlSeconds);
      } catch (err) {
        logger.warn({ key, error: err.message }, 'Redis set error');
      }
    }

    // 2. Write to MongoDB
    try {
      await CacheEntry.findOneAndUpdate(
        { key },
        {
          $set: {
            value,
            expiresAt,
            staleAt,
            tags
          },
          $setOnInsert: { hits: 0 }
        },
        { upsert: true }
      );
    } catch (err) {
      logger.warn({ key, error: err.message }, 'MongoDB cache set error');
    }
  }

  /**
   * Delete specific key from cache
   */
  async del(key) {
    if (redisAvailable && redisClient) {
      try {
        await redisClient.del(key);
      } catch (err) {
        logger.warn({ key, error: err.message }, 'Redis del error');
      }
    }

    try {
      await CacheEntry.deleteOne({ key });
    } catch (err) {
      logger.warn({ key, error: err.message }, 'MongoDB cache del error');
    }
  }

  /**
   * Invalidate cache entries by tag
   */
  async invalidateTag(tag) {
    try {
      await CacheEntry.deleteMany({ tags: tag });
    } catch (err) {
      logger.warn({ tag, error: err.message }, 'MongoDB cache invalidateTag error');
    }
  }

  /**
   * Stale-While-Revalidate wrapper helper
   * @param {string} key
   * @param {Function} fetcherFn - Async function returning fresh data
   * @param {Object} options
   */
  async wrap(key, fetcherFn, options = {}) {
    const cached = await this.get(key);

    if (cached) {
      if (cached.isStale) {
        // Trigger non-blocking revalidation in background
        Promise.resolve().then(async () => {
          try {
            const freshData = await fetcherFn();
            if (freshData) {
              await this.set(key, freshData, { ...options, hits: cached.hits });
            }
          } catch (revalErr) {
            logger.warn({ key, error: revalErr.message }, 'Background SWR revalidation failed');
          }
        });
      }
      return { data: cached.value, fromCache: true, isStale: cached.isStale };
    }

    // Cache miss -> Synchronous fetch
    const freshData = await fetcherFn();
    if (freshData) {
      await this.set(key, freshData, options);
    }
    return { data: freshData, fromCache: false, isStale: false };
  }
}

export const cacheService = new CacheService();
export default cacheService;
