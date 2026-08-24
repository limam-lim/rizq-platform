/**
 * rizq_widget_markdown.js — Markdown آمن لردود ويدجت الشات (متصفح)
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

  var LTR_NUM_PLAIN_RE = /(?:\+[\d\s\-().]+|\b\d[\d\s\-.,()/]{1,}\d|\b\d{2,}\b)/g;
  var BIDI_CTRL_RE = /[\u200E\u200F\u2066\u2067\u2068\u2069\u202A-\u202E\u061C]/g;

  function sanitizeAgentText(text) {
    var s = String(text || '').replace(BIDI_CTRL_RE, '');
    s = s.replace(/\*\*\s*$/g, '');
    s = s.replace(/\*\*([^*\n]{0,300})$/g, '$1');
    s = s.replace(/\*\s*$/g, '');
    return s.trim();
  }

  function wrapLtrNumbersPlain(text) {
    return String(text || '').replace(LTR_NUM_PLAIN_RE, function (m) {
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
    return String(s || '').replace(/^(#{1,6})\s+(.+)$/gm, function (_, hashes, title) {
      var level = Math.min(Math.max(hashes.length, 2), 4);
      var safeTitle = wrapLtrNumbersPlain(escapeHtml(String(title || '').trim()));
      return '<h' + level + ' class="rw-md-h">' + safeTitle + '</h' + level + '>';
    });
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
    var lines = sanitizeAgentText(text).split('\n');
    var processed = lines.map(function (line) {
      var heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        var level = Math.min(Math.max(heading[1].length, 2), 4);
        var safeTitle = wrapLtrNumbersPlain(escapeHtml(heading[2].trim()));
        return '<h' + level + ' class="rw-md-h">' + safeTitle + '</h' + level + '>';
      }

      var row = escapeHtml(stripRawHtml(line));
      row = wrapLtrNumbersPlain(row);
      row = row.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
      row = row.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

      var bullet = row.match(/^[\-\*•]\s+(.+)$/);
      if (bullet) return '<li class="rw-md-li">' + bullet[1] + '</li>';
      return row;
    });

    var s = processed.join('\n');
    s = s.replace(/((?:<li class="rw-md-li">[\s\S]*?<\/li>\s*)+)/g, function (block) {
      return '<ul class="rw-md-ul">' + block.trim() + '</ul>';
    });
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

  function formatLocalTime(date) {
    var d = date instanceof Date ? date : new Date(date || Date.now());
    try {
      return d.toLocaleTimeString('ar-MR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    }
  }

  var api = {
    escapeHtml: escapeHtml,
    stripRawHtml: stripRawHtml,
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
