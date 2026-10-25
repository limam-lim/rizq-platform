#!/usr/bin/env node
/** V3: رفع الفيديو → 403 VIDEO_UPLOAD_DISABLED */
'use strict';

const http = require('http');

function ok(name, pass, detail) {
  console.log((pass ? '✅' : '❌') + ' ' + name + (detail ? ' — ' + detail : ''));
  return pass;
}

function request(port, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/api/ads/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: 5000,
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch (e) { json = { raw }; }
        resolve({ status: res.statusCode, json });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

async function run() {
  const port = Number(process.env.PORT || 3000);
  let passed = 0;
  let total = 0;
  function check(name, pass, detail) {
    total++;
    if (ok(name, pass, detail)) passed++;
  }

  try {
    const r1 = await request(port, {
      title: 'اختبار فيديو',
      phone: '22123456',
      hasVideoFile: true,
      videoFileName: 'clip.mp4',
    });
    check('status 403', r1.status === 403, 'got ' + r1.status);
    check('code VIDEO_UPLOAD_DISABLED', r1.json && r1.json.code === 'VIDEO_UPLOAD_DISABLED');
    check('error key', r1.json && r1.json.error === 'VIDEO_UPLOAD_DISABLED');
    check('not 503', r1.status !== 503);

    const r2 = await request(port, {
      title: 'بدون فيديو',
      phone: '22123456',
      pkg: 'basic',
    });
    check('submit without video ok', r2.status === 200 && r2.json && r2.json.ok === true, JSON.stringify(r2.json));
  } catch (e) {
    check('server reachable', false, e.message);
  }

  console.log('\n' + passed + '/' + total + ' checks passed\n');
  process.exit(passed === total ? 0 : 1);
}

run();
