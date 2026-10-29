/**
 * kycAccess.js — وصول مُقيَّد ومُدقَّق لوثائق الهوية (KYC).
 *
 * المبادئ:
 *   1) لا تُرسَل صور KYC أبداً ضمن قوائم الحسابات (كانت تُضمَّن base64 لكل الحسابات).
 *      القوائم تحمل أعلاماً فقط: hasIdImage / hasLicenseImage / hasActivityImage2.
 *   2) عرض وثيقة = طلب صريح لحساب واحد ووثيقة واحدة، بصلاحية 'kyc.view' فقط،
 *      من جلسة أدمن بشرية (لا السرّ المشترك للخادم)، مع سجل تدقيق لكل محاولة.
 *   3) بعد التوثيق تُحذف صورة الهوية فعلياً من التخزين (لا مجرد حذف الرابط).
 */
'use strict';

const fs = require('fs');
const crypto = require('crypto');
const objectStorage = require('../lib/objectStorage');

const KYC_PERMISSION = 'kyc.view';
const MAX_KYC_BYTES = 3_500_000;
const AUDIT_KEEP_DAYS = 365;

/** doc (في الرابط) → حقول السجل المحتملة (camelCase أولاً ثم snake_case القديم) */
const KYC_DOCS = Object.freeze({
  id: ['idImage', 'id_image'],
  license: ['licenseImage', 'license_image'],
  activity2: ['activityImage2', 'activity_image2'],
});
const ALL_KYC_FIELDS = Object.freeze([].concat(...Object.values(KYC_DOCS)));

function safeAccountId(id) {
  return String(id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
}

/** المسار المسموح الوحيد لوثائق حساب: /uploads/kyc/<accountId>/... */
function ownedKycPrefix(accountId) {
  return '/uploads/kyc/' + safeAccountId(accountId) + '/';
}

function fieldValue(acc, doc) {
  const keys = KYC_DOCS[doc] || [];
  for (const k of keys) {
    if (acc && typeof acc[k] === 'string' && acc[k]) return acc[k];
  }
  return '';
}

/** نسخة أدمن: تزيل كل بيانات صور KYC وتضع أعلام وجود فقط. (لا يعدّل الأصل) */
function redactKycForAdmin(safe) {
  if (!safe || typeof safe !== 'object') return safe;
  const out = Object.assign({}, safe);
  out.hasIdImage = !!fieldValue(safe, 'id');
  out.hasLicenseImage = !!fieldValue(safe, 'license');
  out.hasActivityImage2 = !!fieldValue(safe, 'activity2');
  ALL_KYC_FIELDS.forEach((k) => { delete out[k]; });
  return out;
}

/** مسارات المتغيرات الثلاث لصورة KYC محلية (medium/thumb/full) */
function variantUrls(relUrl) {
  const base = String(relUrl || '').replace(/\.(thumb|full)\.webp$/i, '.webp');
  if (!/\.webp$/i.test(base)) return [base];
  return [base, base.replace(/\.webp$/i, '.thumb.webp'), base.replace(/\.webp$/i, '.full.webp')];
}

/** يقرأ وثيقة حساب من التخزين المحلي — يرفض أي مسار خارج مجلد الحساب نفسه */
function readKycDocument(acc, doc) {
  if (!KYC_DOCS[doc]) return { ok: false, status: 400, error: 'invalid_doc' };
  const rel = fieldValue(acc, doc);
  if (!rel) return { ok: false, status: 404, error: 'doc_not_found' };
  const prefix = ownedKycPrefix(acc && acc.id);
  if (rel.indexOf(prefix) !== 0 || rel.indexOf('..') !== -1) {
    return { ok: false, status: 404, error: 'doc_not_found' };
  }
  // نفضّل النسخة الكاملة للمراجعة، ثم المتوسطة
  const [medium, , full] = variantUrls(rel);
  for (const u of [full, medium]) {
    try {
      if (!u || !objectStorage.exists(u)) continue;
      const abs = objectStorage.resolveLocalPath(u);
      const st = fs.statSync(abs);
      if (!st.isFile() || st.size === 0 || st.size > MAX_KYC_BYTES) continue;
      return { ok: true, buffer: fs.readFileSync(abs), contentType: 'image/webp' };
    } catch (e) { /* try next */ }
  }
  return { ok: false, status: 404, error: 'doc_not_found' };
}

/** حذف فعلي لملفات صورة KYC (كل المتغيرات) — أفضل جهد، لا يرمي */
async function deleteKycFiles(relUrl, accountId) {
  const rel = String(relUrl || '');
  if (!rel || rel.indexOf(ownedKycPrefix(accountId)) !== 0) return { ok: false, skipped: true };
  const results = [];
  for (const u of variantUrls(rel)) {
    try { results.push(await objectStorage.deleteObject(u)); } catch (e) { results.push({ ok: false, error: e.message }); }
  }
  return { ok: results.every((r) => r && r.ok !== false), results };
}

function _repo() {
  return require('../db/repos').kycAccessAudit;
}

function clientIp(req) {
  const xf = String((req && req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim();
  return (xf || (req && req.ip) || '').slice(0, 64);
}

/** سجل تدقيق لكل محاولة عرض (مسموحة أو مرفوضة) — لا يحفظ أي محتوى من الوثيقة */
async function recordKycAccess(req, accountId, doc, outcome, extra) {
  const admin = (req && req.adminUser) || {};
  const rec = {
    id: 'KYCA-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex'),
    at: new Date().toISOString(),
    admin: String(admin.user || admin.name || 'unknown').slice(0, 80),
    adminName: String(admin.name || '').slice(0, 80),
    adminRole: String(admin.role || '').slice(0, 30),
    accountId: safeAccountId(accountId),
    doc: String(doc || '').slice(0, 20),
    outcome: String(outcome || '').slice(0, 40),
    reason: extra && extra.reason ? String(extra.reason).slice(0, 200) : '',
    ip: clientIp(req),
    userAgent: String((req && req.headers && req.headers['user-agent']) || '').slice(0, 160),
  };
  try {
    await _repo().upsert(rec.id, rec, { skipBackup: true });
  } catch (e) {
    console.error('[kyc-audit] write failed:', e && e.message);
  }
  return rec;
}

async function listKycAccess(opts) {
  const limit = Math.max(1, Math.min(500, Number(opts && opts.limit) || 100));
  const accountId = opts && opts.accountId ? safeAccountId(opts.accountId) : '';
  let rows = [];
  try { rows = await _repo().list(); } catch (e) { rows = []; }
  if (!Array.isArray(rows)) rows = Object.values(rows || {});
  const cutoff = Date.now() - AUDIT_KEEP_DAYS * 86400000;
  return rows
    .filter((r) => r && r.at && Date.parse(r.at) >= cutoff)
    .filter((r) => !accountId || r.accountId === accountId)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, limit);
}

module.exports = {
  KYC_PERMISSION,
  KYC_DOCS,
  ALL_KYC_FIELDS,
  redactKycForAdmin,
  readKycDocument,
  deleteKycFiles,
  recordKycAccess,
  listKycAccess,
  ownedKycPrefix,
  variantUrls,
};
