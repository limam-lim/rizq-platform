/**
 * اختبار صلاحيات فريق الإدارة — وحدة + API (إن كان الخادم يعمل)
 * node scripts/test-admin-team.js
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const bcrypt = require('bcryptjs');

const PORT = Number(process.env.PORT || 3000);
const BASE = 'http://127.0.0.1:' + PORT;

const results = [];
function ok(name, pass, detail) {
  results.push({ name, pass, detail: detail || '' });
  console.log((pass ? 'OK  ' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}

async function req(method, urlPath, body, headers) {
  const r = await fetch(BASE + urlPath, {
    method,
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let j = null;
  try { j = await r.json(); } catch (e) { j = null; }
  return { status: r.status, body: j };
}

function withIsolatedTeamFile(fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rizq-admin-team-'));
  const tmpFile = path.join(tmpDir, 'admin-team.json');
  fs.writeFileSync(tmpFile, '[]', 'utf8');
  const realFile = path.join(__dirname, '..', 'data', 'admin-team.json');
  const savedReal = fs.existsSync(realFile) ? fs.readFileSync(realFile, 'utf8') : null;

  const teamSrc = fs.readFileSync(path.join(__dirname, '..', 'services', 'adminTeam.js'), 'utf8');
  const patched = teamSrc.replace(
    "const TEAM_FILE = path.join(__dirname, '..', 'data', 'admin-team.json');",
    "const TEAM_FILE = " + JSON.stringify(tmpFile) + ";"
  );
  const tmpModule = path.join(tmpDir, 'adminTeam.js');
  fs.writeFileSync(tmpModule, patched, 'utf8');
  delete require.cache[require.resolve('../services/adminPermissions')];
  const adminTeam = require(tmpModule);

  return fn(adminTeam).finally(function () {
    delete require.cache[tmpModule];
    if (savedReal != null) fs.writeFileSync(realFile, savedReal, 'utf8');
    else if (fs.existsSync(realFile)) fs.unlinkSync(realFile);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
}

async function testModules() {
  const {
    MAX_TEAM_MEMBERS,
    hasAdminPermission,
    normalizePermissions,
    permissionsForLegacyRole,
    PERMISSION_PRESETS,
  } = require('../services/adminPermissions');

  ok('MAX_TEAM_MEMBERS is 15', MAX_TEAM_MEMBERS === 15);
  ok('normalize * collapses to star only', normalizePermissions(['overview', '*', 'users']).join() === '*');
  ok('hasAdminPermission * grants all', hasAdminPermission(['*'], 'team.manage'));
  ok('hasAdminPermission granular', hasAdminPermission(['tenders', 'overview'], 'tenders'));
  ok('hasAdminPermission denies', !hasAdminPermission(['overview'], 'payments'));
  ok('tender_reviewer preset', PERMISSION_PRESETS.tender_reviewer.permissions.includes('tenders'));
  ok('legacy moderator has tenders', permissionsForLegacyRole('moderator').includes('tenders'));
  ok('legacy super is *', permissionsForLegacyRole('super')[0] === '*');

  await withIsolatedTeamFile(async function (adminTeam) {
    const legacy = [
      { user: 'testadmin', passHash: bcrypt.hashSync('x', 10), name: 'Admin', role: 'super' },
      { user: 'testmod', passHash: bcrypt.hashSync('y', 10), name: 'Mod', role: 'moderator' },
    ];
    const seeded = adminTeam.seedFromLegacyAccounts(legacy);
    ok('seedFromLegacyAccounts creates members', seeded.length === 2);
    ok('seed super gets *', seeded[0].permissions.includes('*'));
    ok('seed moderator lacks team.manage', !seeded[1].permissions.includes('team.manage'));

    const member = await adminTeam.createMember({
      user: 'reviewer1',
      name: 'Reviewer',
      pass: 'secret123',
      permissions: ['overview', 'tenders'],
    }, 'testadmin');
    ok('createMember stores permissions', member.permissions.join() === 'overview,tenders');

    const authOk = await adminTeam.authenticate('reviewer1', 'secret123');
    ok('authenticate reviewer', authOk && authOk.user === 'reviewer1');
  });
}

async function testHttp() {
  const secret = process.env.BACKEND_SHARED_SECRET || '';
  let health;
  try { health = await req('GET', '/health'); } catch (e) { health = { status: 0 }; }
  if (health.status !== 200) {
    ok('HTTP tests', true, 'SKIP — server not running');
    return;
  }
  ok('GET /health', health.status === 200);

  if (!secret) {
    ok('HTTP admin API', true, 'SKIP — BACKEND_SHARED_SECRET not set');
    return;
  }

  const headers = { 'x-rizq-secret': secret };
  const perms = await req('GET', '/api/admin/permissions', null, headers);
  ok('GET /api/admin/permissions', perms.status === 200 && perms.body.maxTeamMembers === 15);
  const team = await req('GET', '/api/admin/team', null, headers);
  ok('GET /api/admin/team', team.status === 200 && Array.isArray(team.body.team));
}

async function main() {
  console.log('\n=== Admin Team Permissions Tests ===\n');
  await testModules();
  await testHttp();
  const failed = results.filter(function (r) { return !r.pass; }).length;
  console.log('\n' + (failed ? 'FAILED' : 'ALL PASSED') + ': ' + (results.length - failed) + '/' + results.length);
  process.exit(failed ? 1 : 0);
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
