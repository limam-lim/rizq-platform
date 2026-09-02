/**
 * سياسة التوثيق — يجب أن تتطابق مع rizq_verification_policy.js
 */
const ID_ONLY_TYPES = ['individual', 'store'];
const ACTIVITY_PLUS_ID_TYPES = ['office', 'corp', 'showroom', 'exhibition'];
const MODULE_ACTIVITY_PLUS_ID = ['tenders'];

const INSTANT_AUTO_APPROVE = ID_ONLY_TYPES;
const RETAIN_ACTIVITY_DOCUMENTS = true;

function canAutoApproveAccountType(type) {
  return ID_ONLY_TYPES.includes(String(type || '').toLowerCase());
}

function isIdOnlyTier(type) {
  return ID_ONLY_TYPES.includes(String(type || '').toLowerCase());
}

function requiresActivityAndId(type) {
  return ACTIVITY_PLUS_ID_TYPES.includes(String(type || '').toLowerCase());
}

function moduleRequiresActivityAndId(moduleId) {
  return MODULE_ACTIVITY_PLUS_ID.includes(String(moduleId || '').toLowerCase());
}

function shouldPurgeIdImageOnVerify(type) {
  return isIdOnlyTier(type) || requiresActivityAndId(type);
}

module.exports = {
  ID_ONLY_TYPES,
  ACTIVITY_PLUS_ID_TYPES,
  MODULE_ACTIVITY_PLUS_ID,
  INSTANT_AUTO_APPROVE,
  canAutoApproveAccountType,
  isIdOnlyTier,
  requiresActivityAndId,
  moduleRequiresActivityAndId,
  shouldPurgeIdImageOnVerify,
  RETAIN_ACTIVITY_DOCUMENTS,
};
