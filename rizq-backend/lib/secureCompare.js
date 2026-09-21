/**
 * مقارنات توقيت-آمنة للتوكنات والأسرار.
 */
'use strict';

const crypto = require('crypto');

function timingSafeEqualStr(a, b) {
  const left = Buffer.from(String(a == null ? '' : a), 'utf8');
  const right = Buffer.from(String(b == null ? '' : b), 'utf8');
  if (left.length !== right.length) {
    /* مقارنة وهمية بنفس الطول لمنع تسريب الطول عند غياب القيمة */
    const dummy = crypto.createHash('sha256').update(left).digest();
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

module.exports = { timingSafeEqualStr };
