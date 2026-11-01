/**
 * حساب الحارس — موسوم isSentinel ويُستثنى من القوائم العامة والإحصاءات.
 */
'use strict';

function isSentinelAccount(rec) {
  if (!rec || typeof rec !== 'object') return false;
  if (rec.isSentinel === true) return true;
  if (rec.data && rec.data.isSentinel === true) return true;
  const email = String(rec.email || (rec.data && rec.data.email) || '').trim().toLowerCase();
  if (email === 'sentinel@rizq.mr' || email.startsWith('sentinel@')) return true;
  return false;
}

/** شرط SQL لاستبعاد حسابات الحارس من القوائم العامة */
const SQL_NOT_SENTINEL = `(COALESCE(data->>'isSentinel','') IS DISTINCT FROM 'true')`;

function filterOutSentinel(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((a) => !isSentinelAccount(a));
}

module.exports = {
  isSentinelAccount,
  SQL_NOT_SENTINEL,
  filterOutSentinel,
};
