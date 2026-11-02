#!/usr/bin/env node
'use strict';
/**
 * Phase 2 (conservative): within each @media / root bucket, merge rules that share
 * the exact same selector list. Last property wins. Rebuild rizq_landing.css concat.
 * Does not remove !important yet (separate pass with gate).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const PARTS = [
  'rizq_landing-fouc.css',
  'rizq_landing-mobile-critical.css',
  'rizq_landing-main.css',
  'rizq_landing-ads-preview.css'
];

function ensureLf(s) {
  return String(s).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Very small CSS rule tokenizer — good enough for this stylesheet (no nested @). */
function splitTopLevel(css) {
  const chunks = [];
  let i = 0;
  const n = css.length;
  while (i < n) {
    while (i < n && /\s/.test(css[i])) i++;
    if (i >= n) break;
    if (css.startsWith('/*', i)) {
      const end = css.indexOf('*/', i + 2);
      const j = end < 0 ? n : end + 2;
      chunks.push({ type: 'comment', text: css.slice(i, j) });
      i = j;
      continue;
    }
    if (css[i] === '@') {
      // @media / @keyframes / @supports / @font-face
      const brace = css.indexOf('{', i);
      if (brace < 0) {
        chunks.push({ type: 'other', text: css.slice(i) });
        break;
      }
      let depth = 0;
      let k = brace;
      for (; k < n; k++) {
        if (css[k] === '{') depth++;
        else if (css[k] === '}') {
          depth--;
          if (depth === 0) { k++; break; }
        }
      }
      const head = css.slice(i, brace).trim();
      const body = css.slice(brace + 1, k - 1);
      chunks.push({ type: 'at', head, body, text: css.slice(i, k) });
      i = k;
      continue;
    }
    // normal rule
    const brace = css.indexOf('{', i);
    if (brace < 0) {
      chunks.push({ type: 'other', text: css.slice(i) });
      break;
    }
    let depth = 0;
    let k = brace;
    for (; k < n; k++) {
      if (css[k] === '{') depth++;
      else if (css[k] === '}') {
        depth--;
        if (depth === 0) { k++; break; }
      }
    }
    const sel = css.slice(i, brace).trim();
    const body = css.slice(brace + 1, k - 1);
    chunks.push({ type: 'rule', sel, body, text: css.slice(i, k) });
    i = k;
  }
  return chunks;
}

function parseDecls(body) {
  const map = new Map();
  const order = [];
  String(body).split(';').forEach((raw) => {
    const t = raw.trim();
    if (!t) return;
    const colon = t.indexOf(':');
    if (colon < 0) return;
    const prop = t.slice(0, colon).trim().toLowerCase();
    const val = t.slice(colon + 1).trim();
    if (!map.has(prop)) order.push(prop);
    map.set(prop, val);
  });
  return { map, order };
}

function declsToBody(map, order) {
  return order.filter((p) => map.has(p)).map((p) => p + ':' + map.get(p)).join(';') + (order.length ? ';' : '');
}

function mergeRuleBodies(bodies) {
  const map = new Map();
  const order = [];
  bodies.forEach((b) => {
    const d = parseDecls(b);
    d.order.forEach((p) => {
      if (!map.has(p)) order.push(p);
      map.set(p, d.map.get(p));
    });
  });
  return declsToBody(map, order);
}

function dedupeChunkList(chunks) {
  const bySel = new Map();
  const out = [];
  let merged = 0;
  chunks.forEach((c, idx) => {
    if (c.type !== 'rule') {
      out.push(c);
      return;
    }
    const key = c.sel.replace(/\s+/g, ' ').trim();
    if (bySel.has(key)) {
      const prev = bySel.get(key);
      prev.bodies.push(c.body);
      prev.indexes.push(idx);
      merged++;
    } else {
      const entry = { sel: key, bodies: [c.body], indexes: [idx], outIndex: out.length };
      bySel.set(key, entry);
      out.push({ type: 'rule', sel: key, body: c.body, entry });
    }
  });
  // finalize bodies
  out.forEach((c) => {
    if (c.type === 'rule' && c.entry) {
      c.body = mergeRuleBodies(c.entry.bodies);
      delete c.entry;
    }
  });
  return { chunks: out, merged };
}

function serialize(chunks) {
  return chunks.map((c) => {
    if (c.type === 'rule') return c.sel + '{' + c.body + '}';
    if (c.type === 'at') {
      const inner = splitTopLevel(c.body);
      const ded = dedupeChunkList(inner);
      return c.head + '{' + serialize(ded.chunks) + '}';
    }
    return c.text;
  }).join('\n');
}

function processFile(rel) {
  const fp = path.join(ROOT, rel);
  const raw = ensureLf(fs.readFileSync(fp, 'utf8'));
  const chunks = splitTopLevel(raw);
  // top-level dedupe
  const top = dedupeChunkList(chunks);
  // also dedupe inside @media (serialize already does)
  // recount merges inside at-rules
  let merged = top.merged;
  top.chunks.forEach((c) => {
    if (c.type === 'at') {
      const inner = dedupeChunkList(splitTopLevel(c.body));
      merged += inner.merged;
      c.body = serialize(inner.chunks);
      // prevent double serialize of at body
      c._done = true;
    }
  });
  const out = top.chunks.map((c) => {
    if (c.type === 'rule') return c.sel + '{' + c.body + '}';
    if (c.type === 'at') return c.head + '{' + c.body + '}';
    return c.text;
  }).join('\n') + '\n';
  fs.writeFileSync(fp, ensureLf(out), 'utf8');
  return { file: rel, merged, before: raw.length, after: out.length };
}

function rebuildConcat() {
  const parts = PARTS.map((p) => fs.readFileSync(path.join(ROOT, p), 'utf8'));
  fs.writeFileSync(path.join(ROOT, 'rizq_landing.css'), ensureLf(parts.join('\n')), 'utf8');
}

const results = PARTS.map(processFile);
rebuildConcat();
const important = (fs.readFileSync(path.join(ROOT, 'rizq_landing.css'), 'utf8').match(/!important/g) || []).length;
console.log(JSON.stringify({ ok: true, results, important }, null, 2));
