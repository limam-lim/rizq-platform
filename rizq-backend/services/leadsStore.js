/**
 * leadsStore.js — طلبات Leads من الويدجت/التيليغرام (حالة pending → معالجة)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { nowIsoWithLocal } = require('./localTime');
const { formatPendingLeadsList, timestampLine } = require('./telegramNotifyFormat');

const FILE = path.join(__dirname, '..', 'data', 'leads.json');

function readLeads() {
  try {
    if (!fs.existsSync(FILE)) return [];
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    console.error('[leads-store] read error:', e.message);
    return [];
  }
}

function writeLeads(list) {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2), 'utf8');
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
  const list = readLeads();
  list.push(rec);
  writeLeads(list);
  console.log('[leads-store] saved', rec.id, rec.businessName, rec.whatsapp, '@', rec.createdAtLocal);
  return rec;
}

  function patchLead(id, patch) {
  const list = readLeads();
  const idx = list.findIndex((l) => l.id === id);
  if (idx < 0) return null;
  const ts = nowIsoWithLocal();
  Object.assign(list[idx], patch, { updatedAt: ts.iso, updatedAtLocal: ts.local });
  writeLeads(list);
  return list[idx];
}

function getPendingLeads() {
  return readLeads()
    .filter((l) => l.status === 'pending')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getLeadById(id) {
  return readLeads().find((l) => l.id === id) || null;
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
  FILE,
  readLeads,
  saveLead,
  patchLead,
  getPendingLeads,
  getLeadById,
  updateLeadStatus,
  findRecentDuplicate,
  formatPendingLeadsForAdmin,
};
