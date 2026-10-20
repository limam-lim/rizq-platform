/**
 * dynamicKnowledge.js — تحليل ملفات Excel/CSV واستخراج معرفة ديناميكية للوكيل الماسي
 * يُخزَّن الناتج في rizq_subscribers_store.json → profile.dynamicKnowledge (معزول لكل subscriberId)
 *
 * Excel: exceljs (آمن) — CSV يبقى محلّياً بلا اعتماد.
 */
'use strict';

const ExcelJS = require('exceljs');

const MAX_TEXT_CHARS = 48000;
const MAX_ROWS_PER_SHEET = 200;
const MAX_COLS = 30;
const MAX_SHEETS = 8;

function _normCell(v) {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v instanceof Date) return v.toISOString().slice(0, 16).replace('T', ' ');
    if (Array.isArray(v.richText)) {
      return v.richText.map((t) => (t && t.text != null ? String(t.text) : '')).join('').trim();
    }
    if (v.text != null) return String(v.text).trim();
    if (v.result != null) return _normCell(v.result);
    if (v.hyperlink != null && v.text == null) return String(v.hyperlink).trim();
    if (typeof v.toString === 'function' && v.toString !== Object.prototype.toString) {
      const s = v.toString();
      if (s && s !== '[object Object]') return String(s).trim();
    }
    return '';
  }
  return String(v).trim();
}

function _parseCsv(buffer) {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const rows = lines.slice(0, MAX_ROWS_PER_SHEET + 1).map((line) => {
    const out = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if ((c === ',' || c === ';') && !inQ) {
        out.push(cur.trim());
        cur = '';
      } else cur += c;
    }
    out.push(cur.trim());
    return out.slice(0, MAX_COLS);
  });
  return [{ name: 'CSV', rows }];
}

/**
 * قراءة .xlsx عبر exceljs — نفس شكل الصفوف السابق (مصفوفة نصوص).
 * ملفات .xls القديمة غير مدعومة (صيغة ثنائية مهجورة) — حوّل إلى .xlsx.
 */
async function _parseXlsx(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheets = [];
  const list = workbook.worksheets.slice(0, MAX_SHEETS);
  for (let i = 0; i < list.length; i++) {
    const worksheet = list[i];
    const rows = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      if (rows.length >= MAX_ROWS_PER_SHEET) return;
      const cells = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber > MAX_COLS) return;
        while (cells.length < colNumber - 1) cells.push('');
        cells.push(_normCell(cell.value));
      });
      const trimmed = cells.slice(0, MAX_COLS);
      if (trimmed.some((c) => c)) rows.push(trimmed);
    });
    if (rows.length) sheets.push({ name: worksheet.name || ('Sheet' + (i + 1)), rows });
  }
  return sheets;
}

function _rowsToText(sheets) {
  const parts = [];
  sheets.forEach((sh) => {
    parts.push(`## ${sh.name}`);
    sh.rows.forEach((row) => {
      parts.push(row.filter(Boolean).join(' | '));
    });
    parts.push('');
  });
  return parts.join('\n').trim();
}

/**
 * @param {string} fileName
 * @param {Buffer} buffer
 * @returns {Promise<{ ok: boolean, dynamicKnowledge?: object, error?: string, detail?: string }>}
 */
async function parseKnowledgeFile(fileName, buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || !buffer.length) {
    return { ok: false, error: 'empty_file' };
  }
  if (buffer.length > 5 * 1024 * 1024) {
    return { ok: false, error: 'file_too_large' };
  }

  const ext = String(fileName || '').toLowerCase().split('.').pop();
  let sheets = [];
  try {
    if (ext === 'csv') {
      sheets = _parseCsv(buffer);
    } else if (ext === 'xlsx') {
      sheets = await _parseXlsx(buffer);
    } else if (ext === 'xls') {
      return {
        ok: false,
        error: 'unsupported_format',
        detail: 'xls_legacy_use_xlsx',
      };
    } else {
      return { ok: false, error: 'unsupported_format' };
    }
  } catch (e) {
    return { ok: false, error: 'parse_failed', detail: e.message };
  }

  if (!sheets.length || !sheets.some((s) => s.rows && s.rows.length)) {
    return { ok: false, error: 'no_data' };
  }

  let text = _rowsToText(sheets);
  if (text.length > MAX_TEXT_CHARS) {
    text = text.slice(0, MAX_TEXT_CHARS) + '\n… [تم اختصار المحتوى — الملف كبير]';
  }

  const rowCount = sheets.reduce((n, s) => n + (s.rows ? s.rows.length : 0), 0);

  return {
    ok: true,
    dynamicKnowledge: {
      text,
      tables: sheets.map((s) => ({ name: s.name, rowCount: s.rows.length })),
      updatedAt: new Date().toISOString(),
      sourceFile: String(fileName || 'upload').slice(0, 120),
      rowCount,
    },
  };
}

/** نص جاهز للحقن في System Prompt */
function formatDynamicKnowledgeForPrompt(dynamicKnowledge) {
  if (!dynamicKnowledge || !dynamicKnowledge.text) return '';
  const updated = dynamicKnowledge.updatedAt
    ? `\n(آخر تحديث: ${dynamicKnowledge.updatedAt.slice(0, 10)})`
    : '';
  const src = dynamicKnowledge.sourceFile ? ` — مصدر: ${dynamicKnowledge.sourceFile}` : '';
  return (
    `\n## 📊 بيانات تشغيلية محدّثة (Excel/CSV)${src}${updated}\n` +
    `استخدم هذه البيانات كمصدر أول للأسعار والجداول والمواعيد — لا تخترع أرقاماً خارجها.\n` +
    dynamicKnowledge.text.slice(0, MAX_TEXT_CHARS) +
    '\n'
  );
}

module.exports = {
  parseKnowledgeFile,
  formatDynamicKnowledgeForPrompt,
  MAX_TEXT_CHARS,
};
