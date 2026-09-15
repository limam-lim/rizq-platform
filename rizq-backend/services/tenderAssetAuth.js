/**
 * tenderAssetAuth.js — توقيع URLs وصلاحيات مرفقات المناقصات (صور + PDF)
 */
'use strict';

const crypto = require('crypto');

const TENDER_ASSET_SIG_TTL_MS = 60 * 60 * 1000;

function assetSigSecret() {
  return String(process.env.BACKEND_SHARED_SECRET || process.env.RIZQ_API_SECRET || '').trim();
}

function buildTenderAssetSig(viewerId, tenderId, assetKey) {
  const secret = assetSigSecret();
  if (!secret || !viewerId || !tenderId || !assetKey) return '';
  const exp = Date.now() + TENDER_ASSET_SIG_TTL_MS;
  const sig = crypto.createHmac('sha256', secret)
    .update(`${viewerId}|${tenderId}|${assetKey}|${exp}`)
    .digest('hex')
    .slice(0, 32);
  return `viewer=${encodeURIComponent(viewerId)}&exp=${exp}&sig=${sig}`;
}

function verifyTenderAssetSig(viewerId, tenderId, assetKey, exp, sig) {
  const secret = assetSigSecret();
  if (!secret || !viewerId || !tenderId || !assetKey || !exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  const expected = crypto.createHmac('sha256', secret)
    .update(`${viewerId}|${tenderId}|${assetKey}|${exp}`)
    .digest('hex')
    .slice(0, 32);
  try {
    return crypto.timingSafeEqual(Buffer.from(String(sig)), Buffer.from(expected));
  } catch (e) {
    return false;
  }
}

function buildSignedTenderAssetUrl(basePath, viewerId, tenderId, assetKey) {
  const q = buildTenderAssetSig(viewerId, tenderId, assetKey);
  return q ? `${basePath}?${q}` : basePath;
}

module.exports = {
  TENDER_ASSET_SIG_TTL_MS,
  buildTenderAssetSig,
  verifyTenderAssetSig,
  buildSignedTenderAssetUrl,
};
