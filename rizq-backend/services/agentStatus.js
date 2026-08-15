/**
 * حالة تفعيل وكيل المكالمات/الواتساب لكل مشترٍ — يُستخدم من rizq-backend
 * (لوحات التحكم تستدعي backendUrl + /api/agent/toggle)
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'agent-status.json');

function readAll() {
  try {
    if (!fs.existsSync(FILE)) return {};
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return raw && typeof raw === 'object' ? raw : {};
  } catch (e) {
    return {};
  }
}

function writeAll(obj) {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(obj, null, 2), 'utf8');
}

function setActive(phone, active) {
  const key = String(phone || '').replace(/\D/g, '').slice(-8);
  if (!key) return null;
  const all = readAll();
  all[key] = { active: !!active, updatedAt: new Date().toISOString() };
  writeAll(all);
  return all[key];
}

function isActive(phone) {
  const key = String(phone || '').replace(/\D/g, '').slice(-8);
  const all = readAll();
  if (!Object.prototype.hasOwnProperty.call(all, key)) return true;
  return !!all[key].active;
}

module.exports = { setActive, isActive, readAll, FILE };
