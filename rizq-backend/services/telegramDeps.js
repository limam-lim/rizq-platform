'use strict';

/** ربط متأخر لتبعيات Telegram (تُعرَّف بعد تحميل server.js بالكامل) */
let _deps = null;

function setTelegramDeps(deps) {
  _deps = deps;
}

function getTelegramDeps() {
  return _deps;
}

module.exports = { setTelegramDeps, getTelegramDeps };
