#!/usr/bin/env node
/**
 * check-unawaited-async.js — حارس دائم ضد أخطاء async/await (منذ هجرة SQLite → Postgres).
 *
 * يحلّل الكود الخادمي (AST) ويبلّغ عن أي استدعاء لدالة async لم يُنتظر (await):
 *   if (!isActive(x))          → Promise دائماً truthy → حماية تُتجاوز (fail-open)
 *   const r = verifyOtp(...)   → r.ok undefined → المسار يفشل دائماً
 *   await fn().map(...)        → أسبقية خاطئة
 *
 * يحلّ require() إلى التعريف الحقيقي، ويغطي: الاستيراد بالتفكيك، الاستيراد ككائن (X.fn())،
 * require('./m').fn()، واستدعاءات deps/repos/accountsHelpers.
 *
 * للاستثناء المقصود (fire-and-forget مع معالجة):  void fn()  أو  fn().catch(...)
 * أو تعليق في نفس السطر:  // await-ok: <السبب>
 *
 * الاستخدام:  npm run test:await        (exit 1 عند وجود ملاحظات)
 *            node scripts/check-unawaited-async.js --json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const walk = require('acorn-walk');

const BACKEND = path.resolve(__dirname, '..');
const JSON_OUT = process.argv.includes('--json');
const INCLUDE_SCRIPTS = process.argv.includes('--scripts');
const ARRAY_BUILTINS = new Set(['forEach', 'map', 'filter', 'find', 'findIndex', 'some', 'every', 'reduce', 'sort', 'push', 'includes', 'bind', 'call', 'apply']);
const DEPS = /^(deps|accountsHelpers|helpers|repos|store|ctx|services|svc|db|sql)$/;

function resolveMod(from, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.normalize(path.join(path.dirname(from), spec));
  for (const c of [base, base + '.js', path.join(base, 'index.js')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function listServerFiles() {
  const out = new Set();
  (function rec(d) {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      if (f.name === 'node_modules' || f.name.startsWith('.')) continue;
      const p = path.join(d, f.name);
      if (f.isDirectory()) { if (!/[\\/](fixtures|scripts|migrations|data|uploads|backups)$/.test(p)) rec(p); }
      else if (f.name.endsWith('.js')) out.add(p);
    }
  })(BACKEND);
  // ملفات الجذر التي يحمّلها الخادم عبر require (متعدٍّ)
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of [...out]) {
      const s = fs.readFileSync(f, 'utf8');
      for (const m of s.matchAll(/require\(\s*['"]((?:\.\.?\/)+[^'"]+)['"]\s*\)/g)) {
        const r = resolveMod(f, m[1]);
        if (r && !out.has(r) && !r.includes('node_modules') && fs.existsSync(r)) { out.add(r); changed = true; }
      }
    }
  }
  const files = [...out].filter((f) => !/[\\/]scripts[\\/]/.test(f));
  // --scripts: افحص أيضاً سكربتات التشغيل (scripts/*.js) التي تستدعي المستودع
  if (INCLUDE_SCRIPTS) {
    const sd = path.join(BACKEND, 'scripts');
    for (const f of fs.readdirSync(sd)) if (f.endsWith('.js')) files.push(path.join(sd, f));
  }
  return files;
}

const mods = new Map();
function parse(file) {
  if (mods.has(file)) return mods.get(file);
  const src = fs.readFileSync(file, 'utf8');
  let rec;
  try {
    rec = { src, lines: src.split('\n'), ast: acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowHashBang: true, allowReturnOutsideFunction: true }) };
  } catch (e) {
    rec = { src, lines: src.split('\n'), ast: null, err: e.message };
  }
  mods.set(file, rec);
  return rec;
}

const fileAsync = new Map();
const fileSync = new Map();
const globalAsync = new Set();
function indexFile(f) {
  if (fileAsync.has(f)) return;
  const { ast } = parse(f);
  const A = new Set(); const S = new Set();
  if (ast) {
    walk.full(ast, (n) => {
      if (n.type === 'FunctionDeclaration' && n.id) (n.async ? A : S).add(n.id.name);
      if (n.type === 'VariableDeclarator' && n.id && n.id.type === 'Identifier' && n.init &&
        (n.init.type === 'FunctionExpression' || n.init.type === 'ArrowFunctionExpression')) {
        (n.init.async ? A : S).add(n.id.name);
      }
      if (n.type === 'Property' && n.key && n.value &&
        (n.value.type === 'FunctionExpression' || n.value.type === 'ArrowFunctionExpression') && n.value.async) {
        const k = n.key.name || n.key.value; if (k) A.add(k);
      }
    });
  }
  for (const s of [...S]) if (A.has(s)) S.delete(s);
  fileAsync.set(f, A); fileSync.set(f, S);
  A.forEach((x) => globalAsync.add(x));
}

const importCache = new Map();
function importsOf(f) {
  if (importCache.has(f)) return importCache.get(f);
  const map = new Map();
  const { ast } = parse(f);
  if (ast) {
    walk.full(ast, (n) => {
      if (n.type !== 'VariableDeclarator' || !n.init) return;
      let call = n.init; let member = null;
      if (call.type === 'MemberExpression' && call.object.type === 'CallExpression') { member = call.property.name; call = call.object; }
      if (call.type !== 'CallExpression' || call.callee.name !== 'require' || !call.arguments[0] || call.arguments[0].type !== 'Literal') return;
      const mod = resolveMod(f, String(call.arguments[0].value));
      if (!mod) return;
      if (n.id.type === 'ObjectPattern') {
        for (const p of n.id.properties) {
          if (p.type !== 'Property') continue;
          map.set(p.value.name || p.key.name, { mod, orig: p.key.name || p.key.value });
        }
      } else if (n.id.type === 'Identifier' && member) {
        map.set(n.id.name, { mod, orig: member });
      } else if (n.id.type === 'Identifier') {
        map.set(n.id.name, { mod, ns: true });
      }
    });
  }
  importCache.set(f, map);
  return map;
}

function isAsyncExport(mod, name, seen = new Set()) {
  const key = mod + ':' + name;
  if (seen.has(key)) return false;
  seen.add(key);
  indexFile(mod);
  if (fileAsync.get(mod).has(name)) return true;
  const imp = importsOf(mod);
  if (imp.has(name) && !imp.get(name).ns) return isAsyncExport(imp.get(name).mod, imp.get(name).orig, seen);
  return false;
}

/** القيمة تتدفق إلى المستدعي (return / جسم arrow) عبر ?: أو || أو && */
function flowsToCaller(ancestors) {
  for (let i = ancestors.length - 2; i >= 0; i--) {
    const a = ancestors[i]; const child = ancestors[i + 1];
    if (a.type === 'ReturnStatement') return true;
    if (a.type === 'ArrowFunctionExpression' && a.body === child) return true;
    if (a.type === 'ConditionalExpression' && a.test !== child) continue;
    if (a.type === 'LogicalExpression' || a.type === 'ParenthesizedExpression') continue;
    return false;
  }
  return false;
}

const files = listServerFiles();
files.forEach(indexFile);
const findings = [];
for (const f of files) {
  const { ast, err, lines } = parse(f);
  const rel = path.relative(path.resolve(BACKEND, '..'), f);
  if (!ast) { findings.push({ file: rel, line: 0, name: '(parse error)', detail: err }); continue; }
  const imp = importsOf(f);
  const localA = fileAsync.get(f); const localS = fileSync.get(f);
  walk.ancestor(ast, {
    CallExpression(node, ancestors) {
      let name; let kind = null;
      if (node.callee.type === 'MemberExpression' && !node.callee.computed && node.callee.property.type === 'Identifier') {
        const prop = node.callee.property.name;
        if (ARRAY_BUILTINS.has(prop)) return;
        const obj = node.callee.object;
        let nsMod = null;
        if (obj.type === 'Identifier' && imp.has(obj.name) && imp.get(obj.name).ns) nsMod = imp.get(obj.name).mod;
        if (obj.type === 'CallExpression' && obj.callee.name === 'require' && obj.arguments[0] && obj.arguments[0].type === 'Literal') {
          nsMod = resolveMod(f, String(obj.arguments[0].value));
        }
        if (nsMod) {
          if (!isAsyncExport(nsMod, prop)) return;
          kind = 'module'; name = (obj.name || 'require()') + '.' + prop;
        } else {
          let root = obj;
          while (root && root.type === 'MemberExpression') root = root.object;
          // repos().x.list() — مستودع يُجلب عبر دالة كسولة
          const rootName = root && root.type === 'Identifier' ? root.name
            : (root && root.type === 'CallExpression' && root.callee.type === 'Identifier' && /^_?repos?$/.test(root.callee.name) ? 'repos' : '');
          if (!DEPS.test(rootName)) return;
          if (rootName === 'repos' || rootName === 'db') kind = 'repo';
          else if (globalAsync.has(prop)) kind = 'dep';
          else return;
          name = rootName + '.' + prop;
        }
      } else if (node.callee.type === 'Identifier') {
        name = node.callee.name;
        if (localA.has(name)) kind = 'local';
        else if (localS.has(name)) return;
        else if (imp.has(name) && !imp.get(name).ns) { if (isAsyncExport(imp.get(name).mod, imp.get(name).orig)) kind = 'import'; else return; }
        else if (globalAsync.has(name)) kind = 'dep';
        else return;
      } else return;

      const parent = ancestors[ancestors.length - 2];
      if (parent && parent.type === 'AwaitExpression') return;
      if (parent && parent.type === 'MemberExpression' && parent.object === node &&
        ['then', 'catch', 'finally'].includes(parent.property.name)) return;
      if (parent && parent.type === 'UnaryExpression' && parent.operator === 'void') return;
      if (flowsToCaller(ancestors)) return;
      if (ancestors.some((a) => a.type === 'CallExpression' && a.callee.type === 'MemberExpression' &&
        a.callee.object.type === 'Identifier' && a.callee.object.name === 'Promise')) return;
      // تمرير وعد إلى مصفوفة/دالة صراحةً (workers.push(worker()))
      if (parent && parent.type === 'CallExpression' && parent.arguments.includes(node) &&
        parent.callee.type === 'MemberExpression' && parent.callee.property.name === 'push') return;
      if (/\/\/\s*await-ok\b/.test(lines[node.loc.start.line - 1] || '')) return;

      let encl = null;
      for (let i = ancestors.length - 2; i >= 0; i--) {
        if (/Function/.test(ancestors[i].type)) { encl = ancestors[i]; break; }
      }
      findings.push({
        file: rel, line: node.loc.start.line, name, kind,
        enclosing: encl ? ((encl.id && encl.id.name) || '(anon)') : '(top-level)',
        enclosingAsync: !!(encl && encl.async),
        context: parent ? parent.type : '',
      });
    },
  });
}

if (JSON_OUT) process.stdout.write(JSON.stringify(findings, null, 1) + '\n');
else {
  for (const x of findings) {
    console.log(`${x.file}:${x.line}  ${x.name}  [${x.kind}] in ${x.enclosing}${x.enclosingAsync ? '' : ' (sync fn)'}  <${x.context}>`);
  }
  console.log(findings.length
    ? `\n✗ ${findings.length} unawaited async call(s) — add await, .catch(), void, or // await-ok: reason`
    : `✓ no unawaited async calls (${files.length} server files scanned)`);
}
process.exitCode = findings.length ? 1 : 0;
