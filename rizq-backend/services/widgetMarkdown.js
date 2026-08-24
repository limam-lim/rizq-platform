/**
 * widgetMarkdown.js — تحويل Markdown آمن لردود الويدجت (بدون XSS)
 */
'use strict';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const LTR_NUM_PLAIN_RE = /(?:\+[\d\s\-().]+|\b\d[\d\s\-.,()/]{1,}\d|\b\d{2,}\b)/g;
const BIDI_CTRL_RE = /[\u200E\u200F\u2066\u2067\u2068\u2069\u202A-\u202E\u061C]/g;

/** إزالة رموز اتجاه Unicode المخفية (⁦ ⁩ وغيرها) وتنظيف ** المقطوعة */
function sanitizeAgentText(text) {
  let s = String(text || '').replace(BIDI_CTRL_RE, '');
  s = s.replace(/\*\*\s*$/g, '');
  s = s.replace(/\*\*([^*\n]{0,300})$/g, '$1');
  s = s.replace(/\*\s*$/g, '');
  return s.trim();
}

function wrapLtrNumbersPlain(text) {
  return String(text || '').replace(LTR_NUM_PLAIN_RE, (m) => {
    if (!/[+\d]/.test(m)) return m;
    return `<span dir="ltr" class="rw-num">${m}</span>`;
  });
}

function stripRawHtml(s) {
  return String(s || '')
    .replace(/<\/?[a-z][a-z0-9]*[^>]*>/gi, ' ')
    .replace(/[1-6]\s+class=&quot;rw-md-h&quot;&gt;/gi, ' ')
    .replace(/[1-6]\s+class="rw-md-h">/gi, ' ')
    .replace(/class=&quot;rw-md-h&quot;&gt;/gi, ' ')
    .replace(/class="rw-md-h">/gi, ' ')
    .replace(/<\d{1,3}(?=\s|>|$)/g, ' ');
}

function parseMarkdownHeadings(s) {
  return String(s || '').replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, title) => {
    const level = Math.min(Math.max(hashes.length, 2), 4);
    const safeTitle = wrapLtrNumbersPlain(escapeHtml(String(title || '').trim()));
    return `<h${level} class="rw-md-h">${safeTitle}</h${level}>`;
  });
}

function cleanupBrokenTags(s) {
  return String(s || '')
    .replace(/(?:^|[^<])[1-6]\s+class="rw-md-h">/g, (m) => m.replace(/[1-6]\s+class="rw-md-h">/g, ''))
    .replace(/(?:^|[^<])[1-6]\s+class=&quot;rw-md-h&quot;&gt;/g, (m) => m.replace(/[1-6]\s+class=&quot;rw-md-h&quot;&gt;/g, ''))
    .replace(/<\d{1,3}(?=\s+class="rw-md-h")/gi, '')
    .replace(/<\d{1,3}(?![0-9a-z/])/gi, '')
    .replace(/<\s*\/\s*h[0-9]/gi, '')
    .replace(/(?<!<\/?h[2-4])\s*class="rw-md-h">/g, '');
}

function formatAgentMarkdown(text) {
  const lines = sanitizeAgentText(text).split('\n');
  const processed = lines.map((line) => {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = Math.min(Math.max(heading[1].length, 2), 4);
      const safeTitle = wrapLtrNumbersPlain(escapeHtml(heading[2].trim()));
      return `<h${level} class="rw-md-h">${safeTitle}</h${level}>`;
    }

    let row = escapeHtml(stripRawHtml(line));
    row = wrapLtrNumbersPlain(row);
    row = row.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    row = row.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

    const bullet = row.match(/^[\-\*•]\s+(.+)$/);
    if (bullet) return `<li class="rw-md-li">${bullet[1]}</li>`;
    return row;
  });

  let s = processed.join('\n');
  s = s.replace(/((?:<li class="rw-md-li">[\s\S]*?<\/li>\s*)+)/g, (block) => (
    '<ul class="rw-md-ul">' + block.trim() + '</ul>'
  ));
  s = s.replace(/\n{2,}/g, '<br><br>');
  s = s.replace(/\n/g, '<br>');
  s = cleanupBrokenTags(s);
  return s;
}

function wrapLtrNumbers(html) {
  return wrapLtrNumbersPlain(html);
}

function wrapLtrPhones(html) {
  return wrapLtrNumbersPlain(html);
}

module.exports = {
  escapeHtml,
  stripRawHtml,
  sanitizeAgentText,
  wrapLtrNumbersPlain,
  parseMarkdownHeadings,
  cleanupBrokenTags,
  formatAgentMarkdown,
  wrapLtrPhones,
  wrapLtrNumbers,
  LTR_NUM_PLAIN_RE,
  BIDI_CTRL_RE,
  LTR_NUM_RE: LTR_NUM_PLAIN_RE,
  PHONE_RE: LTR_NUM_PLAIN_RE,
};
