/**
 * تذاكر دعم/شكاوى — تخزين موحّد لجميع الوكلاء
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'support-tickets.json');

function readTickets() {
  try {
    if (!fs.existsSync(FILE)) return [];
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function writeTickets(list) {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2), 'utf8');
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
  const list = readTickets();
  list.push(rec);
  writeTickets(list);
  return rec;
}

function updateTicketStatus(id, status, adminNote) {
  const list = readTickets();
  const idx = list.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  const allowed = ['open', 'in_progress', 'resolved', 'closed'];
  if (!allowed.includes(status)) return null;
  list[idx].status = status;
  list[idx].updatedAt = new Date().toISOString();
  if (adminNote) list[idx].adminNote = String(adminNote).slice(0, 500);
  writeTickets(list);
  return list[idx];
}

module.exports = { saveTicket, readTickets, updateTicketStatus, FILE };
