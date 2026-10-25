/**
 * SEO ديناميكي — sitemap.xml حي + معاينة Open Graph للقوائم
 */
'use strict';

const express = require('express');

let _deps = {
  readAds: () => [],
  readAccounts: () => [],
  publicOrigin: () => 'https://rizq.mr',
};

function configureSeoRoutes(deps) {
  if (deps) _deps = Object.assign({}, _deps, deps);
}

function escXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function origin() {
  try {
    return String(_deps.publicOrigin()).replace(/\/$/, '');
  } catch (e) {
    return 'https://rizq.mr';
  }
}

function urlEntry(loc, lastmod, changefreq, priority) {
  return (
    '  <url>\n' +
    '    <loc>' + escXml(loc) + '</loc>\n' +
    (lastmod ? '    <lastmod>' + escXml(lastmod.slice(0, 10)) + '</lastmod>\n' : '') +
    (changefreq ? '    <changefreq>' + changefreq + '</changefreq>\n' : '') +
    (priority != null ? '    <priority>' + priority + '</priority>\n' : '') +
    '  </url>\n'
  );
}

function buildSitemapXml() {
  const base = origin();
  const staticPages = [
    ['/', '1.0', 'daily'],
    ['/rizq_landing_v8.html', '1.0', 'daily'],
    ['/rizq_browse.html', '0.9', 'daily'],
    ['/rizq_directory.html', '0.8', 'daily'],
    ['/rizq_store.html', '0.8', 'daily'],
    ['/rizq_office.html', '0.7', 'weekly'],
    ['/rizq_corp.html', '0.7', 'weekly'],
    ['/rizq_estate.html', '0.8', 'daily'],
    ['/rizq_tenders.html', '0.7', 'daily'],
    ['/rizq_investments.html', '0.7', 'weekly'],
    ['/rizq_legal.html', '0.3', 'monthly'],
  ];
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  const today = new Date().toISOString();
  staticPages.forEach(([path, pri, freq]) => {
    xml += urlEntry(base + path, today, freq, pri);
  });

  const ads = (typeof _deps.readAds === 'function' ? _deps.readAds() : []) || [];
  ads.slice(0, 5000).forEach((ad) => {
    if (!ad || !ad.id) return;
    if (ad.status && ad.status !== 'approved' && ad.status !== 'active' && ad.status !== 'published') {
      if (ad.hidden || ad.status === 'rejected' || ad.status === 'pending') return;
    }
    const loc = base + '/rizq_browse.html?id=' + encodeURIComponent(ad.id);
    xml += urlEntry(loc, ad.updatedAt || ad.createdAt || today, 'weekly', '0.6');
  });

  const accounts = ((typeof _deps.readAccounts === 'function' ? _deps.readAccounts() : []) || [])
    .filter((a) => a && a.status === 'approved' && !a.suspended);
  accounts.slice(0, 3000).forEach((a) => {
    const page = ({
      store: 'rizq_store.html',
      office: 'rizq_office.html',
      corp: 'rizq_corp.html',
      estate: 'rizq_estate.html',
      individual: 'rizq_profile.html',
    })[a.type] || 'rizq_directory.html';
    xml += urlEntry(
      base + '/' + page + '?id=' + encodeURIComponent(a.id),
      a.updatedAt || a.approvedAt || today,
      'weekly',
      '0.65'
    );
  });

  xml += '</urlset>\n';
  return xml;
}

function findListing(id) {
  const ads = (typeof _deps.readAds === 'function' ? _deps.readAds() : []) || [];
  const ad = ads.find((a) => a && String(a.id) === String(id));
  if (ad) {
    return {
      kind: 'ad',
      id: ad.id,
      title: ad.title || ad.titleAr || 'إعلان على رزق',
      description: String(ad.desc || ad.description || '').slice(0, 220),
      image: ad.thumb || ad.image || (Array.isArray(ad.images) ? ad.images[0] : '') || (origin() + '/rizq-mark-512.png'),
      url: origin() + '/rizq_browse.html?id=' + encodeURIComponent(ad.id),
      price: ad.price || '',
    };
  }
  const accounts = (typeof _deps.readAccounts === 'function' ? _deps.readAccounts() : []) || [];
  const acc = accounts.find((a) => a && String(a.id) === String(id));
  if (acc) {
    const page = ({
      store: 'rizq_store.html',
      office: 'rizq_office.html',
      corp: 'rizq_corp.html',
      estate: 'rizq_estate.html',
      individual: 'rizq_profile.html',
    })[acc.type] || 'rizq_directory.html';
    return {
      kind: 'account',
      id: acc.id,
      title: acc.name || 'حساب على رزق',
      description: String(acc.desc || acc.tagline || '').slice(0, 220),
      image: acc.thumb || acc.cover || (origin() + '/rizq-mark-512.png'),
      url: origin() + '/' + page + '?id=' + encodeURIComponent(acc.id),
      price: '',
    };
  }
  return null;
}

function mountSeoRoutes(app) {
  app.get('/sitemap.xml', (req, res) => {
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    res.send(buildSitemapXml());
  });

  app.get('/api/seo/sitemap.json', (req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ ok: true, bytes: Buffer.byteLength(buildSitemapXml(), 'utf8') });
  });

  app.get('/api/seo/og/:id', (req, res) => {
    const item = findListing(req.params.id);
    if (!item) return res.status(404).json({ ok: false, error: 'not_found' });
    res.json({ ok: true, og: item });
  });

  /** صفحة HTML خفيفة لمعاينة الشبكات الاجتماعية عند مشاركة الرابط */
  app.get('/og/:id', (req, res) => {
    const item = findListing(req.params.id);
    if (!item) return res.status(404).send('Not found');
    const title = escXml(item.title);
    const desc = escXml(item.description || 'رزق — منصة التجارة الموريتانية');
    const image = escXml(item.image);
    const url = escXml(item.url);
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(
      '<!DOCTYPE html><html lang="ar" dir="rtl"><head>' +
      '<meta charset="utf-8"/>' +
      '<title>' + title + ' | رزق</title>' +
      '<meta name="description" content="' + desc + '"/>' +
      '<meta property="og:type" content="website"/>' +
      '<meta property="og:title" content="' + title + '"/>' +
      '<meta property="og:description" content="' + desc + '"/>' +
      '<meta property="og:image" content="' + image + '"/>' +
      '<meta property="og:url" content="' + url + '"/>' +
      '<meta name="twitter:card" content="summary_large_image"/>' +
      '<link rel="canonical" href="' + url + '"/>' +
      '<meta http-equiv="refresh" content="0;url=' + url + '"/>' +
      '</head><body style="font-family:Cairo,sans-serif;padding:24px;background:#0a1628;color:#E8C96A">' +
      '<p>جاري التحويل إلى <a style="color:#E8C96A" href="' + url + '">' + title + '</a>…</p>' +
      '</body></html>'
    );
  });
}

module.exports = { mountSeoRoutes, configureSeoRoutes, buildSitemapXml };
