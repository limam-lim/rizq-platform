#!/usr/bin/env node
/**
 * اختبار طبقة المستودعات + تخزين الملفات المجرّد
 */
'use strict';

const path = require('path');
process.chdir(path.join(__dirname, '..'));

const repos = require('../db/repos');
const objectStorage = require('../lib/objectStorage');
const fs = require('fs');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const stamp = Date.now();
  const pkgId = 'ACC_REPO_' + stamp;
  repos.setPackage(pkgId, {
    accountId: pkgId,
    status: 'active',
    pkgName: 'test',
    accessToken: 'tok_' + stamp,
  });
  assert(repos.getPackage(pkgId), 'package upsert/get');
  repos.packages.remove(pkgId);

  const msgId = 'MSG_' + stamp;
  repos.messages.upsert(msgId, { id: msgId, body: 'hello', createdAt: new Date().toISOString() });
  assert(repos.messages.get(msgId), 'message upsert');
  repos.messages.remove(msgId);

  const cfg = repos.getSiteConfig();
  assert(cfg && typeof cfg === 'object', 'site config singleton');

  const key = 'misc/repo-test/' + stamp + '.bin';
  const put = await objectStorage.putObject({
    key,
    buffer: Buffer.from('rizq-storage-ok'),
    contentType: 'application/octet-stream',
  });
  assert(put.url.indexOf('/uploads/') === 0, 'public url prefix');
  assert(fs.existsSync(objectStorage.resolveLocalPath(key)), 'local object exists');
  await objectStorage.deleteObject(key);

  console.log('OK zero-debt repos + objectStorage');
  console.log('counts', {
    packages: repos.packages.count(),
    messages: repos.messages.count(),
    accounts: repos.accounts.list().length,
    otp: repos.otp.count(),
  });
}

main().catch((e) => {
  console.error('FAIL', e.message || e);
  process.exit(1);
});
