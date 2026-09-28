/**
 * services/marketingAgent.js
 * ═══════════════════════════════════════════════════════════════
 * مدير تسويق رزق — توليد مسودات، مراجعة جودة، موافقة بشرية،
 * جدولة، ونشر فيسبوك عبر Graph API (عند توفّر التوكن).
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const {
  getAnthropicApiKey,
  isAnthropicConfigured,
  getAgentModel,
  createCachedMessage,
} = require('../config/anthropic');
const cfg = require('../../rizq_marketing_agent_config');

let _repos = null;
function repos() {
  if (!_repos) _repos = require('../db/repos');
  return _repos;
}

const client = new Anthropic({ apiKey: getAnthropicApiKey() });

/* ── إعدادات تشغيل مخزّنة ─────────────────────────────────── */

function getSettings() {
  const raw = repos().marketingSettings.get('_root') || {};
  return Object.assign({}, cfg.RUNTIME_DEFAULTS, raw, {
    // لا نخزّن أسراراً في SQLite — تُقرأ دائماً من البيئة
  });
}

function saveSettings(partial) {
  const cur = getSettings();
  const next = Object.assign({}, cur, partial && typeof partial === 'object' ? partial : {});
  // منع حقن أسرار في المتجر
  delete next.facebookPageAccessToken;
  delete next.facebookAppSecret;
  delete next.apiKey;
  repos().marketingSettings.upsert('_root', next);
  return getPublicStatus();
}

function facebookCredentials() {
  return {
    pageId: String(process.env.FACEBOOK_PAGE_ID || '').trim(),
    token: String(process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '').trim(),
    apiVersion: String(process.env.FACEBOOK_API_VERSION || getSettings().facebookApiVersion || 'v21.0').trim(),
  };
}

function isFacebookConfigured() {
  const c = facebookCredentials();
  return !!(c.pageId && c.token);
}

function getPublicStatus() {
  const s = getSettings();
  return {
    ok: true,
    enabled: !!s.enabled,
    requireHumanApproval: s.requireHumanApproval !== false,
    defaultChannel: s.defaultChannel || 'facebook',
    defaultLang: s.defaultLang || 'ar',
    maxDraftsPerDay: s.maxDraftsPerDay || 30,
    claudeConfigured: isAnthropicConfigured(),
    facebookConfigured: isFacebookConfigured(),
    brand: {
      nameAr: cfg.BRAND.nameAr,
      legalName: cfg.BRAND.legalName,
      siteUrl: cfg.BRAND.siteUrl,
    },
    campaignTypes: cfg.listCampaignTypes(),
    channels: cfg.listChannels(),
  };
}

/* ── جودة إبداعية ─────────────────────────────────────────── */

function countMatches(str, re) {
  const m = String(str || '').match(re);
  return m ? m.length : 0;
}

function scoreCreative(body, opts) {
  const rules = cfg.QUALITY_RULES;
  const text = String(body || '').trim();
  const w = rules.scoreWeights;
  let score = 0;
  const notes = [];

  if (text.length >= rules.minBodyChars) {
    score += w.lengthOk;
  } else {
    notes.push('النص قصير جداً');
  }

  const ctaRe = /(سجّل|سجل|انضم|اكتشف|تصفح|ابدأ|جرّب|اشترك|زور|زر|inscription|rejoignez|discover|start|join|register)/i;
  if (ctaRe.test(text)) {
    score += w.hasCta;
  } else {
    notes.push('ينقص دعوة واضحة لإجراء (CTA)');
  }

  const brandOk = /رزق|rizq/i.test(text);
  if (brandOk) {
    score += w.brandMention;
  } else {
    notes.push('يجب ذكر اسم المنصة (رزق / Rizq)');
  }

  const forbiddenHit = (cfg.BRAND.forbidden || []).find((f) => text.toLowerCase().indexOf(String(f).toLowerCase()) !== -1);
  if (!forbiddenHit) {
    score += w.noForbidden;
  } else {
    notes.push('عبارة محظورة: ' + forbiddenHit);
  }

  try {
    const aq = require('./agentQuality');
    const claim = aq.findForbiddenClaim(text);
    if (claim) {
      score = Math.max(0, score - 20);
      notes.push('ادعاء محظور (عائد/ضمان)');
    }
  } catch (e) { /* optional */ }

  const bangs = countMatches(text, /!/g);
  if (bangs <= rules.maxExclamationMarks) {
    score += w.noSpamPunctuation;
  } else {
    notes.push('علامات تعجب مفرطة');
  }

  const tags = countMatches(text, /#[\w\u0600-\u06FF]+/g);
  if (tags <= 6) {
    score += w.hashtagBalance;
  } else {
    notes.push('هاشتاقات كثيرة');
  }

  const pass = score >= rules.passScore && !forbiddenHit;
  return {
    score,
    pass,
    notes,
    charCount: text.length,
    channel: opts && opts.channel,
  };
}

/* ── تخزين الحملات ───────────────────────────────────────── */

function newId(prefix) {
  return (prefix || 'mkt') + '_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
}

function listCampaigns(filter) {
  let rows = repos().marketingCampaigns.list().slice();
  rows.sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
  if (filter && filter.status) {
    rows = rows.filter((r) => r.status === filter.status);
  }
  if (filter && filter.channel) {
    rows = rows.filter((r) => r.channel === filter.channel || (r.variants && r.variants[filter.channel]));
  }
  const limit = Math.min(Number(filter && filter.limit) || 50, 200);
  return rows.slice(0, limit);
}

function getCampaign(id) {
  return repos().marketingCampaigns.get(String(id || '')) || null;
}

function upsertCampaign(camp) {
  if (!camp || !camp.id) return null;
  camp.updatedAt = new Date().toISOString();
  repos().marketingCampaigns.upsert(String(camp.id), camp);
  return camp;
}

function countDraftsToday() {
  const day = new Date().toISOString().slice(0, 10);
  return repos().marketingCampaigns.list().filter((c) => String(c.createdAt || '').slice(0, 10) === day).length;
}

/* ── توليد المحتوى ───────────────────────────────────────── */

function buildSystemPrompt() {
  const b = cfg.BRAND;
  let excellence = '';
  try {
    excellence = require('./agentQuality').buildIntelligenceExcellenceBlock({ mode: 'marketing' });
  } catch (e) { excellence = ''; }
  return [
    'أنت مدير التسويق الرسمي لمنصة «رزق» (Rizq) التابعة لـ ' + b.legalName + '.',
    'السوق: ' + b.market + '. الموقع: ' + b.siteUrl,
    'الشعار: ' + b.taglineAr,
    '',
    'أسلوب الكتابة:',
    ...b.tone.map((t) => '- ' + t),
    '',
    'ممنوع تماماً: ' + b.forbidden.join(' · '),
    'يجب ذكر «رزق» أو Rizq في النص الرئيسي.',
    excellence,
    'أرجع JSON فقط بالشكل المطلوب — بلا markdown.',
  ].filter(Boolean).join('\n');
}

function buildUserPrompt(input) {
  const typeKey = String(input.campaignType || 'platform_awareness');
  const typeMeta = cfg.CAMPAIGN_TYPES[typeKey] || cfg.CAMPAIGN_TYPES.platform_awareness;
  const lang = String(input.lang || getSettings().defaultLang || 'ar');
  const channel = String(input.channel || 'facebook');
  const chMeta = cfg.CHANNELS[channel] || cfg.CHANNELS.facebook;
  const brief = String(input.brief || '').trim().slice(0, 2000);
  const feature = String(input.feature || '').trim().slice(0, 200);
  const link = String(input.link || getSettings().linkFallback || cfg.BRAND.siteUrl).trim();
  const tags = (cfg.BRAND.hashtags[lang] || cfg.BRAND.hashtags.ar || []).join(' ');

  return [
    'أنشئ حملة تسويقية لمنصة رزق.',
    'نوع الحملة: ' + typeKey + ' — ' + typeMeta.goal,
    'اللغة الأساسية: ' + lang,
    'القناة الأساسية: ' + channel + ' (حد أقصى تقريباً ' + chMeta.maxChars + ' حرفاً)',
    feature ? ('الميزة/الموضوع: ' + feature) : '',
    brief ? ('موجز من الأدمن: ' + brief) : '',
    'الرابط المقترح: ' + link,
    'هاشتاقات مقترحة: ' + tags,
    '',
    'أرجع كائناً JSON بهذا الشكل بالضبط:',
    JSON.stringify({
      title: 'عنوان داخلي قصير للأدمن',
      hook: 'جملة افتتاح قوية',
      body: 'نص المنشور الكامل للقناة الأساسية',
      cta: 'دعوة لإجراء قصيرة',
      hashtags: ['#رزق'],
      link: link,
      variants: {
        facebook: 'نص فيسبوك',
        instagram: 'نص إنستغرام',
        whatsapp: 'نص واتساب قصير',
        telegram: 'نص تيليغرام',
        sms: 'SMS ≤160',
        email_subject: 'عنوان البريد',
        email_body: 'جسم البريد',
        site_announcement: 'نص إعلان داخل المنصة ≤280',
      },
      creativeNotes: 'ملاحظات إبداعية للأدمن',
    }, null, 2),
  ].filter(Boolean).join('\n');
}

function parseJsonLoose(text) {
  const raw = String(text || '').trim();
  try {
    return JSON.parse(raw);
  } catch (e1) {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
}

function fallbackCreative(input) {
  const lang = String(input.lang || 'ar');
  const link = String(input.link || cfg.BRAND.siteUrl);
  const typeKey = String(input.campaignType || 'platform_awareness');
  const typeMeta = cfg.CAMPAIGN_TYPES[typeKey] || cfg.CAMPAIGN_TYPES.platform_awareness;
  const brief = String(input.brief || typeMeta.goal).trim();

  const bodies = {
    ar: [
      '🚀 ' + cfg.BRAND.nameAr + ' — ' + cfg.BRAND.taglineAr,
      '',
      brief || typeMeta.goal,
      '',
      'سجّل عملك مجاناً وابدأ عرض خدماتك للزبائن في موريتانيا.',
      '👉 ' + link,
      '',
      (cfg.BRAND.hashtags.ar || []).join(' '),
    ].join('\n'),
    fr: [
      '🚀 ' + cfg.BRAND.nameFr + ' — ' + cfg.BRAND.taglineFr,
      '',
      brief || typeMeta.goal,
      '',
      'Inscrivez votre activité et touchez vos clients en Mauritanie.',
      '👉 ' + link,
      '',
      (cfg.BRAND.hashtags.fr || []).join(' '),
    ].join('\n'),
    en: [
      '🚀 ' + cfg.BRAND.nameFr + ' — Your digital marketplace in Mauritania.',
      '',
      brief || typeMeta.goal,
      '',
      'Register your business and reach customers today.',
      '👉 ' + link,
      '',
      (cfg.BRAND.hashtags.en || []).join(' '),
    ].join('\n'),
  };
  const body = bodies[lang] || bodies.ar;
  return {
    title: typeMeta.labelAr + ' — مسودة',
    hook: cfg.BRAND.taglineAr,
    body,
    cta: lang === 'fr' ? 'Rejoignez Rizq' : (lang === 'en' ? 'Join Rizq' : 'انضم لرزق'),
    hashtags: cfg.BRAND.hashtags[lang] || cfg.BRAND.hashtags.ar,
    link,
    variants: {
      facebook: body,
      instagram: body,
      whatsapp: body.slice(0, 900),
      telegram: body,
      sms: ('رزق: ' + (brief || typeMeta.goal)).slice(0, 140) + ' ' + link,
      email_subject: cfg.BRAND.nameAr + ' — ' + typeMeta.labelAr,
      email_body: body,
      site_announcement: (brief || typeMeta.goal).slice(0, 240),
    },
    creativeNotes: 'مولَّد احتياطي بدون Claude — راجع وعدّل قبل النشر',
    _fallback: true,
  };
}

async function generateCreative(input) {
  if (!isAnthropicConfigured()) {
    return fallbackCreative(input);
  }
  try {
    const { response } = await createCachedMessage(client, {
      model: getAgentModel(),
      max_tokens: 1800,
      temperature: 0.85,
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    });
    const text = (response.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    const parsed = parseJsonLoose(text);
    if (!parsed || !parsed.body) {
      const fb = fallbackCreative(input);
      fb.creativeNotes = (fb.creativeNotes || '') + ' | فشل تحليل JSON من النموذج';
      return fb;
    }
    parsed.link = parsed.link || input.link || cfg.BRAND.siteUrl;
    parsed.variants = parsed.variants && typeof parsed.variants === 'object' ? parsed.variants : {};
    if (!parsed.variants.facebook) parsed.variants.facebook = parsed.body;
    return parsed;
  } catch (err) {
    console.warn('[marketingAgent] generate failed:', err && err.message);
    const fb = fallbackCreative(input);
    fb.creativeNotes = (fb.creativeNotes || '') + ' | خطأ Claude: ' + (err && err.message);
    return fb;
  }
}

async function createDraftCampaign(input, adminUser) {
  try {
    const ops = require('./agentOps');
    if (!ops.isAgentFamilyEnabled('marketing')) {
      const err = new Error('مدير التسويق موقّف من مركز تسيير الوكلاء');
      err.code = 'disabled';
      throw err;
    }
  } catch (eOps) {
    if (eOps && eOps.code === 'disabled') throw eOps;
  }
  const settings = getSettings();
  if (!settings.enabled) {
    const err = new Error('مدير التسويق معطّل من الإعدادات');
    err.code = 'disabled';
    throw err;
  }
  if (countDraftsToday() >= (settings.maxDraftsPerDay || 30)) {
    const err = new Error('تم بلوغ حد المسودات اليومية');
    err.code = 'rate_limit';
    throw err;
  }

  const campaignType = String(input.campaignType || 'platform_awareness');
  if (!cfg.CAMPAIGN_TYPES[campaignType]) {
    const err = new Error('نوع حملة غير معروف');
    err.code = 'bad_type';
    throw err;
  }
  const channel = String(input.channel || settings.defaultChannel || 'facebook');
  if (!cfg.CHANNELS[channel]) {
    const err = new Error('قناة غير معروفة');
    err.code = 'bad_channel';
    throw err;
  }

  const creative = await generateCreative({
    campaignType,
    channel,
    lang: input.lang || settings.defaultLang || 'ar',
    brief: input.brief,
    feature: input.feature,
    link: input.link || settings.linkFallback || cfg.BRAND.siteUrl,
  });

  const primaryBody = String(
    (creative.variants && creative.variants[channel]) || creative.body || ''
  ).trim();
  const quality = scoreCreative(primaryBody, { channel });

  const now = new Date().toISOString();
  const camp = {
    id: newId('mkt'),
    status: 'pending_review',
    campaignType,
    channel,
    lang: String(input.lang || settings.defaultLang || 'ar'),
    title: String(creative.title || 'حملة رزق').slice(0, 120),
    hook: String(creative.hook || '').slice(0, 280),
    body: primaryBody,
    cta: String(creative.cta || '').slice(0, 120),
    hashtags: Array.isArray(creative.hashtags) ? creative.hashtags.slice(0, 12) : [],
    link: String(creative.link || cfg.BRAND.siteUrl).slice(0, 500),
    variants: creative.variants || {},
    creativeNotes: String(creative.creativeNotes || '').slice(0, 1000),
    quality,
    brief: String(input.brief || '').slice(0, 2000),
    feature: String(input.feature || '').slice(0, 200),
    createdBy: adminUser ? String(adminUser).slice(0, 80) : 'admin',
    createdAt: now,
    updatedAt: now,
    scheduledAt: null,
    publishedAt: null,
    publishResult: null,
    rejectionReason: null,
    history: [
      { at: now, action: 'created', by: adminUser || 'admin', note: creative._fallback ? 'fallback' : 'ai' },
    ],
  };

  return upsertCampaign(camp);
}

/* ── موافقة / رفض / تعديل ─────────────────────────────────── */

function pushHistory(camp, action, by, note) {
  if (!Array.isArray(camp.history)) camp.history = [];
  camp.history.push({
    at: new Date().toISOString(),
    action,
    by: by || 'admin',
    note: note ? String(note).slice(0, 300) : undefined,
  });
  if (camp.history.length > 40) camp.history = camp.history.slice(-40);
}

function updateDraftBody(id, patch, adminUser) {
  const camp = getCampaign(id);
  if (!camp) return null;
  if (['published', 'publishing', 'cancelled'].includes(camp.status)) {
    const err = new Error('لا يمكن تعديل حملة في هذه الحالة');
    err.code = 'bad_status';
    throw err;
  }
  if (patch.body != null) camp.body = String(patch.body).slice(0, 5000);
  if (patch.title != null) camp.title = String(patch.title).slice(0, 120);
  if (patch.link != null) camp.link = String(patch.link).slice(0, 500);
  if (patch.cta != null) camp.cta = String(patch.cta).slice(0, 120);
  if (patch.scheduledAt != null) {
    camp.scheduledAt = patch.scheduledAt ? String(patch.scheduledAt) : null;
  }
  if (patch.variants && typeof patch.variants === 'object') {
    camp.variants = Object.assign({}, camp.variants || {}, patch.variants);
  }
  camp.quality = scoreCreative(camp.body, { channel: camp.channel });
  if (camp.status === 'rejected') camp.status = 'pending_review';
  pushHistory(camp, 'edited', adminUser);
  return upsertCampaign(camp);
}

function approveCampaign(id, adminUser, opts) {
  const camp = getCampaign(id);
  if (!camp) return null;
  if (!['pending_review', 'draft', 'rejected', 'failed', 'approved', 'scheduled'].includes(camp.status)) {
    const err = new Error('الحالة لا تسمح بالموافقة');
    err.code = 'bad_status';
    throw err;
  }
  if (camp.quality && camp.quality.pass === false) {
    const err = new Error('الجودة أقل من الحد — عدّل النص أولاً');
    err.code = 'quality';
    throw err;
  }
  const scheduleAt = opts && opts.scheduledAt ? String(opts.scheduledAt) : camp.scheduledAt;
  if (scheduleAt) {
    const t = Date.parse(scheduleAt);
    if (!Number.isFinite(t)) {
      const err = new Error('تاريخ جدولة غير صالح');
      err.code = 'bad_schedule';
      throw err;
    }
    camp.scheduledAt = new Date(t).toISOString();
    camp.status = 'scheduled';
  } else {
    camp.status = 'approved';
  }
  camp.rejectionReason = null;
  pushHistory(camp, camp.status === 'scheduled' ? 'approved_scheduled' : 'approved', adminUser);
  return upsertCampaign(camp);
}

function rejectCampaign(id, adminUser, reason) {
  const camp = getCampaign(id);
  if (!camp) return null;
  if (['published', 'publishing'].includes(camp.status)) {
    const err = new Error('لا يمكن رفض حملة منشورة');
    err.code = 'bad_status';
    throw err;
  }
  camp.status = 'rejected';
  camp.rejectionReason = String(reason || 'مرفوض من الأدمن').slice(0, 500);
  pushHistory(camp, 'rejected', adminUser, camp.rejectionReason);
  return upsertCampaign(camp);
}

function cancelCampaign(id, adminUser) {
  const camp = getCampaign(id);
  if (!camp) return null;
  if (camp.status === 'published') {
    const err = new Error('الحملة منشورة مسبقاً');
    err.code = 'bad_status';
    throw err;
  }
  camp.status = 'cancelled';
  pushHistory(camp, 'cancelled', adminUser);
  return upsertCampaign(camp);
}

/* ── نشر فيسبوك ───────────────────────────────────────────── */

async function publishToFacebook(camp) {
  const creds = facebookCredentials();
  if (!creds.pageId || !creds.token) {
    const err = new Error('فيسبوك غير مُعدّ — أضف FACEBOOK_PAGE_ID و FACEBOOK_PAGE_ACCESS_TOKEN في .env');
    err.code = 'fb_not_configured';
    throw err;
  }

  const message = String(camp.body || '').trim();
  if (!message) {
    const err = new Error('نص المنشور فارغ');
    err.code = 'empty';
    throw err;
  }

  const payload = { message, access_token: creds.token };
  if (camp.link) payload.link = String(camp.link);

  const url = 'https://graph.facebook.com/' + encodeURIComponent(creds.apiVersion) +
    '/' + encodeURIComponent(creds.pageId) + '/feed';

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = (data.error && data.error.message) || ('HTTP ' + res.status);
    const err = new Error('فشل نشر فيسبوك: ' + msg);
    err.code = 'fb_api';
    err.details = data.error || data;
    throw err;
  }
  return {
    provider: 'facebook',
    postId: data.id || null,
    raw: { id: data.id },
  };
}

async function publishCampaign(id, adminUser, opts) {
  const settings = getSettings();
  const camp = getCampaign(id);
  if (!camp) return null;

  if (settings.requireHumanApproval !== false) {
    if (!['approved', 'scheduled'].includes(camp.status) && !(opts && opts.forceAfterApprove)) {
      // مسار مختصر: موافقة + نشر في خطوة واحدة من الأدمن
      if (opts && opts.approveAndPublish) {
        approveCampaign(id, adminUser, { scheduledAt: null });
        return publishCampaign(id, adminUser, { forceAfterApprove: true });
      }
      const err = new Error('يلزم موافقة أدمن قبل النشر');
      err.code = 'needs_approval';
      throw err;
    }
  } else if (!['approved', 'scheduled', 'pending_review', 'draft'].includes(camp.status)) {
    const err = new Error('حالة غير صالحة للنشر');
    err.code = 'bad_status';
    throw err;
  }

  if (camp.channel !== 'facebook') {
    const err = new Error('النشر الآلي متاح لفيسبوك فقط — انسخ مسودة القناة الأخرى يدوياً');
    err.code = 'channel_manual';
    throw err;
  }

  camp.status = 'publishing';
  pushHistory(camp, 'publishing', adminUser);
  upsertCampaign(camp);

  try {
    const result = await publishToFacebook(camp);
    camp.status = 'published';
    camp.publishedAt = new Date().toISOString();
    camp.publishResult = result;
    pushHistory(camp, 'published', adminUser, result.postId || '');
    return upsertCampaign(camp);
  } catch (err) {
    camp.status = 'failed';
    camp.publishResult = { error: err.message, code: err.code, details: err.details || null };
    pushHistory(camp, 'failed', adminUser, err.message);
    upsertCampaign(camp);
    throw err;
  }
}

/* ── جدولة ────────────────────────────────────────────────── */

let _schedulerTimer = null;

async function processDueSchedules() {
  const now = Date.now();
  const due = repos().marketingCampaigns.list().filter((c) => {
    if (c.status !== 'scheduled' || !c.scheduledAt) return false;
    const t = Date.parse(c.scheduledAt);
    return Number.isFinite(t) && t <= now;
  });
  for (const camp of due) {
    try {
      await publishCampaign(camp.id, 'scheduler', { forceAfterApprove: true });
    } catch (err) {
      console.error('[marketingAgent] schedule publish failed', camp.id, err.message);
    }
  }
  return due.length;
}

function startScheduler() {
  if (_schedulerTimer) return;
  const sec = Math.max(30, Number(getSettings().schedulePollSeconds) || 60);
  _schedulerTimer = setInterval(() => {
    processDueSchedules().catch((e) => console.error('[marketingAgent] scheduler', e.message));
  }, sec * 1000);
  if (_schedulerTimer.unref) _schedulerTimer.unref();
  console.log('[marketingAgent] scheduler started every ' + sec + 's');
}

function getStats() {
  const all = repos().marketingCampaigns.list();
  const byStatus = {};
  all.forEach((c) => {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  });
  return {
    total: all.length,
    byStatus,
    draftsToday: countDraftsToday(),
    facebookConfigured: isFacebookConfigured(),
    claudeConfigured: isAnthropicConfigured(),
  };
}

module.exports = {
  getSettings,
  saveSettings,
  getPublicStatus,
  getStats,
  listCampaigns,
  getCampaign,
  createDraftCampaign,
  updateDraftBody,
  approveCampaign,
  rejectCampaign,
  cancelCampaign,
  publishCampaign,
  processDueSchedules,
  startScheduler,
  scoreCreative,
  isFacebookConfigured,
};
