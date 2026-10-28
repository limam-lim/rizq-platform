/**
 * express-rate-limit store backed by Redis with in-memory fallback.
 */
'use strict';

const redis = require('./redis');

class MemoryHitStore {
  constructor(windowMs) {
    this.hits = new Map();
    this.windowMs = windowMs || 60_000;
  }
  async increment(key) {
    const now = Date.now();
    let row = this.hits.get(key);
    if (!row || row.resetTime <= now) {
      row = { totalHits: 0, resetTime: now + this.windowMs };
    }
    row.totalHits += 1;
    this.hits.set(key, row);
    return { totalHits: row.totalHits, resetTime: new Date(row.resetTime) };
  }
  async decrement(key) {
    const row = this.hits.get(key);
    if (row && row.totalHits > 0) {
      row.totalHits -= 1;
      this.hits.set(key, row);
    }
  }
  async resetKey(key) {
    this.hits.delete(key);
  }
  async shutdown() {
    this.hits.clear();
  }
}

class RedisHitStore {
  constructor(client, windowMs) {
    this.client = client;
    this.windowMs = windowMs || 60_000;
    this.prefix = 'rl:';
  }
  async increment(key) {
    const k = this.prefix + key;
    const multi = this.client.multi();
    multi.incr(k);
    multi.pttl(k);
    const res = await multi.exec();
    let totalHits = Number(res[0][1]) || 1;
    let ttl = Number(res[1][1]);
    if (ttl < 0) {
      await this.client.pexpire(k, this.windowMs);
      ttl = this.windowMs;
    }
    return { totalHits, resetTime: new Date(Date.now() + Math.max(ttl, 0)) };
  }
  async decrement(key) {
    try { await this.client.decr(this.prefix + key); } catch (e) { /* ignore */ }
  }
  async resetKey(key) {
    try { await this.client.del(this.prefix + key); } catch (e) { /* ignore */ }
  }
  async shutdown() { /* no-op */ }
}

let _store = null;
const _hybrids = new Map();

async function getRateLimitStore(windowMs) {
  if (_store) return _store;
  const st = await redis.ready();
  if (st.ok && redis.getClient()) {
    _store = new RedisHitStore(redis.getClient(), windowMs);
    console.log('[rate-limit] using Redis store');
  } else {
    _store = new MemoryHitStore(windowMs);
    console.log('[rate-limit] using in-memory store (Redis unavailable)');
  }
  return _store;
}

function createRateLimitStoreSyncFallback(windowMs) {
  // For express-rate-limit init before ready(): memory first, upgrade later via getRateLimitStore
  return new MemoryHitStore(windowMs);
}

/**
 * Hybrid store: memory at construction, upgrades to Redis after redis.ready().
 * Safe to pass into express-rate-limit before boot completes.
 */
function createHybridRateLimitStore(windowMs) {
  const ms = windowMs || 60_000;
  let inner = new MemoryHitStore(ms);
  let upgraded = false;
  let upgradePromise = null;

  async function ensureUpgraded() {
    if (upgraded) return inner;
    if (upgradePromise) return upgradePromise;
    upgradePromise = (async () => {
      try {
        const st = await redis.ready();
        if (st.ok && redis.getClient()) {
          inner = new RedisHitStore(redis.getClient(), ms);
          console.log('[rate-limit] hybrid upgraded to Redis (windowMs=' + ms + ')');
        } else {
          console.log('[rate-limit] hybrid staying in-memory (windowMs=' + ms + ')');
        }
      } catch (e) {
        console.warn('[rate-limit] hybrid upgrade failed — memory:', e && e.message);
      }
      upgraded = true;
      return inner;
    })();
    return upgradePromise;
  }

  return {
    windowMs: ms,
    async increment(key) {
      await ensureUpgraded();
      return inner.increment(key);
    },
    async decrement(key) {
      await ensureUpgraded();
      return inner.decrement(key);
    },
    async resetKey(key) {
      await ensureUpgraded();
      return inner.resetKey(key);
    },
    async shutdown() {
      return inner.shutdown();
    },
    ready: ensureUpgraded,
  };
}

function getOrCreateHybridStore(windowMs) {
  const ms = windowMs || 60_000;
  const key = String(ms);
  if (!_hybrids.has(key)) {
    _hybrids.set(key, createHybridRateLimitStore(ms));
  }
  return _hybrids.get(key);
}

/** Warm all known hybrid stores (call after redis.ready() during boot). */
async function warmRateLimitStores() {
  const stores = Array.from(_hybrids.values());
  if (!stores.length) {
    // Ensure at least the default API window is warmed
    stores.push(getOrCreateHybridStore(15 * 60 * 1000));
  }
  await Promise.all(stores.map((s) => s.ready()));
}

module.exports = {
  MemoryHitStore,
  RedisHitStore,
  getRateLimitStore,
  createRateLimitStoreSyncFallback,
  createHybridRateLimitStore,
  getOrCreateHybridStore,
  warmRateLimitStores,
};
