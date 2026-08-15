#!/usr/bin/env node
/** Empty static featured listing cards in rizq_landing_v8.html (UTF-8 safe) */
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'rizq_landing_v8.html');
let h = fs.readFileSync(p, 'utf8');
h = h.replace(
  /(<div class="listings-grid">)[\s\S]*?(<\/div>\s*\n  <div style="text-align:center;margin-top:36px")/,
  '$1\n    <!-- populated dynamically when FEATURED_ADS has entries -->\n  $2'
);
fs.writeFileSync(p, h, 'utf8');
console.log('Empty featured HTML grid in rizq_landing_v8.html');
