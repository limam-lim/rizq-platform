/**
 * فحص RTL/LTR وتسرب اللغة — rizq platform
 * node scripts/audit-i18n-rtl.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));

const MIXED_PATTERNS = [
  { re: /\/\s*(Nom|Téléphone|Ville|Panier|Commander|WhatsApp|Paiement|Adresse|Quartier)/gi, label: 'AR label with FR slash' },
  { re: /[\u0600-\u06FF].*\|\s*[A-Za-zÀ-ÿ]{4,}/g, label: 'AR|Latin in same text node' },
  { re: /<title>[^<]*\|[^<]*[À-ÿA-Za-z]{4,}[^<]*[\u0600-\u06FF]/g, label: 'Bilingual title' },
  { re: /<html[^>]+lang="ar"[^>]+dir="ltr"/g, label: 'AR lang with LTR dir' },
  { re: /<html[^>]+lang="fr"[^>]+dir="rtl"/g, label: 'FR lang with RTL dir' },
];

const results = { pages: [], mixed: [], missingI18n: [], ok: [] };

htmlFiles.forEach((file) => {
  const full = path.join(ROOT, file);
  const content = fs.readFileSync(full, 'utf8');
  const hasRtlDefault = /<html[^>]+lang="ar"[^>]+dir="rtl"/.test(content);
  const hasI18n = content.includes('rizq_i18n.js');
  const hasBtnLang = content.includes('btn-lang');
  const hasMixed = [];

  MIXED_PATTERNS.forEach(({ re, label }) => {
    re.lastIndex = 0;
    const m = content.match(re);
    if (m && m.length) hasMixed.push({ label, count: m.length, sample: m[0].slice(0, 80) });
  });

  results.pages.push({ file, hasRtlDefault, hasI18n, hasBtnLang, mixed: hasMixed.length });
  if (hasMixed.length) results.mixed.push({ file, issues: hasMixed });
  if (hasBtnLang && !hasI18n && file !== 'rizq_landing_v8.html' && file !== 'rizq_tenders.html' && file !== 'rizq_chat_widget.html') {
    results.missingI18n.push(file);
  }
  if (hasRtlDefault && hasI18n) results.ok.push(file);
});

console.log('\n=== RIZQ RTL/LTR Audit ===\n');
console.log('HTML pages:', htmlFiles.length);
console.log('Default lang=ar dir=rtl:', results.pages.filter((p) => p.hasRtlDefault).length);
console.log('With rizq_i18n.js:', results.pages.filter((p) => p.hasI18n).length);
console.log('Pages with mixed-language signals:', results.mixed.length);
results.mixed.forEach((m) => {
  console.log('\n  ' + m.file);
  m.issues.forEach((i) => console.log('    - ' + i.label + ' (' + i.count + '): ' + i.sample));
});
if (results.missingI18n.length) {
  console.log('\nLang button without central i18n (review):', results.missingI18n.join(', '));
}
console.log('\nAudit complete.');
process.exit(results.mixed.length ? 1 : 0);
