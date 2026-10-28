/**
 * Generic session store — Redis hash/JSON with memory fallback.
 * Separate from adminSessionStore (Postgres-backed admin tokens).
 */
'use strict';

const crypto = require('crypto');
const redis = require('../lib/redis');

const mem = new Map(); // sid -> { data, expiresAt }

function genId() {
  return crypto.randomBytes(24).toString('hex');
}

async function get(sid) {
  if (!sid) return null;
  const st = await redis.ready();
  const client = redis.getClient();
  if (st.ok && client) {
    try {
      const raw = await client.get('sess:' + sid);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
        await client.del('sess:' + sid);
        return null;
      }
      return parsed.data;
    } catch (e) {
      console.warn('[sessionStore] redis get failed:', e.message);
    }
  }
  const row = mem.get(String(sid));
  if (!row) return null;
  if (row.expiresAt && row.expiresAt < Date.now()) {
    mem.delete(String(sid));
    return null;
  }
  return row.data;
}

async function set(sid, data, ttlSec) {
  const id = sid || genId();
  const ttl = Math.max(60, Number(ttlSec) || 12 * 3600);
  const expiresAt = Date.now() + ttl * 1000;
  const payload = { data, expiresAt };
  const st = await redis.ready();
  const client = redis.getClient();
  if (st.ok && client) {
    try {
      await client.set('sess:' + id, JSON.stringify(payload), 'EX', ttl);
      return id;
    } catch (e) {
      console.warn('[sessionStore] redis set failed:', e.message);
    }
  }
  mem.set(String(id), payload);
  return id;
}

async function destroy(sid) {
  if (!sid) return false;
  const st = await redis.ready();
  const client = redis.getClient();
  if (st.ok && client) {
    try { await client.del('sess:' + sid); } catch (e) { /* ignore */ }
  }
  return mem.delete(String(sid));
}

module.exports = { get, set, destroy, genId };
