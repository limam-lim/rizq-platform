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

assert(tDir.includes('type=tenders'), 'tenders redirect');
assert(iDir.includes('type=investments'), 'investments redirect');

assert(dir.includes("tenders:"), 'directory has tenders type');
assert(dir.includes("investments:"), 'directory has investments type');
assert(dir.includes('/api/tenders'), 'directory fetches tenders');
assert(dir.includes('/api/investments'), 'directory fetches investments');
assert(dir.includes("feed: true"), 'feed flag present');

assert(header.includes("tenders: 'rizq_tenders_directory.html'"), 'header tenders → directory');
assert(header.includes("investments: 'rizq_investments_directory.html'"), 'header investments → directory');
assert(header.includes("rizq_tenders_directory: 'tenders'"), 'header page map tenders directory');

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

console.log('test-tenders-invest-directories: OK');
