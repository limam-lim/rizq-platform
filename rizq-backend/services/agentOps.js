/**
 * agentOps.js — تسيير مركزي لوكلاء رزق من لوحة الأدمن
 * إعدادات تشغيل عامة + ملخص حالة موحّد
 * enabled/disabled يبقى مصدر الحقيقة الوحيد هنا.
 */
'use strict';

const { isAnthropicConfigured, getAgentModel, getAdvancedModel } = require('../config/anthropic');

const DEFAULTS = {
  widgetEnabled: true,
  brainEnabled: true,
  subscriberEnabled: true,
  marketingEnabled: true,
  inquiryAutoReplyEnabled: true,
  investmentEnabled: true,
  qualityLoggingEnabled: true,
  updatedAt: null,
  updatedBy: null,
};

let _repos = null;
function repos() {
  if (!_repos) _repos = require('../db/repos');
  return _repos;
}

async function getSettings() {
  const raw = (await repos().agentOpsSettings.get('_root')) || {};
  return Object.assign({}, DEFAULTS, raw);
}

async function saveSettings(partial, adminUser) {
  const cur = await getSettings();
  const next = Object.assign({}, cur);
  Object.keys(DEFAULTS).forEach((k) => {
    if (k === 'updatedAt' || k === 'updatedBy') return;
    if (partial && typeof partial[k] === 'boolean') next[k] = partial[k];
  });
  next.updatedAt = new Date().toISOString();
  next.updatedBy = adminUser ? String(adminUser).slice(0, 80) : cur.updatedBy;
  await repos().agentOpsSettings.upsert('_root', next);
  return next;
}

async function isAgentFamilyEnabled(family) {
  const s = await getSettings();
  switch (String(family || '')) {
    case 'widget': return s.widgetEnabled !== false;
    case 'brain': return s.brainEnabled !== false;
    case 'subscriber': return s.subscriberEnabled !== false;
    case 'marketing': return s.marketingEnabled !== false;
    case 'inquiry': return s.inquiryAutoReplyEnabled !== false;
    case 'investment': return s.investmentEnabled !== false;
    case 'quality': return s.qualityLoggingEnabled !== false;
    default: return true;
  }
}

/**
 * بوابة موحّدة لكل نقاط دخول الوكلاء.
 * @returns {{ ok: true } | { ok: false, error: string, code: string, family: string }}
 */
async function assertAgentEnabled(family) {
  const slug = String(family || '').trim();
  if (!slug) return { ok: true };
  const enabled = await isAgentFamilyEnabled(slug);
  if (enabled) return { ok: true };
  return {
    ok: false,
    error: 'agent_family_disabled',
    code: 'agent_family_disabled',
    family: slug,
    message: 'عائلة الوكيل موقوفة من مركز تسيير الوكلاء',
  };
}

function facebookConfigured() {
  return !!(String(process.env.FACEBOOK_PAGE_ID || '').trim() &&
    String(process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '').trim());
}

async function buildDashboard() {
  const settings = await getSettings();
  let misses = [];
  let missCount = 0;
  try {
    const aq = require('./agentQuality');
    misses = await aq.listAgentMisses(15);
    missCount = (await aq.listAgentMisses(500)).length;
  } catch (e) { /* */ }

  let marketingStats = null;
  try {
    marketingStats = require('./marketingAgent').getStats();
  } catch (e) { /* */ }

  const claude = isAnthropicConfigured();
  const families = [
    {
      id: 'widget',
      nameAr: 'ويدجت الدردشة / مدير رزق',
      panel: 'ai-manager',
      enabled: settings.widgetEnabled !== false,
      needsClaude: true,
      ready: claude && settings.widgetEnabled !== false,
    },
    {
      id: 'brain',
      nameAr: 'عقل القنوات (اتصال / واتساب / بريد)',
      panel: 'channels',
      enabled: settings.brainEnabled !== false,
      needsClaude: true,
      ready: claude && settings.brainEnabled !== false,
    },
    {
      id: 'subscriber',
      nameAr: 'وكلاء الباقة الماسية',
      panel: 'subscriber-agents',
      enabled: settings.subscriberEnabled !== false,
      needsClaude: true,
      ready: claude && settings.subscriberEnabled !== false,
    },
    {
      id: 'marketing',
      nameAr: 'مدير التسويق',
      panel: 'marketing',
      enabled: settings.marketingEnabled !== false,
      needsClaude: true,
      ready: claude && settings.marketingEnabled !== false,
      extra: facebookConfigured() ? 'فيسبوك جاهز' : 'فيسبوك غير مربوط (مسودات فقط)',
    },
    {
      id: 'inquiry',
      nameAr: 'رد تلقائي على الاستفسارات',
      panel: 'ai-manager',
      enabled: settings.inquiryAutoReplyEnabled !== false,
      needsClaude: true,
      ready: claude && settings.inquiryAutoReplyEnabled !== false,
    },
    {
      id: 'investment',
      nameAr: 'غرفة الاستثمارات',
      panel: null,
      enabled: settings.investmentEnabled !== false,
      needsClaude: true,
      ready: claude && settings.investmentEnabled !== false,
    },
    {
      id: 'moderator',
      nameAr: 'المراقب الآلي',
      panel: 'moderator-config',
      enabled: true,
      needsClaude: false,
      ready: true,
      note: 'قواعد محلية — لا يُوقف من هنا',
    },
    {
      id: 'quota',
      nameAr: 'حارس الحصص',
      panel: 'quota-guard',
      enabled: true,
      needsClaude: false,
      ready: true,
    },
  ];

  return {
    ok: true,
    settings,
    claudeConfigured: claude,
    facebookConfigured: facebookConfigured(),
    sharedSecretConfigured: !!(process.env.BACKEND_SHARED_SECRET || '').trim(),
    model: getAgentModel(),
    advancedModel: getAdvancedModel(),
    families,
    missesPreview: misses,
    missCount,
    marketingStats,
    links: [
      { panel: 'ai-manager', labelAr: 'تخصيص مدير رزق + أسئلة فائتة' },
      { panel: 'marketing', labelAr: 'حملات التسويق' },
      { panel: 'subscriber-agents', labelAr: 'وكلاء الماسية' },
      { panel: 'quota-guard', labelAr: 'مراقبة الاستهلاك' },
      { panel: 'moderator-config', labelAr: 'إعدادات المراقب' },
      { panel: 'channels', labelAr: 'قنوات التواصل' },
    ],
  };
}

module.exports = {
  DEFAULTS,
  getSettings,
  saveSettings,
  isAgentFamilyEnabled,
  assertAgentEnabled,
  buildDashboard,
  facebookConfigured,
};
