'use strict';
/**
 * أرقام بطاقة الإحصاءات من نفس مصدر القائمة (rizq_categories_config.js).
 * الأقسام + الفروع تُحسب من BUILTIN؛ الولايات ثابتة 15.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const WILAYAS_FIXED = 15;
const CONFIG_PATH = path.join(__dirname, '..', '..', 'rizq_categories_config.js');

let _cache = null;
let _cacheMtime = 0;

function loadRizqCategories() {
  const st = fs.statSync(CONFIG_PATH);
  if (_cache && st.mtimeMs === _cacheMtime) return _cache;
  const src = fs.readFileSync(CONFIG_PATH, 'utf8');
  const sandbox = {
    console,
    localStorage: { getItem: function () { return null; }, setItem: function () {} },
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  const RC = sandbox.RizqCategories;
  if (!RC || !Array.isArray(RC.BUILTIN)) {
    throw new Error('RizqCategories.BUILTIN missing from rizq_categories_config.js');
  }
  _cache = RC;
  _cacheMtime = st.mtimeMs;
  return RC;
}

function countFromBuiltin(builtin) {
  const cats = builtin.length;
  let subs = 0;
  for (let i = 0; i < builtin.length; i++) {
    const c = builtin[i];
    if (Array.isArray(c.subcats) && c.subcats.length) {
      subs += c.subcats.length;
      continue;
    }
    const groups = c.groups || [];
    for (let g = 0; g < groups.length; g++) {
      subs += (groups[g].subs || []).length;
    }
  }
  return { cats: cats, subs: subs };
}

function getCategoryStats() {
  const RC = loadRizqCategories();
  const counts = countFromBuiltin(RC.BUILTIN);
  return {
    cats: counts.cats,
    subs: counts.subs,
    wilayas: WILAYAS_FIXED,
    source: 'rizq_categories_config.js',
  };
}

/**
 * يحقن أرقام الأقسام/الفروع/الولايات في بطاقة #platform-stats.
 * خانة الإعلانات تُحقن عبر lib/adsStat.js في sendRizqHtmlFile.
 */
function injectCategoryStats(html, stats) {
  if (typeof html !== 'string' || !html) return html;
  const s = stats || getCategoryStats();
  const cats = Math.max(0, Number(s.cats) || 0);
  const subs = Math.max(0, Number(s.subs) || 0);
  const wilayas = Math.max(0, Number(s.wilayas) || WILAYAS_FIXED);

  let out = html;
  function patch(key, target, text, extraAttrs) {
    const attrs = extraAttrs || '';
    const reMarked = new RegExp(
      '(<span class="h-stat-num"[^>]*data-rizq-stat="' + key + '"[^>]*)>([^<]*)(<\/span>)',
      'i'
    );
    if (reMarked.test(out)) {
      out = out.replace(reMarked, function (_m, open, _old, close) {
        let o = open
          .replace(/\sdata-target="[^"]*"/i, '')
          .replace(/\sdata-suffix="[^"]*"/i, '');
        return o + ' data-target="' + target + '"' + attrs + '>' + text + close;
      });
      return;
    }
    const reBlock = new RegExp(
      '(<div class="h-stat"[^>]*data-stat="' + key + '"[^>]*>\s*<span class="h-stat-num")[^>]*>([^<]*)(<\/span>)',
      'i'
    );
    out = out.replace(reBlock, '$1 data-target="' + target + '" data-rizq-stat="' + key + '"' + attrs + '>' + text + '$3');
  }
  patch('cats', String(cats), String(cats), '');
  patch('subs', String(subs), String(subs) + '+', ' data-suffix="+"');
  patch('wilayas', String(wilayas), String(wilayas), '');
  return out;
}

module.exports = {
  WILAYAS_FIXED,
  CONFIG_PATH,
  loadRizqCategories,
  countFromBuiltin,
  getCategoryStats,
  injectCategoryStats,
};
