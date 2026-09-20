/**
 * غرفة الاستثمارات — وكيل المراجعة الأوّلية + تخزين الفرص + تقرير تشغيلي يومي.
 * البريد التشغيلي خاص (INVESTMENT_OPS_EMAIL / OWNER_OPS_EMAIL / SUPER_ADMIN_EMAIL)
 * ولا يُعرَض أبداً في الواجهة العامة — direction@rizq.mr هو البريد العام فقط.
 */
'use strict';

const crypto = require('crypto');
const {
  isAnthropicConfigured,
  getAgentModel,
  createCachedMessage,
} = require('../config/anthropic');
const {
  scoreInvestmentOpportunity,
  shouldAutoApprove,
  TIER,
} = require('./provisionalTier');
const { saveInvestmentImages } = require('./imagePipeline');
const { saveInvestmentDocument, extractPdfTextFromDataUri } = require('./tenderDocument');
const repos = require('../db/repos');

const PUBLIC_CONTACT = 'direction@rizq.mr';
const SECTORS = [
  'تجارة', 'خدمات', 'تكنولوجيا', 'عقارات', 'زراعة', 'صناعة', 'طاقة', 'سياحة', 'تعليم', 'صحة', 'أخرى',
  'commerce', 'services', 'technologie', 'immobilier', 'agriculture', 'industrie', 'energie', 'tourisme', 'education', 'sante', 'autre'
];

function readInvestments() {
  return {
    opportunities: repos.listInvestmentOpportunities(),
    updatedAt: (repos.investments.get('_meta') || {}).updatedAt || null,
  };
}

function writeInvestments(store) {
  const opps = (store && Array.isArray(store.opportunities)) ? store.opportunities : [];
  const entries = opps.filter((o) => o && o.id).map((o) => ({ id: String(o.id), data: o }));
  entries.push({ id: '_meta', data: { updatedAt: new Date().toISOString() } });
  repos.investments.replaceAll(entries);
}

function readEvents() {
  return { events: repos.listInvestmentEvents() };
}

function pushEvent(type, meta) {
  const id = 'iev_' + crypto.randomBytes(6).toString('hex');
  const ev = {
    id,
    type: String(type || 'event'),
    meta: meta && typeof meta === 'object' ? meta : {},
    at: new Date().toISOString(),
  };
  repos.pushInvestmentEvent(ev);
  // احتفظ بحد أقصى ~2000 حدث
  const all = repos.listInvestmentEvents().sort((a, b) => String(b.at).localeCompare(String(a.at)));
  if (all.length > 2000) {
    all.slice(2000).forEach((e) => repos.investmentEvents.remove(String(e.id)));
  }
  return readEvents();
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
    provisionalTier: item.provisionalTier || null,
    provisionalLabelAr: item.provisionalLabelAr || null,
    provisionalLabelFr: item.provisionalLabelFr || null,
  };
  if (unlockContacts) {
    out.contactHint = PUBLIC_CONTACT;
  } else {
    out.contactHint = null;
    out.contactsLocked = true;
  }
  return out;
}

function isPublicStatus(status) {
  return status === 'approved' || status === 'published' || status === 'provisionally_approved';
}

function listPublic(opts) {
  const unlock = !!(opts && opts.unlockContacts);
  const store = readInvestments();
  const list = store.opportunities
    .filter((o) => o && isPublicStatus(o.status))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .map((o) => toPublicOpportunity(o, unlock));
  return { ok: true, opportunities: list, publicContact: PUBLIC_CONTACT };
}

async function submitOpportunity(body) {
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

  if (body && body.document) {
    const pdfExtract = await extractPdfTextFromDataUri(body.document);
    if (pdfExtract.error) {
      const err = new Error(lang === 'fr' ? 'PDF invalide ou trop volumineux (max 5 Mo)' : 'ملف PDF غير صالح أو أكبر من 5MB');
      err.status = 400;
      err.code = 'invalid_pdf';
      throw err;
    }
  }

  const draft = {
    title,
    description,
    capital: sanitizeText(body && body.capital, 80),
    sector: sanitizeText(body && body.sector, 80) || (lang === 'fr' ? 'Autre' : 'أخرى'),
    stage: sanitizeText(body && body.stage, 80) || (lang === 'fr' ? 'Idée' : 'فكرة'),
  };
  const score = scoreInvestmentOpportunity(draft);
  const auto = shouldAutoApprove(score.provisionalTier);
  const status = auto ? 'provisionally_approved' : 'pending_review';
  const id = 'inv_' + crypto.randomBytes(7).toString('hex');

  let images = [];
  let documentPath = null;
  try {
    images = await saveInvestmentImages(id, body && body.images);
    documentPath = await saveInvestmentDocument(id, body && body.document);
  } catch (e) {
    if (e && e.code === 'invalid_pdf') {
      const err = new Error(lang === 'fr' ? 'PDF invalide ou trop volumineux (max 5 Mo)' : 'ملف PDF غير صالح أو أكبر من 5MB');
      err.status = 400;
      throw err;
    }
    throw e;
  }

  const item = {
    id,
    title,
    titleFr: sanitizeText(body && body.titleFr, 140),
    sector: draft.sector,
    capital: draft.capital,
    stage: draft.stage,
    summary: description.slice(0, 400),
    summaryFr: sanitizeText(body && body.summaryFr, 400),
    description,
    wilaya: sanitizeText(body && body.wilaya, 60),
    contactEmail: sanitizeText(body && body.contactEmail, 120),
    contactPhone: sanitizeText(body && body.contactPhone, 40),
    accountId: sanitizeText(body && body.accountId, 80) || null,
    images: images || [],
    document: documentPath,
    documentName: documentPath
      ? sanitizeText(body && body.documentName, 120) || 'document.pdf'
      : null,
    status,
    createdAt: new Date().toISOString(),
    lang,
    provisionalTier: score.provisionalTier,
    provisionalLabelAr: score.provisionalLabelAr,
    provisionalLabelFr: score.provisionalLabelFr,
    provisionalReasons: score.provisionalReasons,
    provisionalAt: score.provisionalAt,
    provisionalBy: score.provisionalBy,
    provisionallyApprovedAt: auto ? new Date().toISOString() : null,
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
    provisionalTier: item.provisionalTier,
    autoApproved: auto,
    imageCount: (item.images || []).length,
    hasDocument: !!item.document,
  });
  if (auto) {
    pushEvent('opportunity_provisional_approve', { id: item.id, tier: TIER.GREEN });
  }

  const msgAr = auto
    ? 'موافقة مبدئية من وكيل الاستثمارات. يمكنك المتابعة — القرار قابل للمراجعة. التواصل العام: ' + PUBLIC_CONTACT
    : 'تم استلام الملف. معلّق بانتظار مراجعة Limam (لبس أو شبهة). التواصل العام: ' + PUBLIC_CONTACT;
  const msgFr = auto
    ? 'Approbation provisoire par le conseiller investissement. Suite possible — décision révocable. Contact public: ' + PUBLIC_CONTACT
    : 'Dossier reçu. En attente de Limam (ambiguïté ou suspicion). Contact public: ' + PUBLIC_CONTACT;

  return {
    ok: true,
    id: item.id,
    status: item.status,
    provisionalTier: item.provisionalTier,
    provisionalLabel: lang === 'fr' ? item.provisionalLabelFr : item.provisionalLabelAr,
    autoApproved: auto,
    message: lang === 'fr' ? msgFr : msgAr,
    publicContact: PUBLIC_CONTACT,
  };
}

/** قرار بشري نهائي — ينقض أو يؤكد الموافقة المبدئية */
function decideOpportunity(id, action, reviewer) {
  const store = readInvestments();
  const idx = store.opportunities.findIndex((o) => o && o.id === id);
  if (idx === -1) {
    const err = new Error('not_found');
    err.status = 404;
    throw err;
  }
  const act = String(action || '').toLowerCase();
  if (act !== 'approve' && act !== 'reject' && act !== 'hold') {
    const err = new Error('invalid_action');
    err.status = 400;
    throw err;
  }
  const item = store.opportunities[idx];
  if (act === 'approve') {
    item.status = 'approved';
    item.publishedAt = new Date().toISOString();
  } else if (act === 'reject') {
    item.status = 'rejected';
    item.rejectedAt = new Date().toISOString();
  } else {
    item.status = 'pending_review';
  }
  item.reviewedAt = new Date().toISOString();
  item.reviewedBy = String(reviewer || 'admin').slice(0, 80);
  item.humanOverride = true;
  store.opportunities[idx] = item;
  writeInvestments(store);
  pushEvent('opportunity_decision', { id, action: act, by: item.reviewedBy });
  return { ok: true, opportunity: toPublicOpportunity(item, true) };
}

function listAdmin(opts) {
  const store = readInvestments();
  let list = store.opportunities.slice();
  const status = opts && opts.status;
  if (status) list = list.filter((o) => o && o.status === status);
  const tier = opts && opts.tier;
  if (tier) list = list.filter((o) => o && o.provisionalTier === tier);
  return {
    ok: true,
    opportunities: list.slice(0, 200).map((o) => ({
      id: o.id,
      title: o.title,
      sector: o.sector,
      capital: o.capital,
      stage: o.stage,
      status: o.status,
      provisionalTier: o.provisionalTier,
      provisionalLabelAr: o.provisionalLabelAr,
      provisionalReasons: o.provisionalReasons,
      createdAt: o.createdAt,
      contactEmail: o.contactEmail || null,
      contactPhone: o.contactPhone || null,
      humanOverride: !!o.humanOverride,
    })),
  };
}

function buildDailyDigest() {
  const store = readInvestments();
  const events = readEvents().events || [];
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentEvents = events.filter((e) => e && e.at && Date.parse(e.at) >= dayAgo);
  const pending = store.opportunities.filter((o) => o && o.status === 'pending_review');
  const provisional = store.opportunities.filter((o) => o && o.status === 'provisionally_approved');
  const approved = store.opportunities.filter((o) => o && (o.status === 'approved' || o.status === 'published'));
  const plans = recentEvents.filter((e) => e.type === 'plan_request').length;
  const submits = recentEvents.filter((e) => e.type === 'opportunity_submit').length;
  const auto = recentEvents.filter((e) => e.type === 'opportunity_provisional_approve').length;
  const byTier = { green: 0, yellow: 0, red: 0 };
  store.opportunities.forEach((o) => {
    if (o && o.provisionalTier && byTier[o.provisionalTier] != null) byTier[o.provisionalTier] += 1;
  });

  return {
    generatedAt: new Date().toISOString(),
    windowHours: 24,
    plansRequested: plans,
    opportunitiesSubmitted: submits,
    autoProvisionallyApproved: auto,
    pendingReview: pending.length,
    provisionallyApproved: provisional.length,
    published: approved.length,
    tiers: byTier,
    pendingItems: pending.slice(0, 15).map((o) => ({
      id: o.id,
      title: o.title,
      sector: o.sector,
      capital: o.capital,
      provisionalTier: o.provisionalTier,
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
    'Provisionally approved live: ' + (digest.provisionallyApproved || 0),
    'Auto provisional (24h): ' + (digest.autoProvisionallyApproved || 0),
    'Published: ' + digest.published,
    'Tiers: green=' + ((digest.tiers && digest.tiers.green) || 0) +
      ' yellow=' + ((digest.tiers && digest.tiers.yellow) || 0) +
      ' red=' + ((digest.tiers && digest.tiers.red) || 0),
    '',
    'Pending / yellow-red titles:',
  ];
  digest.pendingItems.forEach((it) => {
    lines.push('- [' + (it.provisionalTier || '?') + '] [' + it.id + '] ' + it.title + ' · ' + (it.sector || '') + ' · ' + (it.capital || ''));
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
  listAdmin,
  submitOpportunity,
  decideOpportunity,
  buildDailyDigest,
  sendOpsDailyReport,
  startDailyOpsScheduler,
  opsEmail,
  readInvestments,
  toPublicOpportunity,
  isPublicStatus,
};
