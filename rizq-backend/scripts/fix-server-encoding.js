/** One-shot repair: remove leading U+FFFD before server.js header */
const fs = require('fs');
const p = require('path').join(__dirname, '..', 'server.js');
let s = fs.readFileSync(p, 'utf8');
if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
if (s.charCodeAt(0) === 0xFFFD) s = s.slice(1);
fs.writeFileSync(p, s, 'utf8');
require('child_process').execSync('node --check "' + p + '"', { stdio: 'inherit' });
console.log('server.js syntax OK');
