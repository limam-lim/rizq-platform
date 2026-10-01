#!/usr/bin/env node
'use strict';
/**
 * يزرع حسابات ترويجية عامة (محل / مكتب / معرض) + كتالوج صور + يغذي المناقصات/الاستثمارات
 * للاستخدام في فيديو واجهات العرض العامة — ليست لوحات تحكم.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require(path.join(__dirname, '..', 'rizq-backend', 'node_modules', 'sharp'));
const platformStore = require(path.join(__dirname, '..', 'rizq-backend', 'db', 'platformStore'));
const repos = require(path.join(__dirname, '..', 'rizq-backend', 'db', 'repos'));

const ROOT = path.join(__dirname, '..');
const CAT_UP = path.join(ROOT, 'rizq-backend', 'uploads', 'catalog');
const ACC_UP = path.join(ROOT, 'rizq-backend', 'uploads', 'accounts');
fs.mkdirSync(CAT_UP, { recursive: true });
fs.mkdirSync(ACC_UP, { recursive: true });

const NOW = new Date().toISOString();

async function makeCard(file, bg, title, price) {
  const safeTitle = String(title).replace(/[<>&]/g, '');
  const safePrice = String(price || '').replace(/[<>&]/g, '');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="#0d1b2a"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <rect x="36" y="36" width="728" height="528" rx="28" fill="rgba(255,255,255,0.08)" stroke="#C9A84C" stroke-width="2"/>
  <text x="400" y="250" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="34" font-weight="700" fill="#E8C96A">${safeTitle}</text>
  <text x="400" y="320" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="28" fill="#ffffff">${safePrice}</text>
  <text x="400" y="420" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.7)">بيانات ترويجية فقط</text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
}

async function makeThumb(file, bg, label, emoji) {
  const safe = String(label).replace(/[<>&]/g, '');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
  <defs>
    <radialGradient id="r" cx="35%" cy="30%" r="75%">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="#0d1b2a"/>
    </radialGradient>
  </defs>
  <rect width="400" height="400" rx="40" fill="url(#r)"/>
  <circle cx="200" cy="150" r="70" fill="rgba(201,168,76,0.18)" stroke="#C9A84C" stroke-width="3"/>
  <text x="200" y="168" text-anchor="middle" font-size="54">${emoji}</text>
  <text x="200" y="280" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="28" font-weight="700" fill="#E8C96A">${safe}</text>
  <text x="200" y="320" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.75)">رزق</text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
}

function token() {
  return crypto.randomBytes(20).toString('hex');
}

async function upsertPromoAccount(def) {
  const thumbFile = path.join(ACC_UP, def.id + '-thumb.png');
  await makeThumb(thumbFile, def.color, def.shortName, def.emoji);
  const thumbUrl = '/uploads/accounts/' + def.id + '-thumb.png';
  const acc = {
    id: def.id,
    type: def.type,
    name: def.name,
    status: 'approved',
    approvedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    accessToken: token(),
    dashToken: 'TK_' + crypto.randomBytes(8).toString('hex').toUpperCase(),
    phone: def.phone,
    email: def.email,
    whatsapp: def.whatsapp,
    city: 'نواكشوط',
    address: def.address,
    category: def.category,
    activity: def.activity,
    desc: def.desc,
    tagline: def.tagline,
    thumb: thumbUrl,
    logo_emoji: def.emoji,
    suspended: false,
    packageStatus: 'active',
    packageExpiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
  };
  platformStore.upsertAccount(acc);
  return { acc, thumbUrl };
}

async function addCatalog(accountId, kind, items) {
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const id = 'CAT_PROMO_' + String(accountId).replace(/\W/g, '').slice(-10) + '_' + (i + 1);
    const dir = path.join(CAT_UP, id);
    fs.mkdirSync(dir, { recursive: true });
    await makeCard(path.join(dir, '1.png'), it.color, it.name, (it.price ? it.price + ' MRU' : ''));
    const url = '/uploads/catalog/' + id + '/1.png';
    const rec = {
      id,
      accountId,
      kind,
      name: it.name,
      nameFr: it.nameFr || '',
      price: String(it.price || ''),
      cat: it.cat || '',
      desc: it.desc || (it.name + ' — بيانات ترويجية فقط'),
      descFr: '',
      images: [url],
      image: url,
      emoji: it.emoji || '📦',
      status: 'active',
      sold: 0,
      createdAt: NOW,
      updatedAt: NOW,
    };
    platformStore.upsertCatalogItem(rec);
    out.push(rec);
  }
  return out;
}

(async () => {
  const store = await upsertPromoAccount({
    id: 'acc_promo_store_rizq',
    type: 'store',
    name: 'محل رزق',
    shortName: 'محل رزق',
    emoji: '🏪',
    color: '#1B3A6B',
    phone: '44112233',
    email: 'promo.store@rizq.demo',
    whatsapp: '+22244112233',
    address: 'نواكشوط — تفرغ زينة',
    category: 'إلكترونيات',
    activity: 'بيع إلكترونيات وإكسسوارات',
    desc: 'هواتف، حواسيب، وإكسسوارات أصلية — واجهة ترويجية على رزق',
    tagline: 'بضاعتك في واجهة أنيقة',
  });

  const office = await upsertPromoAccount({
    id: 'acc_promo_office_rizq',
    type: 'office',
    name: 'مكتب رزق للاستشارات',
    shortName: 'مكتب رزق',
    emoji: '🛡️',
    color: '#0e7490',
    phone: '44223344',
    email: 'promo.office@rizq.demo',
    whatsapp: '+22244223344',
    address: 'نواكشوط — كصر',
    category: 'استشارات أعمال',
    activity: 'خدمات مكتبية واستشارية',
    desc: 'استشارات قانونية، محاسبية، وتسويقية — بيانات ترويجية فقط',
    tagline: 'خدمات مكتبك على رزق',
  });

  const corp = await upsertPromoAccount({
    id: 'acc_promo_corp_rizq',
    type: 'corp',
    name: 'معرض رزق',
    shortName: 'معرض رزق',
    emoji: '🏬',
    color: '#2f4a1f',
    phone: '44334455',
    email: 'promo.corp@rizq.demo',
    whatsapp: '+22244334455',
    address: 'نواكشوط — دار النعيم',
    category: 'سيارات وعقارات',
    activity: 'معرض سيارات وعقارات',
    desc: 'سيارات وعقارات مختارة — واجهة معرض ترويجية على رزق',
    tagline: 'معرضك بواجهة كاملة',
  });

  const storeItems = await addCatalog(store.acc.id, 'product', [
    { name: 'آيفون 14 برو', price: '185000', cat: 'هواتف', emoji: '📱', color: '#1a365d' },
    { name: 'سماعات AirPods Pro', price: '22000', cat: 'إكسسوارات', emoji: '🎧', color: '#123456' },
    { name: 'لابتوب Dell XPS', price: '125000', cat: 'حواسيب', emoji: '💻', color: '#2c3e50' },
    { name: 'شاشة Samsung 55"', price: '78000', cat: 'شاشات', emoji: '📺', color: '#243b55' },
    { name: 'شاحن سريع 65W', price: '3500', cat: 'إكسسوارات', emoji: '🔌', color: '#234567' },
    { name: 'ساعة ذكية', price: '16000', cat: 'إكسسوارات', emoji: '⌚', color: '#3a2a1a' },
  ]);

  const officeItems = await addCatalog(office.acc.id, 'service', [
    { name: 'استشارة قانونية', price: '15000', cat: 'قانون', emoji: '⚖️', color: '#0e7490', desc: 'جلسة استشارة أولية — ترويجي' },
    { name: 'محاسبة شهرية', price: '25000', cat: 'محاسبة', emoji: '📊', color: '#134e4a', desc: 'متابعة حسابات شهرية — ترويجي' },
    { name: 'خطة تسويق رقمي', price: '40000', cat: 'تسويق', emoji: '📣', color: '#1e3a5f', desc: 'خطة محتوى وإعلانات — ترويجي' },
    { name: 'تأسيس شركة', price: '60000', cat: 'قانون', emoji: '🏢', color: '#312e81', desc: 'مرافقة إجراءات التأسيس — ترويجي' },
  ]);

  const corpItems = await addCatalog(corp.acc.id, 'product', [
    { name: 'تويوتا كورولا 2021', price: '4500000', cat: 'سيارات', emoji: '🚗', color: '#1f4e3d' },
    { name: 'هيونداي توسان 2022', price: '5800000', cat: 'سيارات', emoji: '🚙', color: '#1a3a2a' },
    { name: 'قطعة أرض تفرغ زينة', price: '15000000', cat: 'عقارات', emoji: '🏞️', color: '#3a2a1a' },
    { name: 'شقة 3 غرف لكصر', price: '9200000', cat: 'عقارات', emoji: '🏠', color: '#2a1a3a' },
  ]);

  // غرفة المناقصات — صفوف ترويجية ظاهرة للزائر
  const tenders = platformStore.readTenders().filter((t) => !String(t.id || '').startsWith('TND_PROMO_'));
  const promoTenders = [
    {
      id: 'TND_PROMO_001',
      title: 'توريد أجهزة حاسوب للمدارس',
      titleFr: 'Fourniture d’ordinateurs',
      desc: 'مناقصة ترويجية — بيانات ترويجية فقط',
      category: 'توريد',
      city: 'نواكشوط',
      wilaya: 'نواكشوط',
      budget: '3200000',
      status: 'open',
      deadline: new Date(Date.now() + 20 * 86400000).toISOString(),
      createdAt: NOW,
      ownerId: 'acc_promo_office_rizq',
      ownerName: 'جهة ترويجية',
    },
    {
      id: 'TND_PROMO_002',
      title: 'صيانة أسطول سيارات',
      titleFr: 'Maintenance de flotte',
      desc: 'مناقصة ترويجية — بيانات ترويجية فقط',
      category: 'خدمات',
      city: 'نواذيبو',
      wilaya: 'نواذيبو',
      budget: '1800000',
      status: 'open',
      deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      ownerId: 'acc_promo_corp_rizq',
      ownerName: 'جهة ترويجية',
    },
    {
      id: 'TND_PROMO_003',
      title: 'تجهيز مكتب إداري',
      titleFr: 'Équipement de bureau',
      desc: 'مناقصة ترويجية — بيانات ترويجية فقط',
      category: 'أثاث',
      city: 'كيفة',
      wilaya: 'كيفة',
      budget: '950000',
      status: 'open',
      deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      ownerId: 'acc_promo_store_rizq',
      ownerName: 'جهة ترويجية',
    },
  ];
  platformStore.writeTenders(tenders.concat(promoTenders));

  // غرفة الاستثمارات
  ['INV_PROMO_001', 'INV_PROMO_002', 'INV_PROMO_003'].forEach((id, i) => {
    repos.upsertInvestment({
      id,
      title: ['مشروع متجر حيوي', 'استثمار عقاري صغير', 'وحدة تصنيع خفيفة'][i],
      titleFr: ['Boutique urbaine', 'Petit immobilier', 'Atelier léger'][i],
      sector: ['تجارة', 'عقارات', 'صناعة'][i],
      wilaya: 'نواكشوط',
      city: 'نواكشوط',
      stage: ['فكرة', 'تشغيل', 'توسعة'][i],
      summary: 'فرصة ترويجية — بيانات ترويجية فقط',
      description: 'فرصة ترويجية — بيانات ترويجية فقط',
      capital: ['800000 MRU', '2500000 MRU', '1200000 MRU'][i],
      status: 'approved',
      publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    });
  });

  console.log(JSON.stringify({
    ok: true,
    storeId: store.acc.id,
    officeId: office.acc.id,
    corpId: corp.acc.id,
    catalog: {
      store: storeItems.length,
      office: officeItems.length,
      corp: corpItems.length,
    },
    thumbs: {
      store: store.thumbUrl,
      office: office.thumbUrl,
      corp: corp.thumbUrl,
    },
  }, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
