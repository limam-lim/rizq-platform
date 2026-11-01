/**
 * مساعد مشترك: يشغّل server.js على منفذ حر مع DATABASE_URL الحالي (rizq_test).
 */
'use strict';

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const BACKEND = path.join(__dirname, '..');

function freePort() {
  return 4100 + Math.floor(Math.random() * 500);
}

function waitForServer(port, ms) {
  const deadline = Date.now() + (ms || 45000);
  return new Promise((resolve) => {
    const tryOnce = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/api/otp/config', timeout: 1500 }, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() >= deadline) resolve(false);
        else setTimeout(tryOnce, 250);
      });
      req.on('timeout', () => {
        req.destroy();
        if (Date.now() >= deadline) resolve(false);
        else setTimeout(tryOnce, 250);
      });
    };
    tryOnce();
  });
}

/**
 * @returns {Promise<{ port:number, base:string, child:import('child_process').ChildProcess, logs:()=>string, stop:()=>Promise<void> }>}
 */
async function spawnHttpTestServer(opts) {
  opts = opts || {};
  const port = opts.port || freePort();
  const env = Object.assign({}, process.env, {
    PORT: String(port),
    HOST: '127.0.0.1',
    NODE_ENV: process.env.NODE_ENV || 'test',
    OTP_DEV_HINT: process.env.OTP_DEV_HINT || 'true',
    TRUST_PROXY: process.env.TRUST_PROXY || '1',
  });
  if (opts.stripTelegram !== false) delete env.TELEGRAM_BOT_TOKEN;

  let logs = '';
  const child = spawn(process.execPath, ['server.js'], {
    cwd: BACKEND,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => { logs += d; });
  child.stderr.on('data', (d) => { logs += d; });

  const up = await waitForServer(port, opts.timeoutMs || 45000);
  if (!up) {
    try { child.kill('SIGTERM'); } catch (e) { /* */ }
    const err = new Error('test server failed to boot on :' + port + '\n' + logs.slice(-800));
    throw err;
  }

  return {
    port,
    base: 'http://127.0.0.1:' + port,
    child,
    logs: () => logs,
    stop: () => new Promise((resolve) => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      try {
        child.once('exit', finish);
        child.kill('SIGTERM');
        setTimeout(() => {
          try { child.kill('SIGKILL'); } catch (e2) { /* */ }
          finish();
        }, 4000);
      } catch (e3) {
        finish();
      }
    }),
  };
}

module.exports = { spawnHttpTestServer, freePort, waitForServer };
