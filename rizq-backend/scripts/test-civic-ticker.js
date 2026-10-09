#!/usr/bin/env node
/**
 * Civic ticker site-config shape + sanitize rules (mirrors server POST mapping).
 */
'use strict';

const assert = require('assert');
const path = require('path');
const { sanitizeSafeUrl } = require(path.join(__dirname, '../lib/sanitizeHtml'));

function sanitizeCivicTicker(list) {
  const COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  return (list || []).slice(0, 30).map((item, idx) => {
    const rawColor = String(item.color || '').trim();
    let color = '#C9A84C';
    if (rawColor === 'urgent' || rawColor === 'red') color = '#ef4444';
    else if (rawColor === 'gold' || rawColor === 'default') color = '#C9A84C';
    else if (rawColor === 'navy') color = '#7dd3fc';
    else if (COLOR_RE.test(rawColor)) {
      color = rawColor.length === 4
        ? ('#' + rawColor[1] + rawColor[1] + rawColor[2] + rawColor[2] + rawColor[3] + rawColor[3])
        : rawColor;
    }
    const orderNum = Number(item.order);
    return {
      id: String(item.id || ('civic_' + Date.now() + '_' + idx)).slice(0, 60),
      textAr: String(item.textAr || '').slice(0, 220),
      textFr: String(item.textFr || '').slice(0, 220),
      color,
      priority: item.priority === 'urgent' || item.priority === 'high' || color === '#ef4444'
        ? 'urgent'
        : 'normal',
      link: sanitizeSafeUrl(item.link || '', 500),
      active: item.active !== false,
      order: Number.isFinite(orderNum) ? Math.max(0, Math.min(999, Math.round(orderNum))) : idx,
    };
  });
}

const out = sanitizeCivicTicker([
  { textAr: 'طوارئ', color: 'red', link: 'javascript:alert(1)', order: 2 },
  { textAr: 'توعية', color: '#0f0', link: 'https://example.com/x', order: 0, priority: 'normal' },
  { textAr: 'مهرجان', color: 'gold', active: false, order: 1 },
]);

assert.strictEqual(out.length, 3);
assert.strictEqual(out[0].color, '#ef4444');
assert.strictEqual(out[0].priority, 'urgent');
assert.strictEqual(out[0].link, ''); // javascript blocked
assert.strictEqual(out[1].color, '#00ff00');
assert.strictEqual(out[1].link, 'https://example.com/x');
assert.strictEqual(out[2].active, false);
assert.strictEqual(out[2].color, '#C9A84C');

// Frontend fallback must not be blank
const fs = require('fs');
const civicJs = fs.readFileSync(path.join(__dirname, '../../rizq_civic_ticker.js'), 'utf8');
assert.ok(civicJs.includes('FALLBACK'));
assert.ok(civicJs.includes('civicTicker'));
assert.ok(civicJs.includes('ticker-has-urgent'));

const panel = fs.readFileSync(path.join(__dirname, '../../rizq_cp_panel.html'), 'utf8');
assert.ok(panel.includes('شريط الخدمة العامة'));
assert.ok(panel.includes('civicSaveForm'));
assert.ok(panel.includes('civicTicker'));

const landing = fs.readFileSync(path.join(__dirname, '../../rizq_landing_v8.html'), 'utf8');
assert.ok(landing.includes('rizq_civic_ticker.js'));
assert.ok(landing.includes('civic-ticker-wrap'));
assert.ok(landing.includes('مباشر')); // live ads preserved

console.log('OK: civic ticker sanitize + wiring checks passed');
