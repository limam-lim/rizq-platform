#!/usr/bin/env node
'use strict';

/**
 * تشغيل Rizqbot في وضع Polling للتطوير المحلي (بدون نطاق عام).
 * يشغّل server.js مع TELEGRAM_USE_POLLING=true
 */
process.env.TELEGRAM_USE_POLLING = 'true';
require('../server.js');
