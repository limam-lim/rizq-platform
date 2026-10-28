/**
 * Async SQL helpers ONLY — pg.Pool via db/pool.
 * Supports ? placeholders and @name / :name named params.
 * NO deasync. NO sync helpers.
 */
'use strict';

const poolMod = require('./pool');

function toPgPlaceholders(sql) {
  let i = 0;
  return String(sql).replace(/\?/g, () => '$' + (++i));
}

function normalizeNamed(sql, params) {
  if (params == null) return { text: sql, values: [] };
  if (Array.isArray(params)) return { text: sql, values: params };
  if (typeof params !== 'object') return { text: sql, values: [params] };

  const values = [];
  const text = String(sql).replace(/[@$:]([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, name, offset, whole) => {
    if (match[0] === '$' && /^\d+$/.test(name)) return match;
    if (match[0] === ':' && offset > 0 && whole[offset - 1] === ':') return match;
    if (!Object.prototype.hasOwnProperty.call(params, name)) {
      throw new Error('[sql] missing named parameter: ' + name);
    }
    values.push(params[name]);
    return '?';
  });
  return { text, values };
}

function adaptPgSql(sql) {
  let s = String(sql);
  s = s.replace(/\bINSERT\s+OR\s+IGNORE\b/gi, 'INSERT');
  s = s.replace(/\bINSERT\s+OR\s+REPLACE\b/gi, 'INSERT');
  return s;
}

function prepare(sql, params) {
  const norm = normalizeNamed(sql, params);
  const text = toPgPlaceholders(adaptPgSql(norm.text));
  return { text, values: norm.values };
}

async function query(sql, params) {
  await poolMod.ready();
  const { text, values } = prepare(sql, params);
  const res = await poolMod.getPool().query(text, values);
  return res.rows;
}

async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function execute(sql, params) {
  await poolMod.ready();
  const { text, values } = prepare(sql, params);
  const res = await poolMod.getPool().query(text, values);
  return { changes: res.rowCount || 0, rows: res.rows };
}

async function execScript(sqlText) {
  await poolMod.ready();
  await poolMod.getPool().query(sqlText);
}

async function withTransaction(fn) {
  await poolMod.ready();
  const client = await poolMod.getPool().connect();
  try {
    await client.query('BEGIN');
    const tx = {
      async query(sql, params) {
        const { text, values } = prepare(sql, params);
        const res = await client.query(text, values);
        return res.rows;
      },
      async queryOne(sql, params) {
        const rows = await tx.query(sql, params);
        return rows[0] || null;
      },
      async execute(sql, params) {
        const { text, values } = prepare(sql, params);
        const res = await client.query(text, values);
        return { changes: res.rowCount || 0, rows: res.rows };
      },
    };
    const result = await fn(tx);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (e2) { /* ignore */ }
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  query,
  queryOne,
  execute,
  execScript,
  withTransaction,
  toPgPlaceholders,
  normalizeNamed,
  prepare,
};
