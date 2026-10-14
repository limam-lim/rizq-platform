#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const landing = read('rizq_landing_v8.html');
const header = read('rizq_header.js');
const dyn = read('rizq_dynamic_nav.js');
const dir = read('rizq_directory.html');
const tDir = read('rizq_tenders_directory.html');
const iDir = read('rizq_investments_directory.html');
const tDetail = read('rizq_tender_detail.html');
const iDetail = read('rizq_investment_detail.html');
const invRoutes = read('rizq-backend/routes/investments.js');
const entitlements = read('rizq-backend/services/entitlements.js');
const invRoom = read('rizq-backend/services/investmentRoom.js');
const subAct = read('rizq-backend/services/subRequestActivation.js');

assert(tDir.includes('type=tenders'), 'tenders redirect');
assert(iDir.includes('type=investments'), 'investments redirect');

assert(dir.includes("tenders:"), 'directory has tenders type');
assert(dir.includes("investments:"), 'directory has investments type');
assert(dir.includes('/api/tenders'), 'directory fetches tenders');
assert(dir.includes('/api/investments'), 'directory fetches investments');
assert(dir.includes("feed: true"), 'feed flag present');
assert(dir.includes("page: 'rizq_tender_detail.html'"), 'directory tenders → detail room');
assert(dir.includes("page: 'rizq_investment_detail.html'"), 'directory investments → detail room');
assert(dir.includes("rizq_tender_detail.html?demo=1"), 'example cards → tender detail demo');
assert(dir.includes("rizq_investment_detail.html?demo=1"), 'example cards → invest detail demo');
assert(dir.includes("'?id='"), 'feed cards use ?id= for detail rooms');
assert(!dir.includes("'?focus='"), 'feed cards no longer use ?focus= submit deep-link');

assert(header.includes("tenders: 'rizq_tenders_directory.html'"), 'header tenders → directory');
assert(header.includes("investments: 'rizq_investments_directory.html'"), 'header investments → directory');
assert(header.includes("rizq_tenders_directory: 'tenders'"), 'header page map tenders directory');
assert(header.includes("rizq_tender_detail: 'tenders'"), 'header page map tender detail');
assert(header.includes("rizq_investment_detail: 'investments'"), 'header page map investment detail');

assert(dyn.includes("href: 'rizq_tenders_directory.html'"), 'dynamic nav tenders');
assert(dyn.includes("href: 'rizq_investments_directory.html'"), 'dynamic nav investments');

assert(!landing.includes('id="virtual-tenders"'), 'landing removed virtual-tenders');
assert(!landing.includes('id="virtual-investments"'), 'landing removed virtual-investments');
assert(!landing.includes("renderFeedStrip('rzq-disc-tenders'"), 'no tenders strip render');
assert(!landing.includes("renderFeedStrip('rzq-disc-investments'"), 'no investments strip render');
assert(landing.includes('href="rizq_tenders_directory.html"'), 'landing nav to tenders directory');
assert(landing.includes('href="rizq_investments_directory.html"'), 'landing nav to investments directory');
assert(landing.includes('href="rizq_tenders.html?demo=1"'), 'hero portal still room tenders');
assert(landing.includes('href="rizq_investments.html?demo=1"'), 'hero portal still room investments');
assert(landing.includes('hero-biz-tender'), 'hero tender portal class kept');
assert(landing.includes('hero-biz-invest'), 'hero invest portal class kept');

const tRoom = read('rizq_tenders.html');
const iRoom = read('rizq_investments.html');
assert(tRoom.includes('id="td-submit"'), 'tender room keeps deposit form');
assert(tRoom.includes('rizq_tenders_directory.html'), 'tender room links to directory');
assert(tRoom.includes('id="t-grid" hidden') || tRoom.includes('t-grid" id="t-grid" hidden') || /id="t-grid"[^>]*hidden/.test(tRoom), 'tender list grid hidden');
assert(tRoom.includes('غرفة إيداع') || tRoom.includes('salle de dépôt') || tRoom.includes('للإيداع والترويج'), 'tender room is deposit-focused');
assert(!/loadTenders[\s\S]*\/api\/tenders'/.test(tRoom.replace(/\s+/g,' ')) || tRoom.includes('عرض المناقصات انتقل'), 'tender load does not fetch list for display');
assert(iRoom.includes('id="inv-submit"'), 'invest room keeps deposit form');
assert(iRoom.includes('rizq_investments_directory.html'), 'invest room links to directory');
assert(/id="inv-opp-grid"[^>]*hidden/.test(iRoom), 'invest opp grid hidden');
assert(iRoom.includes('function renderOpps()'), 'invest renderOpps stubbed (no list)');

assert(tDetail.includes('/api/tenders/package/status/'), 'tender detail checks package');
assert(tDetail.includes('/api/tenders/'), 'tender detail fetches item');
assert(tDetail.includes('renderGate'), 'tender detail has gate');
assert(iDetail.includes('/api/investments/package/status/'), 'invest detail checks package');
assert(iDetail.includes('/api/investments/'), 'invest detail fetches item');
assert(iDetail.includes('renderGate'), 'invest detail has gate');

assert(entitlements.includes('getInvestmentEntitlements'), 'investment entitlements exported');
assert(entitlements.includes('::investment'), 'investment package key isolated');
assert(invRoom.includes('getPublicById'), 'investment getPublicById');
assert(invRoutes.includes("/api/investments/package/status/:id"), 'invest package status route');
assert(invRoutes.includes("/api/investments/:id"), 'invest detail route');
assert(subAct.includes("category === 'investment'"), 'sub activation supports investment');

console.log('test-tenders-invest-directories: OK');
