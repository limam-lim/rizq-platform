/**
 * موافقة مبدئية موحّدة (أخضر / أصفر / أحمر)
 * — أخضر: موافقة مبدئية تلقائية
 * — أصفر/أحمر: تعليق لانتظار Limam (لبس / شبهة / غير منطقي)
 * القرار النهائي قابل للنقض من لوحة الأدمن دائماً.
 */
'use strict';

const TIER = {
  GREEN: 'green',
  YELLOW: 'yellow',
  RED: 'red',
};

const LABELS = {
  ar: {
    green: 'موافقة مبدئية ✅',
    yellow: 'لبس — بانتظارك ⚠️',
    red: 'شبهة / غير منطقي 🚨',
  },
  fr: {
    green: 'Approbation provisoire ✅',
    yellow: 'Ambigu — en attente ⚠️',
    red: 'Suspect / illogique 🚨',
  },
};

/** تفعيل الموافقة المبدئية التلقائية (افتراضي: مفعّل) */
function autoApproveEnabled() {
  const v = String(process.env.PROVISIONAL_AUTO_APPROVE || '1').trim().toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'off' && v !== 'no';
}

function label(tier, lang) {
  const L = lang === 'fr' ? LABELS.fr : LABELS.ar;
  return L[tier] || L.yellow;
}

/**
 * تحويل مستوى موثوقية الباقات/الوصل إلى لون.
 * clear → أخضر | low/medium → أصفر | high/unreviewed → أحمر
 */
function tierFromPlausibility(level, flags) {
  const lv = String(level || 'unreviewed').toLowerCase();
  const fl = Array.isArray(flags) ? flags.map((f) => String(f).toLowerCase()) : [];
  const hardFlag = fl.some((f) =>
    /duplicate|fraud|mismatch|fake|محظور|تزوير|مكرر|سعر.?خاط|بدون.?وصل|no.?receipt|price.?mismatch/.test(f)
  );
  if (hardFlag || lv === 'high') return TIER.RED;
  if (lv === 'unreviewed' || lv === 'medium' || lv === 'low') {
    if (lv === 'clear') return TIER.GREEN;
    if (lv === 'low') return TIER.YELLOW;
    if (lv === 'medium') return TIER.YELLOW;
    return TIER.RED; // unreviewed بدون وصل مؤكد
  }
  if (lv === 'clear') return TIER.GREEN;
  return TIER.YELLOW;
}

const INV_RED_RE = /ضمان\s*عائد|عائد\s*مضمون|ربح\s*مضمون|100\s*%\s*ربح|بدون\s*مخاطر|garant(?:ie|i)\s*(?:de\s*)?rendement|guaranteed\s*return|sans\s*risque|get\s*rich|ponzi|احتيال|نصب/i;
const INV_YELLOW_RE = /قريباً|غير\s*محدد|تواصل\s*خاص|whatsapp\s*only|بسرعة|فرصة\s*نادرة|urgent|asap|limited\s*time/i;

/**
 * تقييم فرصة استثمارية — قواعد حذرة مناسبة لعمل فردي.
 */
function scoreInvestmentOpportunity(item) {
  const reasons = [];
  const title = String((item && item.title) || '').trim();
  const desc = String((item && item.description) || '').trim();
  const capital = String((item && item.capital) || '').trim();
  const sector = String((item && item.sector) || '').trim();
  const blob = title + '\n' + desc + '\n' + capital;

  let tier = TIER.GREEN;

  if (INV_RED_RE.test(blob)) {
    tier = TIER.RED;
    reasons.push('guaranteed_return_or_fraud_language');
  }
  if (/مليار|billion|∞|unlimited/i.test(capital) && desc.length < 120) {
    tier = TIER.RED;
    reasons.push('unrealistic_capital_thin_desc');
  }
  if (desc.length < 40) {
    tier = tier === TIER.RED ? TIER.RED : TIER.YELLOW;
    reasons.push('description_short');
  }
  if (!capital || /غير\s*محدد|n\/?a|à\s*préciser/i.test(capital)) {
    if (tier === TIER.GREEN) tier = TIER.YELLOW;
    reasons.push('capital_missing');
  }
  if (!sector || /أخرى|autre|other|عام|général/i.test(sector)) {
    if (tier === TIER.GREEN) tier = TIER.YELLOW;
    reasons.push('sector_vague');
  }
  if (INV_YELLOW_RE.test(blob) && tier === TIER.GREEN) {
    tier = TIER.YELLOW;
    reasons.push('urgency_or_ambiguity');
  }
  if (title.length < 6) {
    tier = tier === TIER.RED ? TIER.RED : TIER.YELLOW;
    reasons.push('title_short');
  }

  return {
    provisionalTier: tier,
    provisionalLabelAr: label(tier, 'ar'),
    provisionalLabelFr: label(tier, 'fr'),
    provisionalReasons: reasons,
    provisionalAt: new Date().toISOString(),
    provisionalBy: 'investment_agent',
  };
}

/**
 * تقييم طلب باقة بعد تحليل الوصل (أو من riskLevel القادم من العميل).
 */
function scorePackageRequest(req, aiResult) {
  const level = (aiResult && aiResult.plausibilityLevel) || (req && req.riskLevel) || 'unreviewed';
  const flags = []
    .concat((req && req.flags) || [])
    .concat((aiResult && aiResult.notes) || []);
  let tier = tierFromPlausibility(level, flags);
  const reasons = [];
  if (!req || !req.receiptImage) {
    reasons.push('no_receipt');
    tier = TIER.RED;
  }
  if (String(level) === 'unreviewed') reasons.push('ai_unreviewed');
  if (Array.isArray(aiResult && aiResult.notes)) {
    aiResult.notes.slice(0, 5).forEach((n) => reasons.push(String(n).slice(0, 80)));
  }
  return {
    provisionalTier: tier,
    provisionalLabelAr: label(tier, 'ar'),
    provisionalLabelFr: label(tier, 'fr'),
    provisionalReasons: reasons.slice(0, 12),
    provisionalAt: new Date().toISOString(),
    provisionalBy: 'packages_agent',
    plausibilityLevel: level,
  };
}

function shouldAutoApprove(tier) {
  return autoApproveEnabled() && tier === TIER.GREEN;
}

module.exports = {
  TIER,
  LABELS,
  autoApproveEnabled,
  label,
  tierFromPlausibility,
  scoreInvestmentOpportunity,
  scorePackageRequest,
  shouldAutoApprove,
};
