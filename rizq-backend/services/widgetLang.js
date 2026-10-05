/**
 * Widget agent — automatic language detection (AR / HS / FR / EN / ES)
 * Reply MUST match the language/dialect of the user's latest message.
 */
const LANG_LABELS = {
  ar: 'Arabic (Fusaha)',
  hs: 'Mauritanian Hassaniya (NOT Moroccan Darija)',
  fr: 'French',
  en: 'English',
  es: 'Spanish',
};

/** Mauritanian Hassaniya markers — keep in sync with client widget detectors */
const HASSANIYA_RE =
  /كيفاش|كيفاه|كيفة|شنهو|شنهوا|شنهي|شنو\s*هو|اشنو|اش\s*تبي|اش\s*بيك|تبيها|تبيه|نبيه|نبي\s|تبي|حابّ|حاب |واش|بغيت|شحال|شحّال|شحالك|اشحال|ماكو|ماكاش|كاين|نعاونك|راهي|راهو|راه |الزين|حسانية|hassani|وش\s*راك|وين\s*راك|ماشي\s*مشكل|أهلين|اهلين|أيوه|ايوه|تاع|متاع|هاذي|هذاك|هاذاك|هذايا|صايي|برك|خلّيني|خليني|مانعرف|ما\s*نعرف|مانفهم|ما\s*نفهم|عطيني|وين |فين |نواكشوط|انواكشوط|موريتان|رزق\s*معاك|نوضّح|نوضح|شنو |يگول|گلت|انشاء\s*الله|إن\s*شاء\s*الله|صح\s*ولا|نبي\s*ننشر|نبي\s*محل|نبي\s*باقة|شحال\s*ثمن|كيفاه\s*ن|\bزين\b|صاي\b|صايي|لبّاس|لباس|اشلونك|شلونك/;

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

  // Explicit language switch requests
  if (/espa[nñ]?ol|espagn|spanish|سبان|اسبان|بالاسبان|en español/.test(lower) &&
      /اقصد|أقصد|أريد|اريد|talk|speak|parle|habla|respond|reply|بال|تكلم|كلمني|meant|mean|quiero|je veux|i want/.test(lower)) {
    return 'es';
  }
  if (/fran[cç]ais|french|فرنس|بالفرنس|en français/.test(lower) &&
      /اقصد|أقصد|أريد|اريد|talk|speak|parle|habla|respond|reply|بال|تكلم|كلمني|meant|mean|quiero|je veux|i want/.test(lower)) {
    return 'fr';
  }
  if (/english|anglais|انجل|إنجل|بالإنجل|speak english|in english/.test(lower) &&
      /اقصد|أقصد|أريد|اريد|talk|speak|parle|habla|respond|reply|بال|تكلم|كلمني|meant|mean|quiero|je veux|i want/.test(lower)) {
    return 'en';
  }
  if (/hassan|حسان|بالحسانية/.test(lower)) return 'hs';
  if (/بالعربية|تكلم عربي|in arabic|عربي فصح|الفصحى/.test(lower) &&
      /اقصد|أقصد|أريد|اريد|talk|speak|parle|habla|respond|reply|بال|تكلم|كلمني|meant|mean/.test(lower)) {
    return 'ar';
  }

  // Mauritanian Hassaniya — before generic Arabic script check
  if (HASSANIYA_RE.test(t) || HASSANIYA_RE.test(lower)) return 'hs';

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

  // Digits / punctuation only → UI hint
  if (/^[\d\s?.!،,؟€$]+$/.test(t)) return normalizeUiLang(uiLangHint);

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
  HASSANIYA_RE,
};
