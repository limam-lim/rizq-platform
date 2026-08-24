/**
 * dynamicKnowledge.js — تحليل ملفات Excel/CSV واستخراج معرفة ديناميكية للوكيل الماسي
 * يُخزَّن الناتج في rizq_subscribers_store.json → profile.dynamicKnowledge (معزول لكل subscriberId)
 */
'use strict';

const XLSX = require('xlsx');

const MAX_TEXT_CHARS = 48000;
const MAX_ROWS_PER_SHEET = 200;
const MAX_COLS = 30;

function _normCell(v) {
  if (v == null) return '';
  if (typeof v === 'object' && v instanceof Date) return v.toISOString().slice(0, 16).replace('T', ' ');
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

function _parseXlsx(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheets = [];
  wb.SheetNames.slice(0, 8).forEach((name) => {
    const sheet = wb.Sheets[name];
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    const rows = (raw || [])
      .slice(0, MAX_ROWS_PER_SHEET)
      .map((row) => (Array.isArray(row) ? row : []).slice(0, MAX_COLS).map(_normCell))
      .filter((row) => row.some((c) => c));
    if (rows.length) sheets.push({ name, rows });
  });
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
 * @returns {{ ok: boolean, dynamicKnowledge?: object, error?: string }}
 */
function parseKnowledgeFile(fileName, buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || !buffer.length) {
    return { ok: false, error: 'empty_file' };
  }
  if (buffer.length > 5 * 1024 * 1024) {
    return { ok: false, error: 'file_too_large' };
  }

  const ext = String(fileName || '').toLowerCase().split('.').pop();
  let sheets = [];
  try {
    if (ext === 'csv') sheets = _parseCsv(buffer);
    else if (ext === 'xlsx' || ext === 'xls') sheets = _parseXlsx(buffer);
    else return { ok: false, error: 'unsupported_format' };
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
