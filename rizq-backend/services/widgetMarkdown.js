/**
 * widgetMarkdown.js — تنسيق ردود الويدجت: نصّ عادي فقط (بدون Markdown) + أرقام غربية
 */
'use strict';

const { toWesternDigits } = require('./localTime');

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const LTR_NUM_PLAIN_RE = /(?:\+222[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2}|\+[\d\s\-().]{8,24}|\b\d[\d\s\-.,()/]{1,}\d|\b\d{2,}\b)/g;
const BIDI_CTRL_RE = /[\u200E\u200F\u2066\u2067\u2068\u2069\u202A-\u202E\u061C]/g;

function stripMarkdownTableLine(line) {
  const trimmed = String(line || '').trim();
  if (!/^\|/.test(trimmed)) return line;
  const cells = trimmed.split('|').map((c) => c.trim()).filter(Boolean);
  if (!cells.length) return '';
  if (cells.every((c) => /^[-:\s|]+$/.test(c))) return '';
  return cells.join(' — ');
}

function stripLineBullet(line) {
  return String(line || '').replace(/^[\s]*[\-\*•·▪◦‣➤►→]\s*/, '');
}

/** نصّ محادثة نظيف: بدون Markdown، أرقام غربية 0-9 فقط */
function formatPlainChatText(text) {
  let s = String(text || '').replace(BIDI_CTRL_RE, '');
  s = toWesternDigits(s);

  s = s.replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, '').trim());
  s = s.replace(/`([^`\n]+)`/g, '$1');
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '$1');
  s = s.replace(/\*([^*\n]+)\*/g, '$1');
  s = s.replace(/__([^_\n]+)__/g, '$1');
  s = s.replace(/_([^_\n]+)_/g, '$1');
  s = s.replace(/^#{1,6}\s+/gm, '');

  s = s.split('\n').map((line) => {
    const tableLine = stripMarkdownTableLine(line);
    return stripLineBullet(tableLine);
  }).join('\n');

  s = s.replace(/\*\*\s*$/g, '');
  s = s.replace(/\*\*([^*\n]{0,300})$/g, '$1');
  s = s.replace(/\*\s*$/g, '');
  s = s.replace(/\n{3,}/g, '\n\n');

  return s.trim();
}

/** @deprecated alias — use formatPlainChatText */
function sanitizeAgentText(text) {
  return formatPlainChatText(text);
}

function wrapLtrNumbersPlain(text) {
  const plain = formatPlainChatText(text);
  return plain.replace(LTR_NUM_PLAIN_RE, (m) => {
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
  return formatPlainChatText(s);
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

/** عرض HTML للويدجت — فقرات نصّية + أرقام/هواتف LTR معزولة */
function formatAgentMarkdown(text) {
  const plain = formatPlainChatText(text);
  let escaped = escapeHtml(stripRawHtml(plain));
  escaped = wrapLtrNumbersPlain(escaped);
  return escaped.replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>');
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
  toWesternDigits,
  formatPlainChatText,
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
