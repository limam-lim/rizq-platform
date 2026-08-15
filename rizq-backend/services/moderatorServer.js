/**
 * فحص المشرف على جانب الخادم — يعيد استخدام rizq_moderator_agent.js
 * قبل حفظ أي إعلان جديد عبر POST /api/ads
 */
const fs = require('fs');
const path = require('path');

const SITE_CONFIG_FILE = path.join(__dirname, '..', 'data', 'site-config.json');

function readSiteConfig() {
  try {
    if (!fs.existsSync(SITE_CONFIG_FILE)) return {};
    return JSON.parse(fs.readFileSync(SITE_CONFIG_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function syncModeratorStorage() {
  const cfg = readSiteConfig();
  const store = {
    rizq_moderator_overrides: JSON.stringify(cfg.moderatorConfig || {}),
    rizq_section_rules: JSON.stringify(cfg.sectionRules || {}),
  };
  global.localStorage = {
    getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key, val) { store[key] = String(val); },
    removeItem(key) { delete store[key]; },
  };
}

let RizqAgent;
function getAgent() {
  if (RizqAgent) return RizqAgent;
  syncModeratorStorage();
  global.RizqModerator = require('../../rizq_moderator_config.js');
  RizqAgent = require('../../rizq_moderator_agent.js');
  return RizqAgent;
}

/**
 * @param {object} adData — حقول الإعلان (title, desc, price, category, images, accountType...)
 * @returns {object} قرار المشرف { decision, message_ar, ... }
 */
function inspectAdForPublish(adData) {
  syncModeratorStorage();
  return getAgent().inspect(adData || {});
}

/**
 * Express middleware — يرفض المحتوى المحظور قبل writeAds()
 */
function moderatorAdMiddleware(req, res, next) {
  const b = req.body || {};
  const draftId = (typeof b.id === 'string' && b.id.trim()) ? b.id.trim() : 'draft-' + Date.now();

  const decision = inspectAdForPublish({
    id: draftId,
    title: b.title,
    desc: b.desc,
    titleFr: b.titleFr,
    descFr: b.descFr,
    price: b.price,
    category: b.category,
    images: b.images,
    video: b.video,
    seller_trust_score: b.seller_trust_score,
    accountType: b.accountType || b.account_type || b.section || 'individual',
  });

  if (decision.decision === 'reject') {
    return res.status(422).json({
      ok: false,
      error: decision.message_ar || 'محتوى الإعلان مرفوض',
      errorFr: decision.message_fr || '',
      moderator: decision,
    });
  }

  req.moderatorDecision = decision;
  next();
}

module.exports = { inspectAdForPublish, moderatorAdMiddleware, syncModeratorStorage };
