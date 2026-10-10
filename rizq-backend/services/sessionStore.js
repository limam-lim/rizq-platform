/**
 * Admin session store — Redis + memory (Map-compatible for existing middleware).
 * set/delete are sync for call-site compatibility; Redis write-through is async.
 * getAsync hydrates from Redis when memory miss (multi-instance).
 */
'use strict';

const crypto = require('crypto');
const redis = require('../lib/redis');

const MEM = new Map();
const KEY_PREFIX = 'admin:sess:';

function ttlSeconds(expiresAt) {
  const ms = Number(expiresAt) - Date.now();
  return Math.max(1, Math.ceil(ms / 1000));
}

function createSessionStore() {
  const store = {
    get(token) {
      const key = String(token || '');
      if (!key) return undefined;
      const sess = MEM.get(key);
      if (!sess) return undefined;
      if (sess.expiresAt < Date.now()) {
        store.delete(key);
        return undefined;
      }
      return sess;
    },

    async getAsync(token) {
      const key = String(token || '');
      if (!key) return undefined;
      const local = store.get(key);
      if (local) return local;
      const client = redis.getClient();
      if (!client) return undefined;
      try {
        const raw = await client.get(KEY_PREFIX + key);
        if (!raw) return undefined;
        const sess = JSON.parse(raw);
        if (!sess || sess.expiresAt < Date.now()) {
          await client.del(KEY_PREFIX + key);
          return undefined;
        }
        MEM.set(key, sess);
        return sess;
      } catch (e) {
        console.warn('[sessionStore] redis get failed:', e.message);
        return undefined;
      }
    },

    set(token, sess) {
      const key = String(token || '');
      if (!key || !sess) return store;
      MEM.set(key, sess);
      const client = redis.getClient();
      if (client) {
        const ttl = ttlSeconds(sess.expiresAt);
        client.set(KEY_PREFIX + key, JSON.stringify(sess), 'EX', ttl).catch((e) => {
          console.warn('[sessionStore] redis set failed:', e.message);
        });
      }
      return store;
    },

    delete(token) {
      const key = String(token || '');
      MEM.delete(key);
      const client = redis.getClient();
      if (client) client.del(KEY_PREFIX + key).catch(() => {});
      return true;
    },

    has(token) {
      return !!store.get(token);
    },

    forEach(fn) {
      MEM.forEach(fn);
    },

    newToken() {
      return crypto.randomBytes(24).toString('hex');
    },
  };
  return store;
}

module.exports = { createSessionStore };
