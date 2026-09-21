/**
 * leadsStore.js — طلبات Leads من الويدجت/التيليغرام (حالة pending → معالجة)
 * التخزين عبر repos (SQLite).
 */
'use strict';

const { nowIsoWithLocal } = require('./localTime');
const { formatPendingLeadsList, timestampLine } = require('./telegramNotifyFormat');
const repos = require('../db/repos');

function readLeads() {
  return repos.leads.list();
}

function saveLead({
  businessName,
  whatsapp,
  package: pkg,
  packageId,
  packagePrice,
  packagePriceLabel,
  notes,
  source,
  channel,
  kind,
  status,
}) {
  const id = 'LEAD-' + Date.now().toString(36).toUpperCase();
  const ts = nowIsoWithLocal();
  const rec = {
    id,
    businessName: String(businessName || 'غير محدد').slice(0, 200),
    whatsapp: String(whatsapp || '').slice(0, 120),
    package: String(pkg || 'غير محددة').slice(0, 120),
    packageId: packageId ? String(packageId).slice(0, 80) : null,
    packagePrice: packagePrice != null ? Number(packagePrice) : null,
    packagePriceLabel: packagePriceLabel ? String(packagePriceLabel).slice(0, 120) : null,
    notes: String(notes || '').slice(0, 1000),
    source: String(source || 'unknown').slice(0, 40),
    channel: String(channel || 'unknown').slice(0, 40),
    kind: String(kind || 'subscription').slice(0, 40),
    status: status || 'pending',
    createdAt: ts.iso,
    createdAtLocal: ts.local,
    timezone: ts.tz,
    updatedAt: null,
    telegramSent: false,
    telegramMessageId: null,
  };
  repos.leads.upsert(id, rec);
  console.log('[leads-store] saved', rec.id, rec.businessName, rec.whatsapp, '@', rec.createdAtLocal);
  return rec;
}

function patchLead(id, patch) {
  const cur = repos.leads.get(String(id));
  if (!cur) return null;
  const ts = nowIsoWithLocal();
  const next = Object.assign({}, cur, patch, { updatedAt: ts.iso, updatedAtLocal: ts.local });
  repos.leads.upsert(String(id), next);
  return next;
}

function getPendingLeads() {
  return readLeads()
    .filter((l) => l.status === 'pending')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getLeadById(id) {
  return repos.leads.get(String(id)) || null;
}

function updateLeadStatus(id, status, adminNote) {
  const allowed = ['pending', 'contacted', 'activated', 'rejected', 'closed'];
  if (!allowed.includes(status)) return null;
  return patchLead(id, {
    status,
    adminNote: adminNote ? String(adminNote).slice(0, 500) : undefined,
  });
}

function findRecentDuplicate(whatsapp, withinMs) {
  const norm = String(whatsapp || '').replace(/\D/g, '');
  if (!norm) return null;
  const since = Date.now() - (withinMs || 3600000);
  return readLeads().find((l) => {
    if (l.status !== 'pending') return false;
    const w = String(l.whatsapp || '').replace(/\D/g, '');
    if (w !== norm) return false;
    return new Date(l.createdAt).getTime() >= since;
  }) || null;
}

function formatPendingLeadsForAdmin(leads) {
  const pending = leads || getPendingLeads();
  return formatPendingLeadsList(pending, function (l) {
    return timestampLine(l);
  });
}

module.exports = {
  readLeads,
  saveLead,
  patchLead,
  getPendingLeads,
  getLeadById,
  updateLeadStatus,
  findRecentDuplicate,
  formatPendingLeadsForAdmin,
};
