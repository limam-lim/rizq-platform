/**
 * agentQuality.js — طبقة جودة موحّدة لكل وكلاء رزق
 *
 * - كتلة ذكاء مشتركة تُحقَن في برومبتات الوكلاء
 * - فحص ادعاءات محظورة (عوائد مضمونة، خصومات مخترعة…)
 * - تسجيل أسئلة/ردود ضعيفة على الخادم (بدل localStorage فقط)
 * - تلميع ردود القنوات (مكالمة/واتساب)
 */
'use strict';

const crypto = require('crypto');

const FORBIDDEN_CLAIM_PATTERNS = [
  /ضمان\s*(أرباح|عائد|ربح)/i,
  /عائد\s*مضمون/i,
  /ثراء\s*سريع/i,
  /بدون\s*أي?\s*مخاطر/i,
  /100\s*%\s*(مضمون|مجاني\s*للأبد)/i,
  /rendement\s*garanti/i,
  /guaranteed\s*return/i,
  /get\s*rich\s*quick/i,
  /zero\s*risk/i,
  /خصم\s*\d{2,}\s*%\s*(من|على)?\s*(الإدارة|رزق)/i,
];

const UNCERTAIN_RE = /\b(ربما|أظن|قد يكون|I think|maybe|probably|je pense|quizás|tal vez)\b/i;

/**
 * كتلة ذكاء مشتركة — تُضاف لكل وكلاء Claude
 */
function buildIntelligenceExcellenceBlock(opts) {
  opts = opts || {};
  const mode = opts.mode || 'platform'; // platform | merchant | marketing | investment
  const lines = [
    '## INTELLIGENCE EXCELLENCE (NON-NEGOTIABLE)',
    '- Think before answering: identify intent, needed facts, and the best next action.',
    '- Prefer tools / verified data over memory for prices, packages, stock, trust scores, and lead IDs.',
    '- If data is missing: say so briefly, then offer a concrete next step (page, contact, or escalate).',
    '- Never invent numbers, discounts, inventory, deadlines, or reference IDs.',
    '- Never promise guaranteed profits, risk-free returns, or unofficial discounts.',
    '- Answer in the user\'s language (Arabic fusaha, Mauritanian Hassaniya, French, English, Spanish) — match slang length. Hassaniya must be Mauritanian (never Moroccan Darija).',
    '- Be decisive and useful: 2–5 plain sentences unless a comparison truly needs more.',
    '- For serious buy/subscribe intent: collect name + WhatsApp + need, then escalate/register interest.',
  ];
  if (mode === 'merchant') {
    lines.push(
      '- Represent ONLY this business; never recommend competitors or divert to another merchant.',
      '- Use dynamic knowledge when present; if a fact is absent from knowledge/profile, do not invent it.'
    );
  }
  if (mode === 'marketing') {
    lines.push(
      '- Creative but truthful: brand «رزق / Rizq», clear CTA, no spam punctuation, no fake scarcity.',
      '- Local Mauritanian tone; highlight real platform value (listing, reach, Diamond deputy).'
    );
  }
  if (mode === 'investment') {
    lines.push(
      '- Prudent first-pass only: no licensed financial advice, no guaranteed ROI figures.',
      '- State risks and that Rizq is a publication intermediary.'
    );
  }
  if (mode === 'platform') {
    lines.push(
      '- For package/pricing questions: call get_packages_info (or equivalent live catalog) before quoting MRU.',
      '- For listing price/trust: use tools/page context — never guess.'
    );
  }
  return lines.join('\n');
}

function findForbiddenClaim(text) {
  const s = String(text || '');
  for (let i = 0; i < FORBIDDEN_CLAIM_PATTERNS.length; i++) {
    if (FORBIDDEN_CLAIM_PATTERNS[i].test(s)) return FORBIDDEN_CLAIM_PATTERNS[i].toString();
  }
  return null;
}

function stripForbiddenClaims(text, lang) {
  const hit = findForbiddenClaim(text);
  if (!hit) return { text: String(text || ''), scrubbed: false };
  const safe = {
    ar: 'لا نقدّم وعود أرباح مضمونة أو خصومات غير رسمية. راجع البيانات الرسمية على المنصة أو راسل direction@rizq.mr.',
    fr: 'Nous ne promettons pas de rendement garanti ni de remises non officielles. Consultez les données officielles ou écrivez à direction@rizq.mr.',
    en: 'We do not promise guaranteed returns or unofficial discounts. Check official platform data or email direction@rizq.mr.',
  };
  const l = String(lang || 'ar').toLowerCase();
  return { text: safe[l] || safe.ar, scrubbed: true, hit };
}

/**
 * فحص خفيف لردود القنوات (غير الويدجت) بعد التوليد
 */
function polishChannelReply(reply, opts) {
  opts = opts || {};
  const channel = opts.channel || 'whatsapp';
  let text = String(reply || '').trim();
  if (!text) {
    text = opts.fallback || 'شكراً لتواصلكم مع رزق. كيف نقدر نساعدكم؟';
  }

  const claim = stripForbiddenClaims(text, opts.lang || 'ar');
  text = claim.text;

  // إزالة markdown الشائع من ردود القنوات الصوتية/الواتساب
  if (channel === 'call' || channel === 'whatsapp') {
    text = text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`+/g, '')
      .replace(/^#+\s*/gm, '')
      .replace(/^\s*[-•*]\s+/gm, '')
      .trim();
  }

  if (channel === 'call') {
    // قصّ الإطالة للمكالمات
    const parts = text.split(/(?<=[.!?؟。])\s+/);
    if (parts.length > 3) text = parts.slice(0, 3).join(' ');
    if (text.length > 420) text = text.slice(0, 400).trim() + '…';
  }

  const uncertain = UNCERTAIN_RE.test(text);
  const quality = {
    length: text.length,
    uncertain,
    scrubbedClaim: !!claim.scrubbed,
    pass: text.length >= 8 && !claim.scrubbed,
  };

  return { text, quality, scrubbedClaim: claim.scrubbed };
}

function scoreReplyHeuristics(reply, userMessage) {
  const text = String(reply || '');
  const msg = String(userMessage || '');
  let score = 50;
  const notes = [];
  if (text.length >= 20 && text.length <= 1200) score += 15;
  else notes.push('length');
  if (!UNCERTAIN_RE.test(text)) score += 10;
  else notes.push('uncertain');
  if (!findForbiddenClaim(text)) score += 15;
  else notes.push('forbidden');
  if (/direction@rizq\.mr|واتساب|whatsapp|سجّل|باق|رزق|rizq/i.test(text) || msg.length < 4) score += 10;
  return { score: Math.min(100, score), notes, pass: score >= 70 };
}

/* ── متجر الأسئلة الفائتة / الردود الضعيفة ───────────────── */

let _repos = null;
function repos() {
  if (!_repos) _repos = require('../db/repos');
  return _repos;
}

function recordAgentMiss(entry) {
  const now = new Date().toISOString();
  const row = {
    id: 'miss_' + Date.now().toString(36) + '_' + crypto.randomBytes(2).toString('hex'),
    text: String(entry.text || entry.message || '').slice(0, 500),
    reply: entry.reply ? String(entry.reply).slice(0, 500) : '',
    lang: String(entry.lang || 'ar').slice(0, 8),
    agent: String(entry.agent || 'unknown').slice(0, 40),
    channel: String(entry.channel || '').slice(0, 40),
    type: String(entry.type || 'missed').slice(0, 40),
    reason: String(entry.reason || '').slice(0, 200),
    tier: String(entry.tier || '').slice(0, 40),
    page: String(entry.page || '').slice(0, 200),
    at: now,
  };
  if (!row.text) return null;
  repos().agentMisses.upsert(row.id, row);
  // احتفظ بآخر 500 فقط
  const all = repos().agentMisses.list();
  if (all.length > 500) {
    all
      .sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')))
      .slice(0, all.length - 500)
      .forEach((old) => repos().agentMisses.remove(old.id));
  }
  return row;
}

function listAgentMisses(limit) {
  const n = Math.min(Number(limit) || 100, 300);
  return repos()
    .agentMisses.list()
    .slice()
    .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
    .slice(0, n);
}

function clearAgentMisses() {
  const ids = repos().agentMisses.list().map((r) => r.id);
  ids.forEach((id) => repos().agentMisses.remove(id));
  return ids.length;
}

function maybeRecordWeakReply(opts) {
  opts = opts || {};
  try {
    const ops = require('./agentOps');
    if (!ops.isAgentFamilyEnabled('quality')) return null;
  } catch (e) { /* */ }
  const reply = String(opts.reply || '');
  const message = String(opts.message || '');
  if (!message) return null;
  const heuristics = scoreReplyHeuristics(reply, message);
  const force = !!opts.force;
  const ungrounded = opts.grounded === false;
  const scrubbed = !!opts.scrubbedClaim;
  if (!force && !ungrounded && !scrubbed && heuristics.pass) return null;
  return recordAgentMiss({
    text: message,
    reply,
    lang: opts.lang,
    agent: opts.agent,
    channel: opts.channel,
    type: scrubbed ? 'claim_scrub' : (ungrounded ? 'ungrounded' : (opts.type || 'weak_reply')),
    reason: opts.reason || heuristics.notes.join(','),
    tier: opts.tier,
    page: opts.page,
  });
}

module.exports = {
  buildIntelligenceExcellenceBlock,
  findForbiddenClaim,
  stripForbiddenClaims,
  polishChannelReply,
  scoreReplyHeuristics,
  recordAgentMiss,
  listAgentMisses,
  clearAgentMisses,
  maybeRecordWeakReply,
  FORBIDDEN_CLAIM_PATTERNS,
};
