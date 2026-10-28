/**
 * Redis client — rate limits, sessions, cache.
 * Falls back to disabled (callers use memory) if Redis unavailable.
 * Require password in REDIS_URL when Redis has requirepass — no hardcoded default.
 *
 * REDIS_URL=redis://:PASSWORD@127.0.0.1:6379
 * REDIS_ENABLED=0 to force-disable
 */
'use strict';

let _client = null;
let _ready = null;
let _enabled = null;
let _backend = 'none'; // redis | memory | none

function redisEnabled() {
  if (_enabled != null) return _enabled;
  if (process.env.REDIS_ENABLED === '0' || process.env.REDIS_ENABLED === 'false') {
    _enabled = false;
    return false;
  }
  const url = String(process.env.REDIS_URL || '').trim();
  _enabled = !!url || process.env.REDIS_ENABLED === '1' || process.env.REDIS_ENABLED === 'true';
  return _enabled;
}

function redisUrl() {
  const url = String(process.env.REDIS_URL || '').trim();
  if (!url) {
    // No default password — only use host without auth when explicitly enabled without URL
    return 'redis://127.0.0.1:6379';
  }
  return url;
}

function getClient() {
  if (!redisEnabled()) return null;
  if (_client) return _client;
  const Redis = require('ioredis');
  _client = new Redis(redisUrl(), {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: true,
    keyPrefix: String(process.env.REDIS_KEY_PREFIX || 'rizq:'),
  });
  _client.on('error', (err) => {
    console.warn('[redis] error:', err && err.message);
  });
  return _client;
}

async function ready() {
  if (!redisEnabled()) {
    _backend = 'memory';
    return { ok: false, enabled: false, backend: 'memory' };
  }
  if (_ready) return _ready;
  _ready = (async () => {
    const client = getClient();
    if (!client) {
      _backend = 'memory';
      return { ok: false, enabled: false, backend: 'memory' };
    }
    try {
      if (client.status === 'wait' || client.status === 'close' || client.status === 'end') {
        await client.connect();
      } else if (client.status !== 'ready') {
        await new Promise((resolve, reject) => {
          const onReady = () => { cleanup(); resolve(); };
          const onErr = (e) => { cleanup(); reject(e); };
          const cleanup = () => {
            client.off('ready', onReady);
            client.off('error', onErr);
          };
          client.once('ready', onReady);
          client.once('error', onErr);
          if (client.status === 'ready') {
            cleanup();
            resolve();
          } else {
            client.connect().catch(onErr);
          }
        });
      }
      const pong = await client.ping();
      const safeUrl = redisUrl().replace(/:[^:@/]+@/, ':****@');
      console.log('[redis] ready (' + safeUrl + ') ping=' + pong);
      _backend = 'redis';
      return { ok: true, enabled: true, backend: 'redis' };
    } catch (e) {
      console.warn('[redis] unavailable — falling back to memory:', e && e.message);
      try { client.disconnect(); } catch (e2) { /* ignore */ }
      _client = null;
      _enabled = false;
      _ready = null;
      _backend = 'memory';
      return { ok: false, enabled: false, backend: 'memory', error: e.message };
    }
  })();
  return _ready;
}

function backend() {
  return _backend;
}

async function close() {
  if (_client) {
    try { await _client.quit(); } catch (e) { /* ignore */ }
    _client = null;
  }
  _ready = null;
  _backend = 'none';
}

module.exports = {
  redisEnabled,
  redisUrl,
  getClient,
  ready,
  close,
  backend,
};
