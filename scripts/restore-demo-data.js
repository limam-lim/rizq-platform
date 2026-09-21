#!/usr/bin/env node
'use strict';
/**
 * Restores local showcase/demo data (ads, tenders, investments).
 * Safe for Cloud Agent / local demo — does not wipe accounts.
 *
 *   node scripts/restore-demo-data.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA = path.join(__dirname, '..', 'rizq-backend', 'data');
fs.mkdirSync(DATA, { recursive: true });

function read(file, fb) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8')); }
  catch (e) { return fb; }
}
function write(file, data) {
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(data, null, 2), 'utf8');
}

const now = new Date().toISOString();
const deadline = new Date(Date.now() + 21 * 864e5).toISOString();
const accounts = read('accounts.json', []);
const store = accounts.find((a) => a.type === 'store' && a.status === 'approved') || { id: 'acc_demo_store_1', name: 'متجر النجمة' };
const indiv = accounts.find((a) => a.type === 'individual' && a.status === 'approved') || store;
const corp = accounts.find((a) => a.type === 'corp') || store;

let ads = read('ads.json', []);
ads.forEach((a) => {
  if (a.status === 'pending') { a.status = 'active'; a.approvedAt = now; }
});
const extras = [
  { id: 'RZQ-2026-22001', title: 'شقة 3 غرف للكراء — تفرغ زينة', desc: 'تشطيب ممتاز، تكييف، موقف سيارات', price: '150000', category: 'عقارات', emoji: '🏠', wilaya: 'نواكشوط', accountId: corp.id },
  { id: 'RZQ-2026-22002', title: 'Toyota Hilux 2022', desc: 'ديزل 4WD ممشى 45000 كم', price: '8000000', category: 'سيارات', emoji: '🚗', wilaya: 'نواذيبو', accountId: indiv.id },
  { id: 'RZQ-2026-22003', title: 'إبل أصيلة — 5 رؤوس', desc: 'من أدرار مع شهادة بيطرية', price: '1200000', category: 'ماشية', emoji: '🐪', wilaya: 'أطار', accountId: indiv.id },
  { id: 'RZQ-2026-22004', title: 'دراعة رجالية فاخرة', desc: 'خياطة موريتانية تقليدية', price: '8500', category: 'أزياء', emoji: '👕', wilaya: 'نواكشوط', accountId: store.id },
  { id: 'RZQ-2026-22005', title: 'وظيفة محاسب — دوام كامل', desc: 'خبرة سنتين، راتب مجزي', price: '0', category: 'وظائف', emoji: '💼', wilaya: 'نواكشوط', accountId: corp.id },
  { id: 'RZQ-2026-22006', title: 'أسمنت وحديد للبناء', desc: 'كميات جملة وتجزئة', price: '4500', category: 'بناء', emoji: '🧱', wilaya: 'نواكشوط', accountId: store.id },
];
const ids = new Set(ads.map((a) => a.id));
extras.forEach((e) => {
  if (ids.has(e.id)) return;
  ads.push(Object.assign({ status: 'active', images: [], createdAt: now, updatedAt: now, views: 80, contacts: 5 }, e));
});
if (!ads.length) {
  ads = extras.map((e) => Object.assign({ status: 'active', images: [], createdAt: now, updatedAt: now }, e));
}
write('ads.json', ads);

write('tenders.json', [
  { id: 'TND_DEMO_001', title: 'توريد 50 مكتباً إدارياً', titleFr: 'Fourniture de 50 bureaux', desc: 'توريد مكاتب خشبية', descFr: 'Fourniture de bureaux en bois', category: 'توريد', budget: '2500000', wilaya: 'نواكشوط', status: 'open', deadline, ownerId: corp.id, ownerName: corp.name || 'جهة رسمية', ownerPhone: corp.phone || '44000000', ownerEmail: corp.email || 'demo@rizq.mr', images: [], bids: [], createdAt: now, publishedAt: now },
  { id: 'TND_DEMO_002', title: 'خدمات صيانة مكيفات — 12 شهراً', titleFr: 'Maintenance climatiseurs', desc: 'عقد صيانة سنوي', descFr: 'Contrat annuel', category: 'خدمات', budget: '900000', wilaya: 'نواكشوط', status: 'open', deadline, ownerId: corp.id, ownerName: corp.name || 'جهة رسمية', ownerPhone: corp.phone || '44000000', ownerEmail: corp.email || 'demo@rizq.mr', images: [], bids: [], createdAt: now, publishedAt: now },
  { id: 'TND_DEMO_003', title: 'طباعة كتيبات ومواد توعوية', titleFr: 'Impression de brochures', desc: 'طباعة 5000 كتيب', descFr: '5000 brochures', category: 'طباعة', budget: '350000', wilaya: 'نواذيبو', status: 'open', deadline, ownerId: corp.id, ownerName: corp.name || 'جهة رسمية', ownerPhone: corp.phone || '44000000', ownerEmail: corp.email || 'demo@rizq.mr', images: [], bids: [], createdAt: now, publishedAt: now },
]);

write('investments.json', {
  updatedAt: now,
  opportunities: [
    { id: 'INV_DEMO_001', title: 'مشروع متجر إلكترونيات في نواكشوط', titleFr: 'Boutique électronique', sector: 'تجارة', sectorFr: 'commerce', capital: '1500000 MRU', stage: 'تشغيل', stageFr: 'Opérationnel', description: 'محل يبحث عن شريك توسعة', descriptionFr: 'Boutique cherchant un partenaire', city: 'نواكشوط', status: 'approved', lang: 'ar', contactName: 'محمد', contactPhone: '44112233', contactEmail: 'invest-demo@rizq.mr', images: [], createdAt: now, approvedAt: now, tier: 'green' },
    { id: 'INV_DEMO_002', title: 'مزرعة دواجن شبه صناعية', titleFr: 'Ferme avicole', sector: 'زراعة', sectorFr: 'agriculture', capital: '4000000 MRU', stage: 'تأسيس', stageFr: 'Création', description: 'فرصة قرب روصو', descriptionFr: 'Opportunité près de Rosso', city: 'روصو', status: 'approved', lang: 'ar', contactName: 'أحمد', contactPhone: '44223344', contactEmail: 'farm-demo@rizq.mr', images: [], createdAt: now, approvedAt: now, tier: 'yellow' },
    { id: 'INV_DEMO_003', title: 'منصة خدمات لوجستية', titleFr: 'Services logistiques', sector: 'خدمات', sectorFr: 'services', capital: '2500000 MRU', stage: 'نمو', stageFr: 'Croissance', description: 'توسيع أسطول شحن', descriptionFr: 'Expansion flotte', city: 'نواذيبو', status: 'approved', lang: 'ar', contactName: 'فاطمة', contactPhone: '44334455', contactEmail: 'logistics-demo@rizq.mr', images: [], createdAt: now, approvedAt: now, tier: 'green' },
  ],
});

console.log(JSON.stringify({
  ads: ads.length,
  activeAds: ads.filter((a) => a.status === 'active').length,
  tenders: 3,
  investments: 3,
}, null, 2));
