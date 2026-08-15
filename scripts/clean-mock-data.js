#!/usr/bin/env node
/** One-shot: empty mock/dummy data arrays across Rizq platform files */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function write(rel, content) {
  fs.writeFileSync(path.join(ROOT, rel), content, 'utf8');
  console.log('Updated:', rel);
}

function replaceArrayBlock(src, varName, replacement) {
  const re = new RegExp(
    `(const\\s+${varName}\\s*=\\s*)\\[[\\s\\S]*?\\];`,
    'm'
  );
  if (!re.test(src)) {
    console.warn('SKIP (not found):', varName);
    return src;
  }
  return src.replace(re, `$1${replacement};`);
}

function replaceVarArray(src, varName) {
  const re = new RegExp(`(var\\s+${varName}\\s*=\\s*)\\[[\\s\\S]*?\\];`, 'm');
  if (!re.test(src)) {
    console.warn('SKIP var (not found):', varName);
    return src;
  }
  return src.replace(re, '$1[];');
}

function replaceObjectBlock(src, varName) {
  const re = new RegExp(
    `(var\\s+${varName}\\s*=\\s*)\\{[\\s\\S]*?\\};`,
    'm'
  );
  if (!re.test(src)) {
    console.warn('SKIP object (not found):', varName);
    return src;
  }
  return src.replace(re, '$1{};');
}

// ── rizq_landing_v8.html ──
let landing = read('rizq_landing_v8.html');
landing = replaceArrayBlock(landing, 'ADS', '[]');
landing = replaceArrayBlock(landing, 'FEATURED_ADS', '[]');
landing = landing.replace(
  /function buildCards\(\)\{\s*const track=document\.getElementById\('cards-track'\);\s*const all=\[\.\.\.ADS,\.\.\.ADS\];[\s\S]*?track\.appendChild\(c\);\s*\}\);\s*\}/,
  `function buildCards(){
  const track=document.getElementById('cards-track');
  if(!track) return;
  track.innerHTML='';
  if(!ADS.length){
    track.innerHTML='<div style="padding:24px 16px;color:#5a6d8a;font-size:13px;text-align:center;width:100%">'+ (typeof isAr!=='undefined' && !isAr ? 'No live listings yet.' : 'لا توجد إعلانات منشورة بعد.') +'</div>';
    return;
  }
  const all=[...ADS,...ADS];
  all.forEach((a,idx)=>{
    const realIdx = idx % ADS.length;
    const c=document.createElement('div');
    c.className='ad-card';
    const d = trAd(a);
    c.innerHTML=\`
      <div class="ad-card-img" style="background:\${d.bg}">\\n        \${d.pin?'<div class="ad-badge">⭐ '+(isAr?'مميز':'Favori')+'</div>':''}
        <span>\${d.emoji}</span>
      </div>
      <div class="ad-card-body">
        <div class="ad-cat">\${d.cat}</div>
        <div class="ad-title">\${d.title}</div>
        <div class="ad-footer">
          <span class="ad-price">\${d.price}</span>
          <span class="ad-loc">\${d.loc}</span>
        </div>
      </div>
      <div class="ad-hover-detail">
        <div class="ahd-cat">\${d.cat}</div>
        <div class="ahd-title">\${d.title}</div>
        <div class="ahd-desc">\${d.desc}</div>
        <div class="ahd-price">\${d.price}</div>\\n        <div class="ahd-meta"><span>\${d.loc}</span><span>\${d.status||''}</span></div>\\n        <button class="ahd-btn" onclick="openCarouselAdModal(\${realIdx})">📋 \${isAr?'عرض الإعلان كاملاً':'Voir l\\'annonce'}</button>
      </div>\`;
    c.addEventListener('click',()=>openCarouselAdModal(realIdx));
    track.appendChild(c);
  });
}`
);
landing = landing.replace(
  "function callSeller(){ window.location.href = 'tel:+22200000000'; }",
  "function callSeller(){ if(!currentAdRef||!currentAdRef.phone){ alert(isAr?'رقم البائع غير متوفر':'Numéro vendeur indisponible'); return; } window.location.href = 'tel:'+String(currentAdRef.phone).replace(/\\s/g,''); }"
);
landing = landing.replace(
  "window.open('https://wa.me/22200000000?text=' + encodeURIComponent(msg), '_blank');",
  "if(!currentAdRef||!currentAdRef.phone){ alert(isAr?'رقم البائع غير متوفر':'Numéro vendeur indisponible'); return; } window.open('https://wa.me/'+String(currentAdRef.phone).replace(/[^\\d]/g,'')+'?text='+encodeURIComponent(msg), '_blank');"
);
landing = landing.replace(
  "window.open('https://wa.me/22200000000?text=' + encodeURIComponent(msg), '_blank');\n  input.value='';",
  "if(!currentAdRef||!currentAdRef.phone){ alert(isAr?'رقم البائع غير متوفر':'Numéro vendeur indisponible'); return; } window.open('https://wa.me/'+String(currentAdRef.phone).replace(/[^\\d]/g,'')+'?text='+encodeURIComponent(msg), '_blank');\n  input.value='';"
);
write('rizq_landing_v8.html', landing);

// ── rizq_browse.html ──
let browse = read('rizq_browse.html');
browse = replaceArrayBlock(browse, 'DEMO_ADS', '[]');
browse = replaceArrayBlock(browse, 'ALL_ADS_DATA', '[]');
browse = browse.replace(
  'const ALL_ADS = loadRealSearchAds().concat(DEMO_ADS);',
  'const ALL_ADS = loadRealSearchAds();'
);
browse = browse.replace(
  'const demo=DEMO_ADS.find(d=>String(d.id)===String(id))||ALL_ADS.find(d=>String(d.id)===String(id))||{};\n  const data=ALL_ADS_DATA.find(a=>String(a.id)===String(id))||{};\n  return Object.assign({},demo,data,stored);',
  'const ad=ALL_ADS.find(d=>String(d.id)===String(id))||{};\n  return Object.assign({}, ad, stored);'
);
write('rizq_browse.html', browse);

// ── rizq_search.html ──
let search = read('rizq_search.html');
search = replaceArrayBlock(search, 'DEMO_ADS', '[]');
search = search.replace(/const ALL_ADS = loadRealSearchAds\(\)\.concat\(DEMO_ADS\);/, 'const ALL_ADS = loadRealSearchAds();');
write('rizq_search.html', search);

// ── rizq_listing.html ──
let listing = read('rizq_listing.html');
listing = replaceArrayBlock(listing, 'ALL_ADS_DATA', '[]');
listing = listing.replace(/\+22234567800/g, '');
write('rizq_listing.html', listing);

// ── rizq_profile.html ──
let profile = read('rizq_profile.html');
profile = replaceArrayBlock(profile, 'ADS', '[]');
profile = profile.replace(/sellerId\s*=\s*'profile_demo'/g, "sellerId = ''");
write('rizq_profile.html', profile);

// ── rizq_admin.html ──
let admin = read('rizq_admin.html');
admin = replaceArrayBlock(admin, 'USERS_DATA', '[]');
admin = replaceArrayBlock(admin, 'ADS_DATA_ADMIN', '[]');
admin = replaceArrayBlock(admin, 'REPORTS_DATA', '[]');
admin = replaceArrayBlock(admin, 'PAYMENTS_DATA', '[]');
write('rizq_admin.html', admin);

// ── rizq_products.html ──
let products = read('rizq_products.html');
products = replaceArrayBlock(products, 'allProducts', '[]');
write('rizq_products.html', products);

// ── rizq_corp.html ──
let corp = read('rizq_corp.html');
corp = replaceVarArray(corp, 'CORP_DEMO_ITEMS');
write('rizq_corp.html', corp);

// ── rizq_store.html ──
let store = read('rizq_store.html');
store = replaceObjectBlock(store, 'STORE_FEATURED_PRODUCTS');
write('rizq_store.html', store);

// ── dashboards ──
let dash = read('rizq_dashboard.html');
dash = replaceArrayBlock(dash, 'DEMO_ADS', '[]');
dash = dash.replace(
  /const IS_DEMO = params\.get\('demo'\) === '1' \|\| !params\.toString\(\);/,
  "const IS_DEMO = params.get('demo') === '1';"
);
dash = dash.replace(
  /const DEMO_ACCOUNT = \{[\s\S]*?\};/,
  'const DEMO_ACCOUNT = { id: "demo", name: "", phone: "", email: "", wilaya: "" };'
);
write('rizq_dashboard.html', dash);

let dashStore = read('rizq_dashboard_store.html');
dashStore = replaceArrayBlock(dashStore, 'DEMO_PRODUCTS', '[]');
dashStore = replaceArrayBlock(dashStore, 'DEMO_MESSAGES', '[]');
dashStore = dashStore.replace(
  /const IS_DEMO = params\.get\('demo'\) === '1' \|\| !params\.toString\(\);/,
  "const IS_DEMO = params.get('demo') === '1';"
);
dashStore = dashStore.replace(
  /const DEMO_ACCOUNT = \{[\s\S]*?\};/,
  'const DEMO_ACCOUNT = { id: "demo", name: "", phone: "", email: "", wilaya: "", type: "store" };'
);
write('rizq_dashboard_store.html', dashStore);

let dashOffice = read('rizq_dashboard_office.html');
dashOffice = replaceArrayBlock(dashOffice, 'DEMO_SERVICES', '[]');
dashOffice = replaceArrayBlock(dashOffice, 'DEMO_REQS', '[]');
dashOffice = dashOffice.replace(
  /const IS_DEMO = params\.get\('demo'\) === '1' \|\| !params\.toString\(\);/,
  "const IS_DEMO = params.get('demo') === '1';"
);
dashOffice = dashOffice.replace(
  /const DEMO_ACC = \{[\s\S]*?\};/,
  'const DEMO_ACC = { id: "demo", name: "", phone: "", email: "", wilaya: "", type: "office" };'
);
write('rizq_dashboard_office.html', dashOffice);

let dashCorp = read('rizq_dashboard_corp.html');
dashCorp = dashCorp.replace(
  /var DEMO_ACC = \{[\s\S]*?\};/,
  'var DEMO_ACC = { id: "demo-corp-001", name: "", phone: "", email: "", wilaya: "", type: "corp" };'
);
write('rizq_dashboard_corp.html', dashCorp);

// ── rizq_ai_prompts.js ──
let prompts = read('rizq_ai_prompts.js');
prompts = prompts.replace(
  /const DEMO_PROFILES = \{[\s\S]*?\};\s*\n/,
  'const DEMO_PROFILES = {};\n\n'
);
prompts = prompts.replace(
  'DEMO_PROFILES[businessId] || DEMO_PROFILES.women_store_demo',
  'DEMO_PROFILES[businessId] || null'
);
write('rizq_ai_prompts.js', prompts);

// ── rizq_subscriber_agent.js ──
let subAgent = read('rizq_subscriber_agent.js');
subAgent = subAgent.replace(
  /function loadDemoSubscribers\(\) \{[\s\S]*?\}/,
  'function loadDemoSubscribers() { /* mock subscribers removed — register real accounts via API */ }'
);
write('rizq_subscriber_agent.js', subAgent);

// ── rizq_cart.html promo codes ──
let cart = read('rizq_cart.html');
cart = cart.replace(/const PROMO_CODES\s*=\s*\{[\s\S]*?\};/, 'const PROMO_CODES = {};');
write('rizq_cart.html', cart);

console.log('Mock data cleanup complete.');
