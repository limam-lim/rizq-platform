#!/usr/bin/env node
'use strict';
/**
 * site.social: حفظ من الأدمن + ظهور عام عبر GET /api/site-config
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const p = path.join(__dirname, '..', '.env');
  const out = {};
  try {
    String(fs.readFileSync(p, 'utf8')).split(/\n/).forEach((line) => {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim();
    });
  } catch (e) {}
  return out;
}

function req(method, urlPath, body, headers) {
  const env = loadEnv();
  const port = Number(env.PORT || process.env.PORT || 3000);
  const payload = body == null ? null : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const r = http.request({
      hostname: '127.0.0.1',
      port,
      path: urlPath,
      method,
      headers: Object.assign(
        { 'Content-Type': 'application/json', 'Content-Length': payload ? Buffer.byteLength(payload) : 0 },
        headers || {}
      ),
    }, (res) => {
      let b = '';
      res.on('data', (c) => { b += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(b); } catch (e) {}
        resolve({ status: res.statusCode, body: json, raw: b });
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

function check(name, cond) {
  console.log((cond ? 'OK  ' : 'FAIL') + ' ' + name);
  if (!cond) process.exitCode = 1;
}

(async () => {
  const env = loadEnv();
  const secret = env.BACKEND_SHARED_SECRET;
  if (!secret) {
    console.error('missing BACKEND_SHARED_SECRET');
    process.exit(1);
  }
  const auth = { 'x-rizq-secret': secret };

  const snap = await req('GET', '/api/site-config');
  check('GET site-config ok', snap.status === 200 && snap.body && snap.body.ok);
  const prevSite = (snap.body.config && snap.body.config.site) || {
    sitename: 'رزق', whatsapp: '+22244882212', social: {}
  };

  const post = await req('POST', '/api/site-config', {
    site: Object.assign({}, prevSite, {
      social: {
        facebook: { enabled: true, url: 'https://facebook.com/rizq.mr' },
        x: { enabled: true, url: 'https://x.com/' },
        youtube: { enabled: true, url: 'javascript:alert(1)' },
        linkedin: { enabled: true, url: 'https://linkedin.com/company/rizq' },
        tiktok: { enabled: true, url: 'https://tiktok.com/@rizq.mr' },
        evil: { enabled: true, url: 'https://evil.example/x' },
      }
    })
  }, auth);
  check('POST site-config ok', post.status === 200 && post.body && post.body.ok);

  const get = await req('GET', '/api/site-config');
  const social = (get.body.config && get.body.config.site && get.body.config.site.social) || {};
  check('facebook kept', social.facebook && social.facebook.enabled && social.facebook.url === 'https://facebook.com/rizq.mr');
  check('x root rejected', social.x && social.x.url === '');
  check('youtube js rejected', social.youtube && social.youtube.url === '');
  check('linkedin kept', social.linkedin && social.linkedin.url.indexOf('linkedin.com/company/rizq') >= 0);
  check('tiktok kept', social.tiktok && social.tiktok.url.indexOf('tiktok.com/@rizq.mr') >= 0);
  check('unknown key stripped', !Object.prototype.hasOwnProperty.call(social, 'evil'));

  // restore usable demo links for local UI
  await req('POST', '/api/site-config', {
    site: Object.assign({}, prevSite, {
      social: {
        facebook: { enabled: true, url: 'https://facebook.com/rizq.mr' },
        x: { enabled: true, url: 'https://x.com/rizq_mr' },
        youtube: { enabled: true, url: 'https://youtube.com/@rizq' },
        linkedin: { enabled: true, url: 'https://linkedin.com/company/rizq' },
        tiktok: { enabled: true, url: 'https://tiktok.com/@rizq.mr' },
      }
    })
  }, auth);

  if (process.exitCode) process.exit(process.exitCode);
  console.log('all site-social checks passed');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
