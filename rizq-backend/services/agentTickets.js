/**
 * تذاكر دعم/شكاوى — تخزين موحّد لجميع الوكلاء (SQLite عبر repos)
 */
const repos = require('../db/repos');

function readTickets() {
  return repos.supportTickets.list();
}

function saveTicket({ source, type, summary, adId, contact, meta }) {
  const id = 'RZQ-' + Date.now().toString(36).toUpperCase();
  const rec = {
    id,
    source: String(source || 'unknown').slice(0, 40),
    type: String(type || 'other').slice(0, 30),
    summary: String(summary || '').slice(0, 500),
    adId: adId ? String(adId).slice(0, 80) : null,
    contact: contact ? String(contact).slice(0, 120) : null,
    meta: meta && typeof meta === 'object' ? meta : {},
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  repos.supportTickets.upsert(id, rec);
  return rec;
}

function updateTicketStatus(id, status, adminNote) {
  const cur = repos.supportTickets.get(String(id));
  if (!cur) return null;
  const allowed = ['open', 'in_progress', 'resolved', 'closed'];
  if (!allowed.includes(status)) return null;
  const next = Object.assign({}, cur, {
    status,
    updatedAt: new Date().toISOString(),
  });
  if (adminNote) next.adminNote = String(adminNote).slice(0, 500);
  repos.supportTickets.upsert(String(id), next);
  return next;
}

module.exports = { saveTicket, readTickets, updateTicketStatus };
