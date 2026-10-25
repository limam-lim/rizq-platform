/**
 * WebAuthn / Passkeys — توليد وتحقق التحديات
 */
'use strict';

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { isoBase64URL, isoUint8Array } = require('@simplewebauthn/server/helpers');
const Passkey = require('../models/passkey');
const Buyer = require('../models/buyer');
const { isProdEnv } = require('../middleware/accountAuth');

function parseOrigins() {
  const fromEnv = String(process.env.WEBAUTHN_ORIGIN || process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const local = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
  ];
  const set = new Set(fromEnv);
  if (!isProdEnv()) local.forEach((o) => set.add(o));
  return Array.from(set);
}

function resolveRp(req) {
  const origins = parseOrigins();
  let origin = String((req && req.headers && req.headers.origin) || '').replace(/\/$/, '');
  if (origin && origins.length && !origins.includes(origin) && isProdEnv()) {
    origin = origins[0] || origin;
  }
  if (!origin) origin = origins[0] || 'http://localhost:3000';

  let rpID = String(process.env.WEBAUTHN_RP_ID || '').trim();
  if (!rpID) {
    try { rpID = new URL(origin).hostname; } catch (e) { rpID = 'localhost'; }
  }
  return {
    rpName: String(process.env.WEBAUTHN_RP_NAME || 'رزق | Rizq').slice(0, 64),
    rpID,
    origin,
    origins: origins.length ? origins : [origin],
  };
}

function userHandle(kind, userId) {
  return isoUint8Array.fromUTF8String(String(kind) + ':' + String(userId));
}

function parseUserHandle(buf) {
  try {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    const s = isoUint8Array.toUTF8String(bytes);
    const i = s.indexOf(':');
    if (i < 1) return null;
    return { kind: s.slice(0, i), userId: s.slice(i + 1) };
  } catch (e) {
    return null;
  }
}

async function buildRegistrationOptions({ kind, userId, userName, displayName, req }) {
  const rp = resolveRp(req);
  const excludeCredentials = Passkey.listCredentialDescriptors(kind, userId);
  const options = await generateRegistrationOptions({
    rpName: rp.rpName,
    rpID: rp.rpID,
    userID: userHandle(kind, userId),
    userName: String(userName || userId).slice(0, 120),
    userDisplayName: String(displayName || userName || userId).slice(0, 120),
    attestationType: 'none',
    excludeCredentials: excludeCredentials.map((c) => ({
      id: c.id,
      transports: c.transports,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: undefined,
    },
    supportedAlgorithmIDs: [-7, -257],
  });
  Passkey.saveChallenge({
    userKind: kind,
    userId,
    challenge: options.challenge,
    purpose: 'register',
  });
  return { options, rp };
}

function challengeFromClientDataJSON(raw) {
  if (!raw) return '';
  try {
    let bytes;
    if (typeof raw === 'string') {
      if (raw.charAt(0) === '{') bytes = Buffer.from(raw, 'utf8');
      else bytes = Buffer.from(isoBase64URL.toBuffer(raw));
    } else {
      bytes = Buffer.from(raw);
    }
    const json = JSON.parse(bytes.toString('utf8'));
    return String(json.challenge || '');
  } catch (e) {
    return '';
  }
}

async function verifyRegistration({ kind, userId, response, friendlyName, req }) {
  const rp = resolveRp(req);
  const clientChallenge = challengeFromClientDataJSON(
    response && response.response && response.response.clientDataJSON
  );
  const challengeRow = Passkey.consumeChallenge(clientChallenge, 'register');
  if (!challengeRow || challengeRow.user_kind !== kind || String(challengeRow.user_id) !== String(userId)) {
    const err = new Error('تحدي التسجيل غير صالح أو منتهٍ');
    err.code = 'INVALID_CHALLENGE';
    err.status = 400;
    throw err;
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challengeRow.challenge,
    expectedOrigin: rp.origins,
    expectedRPID: rp.rpID,
    requireUserVerification: false,
  });
  if (!verification.verified || !verification.registrationInfo) {
    const err = new Error('فشل التحقق من Passkey');
    err.code = 'VERIFY_FAILED';
    err.status = 400;
    throw err;
  }

  const info = verification.registrationInfo;
  const credential = info.credential;
  const credId = typeof credential.id === 'string'
    ? credential.id
    : isoBase64URL.fromBuffer(credential.id);
  const publicKey = isoBase64URL.fromBuffer(
    credential.publicKey instanceof Uint8Array
      ? credential.publicKey
      : new Uint8Array(credential.publicKey)
  );

  if (Passkey.findByCredentialId(credId)) {
    const err = new Error('هذا المفتاح مسجّل مسبقاً');
    err.code = 'DUPLICATE';
    err.status = 409;
    throw err;
  }

  const row = Passkey.insertPasskey({
    userKind: kind,
    userId,
    credentialId: credId,
    publicKey,
    counter: credential.counter || 0,
    transports: (response.response && response.response.transports) || credential.transports || [],
    deviceType: info.credentialDeviceType || '',
    backedUp: !!info.credentialBackedUp,
    friendlyName: friendlyName || '',
  });
  return { verified: true, passkey: Passkey.rowToPublic(row) };
}

async function buildLoginOptions({ kind, email, req }) {
  const rp = resolveRp(req);
  let allowCredentials = [];
  let userKind = kind || null;
  let userId = null;

  if (email) {
    const em = String(email).trim().toLowerCase();
    if (kind === 'buyer' || kind === 'any' || !kind) {
      const buyer = Buyer.findByEmail(em);
      if (buyer) {
        userKind = 'buyer';
        userId = buyer.id;
        allowCredentials = Passkey.listCredentialDescriptors('buyer', buyer.id);
      }
    }
    if ((!allowCredentials.length) && (kind === 'seller' || kind === 'any' || !kind)) {
      // seller lookup via accounts is done by caller injecting accountId — optional email path below
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    allowCredentials: allowCredentials.length
      ? allowCredentials.map((c) => ({ id: c.id, transports: c.transports }))
      : undefined,
    userVerification: 'preferred',
  });
  Passkey.saveChallenge({
    userKind: userKind || kind || null,
    userId: userId || null,
    challenge: options.challenge,
    purpose: 'login',
  });
  return { options, rp, hint: { userKind, userId, hasAllowList: allowCredentials.length > 0 } };
}

async function buildLoginOptionsForUser({ kind, userId, req }) {
  const rp = resolveRp(req);
  const allowCredentials = Passkey.listCredentialDescriptors(kind, userId);
  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    allowCredentials: allowCredentials.map((c) => ({ id: c.id, transports: c.transports })),
    userVerification: 'preferred',
  });
  Passkey.saveChallenge({
    userKind: kind,
    userId,
    challenge: options.challenge,
    purpose: 'login',
  });
  return { options, rp };
}

async function verifyLogin({ response, req }) {
  const rp = resolveRp(req);
  const clientChallenge = challengeFromClientDataJSON(
    response && response.response && response.response.clientDataJSON
  );
  const challengeRow = Passkey.consumeChallenge(clientChallenge, 'login');
  if (!challengeRow) {
    const err = new Error('تحدي الدخول غير صالح أو منتهٍ');
    err.code = 'INVALID_CHALLENGE';
    err.status = 400;
    throw err;
  }

  const credId = String((response && response.id) || '');
  const stored = Passkey.findByCredentialId(credId);
  if (!stored) {
    const err = new Error('Passkey غير معروف');
    err.code = 'UNKNOWN_CREDENTIAL';
    err.status = 401;
    throw err;
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challengeRow.challenge,
    expectedOrigin: rp.origins,
    expectedRPID: rp.rpID,
    credential: {
      id: stored.credential_id,
      publicKey: isoBase64URL.toBuffer(stored.public_key),
      counter: Number(stored.counter) || 0,
      transports: (() => {
        try { return JSON.parse(stored.transports || '[]'); } catch (e) { return []; }
      })(),
    },
    requireUserVerification: false,
  });

  if (!verification.verified) {
    const err = new Error('فشل التحقق من البصمة');
    err.code = 'VERIFY_FAILED';
    err.status = 401;
    throw err;
  }

  const newCounter = verification.authenticationInfo
    && typeof verification.authenticationInfo.newCounter === 'number'
    ? verification.authenticationInfo.newCounter
    : (Number(stored.counter) || 0) + 1;
  Passkey.updateCounter(stored.credential_id, newCounter);

  return {
    verified: true,
    userKind: stored.user_kind,
    userId: stored.user_id,
    passkey: Passkey.rowToPublic(stored),
  };
}

module.exports = {
  resolveRp,
  parseUserHandle,
  buildRegistrationOptions,
  verifyRegistration,
  buildLoginOptions,
  buildLoginOptionsForUser,
  verifyLogin,
  parseOrigins,
};
