/**
 * Unified SQL helpers — async Pool API + sync facade for legacy call sites.
 *
 * Postgres: pg.Pool (async). Sync helpers use deasync only at the query
 * boundary so existing Express handlers keep working while replicas share
 * one database. Prefer await query()/execute() in new code.
 */
'use strict';

const engine = require('./engine');

let _deasync = null;
function deasync() {
  if (!_deasync) _deasync = require('deasync');
  return _deasync;
}

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

function awaitReady() {
  let done = false;
  let err = null;
  engine.ready().then(() => { done = true; }).catch((e) => { err = e; done = true; });
  deasync().loopWhile(() => !done);
  if (err) throw err;
}

async function query(sql, params) {
  await engine.ready();
  const norm = normalizeNamed(sql, params);
  if (engine.isPostgres) {
    const text = toPgPlaceholders(adaptPgSql(norm.text));
    const res = await engine.getPool().query(text, norm.values);
    return res.rows;
  }
  const db = engine.getSqlite();
  return db.prepare(norm.text).all(...norm.values);
}

async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function execute(sql, params) {
  await engine.ready();
  const norm = normalizeNamed(sql, params);
  if (engine.isPostgres) {
    const text = toPgPlaceholders(adaptPgSql(norm.text));
    const res = await engine.getPool().query(text, norm.values);
    return { changes: res.rowCount || 0, rows: res.rows };
  }
  const db = engine.getSqlite();
  const r = db.prepare(norm.text).run(...norm.values);
  return { changes: r.changes || 0, rows: [] };
}

async function execScript(sql) {
  await engine.ready();
  if (engine.isPostgres) {
    await engine.getPool().query(sql);
    return;
  }
  engine.getSqlite().exec(sql);
}

async function withTransaction(fn) {
  await engine.ready();
  if (engine.isPostgres) {
    const client = await engine.getPool().connect();
    try {
      await client.query('BEGIN');
      const tx = {
        async query(sql, params) {
          const norm = normalizeNamed(sql, params);
          const text = toPgPlaceholders(adaptPgSql(norm.text));
          const res = await client.query(text, norm.values);
          return res.rows;
        },
        async queryOne(sql, params) {
          const rows = await tx.query(sql, params);
          return rows[0] || null;
        },
        async execute(sql, params) {
          const norm = normalizeNamed(sql, params);
          const text = toPgPlaceholders(adaptPgSql(norm.text));
          const res = await client.query(text, norm.values);
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

  const db = engine.getSqlite();
  db.exec('BEGIN');
  try {
    const tx = {
      async query(sql, params) {
        const norm = normalizeNamed(sql, params);
        return db.prepare(norm.text).all(...norm.values);
      },
      async queryOne(sql, params) {
        const norm = normalizeNamed(sql, params);
        return db.prepare(norm.text).get(...norm.values) || null;
      },
      async execute(sql, params) {
        const norm = normalizeNamed(sql, params);
        const r = db.prepare(norm.text).run(...norm.values);
        return { changes: r.changes || 0, rows: [] };
      },
    };
    const result = await fn(tx);
    db.exec('COMMIT');
    return result;
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch (e2) { /* ignore */ }
    throw e;
  }
}

function syncify(promiseFactory) {
  let done = false;
  let err = null;
  let result = null;
  Promise.resolve()
    .then(() => promiseFactory())
    .then((r) => { result = r; done = true; })
    .catch((e) => { err = e; done = true; });
  deasync().loopWhile(() => !done);
  if (err) throw err;
  return result;
}

function querySync(sql, params) {
  awaitReady();
  if (!engine.isPostgres) {
    const norm = normalizeNamed(sql, params);
    return engine.getSqlite().prepare(norm.text).all(...norm.values);
  }
  return syncify(() => query(sql, params));
}

function queryOneSync(sql, params) {
  awaitReady();
  if (!engine.isPostgres) {
    const norm = normalizeNamed(sql, params);
    return engine.getSqlite().prepare(norm.text).get(...norm.values) || null;
  }
  return syncify(() => queryOne(sql, params));
}

function executeSync(sql, params) {
  awaitReady();
  if (!engine.isPostgres) {
    const norm = normalizeNamed(sql, params);
    const r = engine.getSqlite().prepare(norm.text).run(...norm.values);
    return { changes: r.changes || 0, rows: [] };
  }
  return syncify(() => execute(sql, params));
}

function withTransactionSync(fn) {
  awaitReady();
  if (!engine.isPostgres) {
    const db = engine.getSqlite();
    db.exec('BEGIN');
    try {
      const tx = {
        query: (sql, params) => {
          const norm = normalizeNamed(sql, params);
          return db.prepare(norm.text).all(...norm.values);
        },
        queryOne: (sql, params) => {
          const norm = normalizeNamed(sql, params);
          return db.prepare(norm.text).get(...norm.values) || null;
        },
        execute: (sql, params) => {
          const norm = normalizeNamed(sql, params);
          const r = db.prepare(norm.text).run(...norm.values);
          return { changes: r.changes || 0, rows: [] };
        },
      };
      const result = fn(tx);
      db.exec('COMMIT');
      return result;
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch (e2) { /* ignore */ }
      throw e;
    }
  }
  return syncify(() => withTransaction(async (tx) => {
    const syncTx = {
      query: (sql, params) => syncify(() => tx.query(sql, params)),
      queryOne: (sql, params) => syncify(() => tx.queryOne(sql, params)),
      execute: (sql, params) => syncify(() => tx.execute(sql, params)),
    };
    return fn(syncTx);
  }));
}

module.exports = {
  query,
  queryOne,
  execute,
  execScript,
  withTransaction,
  querySync,
  queryOneSync,
  executeSync,
  withTransactionSync,
  toPgPlaceholders,
  normalizeNamed,
};
