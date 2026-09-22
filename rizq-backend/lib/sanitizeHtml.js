/**
 * sanitizeHtml.js — تنظيف HTML محدود السماح (صفحات القانون/السياسة)
 * وفلترة روابط CTA لمنع javascript:/data: XSS.
 */
'use strict';

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'a',
  'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]);

/**
 * يسمح فقط بـ http/https أو مسار نسبي يبدأ بـ / أو ./ أو #
 * يرفض javascript: / data: / vbscript: وأي مخطط آخر.
 */
function sanitizeSafeUrl(raw, maxLen) {
  const lim = Math.max(1, Number(maxLen) || 500);
  const s = String(raw == null ? '' : raw).trim().slice(0, lim);
  if (!s) return '';
  // مسار نسبي آمن
  if (s.charAt(0) === '/' || s.charAt(0) === '#' || s.indexOf('./') === 0) {
    if (/[\s<>"']/.test(s) || /javascript:/i.test(s)) return '';
    return s;
  }
  let parsed;
  try {
    parsed = new URL(s);
  } catch (e) {
    return '';
  }
  const proto = String(parsed.protocol || '').toLowerCase();
  if (proto !== 'http:' && proto !== 'https:') return '';
  return s;
}

/**
 * تنظيف HTML بسيط بدون تبعيات: يحذف السكربتات ومعالجات الأحداث
 * ويُبقي وسوماً من قائمة السماح فقط.
 */
function sanitizeLegalHtml(raw, maxLen) {
  const lim = Math.max(1, Number(maxLen) || 20000);
  let html = String(raw == null ? '' : raw).slice(0, lim);
  if (!html) return '';

  // إزالة كتل خطرة بالكامل
  html = html
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select)[^>]*\/?\s*>/gi, '');

  // إزالة معالجات الأحداث و javascript: في أي خاصية
  html = html
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src|xlink:href)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, ' $1="#"')
    .replace(/\s(href|src|xlink:href)\s*=\s*javascript:[^\s>]*/gi, ' $1="#"')
    .replace(/\s(href|src)\s*=\s*(["'])\s*data:[\s\S]*?\2/gi, ' $1="#"');

  // تمرير الوسوم: إسقاط غير المسموح، تنظيف href في <a>
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, tagName, attrs) => {
    const tag = String(tagName).toLowerCase();
    const isClose = match.charAt(1) === '/';
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (isClose) return '</' + tag + '>';
    if (tag === 'br' || tag === 'hr') return '<' + tag + '>';
    if (tag === 'a') {
      const hrefMatch = /\bhref\s*=\s*(["'])(.*?)\1/i.exec(attrs)
        || /\bhref\s*=\s*([^\s>]+)/i.exec(attrs);
      const rawHref = hrefMatch ? hrefMatch[2] || hrefMatch[1] : '';
      const safe = sanitizeSafeUrl(rawHref, 500);
      if (!safe) return '<a>';
      const safeAttr = safe.replace(/"/g, '&quot;');
      return '<a href="' + safeAttr + '" rel="noopener noreferrer">';
    }
    // وسوم أخرى بلا خصائص (يمنع style= / class= injection غير ضرورية)
    return '<' + tag + '>';
  });

  return html.slice(0, lim);
}

module.exports = { sanitizeSafeUrl, sanitizeLegalHtml };
