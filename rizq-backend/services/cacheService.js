/**
 * Redis cache for hot reads (site-config, public ads, categories).
 * Graceful no-op when Redis is unavailable.
 */
'use strict';

const redis = require('../lib/redis');

const DEFAULT_TTL = Math.max(5, Number(process.env.CACHE_TTL_SECONDS) || 60);

async function cacheGet(key) {
  const client = redis.getClient();
  if (!client) return null;
  try {
    const raw = await client.get('cache:' + key);
    if (raw == null) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds) {
  const client = redis.getClient();
  if (!client) return false;
  try {
    const ttl = ttlSeconds == null ? DEFAULT_TTL : Math.max(1, Number(ttlSeconds) || DEFAULT_TTL);
    await client.set('cache:' + key, JSON.stringify(value), 'EX', ttl);
    return true;
  } catch (e) {
    return false;
  }
}

async function cacheDel(key) {
  const client = redis.getClient();
  if (!client) return false;
  try {
    await client.del('cache:' + key);
    return true;
  } catch (e) {
    return false;
  }
}

async function cacheDelPattern(_pattern) {
  // Explicit key invalidation preferred (avoids SCAN + keyPrefix pitfalls).
  await cacheDel(KEYS.SITE_CONFIG);
  await cacheDel(KEYS.ADS_PUBLIC);
  await cacheDel(KEYS.CATEGORIES);
  return 3;
}

async function getOrSet(key, loader, ttlSeconds) {
  const hit = await cacheGet(key);
  if (hit != null) return { value: hit, hit: true };
  const value = await loader();
  await cacheSet(key, value, ttlSeconds);
  return { value, hit: false };
}

const KEYS = {
  SITE_CONFIG: 'site-config:public',
  ADS_PUBLIC: 'ads:public',
  CATEGORIES: 'categories:config',
};

async function invalidateSiteConfig() {
  await cacheDel(KEYS.SITE_CONFIG);
}

async function invalidateAds() {
  await cacheDel(KEYS.ADS_PUBLIC);
  await cacheDelPattern('ads:*');
}

module.exports = {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  getOrSet,
  invalidateSiteConfig,
  invalidateAds,
  KEYS,
  DEFAULT_TTL,
};
