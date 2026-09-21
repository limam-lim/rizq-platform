/**
 * حالة تفعيل وكيل المكالمات/الواتساب لكل مشترٍ — SQLite عبر repos
 */
const repos = require('../db/repos');

function readAll() {
  return repos.agentStatus.asMap();
}

function setActive(phone, active) {
  const key = String(phone || '').replace(/\D/g, '').slice(-8);
  if (!key) return null;
  const rec = { active: !!active, updatedAt: new Date().toISOString() };
  repos.agentStatus.upsert(key, rec);
  return rec;
}

function isActive(phone) {
  const key = String(phone || '').replace(/\D/g, '').slice(-8);
  const rec = repos.agentStatus.get(key);
  if (!rec) return true;
  return !!rec.active;
}

module.exports = { setActive, isActive, readAll };
