/**
 * express-rate-limit store backed by Redis with in-memory fallback.
 */
'use strict';

const redis = require('./redis');

class MemoryHitStore {
  constructor() {
    this.hits = new Map();
  }
  async increment(key) {
    const now = Date.now();
    let row = this.hits.get(key);
    if (!row || row.resetTime <= now) {
      row = { totalHits: 0, resetTime: now + 60_000 };
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

async function getRateLimitStore(windowMs) {
  if (_store) return _store;
  const st = await redis.ready();
  if (st.ok && redis.getClient()) {
    _store = new RedisHitStore(redis.getClient(), windowMs);
    console.log('[rate-limit] using Redis store');
  } else {
    _store = new MemoryHitStore();
    console.log('[rate-limit] using in-memory store (Redis unavailable)');
  }
  return _store;
}

function createRateLimitStoreSyncFallback(windowMs) {
  // For express-rate-limit init before ready(): memory first, upgrade later via getRateLimitStore
  const mem = new MemoryHitStore();
  mem.windowMs = windowMs;
  return mem;
}

module.exports = {
  MemoryHitStore,
  RedisHitStore,
  getRateLimitStore,
  createRateLimitStoreSyncFallback,
};
