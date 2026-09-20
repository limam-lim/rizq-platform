/**
 * غرفة الاستثمارات — وكيل المراجعة الأوّلية + تخزين الفرص + تقرير تشغيلي يومي.
 * البريد التشغيلي خاص (INVESTMENT_OPS_EMAIL / OWNER_OPS_EMAIL / SUPER_ADMIN_EMAIL)
 * ولا يُعرَض أبداً في الواجهة العامة — direction@rizq.mr هو البريد العام فقط.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  isAnthropicConfigured,
  getAgentModel,
  createCachedMessage,
} = require('../config/anthropic');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'investments.json');
const EVENTS_FILE = path.join(DATA_DIR, 'investment-events.json');

const PUBLIC_CONTACT = 'direction@rizq.mr';
const SECTORS = [
  'تجارة', 'خدمات', 'تكنولوجيا', 'عقارات', 'زراعة', 'صناعة', 'طاقة', 'سياحة', 'تعليم', 'صحة', 'أخرى',
  'commerce', 'services', 'technologie', 'immobilier', 'agriculture', 'industrie', 'energie', 'tourisme', 'education', 'sante', 'autre'
];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function readInvestments() {
  const raw = readJson(FILE, { opportunities: [], updatedAt: null });
  if (!Array.isArray(raw.opportunities)) raw.opportunities = [];
  return raw;
}

function writeInvestments(store) {
  store.updatedAt = new Date().toISOString();
  writeJson(FILE, store);
}

function readEvents() {
  const raw = readJson(EVENTS_FILE, { events: [] });
  if (!Array.isArray(raw.events)) raw.events = [];
  return raw;
}

function pushEvent(type, meta) {
  const store = readEvents();
  store.events.unshift({
    id: 'iev_' + crypto.randomBytes(6).toString('hex'),
    type: String(type || 'event'),
    meta: meta && typeof meta === 'object' ? meta : {},
    at: new Date().toISOString(),
  });
  if (store.events.length > 2000) store.events = store.events.slice(0, 2000);
  writeJson(EVENTS_FILE, store);
  return store;
}

function opsEmail() {
  return String(
    process.env.INVESTMENT_OPS_EMAIL ||
    process.env.OWNER_OPS_EMAIL ||
    process.env.SUPER_ADMIN_EMAIL ||
    ''
  ).trim();
}

function sanitizeText(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max || 2000);
}

function localPlan(input) {
  const title = sanitizeText(input.title, 120) || (input.lang === 'fr' ? 'Projet d\'investissement' : 'مشروع استثماري');
  const sector = sanitizeText(input.sector, 80) || (input.lang === 'fr' ? 'Général' : 'عام');
  const capital = sanitizeText(input.capital, 80) || (input.lang === 'fr' ? 'Non précisé' : 'غير محدد');
  const stage = sanitizeText(input.stage, 80) || (input.lang === 'fr' ? 'Idée' : 'فكرة');
  const desc = sanitizeText(input.description, 2500);
  const lang = input.lang === 'fr' ? 'fr' : 'ar';

  if (lang === 'fr') {
    return {
      executiveSummary: title + ' — opportunité dans le secteur « ' + sector + ' » (stade: ' + stage + '). Première lecture indicative uniquement.',
      businessModel: 'Modèle à préciser avec le porteur: revenus, clients cibles, canaux, et avantages concurrentiels en Mauritanie.',
      capitalUse: 'Capital demandé: ' + capital + '. Répartition indicative: lancement, opérations, marketing, réserve.',
      risks: 'Risques marché, exécution, réglementation et liquidité. Due diligence obligatoire avant tout engagement. Rizq n\'est pas un conseiller financier agréé.',
      ask: 'Partenariat / prise de participation selon négociation. Contact public: ' + PUBLIC_CONTACT + '.',
      investorPitch: desc || 'Décrire clairement la proposition de valeur, le marché cible, et le retour attendu.',
      disclaimer: 'Avis de premier passage — non contractuel. Vérifiez toujours avant d\'investir.'
    };
  }

  return {
    executiveSummary: title + ' — فرصة في قطاع « ' + sector + ' » (المرحلة: ' + stage + '). قراءة أولية إرشادية فقط.',
    businessModel: 'نموذج العمل يُفصَّل مع صاحب الفكرة: مصادر الدخل، العملاء المستهدفون، قنوات البيع، والميزة التنافسية داخل موريتانيا.',
    capitalUse: 'رأس المال المطلوب: ' + capital + '. توزيع إرشادي: إطلاق، تشغيل، تسويق، واحتياطي.',
    risks: 'مخاطر السوق والتنفيذ والتنظيم والسيولة. يلزم فحص عناية واجبة قبل أي التزام. رزق ليست مستشاراً مالياً مرخّصاً.',
    ask: 'شراكة / مساهمة حسب التفاوض. التواصل العام: ' + PUBLIC_CONTACT + '.',
    investorPitch: desc || 'اشرح بوضوح قيمة المشروع، السوق المستهدف، والعائد المتوقع.',
    disclaimer: 'مراجعة أولية — غير ملزمة. تحقّق دائماً قبل الاستثمار.'
  };
}

function buildSystemPrompt(lang) {
  if (lang === 'fr') {
    return [
      'Tu es le conseiller de premier passage de la Salle des investissements Rizq (Mauritanie).',
      'Tu prépares un dossier clair pour des investisseurs — tu n\'es PAS un conseiller financier agréé et tu ne garantis aucun rendement.',
      'Réponds UNIQUEMENT en JSON valide avec les clés:',
      'executiveSummary, businessModel, capitalUse, risks, ask, investorPitch, disclaimer.',
      'Ton: professionnel, prudent, concret, adapté au marché mauritanien.',
      'Mentionne que Rizq est un intermédiaire de publication et que le contact public est ' + PUBLIC_CONTACT + '.',
      'N\'invente pas de chiffres de rendement. Si l\'info manque, dis-le clairement.'
    ].join('\n');
  }
  return [
    'أنت وكيل المراجعة الأوّلية في غرفة الاستثمارات بمنصة رزق (موريتانيا).',
    'تحوّل فكرة المشروع إلى ملف واضح للمستثمرين — ولست مستشاراً مالياً مرخّصاً ولا تضمن أي عائد.',
    'أجب فقط بـ JSON صالح بالمفاتيح:',
    'executiveSummary, businessModel, capitalUse, risks, ask, investorPitch, disclaimer.',
    'الأسلوب: مهني، حذر، عملي، مناسب للسوق الموريتاني.',
    'اذكر أن رزق وسيط نشر وأن البريد العام هو ' + PUBLIC_CONTACT + '.',
    'لا تخترع أرقام عائد. إن نقصت المعلومة فقل ذلك بوضوح.'
  ].join('\n');
}

function parsePlanJson(text) {
  if (!text) return null;
  let raw = String(text).trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return null;
    return {
      executiveSummary: sanitizeText(obj.executiveSummary, 1200),
      businessModel: sanitizeText(obj.businessModel, 1200),
      capitalUse: sanitizeText(obj.capitalUse, 800),
      risks: sanitizeText(obj.risks, 1000),
      ask: sanitizeText(obj.ask, 600),
      investorPitch: sanitizeText(obj.investorPitch, 1500),
      disclaimer: sanitizeText(obj.disclaimer, 400),
    };
  } catch (e) {
    return null;
  }
}

async function generatePlan(input, anthropicClient) {
  const lang = input && input.lang === 'fr' ? 'fr' : 'ar';
  const payload = {
    title: sanitizeText(input && input.title, 120),
    sector: sanitizeText(input && input.sector, 80),
    capital: sanitizeText(input && input.capital, 80),
    stage: sanitizeText(input && input.stage, 80),
    description: sanitizeText(input && input.description, 2500),
    lang,
  };

  if (!payload.title && !payload.description) {
    const err = new Error(lang === 'fr' ? 'Titre ou description requis' : 'العنوان أو الوصف مطلوب');
    err.status = 400;
    throw err;
  }

  pushEvent('plan_request', {
    lang,
    sector: payload.sector || null,
    stage: payload.stage || null,
    hasCapital: !!payload.capital,
  });

  let plan = null;
  let source = 'local';

  if (anthropicClient && isAnthropicConfigured()) {
    try {
      const userMsg = lang === 'fr'
        ? ('Prépare le dossier d\'investissement:\n' + JSON.stringify(payload, null, 2))
        : ('جهّز ملف الاستثمار:\n' + JSON.stringify(payload, null, 2));
      const { response } = await createCachedMessage(anthropicClient, {
        model: getAgentModel(),
        max_tokens: 1400,
        temperature: 0.35,
        system: buildSystemPrompt(lang),
        messages: [{ role: 'user', content: userMsg }],
      }, { fallbackToFast: true });
      const text = (response.content || [])
        .filter((b) => b && b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      plan = parsePlanJson(text);
      if (plan) source = 'claude';
    } catch (e) {
      console.warn('[investments/plan] claude fallback:', e && e.message);
    }
  }

  if (!plan) plan = localPlan(payload);
  if (!plan.disclaimer) {
    plan.disclaimer = lang === 'fr'
      ? 'Avis de premier passage — non contractuel.'
      : 'مراجعة أولية — غير ملزمة.';
  }

  pushEvent('plan_ready', { lang, source });
  return { plan, source, lang };
}

function toPublicOpportunity(item, unlockContacts) {
  if (!item) return null;
  const out = {
    id: item.id,
    title: item.title,
    titleFr: item.titleFr || '',
    sector: item.sector,
    capital: item.capital,
    stage: item.stage,
    summary: item.summary,
    summaryFr: item.summaryFr || '',
    wilaya: item.wilaya || '',
    createdAt: item.createdAt,
    status: item.status,
  };
  if (unlockContacts) {
    out.contactHint = PUBLIC_CONTACT;
  } else {
    out.contactHint = null;
    out.contactsLocked = true;
  }
  return out;
}

function listPublic(opts) {
  const unlock = !!(opts && opts.unlockContacts);
  const store = readInvestments();
  const list = store.opportunities
    .filter((o) => o && (o.status === 'approved' || o.status === 'published'))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .map((o) => toPublicOpportunity(o, unlock));
  return { ok: true, opportunities: list, publicContact: PUBLIC_CONTACT };
}

function submitOpportunity(body) {
  const lang = body && body.lang === 'fr' ? 'fr' : 'ar';
  const title = sanitizeText(body && body.title, 140);
  const description = sanitizeText(body && body.description, 3000);
  if (!title || title.length < 4) {
    const err = new Error(lang === 'fr' ? 'Titre trop court' : 'العنوان قصير جداً');
    err.status = 400;
    throw err;
  }
  if (!description || description.length < 20) {
    const err = new Error(lang === 'fr' ? 'Description trop courte' : 'الوصف قصير جداً');
    err.status = 400;
    throw err;
  }

  const item = {
    id: 'inv_' + crypto.randomBytes(7).toString('hex'),
    title,
    titleFr: sanitizeText(body && body.titleFr, 140),
    sector: sanitizeText(body && body.sector, 80) || (lang === 'fr' ? 'Autre' : 'أخرى'),
    capital: sanitizeText(body && body.capital, 80),
    stage: sanitizeText(body && body.stage, 80) || (lang === 'fr' ? 'Idée' : 'فكرة'),
    summary: description.slice(0, 400),
    summaryFr: sanitizeText(body && body.summaryFr, 400),
    description,
    wilaya: sanitizeText(body && body.wilaya, 60),
    contactEmail: sanitizeText(body && body.contactEmail, 120),
    contactPhone: sanitizeText(body && body.contactPhone, 40),
    accountId: sanitizeText(body && body.accountId, 80) || null,
    status: 'pending_review',
    createdAt: new Date().toISOString(),
    lang,
  };

  const store = readInvestments();
  store.opportunities.unshift(item);
  if (store.opportunities.length > 500) store.opportunities = store.opportunities.slice(0, 500);
  writeInvestments(store);
  pushEvent('opportunity_submit', {
    id: item.id,
    sector: item.sector,
    stage: item.stage,
    lang,
  });

  return {
    ok: true,
    id: item.id,
    status: item.status,
    message: lang === 'fr'
      ? 'Dossier reçu. Revue interne avant publication. Contact public: ' + PUBLIC_CONTACT
      : 'تم استلام الملف. مراجعة داخلية قبل النشر. التواصل العام: ' + PUBLIC_CONTACT,
    publicContact: PUBLIC_CONTACT,
  };
}

function buildDailyDigest() {
  const store = readInvestments();
  const events = readEvents().events || [];
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentEvents = events.filter((e) => e && e.at && Date.parse(e.at) >= dayAgo);
  const pending = store.opportunities.filter((o) => o && o.status === 'pending_review');
  const approved = store.opportunities.filter((o) => o && (o.status === 'approved' || o.status === 'published'));
  const plans = recentEvents.filter((e) => e.type === 'plan_request').length;
  const submits = recentEvents.filter((e) => e.type === 'opportunity_submit').length;

  return {
    generatedAt: new Date().toISOString(),
    windowHours: 24,
    plansRequested: plans,
    opportunitiesSubmitted: submits,
    pendingReview: pending.length,
    published: approved.length,
    pendingItems: pending.slice(0, 15).map((o) => ({
      id: o.id,
      title: o.title,
      sector: o.sector,
      capital: o.capital,
      createdAt: o.createdAt,
    })),
    publicContact: PUBLIC_CONTACT,
  };
}

let _mailer = null;
function getMailer() {
  if (_mailer) return _mailer;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  try {
    const nodemailer = require('nodemailer');
    _mailer = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    return _mailer;
  } catch (e) {
    return null;
  }
}

async function sendOpsDailyReport() {
  const to = opsEmail();
  const digest = buildDailyDigest();
  if (!to) {
    return { ok: false, skipped: true, reason: 'ops_email_unset', digest };
  }
  const mailer = getMailer();
  if (!mailer) {
    return { ok: false, skipped: true, reason: 'smtp_unset', digest };
  }

  const lines = [
    'تقرير غرفة الاستثمارات — رزق',
    'Rapport Salle des investissements — Rizq',
    '',
    'Generated: ' + digest.generatedAt,
    'Plans (24h): ' + digest.plansRequested,
    'Submissions (24h): ' + digest.opportunitiesSubmitted,
    'Pending review: ' + digest.pendingReview,
    'Published: ' + digest.published,
    '',
    'Pending titles:',
  ];
  digest.pendingItems.forEach((it) => {
    lines.push('- [' + it.id + '] ' + it.title + ' · ' + (it.sector || '') + ' · ' + (it.capital || ''));
  });
  if (!digest.pendingItems.length) lines.push('- (none)');
  lines.push('', 'Public contact (platform): ' + PUBLIC_CONTACT);
  lines.push('This ops inbox must never appear on the public site.');

  try {
    await mailer.sendMail({
      from: process.env.EMAIL_FROM || '"رزق Rizq Ops" <direction@rizq.mr>',
      to,
      subject: '[Rizq] Investment room daily report — ' + new Date().toISOString().slice(0, 10),
      text: lines.join('\n'),
    });
    pushEvent('ops_report_sent', { pending: digest.pendingReview, plans: digest.plansRequested });
    return { ok: true, digest: { plansRequested: digest.plansRequested, opportunitiesSubmitted: digest.opportunitiesSubmitted, pendingReview: digest.pendingReview } };
  } catch (e) {
    console.error('[investments/ops-report]', e.message);
    return { ok: false, error: e.message, digest };
  }
}

function startDailyOpsScheduler() {
  if (process.env.INVESTMENT_OPS_REPORT !== '1' && process.env.INVESTMENT_OPS_REPORT !== 'true') {
    return { started: false, reason: 'disabled' };
  }
  const intervalMs = Math.max(60 * 60 * 1000, parseInt(process.env.INVESTMENT_OPS_INTERVAL_MS || String(24 * 60 * 60 * 1000), 10) || 86400000);
  setInterval(() => {
    sendOpsDailyReport().catch((e) => console.warn('[investments/ops-report] interval:', e && e.message));
  }, intervalMs);
  // أول إرسال بعد 3 دقائق من الإقلاع (لا فورًا لتفادي ضجيج إعادة التشغيل)
  setTimeout(() => {
    sendOpsDailyReport().catch(() => {});
  }, 3 * 60 * 1000);
  return { started: true, intervalMs };
}

module.exports = {
  PUBLIC_CONTACT,
  SECTORS,
  generatePlan,
  localPlan,
  listPublic,
  submitOpportunity,
  buildDailyDigest,
  sendOpsDailyReport,
  startDailyOpsScheduler,
  opsEmail,
  readInvestments,
  toPublicOpportunity,
};
