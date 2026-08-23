/**
 * Widget agent — automatic language detection (AR / HS / FR / EN / ES)
 */
const LANG_LABELS = {
  ar: 'Arabic',
  hs: 'Hassaniya/Darija Arabic',
  fr: 'French',
  en: 'English',
  es: 'Spanish',
};

function normalizeUiLang(hint) {
  const h = String(hint || 'ar').toLowerCase();
  if (h === 'fr' || h === 'en' || h === 'es' || h === 'hs') return h;
  return 'ar';
}

/**
 * Detect reply language from user message; fall back to UI hint when ambiguous.
 * @param {string} text
 * @param {string} [uiLangHint]
 * @returns {'ar'|'hs'|'fr'|'en'|'es'}
 */
function detectUserLanguage(text, uiLangHint) {
  const t = String(text || '').trim();
  if (!t) return normalizeUiLang(uiLangHint);

  const lower = t.toLowerCase();

  if (/كيفاش|شنهو|شنو|واش|بغيت|شحال|ماكو|كاين|نعاونك|راك|الزين|بزاف|واخا|علاش|فين|دابا|يلاه|ماشي|هادشي|شنهي/.test(t)) return 'hs';

  if (/[\u0600-\u06FF]/.test(t)) return 'ar';

  if (/\b(bonjour|bonsoir|salut|merci|comment|prix|acheter|vendre|combien|annonce|forfait|svp|je\s+veux|puis-je|qu'est|fiabilit|vendeur|publier)\b/i.test(lower)) {
    return 'fr';
  }

  if (/\b(hola|buenos|gracias|por\s+favor|c[oó]mo|precio|quiero|vender|comprar|ayuda|cu[aá]nto|anuncio|confianza|vendedor)\b/i.test(lower)) {
    return 'es';
  }

  if (/\b(hello|hi|hey|thanks|thank\s+you|how|what|price|buy|sell|help|please|register|trust|seller|package|post\s+ad|reliable)\b/i.test(lower)) {
    return 'en';
  }

  if (/[a-z]/i.test(t)) return 'en';

  return normalizeUiLang(uiLangHint);
}

function getLangLabel(lang) {
  return LANG_LABELS[lang] || LANG_LABELS.ar;
}

function isRtlLang(lang) {
  return lang === 'ar' || lang === 'hs';
}

/** Pick localized string with EN fallback for unknown langs. */
function pickLang(map, lang) {
  if (!map) return '';
  if (map[lang]) return map[lang];
  if (lang === 'hs' && map.ar) return map.ar;
  return map.en || map.ar || map.fr || '';
}

module.exports = {
  detectUserLanguage,
  normalizeUiLang,
  getLangLabel,
  isRtlLang,
  pickLang,
  LANG_LABELS,
};
