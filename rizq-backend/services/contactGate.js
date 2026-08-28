/**
 * rizq-backend/services/contactGate.js
 * ══════════════════════════════════════════════════════════════════
 * © Rizq ADMINIA SARL — Proprietary & Confidential
 * Server-side Contact Gate — masking/stripping contact data from API
 * responses. Frontend blur is UX only; this module is the source of truth.
 * ══════════════════════════════════════════════════════════════════
 */
const fs = require('fs');
const path = require('path');
const { getAccountRecord, sendSMS, sendWhatsApp } = require('../rizq_package_lifecycle_agent');
const {
  getEntitlements,
  getTenderEntitlements,
  getSubscriptionStatus,
  isPaymentConfirmed,
  ACTIVE_STATUSES,
} = require('./entitlements');

const FOMO_LOG_FILE = path.join(__dirname, '..', 'data', 'contact-fomo-log.json');
const FOMO_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour per target account

const FOMO_MSG_AR = 'عميل محتمل حاول التواصل مع نشاطك أو الاطلاع على بياناتك! جدّد أو رقِّ اشتراكك الآن لفتح العملاء المباشرين.';
const FOMO_MSG_FR = 'Un client potentiel a tenté de vous contacter ou voir vos coordonnées ! Renouvelez ou mettez à niveau votre abonnement pour débloquer les prospects directs.';

function normalizeModule(moduleOrType) {
  const m = String(moduleOrType || 'individual').toLowerCase();
  if (m === 'tender' || m === 'tenders') return 'tender';
  if (m === 'shop') return 'store';
  if (['store', 'office', 'corp', 'individual'].includes(m)) return m;
  return 'individual';
}

function redactContactPatterns(text) {
  if (!text) return text;
  let s = String(text);
  s = s.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/gi, '•••@•••.•••');
  s = s.replace(/(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com)[^\s]*/gi, '[واتساب محجوب — اشترك لعرض التواصل]');
  s = s.replace(/(?:\+?222|00222)[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/g, '••• ••• •••');
  s = s.replace(/\b(?:\+?\d{1,3}[\s.-]?)?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/g, '••• ••• •••');
  return s;
}

function getSellerContactEligibility(targetAccountId, accountTypeHint) {
  if (!targetAccountId) {
    return { canExpose: false, reason: 'no_account', isTrial: false, isExpired: false, subscriptionStatus: 'no_subscription' };
  }
  const rec = getAccountRecord(targetAccountId);
  const type = (rec && rec.accountType) || accountTypeHint || 'individual';
  const ent = getEntitlements(targetAccountId, type, rec || undefined);
  const status = ent.subscriptionStatus || 'no_subscription';

  if (status === 'expired' || status === 'suspended') {
    return { canExpose: false, reason: status, isTrial: false, isExpired: true, subscriptionStatus: status };
  }
  if (ent.isTrial || status === 'no_subscription' || status === 'pending') {
    return {
      canExpose: false,
      reason: ent.isTrial ? 'trial' : status,
      isTrial: !!ent.isTrial,
      isExpired: false,
      subscriptionStatus: status,
    };
  }
  const paid = rec ? isPaymentConfirmed(rec) : false;
  const active = ACTIVE_STATUSES.includes(status) && paid;
  return {
    canExpose: active,
    reason: active ? 'active' : 'pending',
    isTrial: false,
    isExpired: false,
    subscriptionStatus: status,
  };
}

function getViewerContactEligibility(viewerAccountId, module) {
  if (!viewerAccountId) {
    return { canUnlock: false, reason: 'unauthenticated', subscriptionStatus: 'no_subscription' };
  }
  const mod = normalizeModule(module);
  if (mod === 'tender') {
    const te = getTenderEntitlements(viewerAccountId);
    return {
      canUnlock: !!te.canUnlockContacts,
      reason: te.canUnlockContacts ? 'active' : (te.isTrial ? 'trial' : te.subscriptionStatus),
      subscriptionStatus: te.subscriptionStatus,
      isTrial: !!te.isTrial,
    };
  }
  const rec = getAccountRecord(viewerAccountId);
  const ent = getEntitlements(viewerAccountId, rec && rec.accountType, rec || undefined);
  if (ent.isTrial) {
    return { canUnlock: false, reason: 'trial', subscriptionStatus: ent.subscriptionStatus, isTrial: true };
  }
  if (['expired', 'suspended', 'pending', 'no_subscription'].includes(ent.subscriptionStatus)) {
    return { canUnlock: false, reason: ent.subscriptionStatus, subscriptionStatus: ent.subscriptionStatus, isTrial: false };
  }
  const paid = rec ? isPaymentConfirmed(rec) : false;
  const active = ACTIVE_STATUSES.includes(ent.subscriptionStatus) && paid;
  return {
    canUnlock: active,
    reason: active ? 'active' : 'pending',
    subscriptionStatus: ent.subscriptionStatus,
    isTrial: false,
  };
}

/**
 * Resolve full contact gate for a viewer trying to access a target account's contacts.
 */
function resolveContactGate(viewerAccountId, targetAccountId, module, accountTypeHint) {
  const mod = normalizeModule(module);
  const seller = getSellerContactEligibility(targetAccountId, accountTypeHint);
  const viewer = getViewerContactEligibility(viewerAccountId, mod);

  let contactsUnlocked = false;
  if (mod === 'tender') {
    contactsUnlocked = !!viewer.canUnlock;
  } else {
    contactsUnlocked = !!(seller.canExpose && viewer.canUnlock);
  }

  const contactsLocked = !contactsUnlocked;
  let lockReason = 'locked';
  if (!seller.canExpose) lockReason = seller.reason;
  else if (!viewer.canUnlock) lockReason = viewer.reason;

  return {
    module: mod,
    contactsUnlocked,
    contactsLocked,
    lockReason,
    fomoEligible: !seller.canExpose,
    sellerBlocked: !seller.canExpose,
    viewerBlocked: !viewer.canUnlock,
    seller: {
      accountId: targetAccountId,
      subscriptionStatus: seller.subscriptionStatus,
      isTrial: seller.isTrial,
      isExpired: seller.isExpired,
    },
    viewer: {
      accountId: viewerAccountId || null,
      subscriptionStatus: viewer.subscriptionStatus,
      isTrial: viewer.isTrial,
      reason: viewer.reason,
    },
  };
}

function extractContactsFromAccount(acc) {
  if (!acc) return { phone: null, email: null, whatsapp: null };
  const phone = String(acc.phone || '').trim();
  const email = String(acc.email || '').trim();
  let whatsapp = String(acc.whatsapp || '').trim();
  if (!whatsapp && phone) whatsapp = phone;
  return {
    phone: phone || null,
    email: email || null,
    whatsapp: whatsapp || null,
  };
}

function toGatedContactPayload(acc, gate) {
  const contacts = extractContactsFromAccount(acc);
  const hidePhone = !!(acc && acc.hidePhone);
  if (!gate || gate.contactsUnlocked) {
    if (hidePhone) {
      return {
        contactsLocked: false,
        phone: null,
        email: contacts.email,
        whatsapp: contacts.whatsapp,
        hidePhone: true,
      };
    }
    return {
      contactsLocked: false,
      phone: contacts.phone,
      email: contacts.email,
      whatsapp: contacts.whatsapp,
      hidePhone: false,
    };
  }
  return {
    contactsLocked: true,
    phone: null,
    email: null,
    whatsapp: null,
    hidePhone: hidePhone,
    contactAccess: {
      lockReason: gate.lockReason,
      fomoEligible: gate.fomoEligible,
    },
  };
}

const ACCOUNT_PUBLIC_SAFE = [
  'id', 'type', 'name', 'city', 'address', 'promo_video', 'category',
  'activityId', 'activity',
  'facebook', 'thumb', 'tagline', 'status', 'approvedAt', 'createdAt',
];

function toPublicAccountGated(acc, gate) {
  if (!acc) return null;
  const out = {};
  ACCOUNT_PUBLIC_SAFE.forEach((k) => { if (acc[k] !== undefined) out[k] = acc[k]; });
  out.desc = gate && gate.contactsUnlocked ? (acc.desc || '') : redactContactPatterns(acc.desc || '');
  const contact = toGatedContactPayload(acc, gate);
  out.contactsLocked = contact.contactsLocked;
  out.phone = contact.phone;
  out.email = contact.email;
  out.whatsapp = contact.whatsapp;
  out.hidePhone = contact.hidePhone;
  if (gate) out.contactAccess = { lockReason: gate.lockReason, fomoEligible: gate.fomoEligible };
  if (Array.isArray(acc.paymentMethods) && acc.paymentMethods.length) {
    out.paymentMethods = acc.paymentMethods.slice(0, 10);
  }
  return out;
}

function toPublicAdGated(ad, gate, sellerAccount) {
  if (!ad) return null;
  const contact = sellerAccount ? toGatedContactPayload(sellerAccount, gate) : { contactsLocked: true, phone: null, email: null, whatsapp: null };
  const unlocked = gate && gate.contactsUnlocked;
  return Object.assign({}, ad, {
    desc: unlocked ? ad.desc : redactContactPatterns(ad.desc),
    descFr: unlocked ? (ad.descFr || '') : redactContactPatterns(ad.descFr || ''),
    contactsLocked: !unlocked,
    sellerContact: unlocked ? {
      phone: contact.phone,
      email: contact.email,
      whatsapp: contact.whatsapp,
    } : null,
    contactAccess: gate ? {
      lockReason: gate.lockReason,
      fomoEligible: gate.fomoEligible,
    } : { lockReason: 'locked', fomoEligible: true },
  });
}

function _readFomoLog() {
  try {
    if (fs.existsSync(FOMO_LOG_FILE)) return JSON.parse(fs.readFileSync(FOMO_LOG_FILE, 'utf8'));
  } catch (e) { /* ignore */ }
  return {};
}

function _writeFomoLog(log) {
  try {
    const dir = path.dirname(FOMO_LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FOMO_LOG_FILE, JSON.stringify(log, null, 2), 'utf8');
  } catch (e) { /* ignore */ }
}

function _normalizePhoneE164(phone) {
  let p = String(phone || '').replace(/\D/g, '');
  if (!p) return '';
  if (!p.startsWith('222') && p.length <= 10) p = '222' + p;
  return p;
}

async function notifyContactAttemptFomo(targetAccountId, module, opts) {
  opts = opts || {};
  if (!targetAccountId) return { ok: false, error: 'no_target' };

  const log = _readFomoLog();
  const key = String(targetAccountId);
  const last = log[key] ? Number(log[key]) : 0;
  if (Date.now() - last < FOMO_COOLDOWN_MS) {
    return { ok: false, error: 'cooldown', skipped: true };
  }

  const pkgRec = getAccountRecord(targetAccountId);
  const accountsFile = path.join(__dirname, '..', 'data', 'accounts.json');
  let accPhone = pkgRec && pkgRec.accountPhone;
  let accEmail = pkgRec && pkgRec.accountEmail;
  if (!accPhone || !accEmail) {
    try {
      const list = JSON.parse(fs.readFileSync(accountsFile, 'utf8'));
      const acc = list.find((a) => a.id === targetAccountId);
      if (acc) {
        accPhone = accPhone || acc.phone;
        accEmail = accEmail || acc.email;
      }
    } catch (e) { /* ignore */ }
  }

  const lang = opts.lang === 'fr' ? 'fr' : 'ar';
  const msg = lang === 'fr' ? FOMO_MSG_FR : FOMO_MSG_AR;
  const results = { sms: null, whatsapp: null };

  const to = _normalizePhoneE164(accPhone);
  if (to) {
    results.sms = await sendSMS('+' + to, msg);
    if (typeof sendWhatsApp === 'function') {
      results.whatsapp = await sendWhatsApp(to, msg);
    }
  }

  const delivered = !!(results.sms && results.sms.ok) || !!(results.whatsapp && results.whatsapp.ok);
  if (delivered) {
    log[key] = Date.now();
    _writeFomoLog(log);
  }

  return { ok: delivered, notified: delivered, results, message: msg, module: normalizeModule(module) };
}

function canSellerExposeContacts(accountId, accountType) {
  return getSellerContactEligibility(accountId, accountType).canExpose;
}

module.exports = {
  normalizeModule,
  redactContactPatterns,
  getSellerContactEligibility,
  getViewerContactEligibility,
  resolveContactGate,
  extractContactsFromAccount,
  toGatedContactPayload,
  toPublicAccountGated,
  toPublicAdGated,
  notifyContactAttemptFomo,
  canSellerExposeContacts,
  FOMO_MSG_AR,
  FOMO_MSG_FR,
};
