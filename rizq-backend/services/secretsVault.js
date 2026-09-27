/**
 * secretsVault.js — خزنة أسرار السوبر أدمن
 *
 * - تخزين مشفّر AES-256-GCM في SQLite
 * - لا تُعاد الأسرار كاملة للمتصفح (قناع فقط)
 * - تُطبَّق على process.env عند الإقلاع وبعد الحفظ
 * - اختيارياً تُحدَّث rizq-backend/.env للاستمرار بعد إعادة التشغيل
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/** تعريف الخانات الجاهزة — المجموعات تظهر في لوحة السوبر أدمن */
const SECRET_SLOTS = [
  {
    group: 'claude',
    groupLabelAr: 'Anthropic / Claude (وكلاء الذكاء)',
    keys: [
      { key: 'ANTHROPIC_API_KEY', labelAr: 'مفتاح Claude (Anthropic)', secret: true, placeholder: 'sk-ant-...' },
      { key: 'CLAUDE_API_KEY', labelAr: 'بديل CLAUDE_API_KEY (اختياري)', secret: true, placeholder: 'sk-ant-...' },
    ],
  },
  {
    group: 'facebook',
    groupLabelAr: 'فيسبوك (مدير التسويق)',
    keys: [
      { key: 'FACEBOOK_PAGE_ID', labelAr: 'معرّف صفحة فيسبوك', secret: false, placeholder: '1234567890' },
      { key: 'FACEBOOK_PAGE_ACCESS_TOKEN', labelAr: 'توكن صفحة فيسبوك', secret: true, placeholder: 'EAAG...' },
      { key: 'FACEBOOK_API_VERSION', labelAr: 'إصدار Graph API', secret: false, placeholder: 'v21.0' },
    ],
  },
  {
    group: 'twilio',
    groupLabelAr: 'Twilio (مكالمات / SMS / واتساب عبر Twilio)',
    keys: [
      { key: 'TWILIO_SID', labelAr: 'Account SID', secret: false, placeholder: 'AC...' },
      { key: 'TWILIO_AUTH_TOKEN', labelAr: 'Auth Token', secret: true, placeholder: '...' },
      { key: 'TWILIO_TOKEN', labelAr: 'TWILIO_TOKEN (إن وُجد كبديل)', secret: true, placeholder: '...' },
      { key: 'RIZQ_TWILIO_NUMBER', labelAr: 'رقم Twilio للمنصة', secret: false, placeholder: '+1...' },
      { key: 'RIZQ_ADMIN_PHONE', labelAr: 'هاتف الإدارة للتنبيهات', secret: false, placeholder: '+222...' },
      { key: 'TWILIO_WEBHOOK_BASE_URL', labelAr: 'رابط Webhook الأساسي', secret: false, placeholder: 'https://...' },
    ],
  },
  {
    group: 'telegram',
    groupLabelAr: 'تيليغرام (تنبيهات الإدارة)',
    keys: [
      { key: 'TELEGRAM_BOT_TOKEN', labelAr: 'توكن بوت تيليغرام', secret: true, placeholder: '123456:ABC...' },
      { key: 'TELEGRAM_ADMIN_CHAT_ID', labelAr: 'Chat ID للإدارة', secret: false, placeholder: '-100...' },
    ],
  },
];

const KNOWN_KEYS = SECRET_SLOTS.reduce((acc, g) => {
  g.keys.forEach((k) => { acc[k.key] = k; });
  return acc;
}, {});

let _repos = null;
function repos() {
  if (!_repos) _repos = require('../db/repos');
  return _repos;
}

function vaultMasterMaterial() {
  const raw = String(
    process.env.SECRETS_VAULT_KEY ||
    process.env.BACKEND_SHARED_SECRET ||
    process.env.RIZQ_API_SECRET ||
    'rizq-dev-vault-unconfigured'
  ).trim();
  return crypto.createHash('sha256').update('rizq-vault-v1:' + raw).digest();
}

function encryptJson(obj) {
  const key = vaultMasterMaterial();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plain = Buffer.from(JSON.stringify(obj || {}), 'utf8');
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: enc.toString('base64'),
  };
}

function decryptJson(blob) {
  if (!blob || !blob.data || !blob.iv || !blob.tag) return {};
  const key = vaultMasterMaterial();
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(blob.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(blob.tag, 'base64'));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(blob.data, 'base64')),
    decipher.final(),
  ]);
  return JSON.parse(dec.toString('utf8'));
}

function readVaultStore() {
  return repos().secretsVault.get('_root') || { blob: null, custom: [], meta: {} };
}

function writeVaultStore(store) {
  repos().secretsVault.upsert('_root', store && typeof store === 'object' ? store : { blob: null, custom: [], meta: {} });
}

function loadSecretsMap() {
  const store = readVaultStore();
  try {
    return decryptJson(store.blob) || {};
  } catch (e) {
    console.warn('[secretsVault] decrypt failed — check SECRETS_VAULT_KEY / BACKEND_SHARED_SECRET:', e.message);
    return {};
  }
}

function maskSecret(value, isSecret) {
  const s = String(value || '');
  if (!s) return { set: false, masked: '', length: 0 };
  if (!isSecret) {
    return { set: true, masked: s.length > 48 ? s.slice(0, 20) + '…' + s.slice(-6) : s, length: s.length };
  }
  if (s.length <= 8) return { set: true, masked: '••••••••', length: s.length };
  return {
    set: true,
    masked: s.slice(0, 4) + '…' + s.slice(-4),
    length: s.length,
  };
}

function applySecretsToEnv(map) {
  const applied = [];
  Object.keys(map || {}).forEach((k) => {
    const v = String(map[k] == null ? '' : map[k]).trim();
    if (!v) return;
    if (!/^[A-Z][A-Z0-9_]*$/.test(k)) return;
    process.env[k] = v;
    applied.push(k);
  });
  // مزامنة بديل Claude
  if (!process.env.ANTHROPIC_API_KEY && process.env.CLAUDE_API_KEY) {
    process.env.ANTHROPIC_API_KEY = process.env.CLAUDE_API_KEY;
  }
  try {
    const anthropic = require('../config/anthropic');
    if (typeof anthropic.invalidateAnthropicClient === 'function') {
      anthropic.invalidateAnthropicClient();
    }
    if (typeof anthropic.ensureAnthropicEnv === 'function') {
      anthropic.ensureAnthropicEnv();
    }
  } catch (e) { /* */ }
  return applied;
}

function escapeEnvValue(v) {
  const s = String(v);
  if (/[\s#"']/.test(s)) return JSON.stringify(s);
  return s;
}

function syncEnvFile(map) {
  const envPath = path.join(__dirname, '..', '.env');
  let lines = [];
  if (fs.existsSync(envPath)) {
    lines = fs.readFileSync(envPath, 'utf8').split(/\n/);
  } else {
    lines = [
      '# رزق — أسرار الخادم (لا ترفع إلى Git)',
      '# تُحدَّث تلقائياً من خزنة السوبر أدمن',
      '',
    ];
  }

  const keysToWrite = Object.keys(map || {}).filter((k) => {
    const v = String(map[k] == null ? '' : map[k]).trim();
    return v && /^[A-Z][A-Z0-9_]*$/.test(k);
  });

  const seen = new Set();
  const out = lines.map((line) => {
    const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!m) return line;
    const key = m[1];
    if (keysToWrite.indexOf(key) === -1) return line;
    seen.add(key);
    return key + '=' + escapeEnvValue(String(map[key]).trim());
  });

  keysToWrite.forEach((key) => {
    if (seen.has(key)) return;
    out.push(key + '=' + escapeEnvValue(String(map[key]).trim()));
  });

  fs.writeFileSync(envPath, out.join('\n').replace(/\n*$/, '\n'), { mode: 0o600 });
  return envPath;
}

function getPublicStatus() {
  const map = loadSecretsMap();
  const store = readVaultStore();
  const groups = SECRET_SLOTS.map((g) => ({
    group: g.group,
    groupLabelAr: g.groupLabelAr,
    fields: g.keys.map((def) => {
      const fromVault = map[def.key];
      const fromEnv = process.env[def.key];
      const effective = String(fromVault || fromEnv || '').trim();
      const masked = maskSecret(effective, def.secret);
      return {
        key: def.key,
        labelAr: def.labelAr,
        secret: !!def.secret,
        placeholder: def.placeholder || '',
        set: masked.set,
        masked: masked.masked,
        length: masked.length,
        source: fromVault ? 'vault' : (fromEnv ? 'env' : 'none'),
      };
    }),
  }));

  const customKeys = Array.isArray(store.custom) ? store.custom : [];
  const customFields = customKeys.map((key) => {
    const effective = String(map[key] || process.env[key] || '').trim();
    const masked = maskSecret(effective, true);
    return {
      key,
      labelAr: key,
      secret: true,
      set: masked.set,
      masked: masked.masked,
      length: masked.length,
      source: map[key] ? 'vault' : (process.env[key] ? 'env' : 'none'),
      custom: true,
    };
  });

  let claudeOk = false;
  try {
    claudeOk = require('../config/anthropic').isAnthropicConfigured();
  } catch (e) {
    claudeOk = !!(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY);
  }

  return {
    ok: true,
    groups,
    customFields,
    meta: store.meta || {},
    readiness: {
      claude: claudeOk,
      facebook: !!(String(process.env.FACEBOOK_PAGE_ID || '').trim() && String(process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '').trim()),
      twilio: !!(String(process.env.TWILIO_SID || '').trim() && (String(process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_TOKEN || '').trim())),
      telegram: !!(String(process.env.TELEGRAM_BOT_TOKEN || '').trim()),
    },
  };
}

/**
 * body.values: { KEY: "value" } — فارغ = تجاهل؛ "__CLEAR__" = حذف من الخزنة
 * body.addCustomKey: "MY_NEW_KEY"
 */
function saveSecrets(body, adminUser) {
  const values = (body && body.values && typeof body.values === 'object') ? body.values : {};
  const map = loadSecretsMap();
  const store = readVaultStore();
  const custom = Array.isArray(store.custom) ? store.custom.slice() : [];
  const changed = [];
  const cleared = [];

  Object.keys(values).forEach((key) => {
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) return;
    // لا تسمح بتغيير مفاتيح تشفير الخزنة نفسها عبر الواجهة
    if (key === 'SECRETS_VAULT_KEY' || key === 'BACKEND_SHARED_SECRET' || key === 'RIZQ_API_SECRET') return;
    const raw = values[key];
    if (raw == null) return;
    const str = String(raw);
    if (str === '') return; // تجاهل الحقول الفارغة (لا تمسح بالخطأ)
    if (str === '__CLEAR__') {
      if (map[key] != null) {
        delete map[key];
        cleared.push(key);
      }
      return;
    }
    // لا تعِد كتابة نفس القيمة المقنّعة إن أُرسلت بالخطأ
    if (str.indexOf('…') !== -1 && str.length < 24) return;
    map[key] = str.trim();
    changed.push(key);
    if (!KNOWN_KEYS[key] && custom.indexOf(key) === -1) custom.push(key);
  });

  if (body && body.addCustomKey) {
    const ck = String(body.addCustomKey || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (/^[A-Z][A-Z0-9_]*$/.test(ck) && !KNOWN_KEYS[ck] && custom.indexOf(ck) === -1) {
      custom.push(ck);
    }
  }

  if (body && body.removeCustomKey) {
    const rk = String(body.removeCustomKey || '').trim();
    const ix = custom.indexOf(rk);
    if (ix !== -1) custom.splice(ix, 1);
    if (map[rk] != null) {
      delete map[rk];
      cleared.push(rk);
    }
  }

  store.blob = encryptJson(map);
  store.custom = custom;
  store.meta = {
    updatedAt: new Date().toISOString(),
    updatedBy: adminUser ? String(adminUser).slice(0, 80) : 'super',
    changedCount: changed.length,
    clearedCount: cleared.length,
  };
  writeVaultStore(store);

  const applied = applySecretsToEnv(map);
  let envPath = null;
  try {
    envPath = syncEnvFile(map);
  } catch (e) {
    console.warn('[secretsVault] .env sync failed:', e.message);
  }

  return {
    ok: true,
    changed,
    cleared,
    applied,
    envSynced: !!envPath,
    status: getPublicStatus(),
  };
}

function loadAndApplyOnBoot() {
  try {
    const map = loadSecretsMap();
    const applied = applySecretsToEnv(map);
    if (applied.length) {
      console.log('[secretsVault] applied ' + applied.length + ' secret(s) from vault to process.env');
    }
    return applied;
  } catch (e) {
    console.warn('[secretsVault] boot apply failed:', e.message);
    return [];
  }
}

module.exports = {
  SECRET_SLOTS,
  KNOWN_KEYS,
  getPublicStatus,
  saveSecrets,
  loadAndApplyOnBoot,
  loadSecretsMap,
  applySecretsToEnv,
  maskSecret,
};
