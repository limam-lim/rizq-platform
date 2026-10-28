/**
 * Small helpers for async store / model call sites.
 */
'use strict';

/** Await every value in an object of promises; return resolved object. */
async function awaitProps(obj) {
  const keys = Object.keys(obj || {});
  const values = await Promise.all(keys.map((k) => obj[k]));
  const out = {};
  keys.forEach((k, i) => { out[k] = values[i]; });
  return out;
}

/** Map async over an array with optional concurrency limit (default unlimited). */
async function mapAsync(list, fn, concurrency) {
  const arr = Array.isArray(list) ? list : [];
  const limit = Math.max(1, Number(concurrency) || arr.length || 1);
  const out = new Array(arr.length);
  let idx = 0;
  async function worker() {
    while (idx < arr.length) {
      const i = idx++;
      out[i] = await fn(arr[i], i);
    }
  }
  const workers = [];
  for (let w = 0; w < Math.min(limit, arr.length); w++) workers.push(worker());
  await Promise.all(workers);
  return out;
}

module.exports = { awaitProps, mapAsync };
