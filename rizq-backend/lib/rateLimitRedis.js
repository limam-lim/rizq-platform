/**
 * express-rate-limit store — Redis when available, otherwise library MemoryStore.
 */
'use strict';

const rateLimit = require('express-rate-limit');
const redis = require('./redis');

function buildRedisStore() {
  if (!redis.redisEnabled()) return undefined;
  try {
    const { RedisStore } = require('rate-limit-redis');
    return new RedisStore({
      prefix: 'rl:',
      sendCommand: (...args) => {
        const client = redis.getClient();
        if (!client) {
          return Promise.reject(new Error('redis_client_unavailable'));
        }
        return client.call(...args);
      },
    });
  } catch (e) {
    console.warn('[rate-limit] RedisStore unavailable:', e && e.message);
    return undefined;
  }
}

/**
 * @param {import('express-rate-limit').Options} opts
 */
function createLimiter(opts) {
  const conf = Object.assign({}, opts);
  const store = buildRedisStore();
  if (store) conf.store = store;
  return rateLimit(conf);
}

module.exports = { createLimiter, buildRedisStore };
