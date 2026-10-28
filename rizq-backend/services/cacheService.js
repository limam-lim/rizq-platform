/**
 * Cache service — Redis with in-memory Map fallback.
 */
'use strict';

const redis = require('../lib/redis');

const mem = new Map(); // key -> { value, expiresAt }

function memGet(key) {
  const row = mem.get(key);
  if (!row) return null;
  if (row.expiresAt && row.expiresAt < Date.now()) {
    mem.delete(key);
    return null;
  }
  return row.value;
}

function memSet(key, value, ttlSec) {
  const expiresAt = ttlSec ? Date.now() + ttlSec * 1000 : 0;
  mem.set(key, { value, expiresAt });
}

async function get(key) {
  const st = await redis.ready();
  const client = redis.getClient();
  if (st.ok && client) {
    try {
      const raw = await client.get('cache:' + key);
      if (raw == null) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[cache] redis get failed:', e.message);
    }
  }
  return memGet(key);
}

async function set(key, value, ttlSec) {
  const ttl = Math.max(1, Number(ttlSec) || 60);
  const st = await redis.ready();
  const client = redis.getClient();
  if (st.ok && client) {
    try {
      await client.set('cache:' + key, JSON.stringify(value), 'EX', ttl);
      return true;
    } catch (e) {
      console.warn('[cache] redis set failed:', e.message);
    }
  }
  memSet(key, value, ttl);
  return true;
}

async function del(key) {
  const st = await redis.ready();
  const client = redis.getClient();
  if (st.ok && client) {
    try { await client.del('cache:' + key); } catch (e) { /* ignore */ }
  }
  mem.delete(key);
}

async function wrap(key, ttlSec, producer) {
  const hit = await get(key);
  if (hit != null) return hit;
  const value = await producer();
  await set(key, value, ttlSec);
  return value;
}

module.exports = { get, set, del, wrap };
