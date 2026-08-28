/**
 * rizq_widget_markdown.js — تنسيق ردود ويدجت الشات (متصفح): نصّ عادي + أرقام غربية
 */
(function (global) {
  'use strict';

  var TZ = 'Africa/Nouakchott';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var LTR_NUM_PLAIN_RE = /(?:\+222[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2}|\+[\d\s\-().]{8,24}|\b\d[\d\s\-.,()/]{1,}\d|\b\d{2,}\b)/g;
  var BIDI_CTRL_RE = /[\u200E\u200F\u2066\u2067\u2068\u2069\u202A-\u202E\u061C]/g;

  function toWesternDigits(value) {
    return String(value == null ? '' : value)
      .replace(/[\u0660-\u0669]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x0660 + 48); })
      .replace(/[\u06F0-\u06F9]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x06F0 + 48); });
  }

  function stripMarkdownTableLine(line) {
    var trimmed = String(line || '').trim();
    if (!/^\|/.test(trimmed)) return line;
    var cells = trimmed.split('|').map(function (c) { return c.trim(); }).filter(Boolean);
    if (!cells.length) return '';
    if (cells.every(function (c) { return /^[-:\s|]+$/.test(c); })) return '';
    return cells.join(' — ');
  }

  function stripLineBullet(line) {
    return String(line || '').replace(/^[\s]*[\-\*•·▪◦‣➤►→]\s*/, '');
  }

  function formatPlainChatText(text) {
    var s = String(text || '').replace(BIDI_CTRL_RE, '');
    s = toWesternDigits(s);
    s = s.replace(/```[\s\S]*?```/g, function (block) { return block.replace(/```/g, '').trim(); });
    s = s.replace(/`([^`\n]+)`/g, '$1');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '$1');
    s = s.replace(/\*([^*\n]+)\*/g, '$1');
    s = s.replace(/__([^_\n]+)__/g, '$1');
    s = s.replace(/_([^_\n]+)_/g, '$1');
    s = s.replace(/^#{1,6}\s+/gm, '');
    s = s.split('\n').map(function (line) {
      return stripLineBullet(stripMarkdownTableLine(line));
    }).join('\n');
    s = s.replace(/\*\*\s*$/g, '');
    s = s.replace(/\*\*([^*\n]{0,300})$/g, '$1');
    s = s.replace(/\*\s*$/g, '');
    s = s.replace(/\n{3,}/g, '\n\n');
    return s.trim();
  }

  function sanitizeAgentText(text) {
    return formatPlainChatText(text);
  }

  function wrapLtrNumbersPlain(text) {
    var plain = formatPlainChatText(text);
    return plain.replace(LTR_NUM_PLAIN_RE, function (m) {
      if (!/[+\d]/.test(m)) return m;
      return '<span dir="ltr" class="rw-num">' + m + '</span>';
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
      .replace(/(?:^|[^<])[1-6]\s+class="rw-md-h">/g, function (m) { return m.replace(/[1-6]\s+class="rw-md-h">/g, ''); })
      .replace(/(?:^|[^<])[1-6]\s+class=&quot;rw-md-h&quot;&gt;/g, function (m) { return m.replace(/[1-6]\s+class=&quot;rw-md-h&quot;&gt;/g, ''); })
      .replace(/<\d{1,3}(?=\s+class="rw-md-h")/gi, '')
      .replace(/<\d{1,3}(?![0-9a-z/])/gi, '')
      .replace(/<\s*\/\s*h[0-9]/gi, '')
      .replace(/(?<!<\/?h[2-4])\s*class="rw-md-h">/g, '');
  }

  function formatAgentMarkdown(text) {
    var plain = formatPlainChatText(text);
    var escaped = escapeHtml(stripRawHtml(plain));
    escaped = wrapLtrNumbersPlain(escaped);
    return escaped.replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>');
  }

  function wrapLtrNumbers(html) {
    return wrapLtrNumbersPlain(html);
  }

  function wrapLtrPhones(html) {
    return wrapLtrNumbersPlain(html);
  }

  function formatLocalTime(date) {
    var d = date instanceof Date ? date : new Date(date || Date.now());
    try {
      return toWesternDigits(d.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }));
    } catch (e) {
      return toWesternDigits(d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0'));
    }
  }

  var api = {
    escapeHtml: escapeHtml,
    stripRawHtml: stripRawHtml,
    toWesternDigits: toWesternDigits,
    formatPlainChatText: formatPlainChatText,
    sanitizeAgentText: sanitizeAgentText,
    wrapLtrNumbersPlain: wrapLtrNumbersPlain,
    parseMarkdownHeadings: parseMarkdownHeadings,
    cleanupBrokenTags: cleanupBrokenTags,
    formatAgentMarkdown: formatAgentMarkdown,
    wrapLtrPhones: wrapLtrPhones,
    wrapLtrNumbers: wrapLtrNumbers,
    formatLocalTime: formatLocalTime,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.RizqWidgetMarkdown = api;
})(typeof window !== 'undefined' ? window : global);
