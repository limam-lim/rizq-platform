#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require(path.join(__dirname, '..', 'rizq-backend', 'node_modules', 'sharp'));

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'rizq-backend', 'data');
const ADS_UP = path.join(ROOT, 'rizq-backend', 'uploads', 'ads');
const CAT_UP = path.join(ROOT, 'rizq-backend', 'uploads', 'catalog');
fs.mkdirSync(ADS_UP, { recursive: true });
fs.mkdirSync(CAT_UP, { recursive: true });

async function makeImg(file, bg, title, price) {
  const safeTitle = String(title).replace(/[<>&]/g, '');
  const safePrice = String(price).replace(/[<>&]/g, '');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="#0d1b2a"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <rect x="40" y="40" width="720" height="520" rx="28" fill="rgba(255,255,255,0.08)" stroke="#C9A84C" stroke-width="2"/>
  <text x="400" y="250" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="36" font-weight="700" fill="#E8C96A">${safeTitle}</text>
  <text x="400" y="330" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="32" fill="#ffffff">${safePrice}</text>
  <text x="400" y="420" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.7)">Rizq</text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
}

(async () => {
  const accounts = JSON.parse(fs.readFileSync(path.join(DATA, 'accounts.json'), 'utf8'));
  const store = accounts.find((a) => a.type === 'store' && a.status === 'approved');
  const individual = accounts.find((a) => a.type === 'individual' && a.status === 'approved');
  const corp = accounts.find((a) => a.type === 'corp');
  if (!store || !individual) throw new Error('missing approved store/individual');

  store.name = 'محل الأصيل للإلكترونيات';
  store.city = 'نواكشوط';
  store.category = 'إلكترونيات';
  store.activity = 'إلكترونيات';
  store.desc = 'هواتف، حواسيب، وإكسسوارات أصلية بأسعار مناسبة';

  if (corp) {
    corp.status = 'approved';
    corp.approvedAt = new Date().toISOString();
    corp.dashToken = corp.dashToken || ('TK_' + crypto.randomBytes(8).toString('hex').toUpperCase());
    corp.name = 'معرض الريادة';
    corp.city = 'نواكشوط';
    corp.category = 'سيارات';
    corp.activity = 'بيع سيارات جديدة';
    corp.desc = 'سيارات وعقارات متميزة — ضمان معتمد';
    corp.tagline = 'سيارات وعقارات متميزة';
    corp.address = 'نواكشوط — حي الكفاح';
    corp.phone = '44556677';
    corp.whatsapp = '+22244556677';
  }
  fs.writeFileSync(path.join(DATA, 'accounts.json'), JSON.stringify(accounts, null, 2));

  const products = [
    { id: 'RZQ-2026-21001', title: 'آيفون 14 برو 256GB', price: '185000', cat: 'electronics', emoji: '📱', wilaya: 'نواكشوط', color: '#1a365d', accountId: store.id },
    { id: 'RZQ-2026-21002', title: 'طقم صالون 7 مقاعد', price: '95000', cat: 'furniture', emoji: '🛋️', wilaya: 'نواكشوط', color: '#5b3a29', accountId: individual.id },
    { id: 'RZQ-2026-21003', title: 'تويوتا كورولا 2020', price: '4200000', cat: 'vehicles', emoji: '🚗', wilaya: 'نواكشوط', color: '#1f4e3d', accountId: corp ? corp.id : store.id },
    { id: 'RZQ-2026-21004', title: 'ثلاجة LG 450 لتر', price: '48000', cat: 'electronics', emoji: '🧊', wilaya: 'نواذيبو', color: '#243b55', accountId: store.id },
    { id: 'RZQ-2026-21005', title: 'لابتوب Dell XPS 15', price: '125000', cat: 'electronics', emoji: '💻', wilaya: 'نواكشوط', color: '#2c3e50', accountId: store.id },
    { id: 'RZQ-2026-21006', title: 'دراجة نارية Yamaha 125', price: '320000', cat: 'vehicles', emoji: '🏍️', wilaya: 'كيفة', color: '#3d1f1f', accountId: individual.id },
  ];

  const ads = [];
  for (const p of products) {
    const dir = path.join(ADS_UP, p.id);
    fs.mkdirSync(dir, { recursive: true });
    const imgPath = path.join(dir, '1.png');
    await makeImg(imgPath, p.color, p.title, p.price + ' MRU');
    ads.push({
      id: p.id,
      title: p.title,
      desc: p.title + ' — حالة ممتازة، متوفر للمعاينة.',
      price: p.price,
      category: p.cat,
      categoryLabel: p.cat,
      emoji: p.emoji,
      wilaya: p.wilaya,
      condition: 'مستعمل نظيف',
      negotiable: true,
      urgent: false,
      images: ['/uploads/ads/' + p.id + '/1.png'],
      seller_trust_score: 80,
      accountId: p.accountId,
      status: 'active',
      date: new Date().toLocaleDateString('ar'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  fs.writeFileSync(path.join(DATA, 'ads.json'), JSON.stringify(ads, null, 2));

  const catalog = [];
  async function addCatalog(accountId, kind, items) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const id = 'CAT_' + String(accountId).slice(-6) + '_' + (i + 1);
      const dir = path.join(CAT_UP, id);
      fs.mkdirSync(dir, { recursive: true });
      await makeImg(path.join(dir, '1.png'), it.color, it.name, it.price + ' MRU');
      const url = '/uploads/catalog/' + id + '/1.png';
      catalog.push({
        id, accountId, kind,
        name: it.name, price: it.price, cat: it.cat, desc: it.name + ' متوفر الآن',
        images: [url], image: url, emoji: it.emoji,
        status: 'active', sold: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  await addCatalog(store.id, 'product', [
    { name: 'سماعات AirPods Pro', price: '22000', cat: 'إكسسوارات', emoji: '🎧', color: '#123456' },
    { name: 'شاحن سريع 65W', price: '3500', cat: 'إكسسوارات', emoji: '🔌', color: '#234567' },
    { name: 'هاتف Samsung A54', price: '65000', cat: 'هواتف', emoji: '📱', color: '#345678' },
    { name: 'تابلت Lenovo', price: '42000', cat: 'أجهزة', emoji: '📲', color: '#456789' },
  ]);
  if (corp) {
    await addCatalog(corp.id, 'product', [
      { name: 'هيونداي توسان 2022', price: '5800000', cat: 'سيارات', emoji: '🚗', color: '#1a3a2a' },
      { name: 'مرسيدس C200', price: '7200000', cat: 'سيارات', emoji: '🚘', color: '#2a1a3a' },
      { name: 'قطعة أرض تفرغ زينة', price: '15000000', cat: 'عقارات', emoji: '🏞️', color: '#3a2a1a' },
    ]);
  }

  fs.writeFileSync(path.join(DATA, 'catalog.json'), JSON.stringify(catalog, null, 2));
  console.log(JSON.stringify({
    ads: ads.length,
    catalog: catalog.length,
    storeId: store.id,
    corpId: corp && corp.id,
  }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
