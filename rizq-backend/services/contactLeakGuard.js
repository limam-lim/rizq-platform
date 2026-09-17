/**
 * contactLeakGuard.js — فحص تسريب وسائل التواصل (نصوص + تمويه)
 * © Rizq ADMINIA SARL
 */
'use strict';

const CONTACT_PATTERNS = [
  { id: 'email', re: /[\w.+-]+@[\w-]+\.[\w.-]+/gi },
  { id: 'phone_mr', re: /(?:\+?222|00222)[\s.\-/]*(?:[\d٠-٩][\s.\-/]*){6,10}/g },
  { id: 'phone_local', re: /\b(?:2|3|4)[\s.\-/]?[\d٠-٩]{2}[\s.\-/]?[\d٠-٩]{2}[\s.\-/]?[\d٠-٩]{2}[\s.\-/]?[\d٠-٩]{2}\b/g },
  { id: 'phone_generic', re: /\b(?:\+?\d{1,4}[\s.\-/]?)?(?:[\d٠-٩][\s.\-/]?){7,12}\d\b/g },
  { id: 'whatsapp_link', re: /(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)[^\s<>"']*/gi },
  { id: 'url', re: /(?:https?:\/\/|www\.)[^\s<>"']{4,}/gi },
  { id: 'telegram', re: /(?:https?:\/\/)?(?:t\.me|telegram\.me|telegram\.org)\/[^\s<>"']*/gi },
  { id: 'instagram', re: /(?:https?:\/\/)?(?:instagram\.com|instagr\.am)\/[^\s<>"']*/gi },
  { id: 'facebook', re: /(?:https?:\/\/)?(?:facebook\.com|fb\.com|fb\.me|m\.facebook\.com)\/[^\s<>"']*/gi },
  { id: 'twitter_x', re: /(?:https?:\/\/)?(?:twitter\.com|x\.com)\/[^\s<>"']*/gi },
  { id: 'linkedin', re: /(?:https?:\/\/)?(?:linkedin\.com|lnkd\.in)\/[^\s<>"']*/gi },
  { id: 'snapchat', re: /(?:https?:\/\/)?(?:snapchat\.com|snap\.chat)\/[^\s<>"']*/gi },
  { id: 'tiktok', re: /(?:https?:\/\/)?(?:tiktok\.com|vm\.tiktok\.com)\/[^\s<>"']*/gi },
];

const CONTACT_KEYWORD_RES = [
  { id: 'kw_whatsapp', re: /(?:whatsapp|what'?s?\s*app|wa\.me|واتس(?:اب)?|wtsp)/i },
  { id: 'kw_telegram', re: /(?:telegram|t\.me|تلي(?:جر|گر)ام|تلگرام|tlg)/i },
  { id: 'kw_phone_ar', re: /(?:هاتف|جوال|تلفون|رقم(?:ي|ال)?|اتصل(?:وا|ي)?|راسل(?:ني|ون)?|تواصل\s*مع(?:ي|نا)?)/i },
  { id: 'kw_phone_en', re: /\b(?:contact|tel(?:ephone)?|phone|mobile|call\s*me|reach\s*me|appel(?:er)?)\b/i },
  { id: 'kw_social', re: /(?:instagram|insta|facebook|fb\.com|snapchat|tiktok|انست(?:ا|غرام)|فيس(?:بوك)?|فايسبوك)/i },
];

const AR_NUMBER_WORDS = new Set([
  'صفر', 'واحد', 'واحدة', 'اثنان', 'اثنين', 'اثنتان', 'اثنتين', 'ثلاث', 'ثلاثة',
  'اربعة', 'أربعة', 'اربع', 'أربع', 'خمس', 'خمسة', 'ست', 'ستة', 'سبع', 'سبعة',
  'ثمان', 'ثماني', 'ثمانية', 'تسع', 'تسعة', 'عشر', 'عشرة',
]);

const EN_NUMBER_WORDS = new Set([
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
]);

const REDACT_PLACEHOLDER = '[محجوب — اشترك لعرض التواصل]';
const REDACT_EMAIL = '•••@•••.•••';
const REDACT_PHONE = '••• ••• •••';

function normalizeForScan(text) {
  return String(text || '')
    .replace(/[\u200c\u200d\u200e\u200f]/g, '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^\S\n]+/g, ' ')
    .trim();
}

function tokenizeWords(text) {
  return normalizeForScan(text)
    .toLowerCase()
    .split(/[\s,،.;:!?()[\]{}"'\/\\|+\-_=]+/)
    .filter(Boolean);
}

function scanLiteralDigitWords(text) {
  const words = tokenizeWords(text);
  let consecutive = 0;
  let maxConsecutive = 0;
  let totalHits = 0;
  words.forEach((w) => {
    const isNumWord = AR_NUMBER_WORDS.has(w) || EN_NUMBER_WORDS.has(w);
    if (isNumWord) {
      consecutive += 1;
      totalHits += 1;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    } else {
      consecutive = 0;
    }
  });
  if (maxConsecutive >= 3) return { hit: true, id: 'literal_digits_consecutive', detail: maxConsecutive };
  if (totalHits >= 4) return { hit: true, id: 'literal_digits_scattered', detail: totalHits };
  return { hit: false };
}

function runPatternScan(text, patterns) {
  const hits = [];
  const s = String(text || '');
  patterns.forEach(({ id, re }) => {
    re.lastIndex = 0;
    if (re.test(s)) hits.push(id);
  });
  return hits;
}

/**
 * @returns {{ hasLeak: boolean, hits: string[], messageAr: string, messageFr: string }}
 */
function scanContactLeak(text) {
  const s = String(text || '');
  if (!s.trim()) {
    return { hasLeak: false, hits: [], messageAr: '', messageFr: '' };
  }
  const hits = []
    .concat(runPatternScan(s, CONTACT_PATTERNS))
    .concat(runPatternScan(s, CONTACT_KEYWORD_RES));

  const literal = scanLiteralDigitWords(s);
  if (literal.hit) hits.push(literal.id);

  const unique = [...new Set(hits)];
  return {
    hasLeak: unique.length > 0,
    hits: unique,
    messageAr: unique.length
      ? 'يُمنع إدراج أرقام أو بريد أو روابط تواصل خارجية — استخدم منصة رزق للتواصل بعد الاشتراك.'
      : '',
    messageFr: unique.length
      ? 'Numéros, e-mails ou liens de contact externes interdits — utilisez Rizq après abonnement.'
      : '',
  };
}

function scanContactLeakFields(fields) {
  const allHits = [];
  const badFields = [];
  (fields || []).forEach((f) => {
    const scan = scanContactLeak(f.val);
    if (scan.hasLeak) {
      badFields.push({ field: f.key, hits: scan.hits });
      scan.hits.forEach((h) => { if (allHits.indexOf(h) === -1) allHits.push(h); });
    }
  });
  return {
    hasLeak: badFields.length > 0,
    fields: badFields,
    hits: allHits,
    messageAr: 'يُمنع إدراج أرقام أو بريد أو روابط تواصل خارجية في هذا المحتوى.',
    messageFr: 'Numéros, e-mails ou liens de contact interdits dans ce contenu.',
  };
}

function stripContactLeak(text) {
  let s = String(text || '');
  CONTACT_PATTERNS.forEach(({ re }) => {
    re.lastIndex = 0;
    s = s.replace(re, REDACT_PLACEHOLDER);
  });
  CONTACT_KEYWORD_RES.forEach(({ re }) => {
    re.lastIndex = 0;
    s = s.replace(re, REDACT_PLACEHOLDER);
  });
  return s;
}

/** فلترة عند القراءة للمشاهدين غير المصرّح لهم */
function redactContactPatterns(text) {
  if (!text) return text;
  let s = String(text);
  s = s.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/gi, REDACT_EMAIL);
  s = s.replace(/(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)[^\s]*/gi, REDACT_PLACEHOLDER);
  s = s.replace(/(?:https?:\/\/)?(?:t\.me|telegram\.me|telegram\.org)[^\s]*/gi, REDACT_PLACEHOLDER);
  s = s.replace(/(?:https?:\/\/)?(?:instagram\.com|instagr\.am|facebook\.com|fb\.com|fb\.me|twitter\.com|x\.com|linkedin\.com|snapchat\.com|tiktok\.com)[^\s]*/gi, REDACT_PLACEHOLDER);
  s = s.replace(/(?:https?:\/\/|www\.)[^\s<>"']+/gi, REDACT_PLACEHOLDER);
  s = s.replace(/(?:\+?222|00222)[\s.\-/]*(?:[\d٠-٩][\s.\-/]*){6,10}/g, REDACT_PHONE);
  s = s.replace(/\b(?:2|3|4)[\s.\-/]?[\d٠-٩]{2}[\s.\-/]?[\d٠-٩]{2}[\s.\-/]?[\d٠-٩]{2}[\s.\-/]?[\d٠-٩]{2}\b/g, REDACT_PHONE);
  s = s.replace(/[٠-٩]{2,}[\s.\-/]*[٠-٩]{2,}/g, REDACT_PHONE);
  s = s.replace(/\b(?:\+?\d{1,3}[\s.\-/]?)?\d{2}[\s.\-/]?\d{2}[\s.\-/]?\d{2}[\s.\-/]?\d{2}\b/g, REDACT_PHONE);
  return s;
}

module.exports = {
  scanContactLeak,
  scanContactLeakFields,
  stripContactLeak,
  redactContactPatterns,
  CONTACT_PATTERNS,
  CONTACT_KEYWORD_RES,
};
