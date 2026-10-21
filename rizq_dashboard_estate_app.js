/* rizq_dashboard_estate_app.js — لوحة عقارات بهوية منصة رزق (بدون وكيل ذكي) */
if (window.RizqDash && RizqDash.purgeSensitiveTokensFromStorage) {
  try { RizqDash.purgeSensitiveTokensFromStorage(); RizqDash.stripUrlToken(); } catch (e0) {}
}

var ACCOUNT = null;
var CTX = null;
var SESSION_ID = '';
var SESSION_TOKEN = '';
var IS_DEMO = false;
var PROPS = [];
var INQS = [];
var HOURS = {};
var STORE_KEY = '';
var _payPkg = null;
var _payFile = null;
var _propPhotosDraft = [];
var _agencyGalleryDraft = [];
var MAX_LISTING_PHOTO_BYTES = 1.5 * 1024 * 1024;
var MAX_PROP_PHOTOS = 6;
var MAX_AGENCY_GALLERY = 8;

function _estIsFr() {
  try {
    if (document.documentElement.lang && /^fr/i.test(document.documentElement.lang)) return true;
    if (document.body && document.body.classList.contains('rizq-lang-fr')) return true;
    if (window.RizqI18n && typeof RizqI18n.getLang === 'function' && /^fr/i.test(String(RizqI18n.getLang() || ''))) return true;
    if (localStorage.getItem('rizq_lang') === 'fr') return true;
  } catch (e) {}
  return false;
}
function _t2(ar, fr) { return _estIsFr() ? (fr || ar) : ar; }

var PANEL_TITLES = {
  overview: _t2('📊 نظرة عامة', '📊 Aperçu'),
  requests: _t2('📩 طلبات المعاينة', '📩 Demandes de visite'),
  properties: _t2('🏠 عقاراتي', '🏠 Mes biens'),
  tenders: _t2('📋 المناقصات', '📋 Appels d\'offres'),
  profile: _t2('🏢 معلومات الوكالة', '🏢 Infos agence'),
  hours: _t2('🕐 ساعات العمل', '🕐 Horaires'),
  photos: _t2('📸 معرض الصور', '📸 Galerie'),
  subscription: _t2('💳 اشتراكي', '💳 Abonnement'),
  referral: _t2('🎁 إحالة الأصدقاء', '🎁 Parrainage'),
  verifiedplus: _t2('🛡️ شارة موثّق⁺', '🛡️ Badge Vérifié⁺'),
  mypayments: _t2('🏦 طرق الدفع', '🏦 Paiements'),
  settings: _t2('⚙️ الإعدادات', '⚙️ Paramètres')
};
var DAYS = [
  { id: 'sat', ar: _t2('السبت', 'Sam') }, { id: 'sun', ar: _t2('الأحد', 'Dim') }, { id: 'mon', ar: _t2('الإثنين', 'Lun') },
  { id: 'tue', ar: _t2('الثلاثاء', 'Mar') }, { id: 'wed', ar: _t2('الأربعاء', 'Mer') }, { id: 'thu', ar: _t2('الخميس', 'Jeu') },
  { id: 'fri', ar: _t2('الجمعة', 'Ven') }
];

function escapeHtml(s) {
  return (window.RizqDash && RizqDash.escapeHtml) ? RizqDash.escapeHtml(s) : String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escapeAttr(s) {
  return (window.RizqDash && RizqDash.escapeAttr) ? RizqDash.escapeAttr(s) : escapeHtml(s);
}
function toast(msg, type) {
  if (typeof showToast === 'function') showToast(msg, type || 'ok');
}

/** يمنع خلط FR داخل واجهة AR (والعكس): يضبط dir/lang ويحدّث عناوين الشريط */
function applyEstateLangShell() {
  var fr = _estIsFr();
  try {
    document.documentElement.lang = fr ? 'fr' : 'ar';
    document.documentElement.dir = fr ? 'ltr' : 'rtl';
    document.body.classList.toggle('rizq-lang-fr', fr);
    document.body.classList.toggle('rizq-lang-ar', !fr);
  } catch (e) {}
  var map = {
    overview: PANEL_TITLES.overview,
    requests: PANEL_TITLES.requests,
    properties: PANEL_TITLES.properties,
    tenders: PANEL_TITLES.tenders,
    profile: PANEL_TITLES.profile,
    hours: PANEL_TITLES.hours,
    photos: PANEL_TITLES.photos,
    subscription: PANEL_TITLES.subscription,
    referral: PANEL_TITLES.referral,
    verifiedplus: PANEL_TITLES.verifiedplus,
    mypayments: PANEL_TITLES.mypayments,
    settings: PANEL_TITLES.settings
  };
  document.querySelectorAll('.sb-item[onclick]').forEach(function (el) {
    var m = String(el.getAttribute('onclick') || '').match(/showPanel\('([^']+)'/);
    if (!m || !map[m[1]]) return;
    var spans = el.querySelectorAll('span');
    var label = null;
    for (var i = 0; i < spans.length; i++) {
      if (!spans[i].classList.contains('sb-icon') && !spans[i].classList.contains('sb-badge')) {
        label = spans[i];
        break;
      }
    }
    if (!label) return;
    var full = map[m[1]];
    var space = full.indexOf(' ');
    label.textContent = space > 0 ? full.slice(space + 1) : full;
  });
  var logout = document.querySelector('.sb-logout span:not(.sb-icon)');
  if (logout) logout.textContent = _t2('تسجيل الخروج', 'Déconnexion');
}

function toggleSidebar() {
  var sb = document.getElementById('sidebar');
  var ov = document.getElementById('sb-overlay');
  if (!sb) return;
  sb.classList.toggle('open');
  if (ov) ov.classList.toggle('open');
}

function showPanel(id, el) {
  document.querySelectorAll('.panel').forEach(function (p) {
    p.classList.toggle('active', p.id === 'panel-' + id);
  });
  document.querySelectorAll('.sb-item').forEach(function (n) { n.classList.remove('active'); });
  if (el && el.classList) el.classList.add('active');
  else {
    var match = document.querySelector('.sb-item[onclick*="\'' + id + '\'"]');
    if (match) match.classList.add('active');
  }
  var tb = document.getElementById('topbar-title');
  if (tb) tb.textContent = PANEL_TITLES[id] || id;
  if (id === 'subscription') renderPackages();
  if (id === 'referral') renderReferral();
  if (id === 'verifiedplus') renderVerifiedPlus();
  if (id === 'mypayments') renderPayments();
  if (id === 'tenders') renderTenders();
  if (window.innerWidth < 900) {
    var sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('open');
  }
}

function logout() {
  try {
    if (window.RizqAccount && RizqAccount.clearSession) RizqAccount.clearSession();
  } catch (e) {}
  location.href = 'rizq_real_estate_register.html';
}

function publicUrl() {
  if (!ACCOUNT || !ACCOUNT.id) return 'rizq_estate.html';
  return 'rizq_estate.html?id=' + encodeURIComponent(ACCOUNT.id);
}

function previewMyPage() { window.open(publicUrl(), '_blank'); }

function openShareModal() {
  var inp = document.getElementById('share-link-input');
  var abs = location.origin + '/' + publicUrl();
  if (inp) inp.value = abs;
  var m = document.getElementById('share-modal');
  if (m) m.classList.add('open');
}
function closeShareModal() {
  var m = document.getElementById('share-modal');
  if (m) m.classList.remove('open');
}
function copyShareLink() {
  var inp = document.getElementById('share-link-input');
  if (!inp || !inp.value) return;
  navigator.clipboard.writeText(inp.value).then(function () { toast('تم نسخ الرابط', 'ok'); }).catch(function () {});
}
function shareWhatsApp() {
  var inp = document.getElementById('share-link-input');
  var link = (inp && inp.value) || publicUrl();
  window.open('https://wa.me/?text=' + encodeURIComponent('شاهد وكالتنا على منصة رزق: ' + link), '_blank');
}

function loadLocal() {
  STORE_KEY = 'rizq_estate_listings_' + (ACCOUNT && ACCOUNT.id ? ACCOUNT.id : 'demo');
  try {
    var raw = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    PROPS = Array.isArray(raw) ? raw : [];
  } catch (e) { PROPS = []; }
  try {
    var iq = JSON.parse(localStorage.getItem('rizq_estate_inquiries_' + (ACCOUNT && ACCOUNT.id)) || '[]');
    INQS = Array.isArray(iq) ? iq : [];
  } catch (e2) { INQS = []; }
  try {
    HOURS = JSON.parse(localStorage.getItem('rizq_estate_hours_' + (ACCOUNT && ACCOUNT.id)) || '{}') || {};
  } catch (e3) { HOURS = {}; }
}

function saveLocal() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(PROPS)); } catch (e) {}
}

function listingLimit() {
  if (!ACCOUNT || typeof RizqSub === 'undefined' || !RizqSub.checkPostLimit) {
    return { allowed: true, limit: 3, used: PROPS.length, remaining: Math.max(0, 3 - PROPS.length) };
  }
  return RizqSub.checkPostLimit(ACCOUNT.id, 'estate', PROPS.filter(function (p) { return p.status !== 'archived'; }).length);
}

function subStatus() {
  if (IS_DEMO) return { status: 'demo', pkg: 'تجريبي', daysLeft: 10 };
  if (typeof RizqSub === 'undefined' || !ACCOUNT) return { status: 'no_subscription' };
  try { return RizqSub.checkSubscription(ACCOUNT.id) || { status: 'no_subscription' }; } catch (e) { return { status: 'no_subscription' }; }
}

function renderSidebarMeta() {
  var name = (ACCOUNT && (ACCOUNT.name || ACCOUNT.owner)) || 'وكالة عقارية';
  var el = document.getElementById('sb-estate-name');
  if (el) el.textContent = name;
  var wb = document.getElementById('wb-name');
  if (wb) wb.textContent = name;
  var av = document.getElementById('sb-av');
  if (av) {
    var letter = String(name).trim().charAt(0) || 'ع';
    av.innerHTML = '<span class="av-letter">' + escapeHtml(letter) + '</span>';
  }
  var st = subStatus();
  var subText = document.getElementById('sb-sub-text');
  var dot = document.getElementById('sb-sub-dot');
  var plan = document.getElementById('wb-plan-badge');
  var statusBadge = document.getElementById('wb-status-badge');
  var label = st.pkg || st.package || st.status || 'بدون اشتراك';
  if (subText) subText.textContent = label;
  if (plan) plan.textContent = label;
  if (dot) {
    dot.className = 'sub-dot';
    if (st.status === 'expired' || st.status === 'no_subscription') dot.classList.add('exp');
    else if (st.status === 'expiring_soon' || st.status === 'trial_expiring') dot.classList.add('warn');
  }
  if (statusBadge) {
    if (st.status === 'expired' || st.status === 'no_subscription') {
      statusBadge.style.color = '#fca5a5';
      statusBadge.textContent = '● منتهٍ / مجاني';
    } else if (st.status === 'trial' || st.status === 'demo') {
      statusBadge.textContent = '● تجريبي';
    } else {
      statusBadge.textContent = '● نشط';
    }
  }
  var badge = document.getElementById('sb-type-badge');
  if (badge) {
    var map = {
      agency: _t2('مكتب / وكالة', 'Agence'),
      developer: _t2('مطور عقاري', 'Promoteur'),
      owner: _t2('مالك فردي', 'Propriétaire')
    };
    badge.textContent = map[(ACCOUNT && ACCOUNT.estateSubType) || 'agency'] || _t2('وكالة عقارية', 'Agence immobilière');
  }
}

function renderOverview() {
  var active = PROPS.filter(function (p) { return p.status !== 'archived'; }).length;
  var views = PROPS.reduce(function (s, p) { return s + (Number(p.views) || 0); }, 0);
  var st = subStatus();
  var stats = document.getElementById('ov-stats');
  if (stats) {
    stats.innerHTML =
      '<div class="stat-card" style="--accent:#1B3A6B"><div class="stat-val">' + PROPS.length + '</div><div class="stat-label">إجمالي العقارات</div></div>' +
      '<div class="stat-card" style="--accent:#C9A84C"><div class="stat-val">' + active + '</div><div class="stat-label">نشطة</div></div>' +
      '<div class="stat-card" style="--accent:#6366f1"><div class="stat-val">' + INQS.length + '</div><div class="stat-label">طلبات معاينة</div></div>' +
      '<div class="stat-card" style="--accent:#16a34a"><div class="stat-val">' + views + '</div><div class="stat-label">مشاهدات</div></div>';
  }
  var ovReq = document.getElementById('ov-requests');
  if (ovReq) {
    if (!INQS.length) ovReq.innerHTML = '<p style="color:var(--text-muted);font-size:12.5px">لا طلبات بعد.</p>';
    else ovReq.innerHTML = INQS.slice(0, 3).map(function (q) {
      return '<div class="req-item"><div class="req-name">' + escapeHtml(q.name || 'عميل') + '</div><div class="req-meta">' + escapeHtml(q.kind || 'معاينة') + ' · ' + escapeHtml(q.phone || '') + '</div></div>';
    }).join('');
  }
  var ovSub = document.getElementById('ov-sub');
  if (ovSub) {
    ovSub.innerHTML = '<div style="font-size:13px;line-height:1.8">' +
      '<div><strong>الحالة:</strong> ' + escapeHtml(st.status || '—') + '</div>' +
      '<div><strong>الباقة:</strong> ' + escapeHtml(st.pkg || st.package || '—') + '</div>' +
      (st.daysLeft != null ? '<div><strong>الأيام المتبقية:</strong> ' + st.daysLeft + '</div>' : '') +
      '</div>';
  }
  renderServicesShowcase();
  var badge = document.getElementById('req-badge');
  var notif = document.getElementById('notif-count');
  var n = INQS.length;
  if (badge) { badge.textContent = n; badge.style.display = n ? '' : 'none'; }
  if (notif) { notif.textContent = n; notif.style.display = n ? 'flex' : 'none'; }
}

function renderServicesShowcase() {
  var root = document.getElementById('services-showcase');
  if (!root) return;
  var tiles = [
    { title: 'عقاراتي', panel: 'properties', ok: true },
    { title: 'طلبات معاينة', panel: 'requests', ok: true },
    { title: 'مناقصات', panel: 'tenders', ok: true },
    { title: 'إحالة', panel: 'referral', ok: true },
    { title: 'موثّق⁺', panel: 'verifiedplus', ok: true },
    { title: 'طرق دفع', panel: 'mypayments', ok: true },
    { title: 'ساعات عمل', panel: 'hours', ok: true },
    { title: 'معرض صور', panel: 'photos', ok: true }
  ];
  root.innerHTML = tiles.map(function (t) {
    return '<div onclick="showPanel(\'' + t.panel + '\',null)" style="background:#fff;border:2px solid rgba(27,58,107,.12);border-radius:14px;padding:14px 10px;text-align:center;cursor:pointer">' +
      '<div style="font-size:13px;font-weight:800;color:#1B3A6B">' + escapeHtml(t.title) + '</div>' +
      '<div style="font-size:11px;color:#16a34a;margin-top:6px;font-weight:700">متاح</div></div>';
  }).join('');
}

function renderRequests() {
  var el = document.getElementById('requests-list');
  if (!el) return;
  if (!INQS.length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:12.5px">لا طلبات معاينة بعد. ستظهر هنا استفسارات المشترين والمستأجرين.</p>';
    return;
  }
  el.innerHTML = INQS.map(function (q) {
    return '<div class="req-item"><div class="req-name">' + escapeHtml(q.name || 'عميل') + '</div>' +
      '<div class="req-meta">' + escapeHtml(q.kind || 'استفسار') + ' · ' + escapeHtml(q.phone || '') + '</div>' +
      '<div class="req-meta">' + escapeHtml(q.message || '') + '</div></div>';
  }).join('');
}

function dealLabel(d) {
  return d === 'sale' ? 'بيع' : (d === 'daily' ? 'يومي/موسمي' : 'إيجار');
}

function renderProps() {
  var lim = listingLimit();
  var hint = document.getElementById('prop-limit-hint');
  if (hint) {
    hint.textContent = lim.limit === Infinity
      ? '(بلا حد في باقتك)'
      : '(المستخدم ' + lim.used + ' / الحد ' + lim.limit + ')';
  }
  var list = document.getElementById('prop-list');
  if (!list) return;
  if (!PROPS.length) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:12.5px">لا عقارات بعد — أضف أول عقار من الزر الذهبي.</p>';
    return;
  }
  list.innerHTML = PROPS.map(function (p, i) {
    var photo = (p.photos && p.photos[0]) || '';
    return '<div class="prop-card">' +
      (photo ? '<img class="prop-thumb" src="' + escapeAttr(photo) + '" alt=""/>' : '<div class="prop-thumb ph">🏠</div>') +
      '<div><div class="prop-title">' + escapeHtml(p.title) + '</div>' +
      '<div class="prop-meta">' + escapeHtml(dealLabel(p.deal)) + ' · ' + escapeHtml(p.type) + ' · ' + escapeHtml(p.city || '') + (p.zone ? ' — ' + escapeHtml(p.zone) : '') + '</div>' +
      '<div class="prop-price">' + escapeHtml(String(p.price || '')) + ' MRU</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:6px">' +
      '<button type="button" class="btn btn-outline btn-sm" data-edit="' + i + '">تعديل</button>' +
      '<button type="button" class="btn btn-danger btn-sm" data-del="' + i + '">حذف</button>' +
      '</div></div>';
  }).join('');
  list.querySelectorAll('[data-edit]').forEach(function (b) {
    b.addEventListener('click', function () { openPropForm(PROPS[Number(b.getAttribute('data-edit'))]); });
  });
  list.querySelectorAll('[data-del]').forEach(function (b) {
    b.addEventListener('click', function () {
      PROPS.splice(Number(b.getAttribute('data-del')), 1);
      saveLocal();
      renderAll();
      toast('تم الحذف', 'ok');
    });
  });
}

function openPropForm(existing) {
  var lim = listingLimit();
  if (!existing && !lim.allowed) {
    toast(lim.msg || 'وصلت لحد الباقة — رقِّ اشتراكك', 'error');
    showPanel('subscription', null);
    return;
  }
  showPanel('properties', null);
  var card = document.getElementById('prop-form-card');
  if (card) card.style.display = '';
  document.getElementById('prop-form-title').textContent = existing ? 'تعديل عقار' : '➕ إضافة عقار';
  document.getElementById('pf-id').value = existing ? existing.id : '';
  document.getElementById('pf-type').value = (existing && existing.type) || 'apartment';
  document.getElementById('pf-deal').value = (existing && existing.deal) || 'sale';
  document.getElementById('pf-title').value = (existing && existing.title) || '';
  document.getElementById('pf-price').value = (existing && existing.price) || '';
  document.getElementById('pf-area').value = (existing && existing.area) || 120;
  document.getElementById('pf-rooms').value = (existing && existing.rooms) || 3;
  document.getElementById('pf-baths').value = (existing && existing.baths) || 2;
  document.getElementById('pf-floor').value = (existing && existing.floor) || '';
  document.getElementById('pf-finish').value = (existing && existing.finish) || 'جيد';
  document.getElementById('pf-city').value = (existing && existing.city) || (ACCOUNT && ACCOUNT.city) || '';
  document.getElementById('pf-zone').value = (existing && existing.zone) || '';
  document.getElementById('pf-desc').value = (existing && existing.desc) || '';
  _propPhotosDraft = (existing && Array.isArray(existing.photos)) ? existing.photos.slice() : [];
  renderPropPhotosPreview();
  var fp = document.getElementById('pf-floorplan');
  if (fp) fp.value = (existing && existing.floorplan) || '';
  renderFloorplanPreview();
  document.getElementById('pf-media').value = (existing && existing.media) || '';
  document.getElementById('pf-map').value = (existing && existing.map) || '';
  var am = (existing && existing.amenities) || [];
  document.querySelectorAll('.pf-amen').forEach(function (c) { c.checked = am.indexOf(c.value) !== -1; });
}
function closePropForm() {
  var card = document.getElementById('prop-form-card');
  if (card) card.style.display = 'none';
}

function bindPropForm() {
  var form = document.getElementById('prop-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var id = document.getElementById('pf-id').value || ('est_' + Date.now());
    var photos = _propPhotosDraft.slice(0, MAX_PROP_PHOTOS);
    var floorplanEl = document.getElementById('pf-floorplan');
    var amenities = [];
    document.querySelectorAll('.pf-amen:checked').forEach(function (c) { amenities.push(c.value); });
    var row = {
      id: id,
      type: document.getElementById('pf-type').value,
      deal: document.getElementById('pf-deal').value,
      title: document.getElementById('pf-title').value.trim(),
      price: document.getElementById('pf-price').value.trim(),
      area: Number(document.getElementById('pf-area').value) || 0,
      rooms: Number(document.getElementById('pf-rooms').value) || 0,
      baths: Number(document.getElementById('pf-baths').value) || 0,
      floor: document.getElementById('pf-floor').value.trim(),
      finish: document.getElementById('pf-finish').value,
      city: document.getElementById('pf-city').value.trim(),
      zone: document.getElementById('pf-zone').value.trim(),
      desc: document.getElementById('pf-desc').value.trim(),
      photos: photos,
      floorplan: floorplanEl ? floorplanEl.value : '',
      media: document.getElementById('pf-media').value.trim(),
      map: document.getElementById('pf-map').value.trim(),
      amenities: amenities,
      status: 'active',
      views: 0,
      updatedAt: new Date().toISOString()
    };
    var idx = PROPS.findIndex(function (p) { return p.id === id; });
    if (idx < 0) {
      var lim = listingLimit();
      if (!lim.allowed) { toast(lim.msg || 'حد الباقة', 'error'); return; }
      PROPS.unshift(row);
    } else {
      row.views = PROPS[idx].views || 0;
      PROPS[idx] = row;
    }
    saveLocal();
    syncPropToCatalog(row);
    closePropForm();
    renderAll();
    toast('تم حفظ العقار', 'ok');
  });
}

function syncPropToCatalog(row) {
  if (!CTX || !CTX.accessToken || !window.RIZQ_BACKEND_BASE || !ACCOUNT || IS_DEMO) return;
  var base = window.RIZQ_BACKEND_BASE.replace(/\/$/, '');
  fetch(base + '/api/catalog', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, RizqDash.authHeaders(CTX.accessToken)),
    body: JSON.stringify({
      accountId: ACCOUNT.id,
      kind: 'product',
      title: row.title,
      price: row.price,
      desc: row.desc,
      category: 'عقارات',
      city: row.city,
      meta: {
        estate: true,
        propertyType: row.type,
        deal: row.deal,
        area: row.area,
        rooms: row.rooms,
        baths: row.baths,
        floor: row.floor,
        finish: row.finish,
        zone: row.zone,
        amenities: row.amenities,
        map: row.map,
        media: row.media,
        localId: row.id
      },
      images: row.photos
    })
  }).catch(function () {});
}

function renderHours() {
  var root = document.getElementById('hours-grid');
  if (!root) return;
  root.innerHTML = DAYS.map(function (d) {
    var h = HOURS[d.id] || { open: '09:00', close: '18:00', off: false };
    return '<div class="form-grid" style="margin-bottom:10px;align-items:end">' +
      '<div class="form-group"><label class="form-label">' + d.ar + '</label>' +
      '<label style="display:flex;gap:8px;align-items:center;font-size:12px;font-weight:700"><input type="checkbox" data-day="' + d.id + '" class="h-off"' + (h.off ? ' checked' : '') + '/> مغلق</label></div>' +
      '<div class="form-group"><label class="form-label">من</label><input class="form-input h-open" data-day="' + d.id + '" value="' + escapeAttr(h.open || '09:00') + '"/></div>' +
      '<div class="form-group"><label class="form-label">إلى</label><input class="form-input h-close" data-day="' + d.id + '" value="' + escapeAttr(h.close || '18:00') + '"/></div>' +
      '</div>';
  }).join('');
}

function saveHours() {
  DAYS.forEach(function (d) {
    var off = document.querySelector('.h-off[data-day="' + d.id + '"]');
    var open = document.querySelector('.h-open[data-day="' + d.id + '"]');
    var close = document.querySelector('.h-close[data-day="' + d.id + '"]');
    HOURS[d.id] = {
      off: !!(off && off.checked),
      open: open ? open.value : '09:00',
      close: close ? close.value : '18:00'
    };
  });
  try { localStorage.setItem('rizq_estate_hours_' + (ACCOUNT && ACCOUNT.id), JSON.stringify(HOURS)); } catch (e) {}
  toast('تم حفظ ساعات العمل', 'ok');
}

function fillProfile() {
  if (!ACCOUNT) return;
  document.getElementById('p-name').value = ACCOUNT.name || '';
  document.getElementById('p-subtype').value = ACCOUNT.estateSubType || 'agency';
  document.getElementById('p-license').value = ACCOUNT.licenseNumber || '';
  document.getElementById('p-city').value = ACCOUNT.city || '';
  document.getElementById('p-focus').value = ACCOUNT.focusAreas || '';
  document.getElementById('p-phone').value = ACCOUNT.phone || '';
  document.getElementById('p-whatsapp').value = ACCOUNT.whatsapp || ACCOUNT.phone || '';
  document.getElementById('p-desc').value = ACCOUNT.desc || '';
  document.getElementById('p-video').value = ACCOUNT.promo_video || '';
  var coverEl = document.getElementById('ph-cover');
  if (coverEl) coverEl.value = ACCOUNT.cover || '';
  _agencyGalleryDraft = Array.isArray(ACCOUNT.gallery) ? ACCOUNT.gallery.slice() : [];
  renderAgencyCoverPreview();
  renderAgencyGalleryPreview();
}

function saveProfile() {
  if (!ACCOUNT) return;
  ACCOUNT.name = document.getElementById('p-name').value.trim();
  ACCOUNT.estateSubType = document.getElementById('p-subtype').value;
  ACCOUNT.licenseNumber = document.getElementById('p-license').value.trim();
  ACCOUNT.city = document.getElementById('p-city').value.trim();
  ACCOUNT.focusAreas = document.getElementById('p-focus').value.trim();
  ACCOUNT.phone = document.getElementById('p-phone').value.trim();
  ACCOUNT.whatsapp = document.getElementById('p-whatsapp').value.trim();
  ACCOUNT.desc = document.getElementById('p-desc').value.trim();
  ACCOUNT.promo_video = document.getElementById('p-video').value.trim();
  persistAccountLocal();
  patchAccountRemote({
    name: ACCOUNT.name,
    city: ACCOUNT.city,
    desc: ACCOUNT.desc,
    phone: ACCOUNT.phone,
    whatsapp: ACCOUNT.whatsapp,
    promo_video: ACCOUNT.promo_video,
    licenseNumber: ACCOUNT.licenseNumber,
    focusAreas: ACCOUNT.focusAreas,
    estateSubType: ACCOUNT.estateSubType
  });
  renderSidebarMeta();
  toast('تم حفظ الملف', 'ok');
}

function savePhotos() {
  if (!ACCOUNT) return;
  var coverEl = document.getElementById('ph-cover');
  ACCOUNT.cover = coverEl ? coverEl.value.trim() : (ACCOUNT.cover || '');
  ACCOUNT.gallery = _agencyGalleryDraft.slice(0, MAX_AGENCY_GALLERY);
  persistAccountLocal();
  patchAccountRemote({ cover: ACCOUNT.cover, gallery: ACCOUNT.gallery });
  toast('تم حفظ المعرض', 'ok');
}

function persistAccountLocal() {
  try {
    var list = JSON.parse(localStorage.getItem('rizq_pending_accounts') || '[]');
    var i = list.findIndex(function (a) { return a && a.id === ACCOUNT.id; });
    if (i >= 0) {
      var clean = Object.assign({}, list[i], ACCOUNT);
      delete clean.accessToken;
      delete clean.backendAccessToken;
      list[i] = clean;
      localStorage.setItem('rizq_pending_accounts', JSON.stringify(list));
    }
  } catch (e) {}
}

function patchAccountRemote(body) {
  if (!CTX || !CTX.accessToken || !window.RIZQ_BACKEND_BASE || !ACCOUNT || IS_DEMO) return;
  var base = window.RIZQ_BACKEND_BASE.replace(/\/$/, '');
  fetch(base + '/api/accounts/mine/' + encodeURIComponent(ACCOUNT.id), {
    method: 'PATCH',
    headers: Object.assign({ 'Content-Type': 'application/json' }, RizqDash.authHeaders(CTX.accessToken)),
    body: JSON.stringify(body)
  }).catch(function () {});
}

function fmtPrice(p) {
  if (window.RizqSub && RizqSub.isPriceUnset && RizqSub.isPriceUnset(p)) {
    return '<span class="price-pending">السعر بانتظار تحديد الإدارة</span>';
  }
  if (window.RizqSub && RizqSub.isExplicitFreePrice && RizqSub.isExplicitFreePrice(p)) {
    return '<strong style="font-size:18px;color:#059669">مجاناً</strong>';
  }
  return '<strong style="font-size:18px;color:#1B3A6B">' + Number(p).toLocaleString('ar-MR') + '</strong> <span style="font-size:12px;color:#64748b">MRU</span>';
}

function renderPackages() {
  var st = subStatus();
  var lim = listingLimit();
  var cur = document.getElementById('sub-current');
  var limLabel = (lim.limit === Infinity) ? 'غير محدود' : (lim.limit != null ? lim.limit : 3);
  if (cur) {
    cur.innerHTML = 'الحالة: ' + escapeHtml(st.status || '—') +
      ' · الباقة: ' + escapeHtml(st.pkg || st.package || '—') +
      (st.daysLeft != null ? ' · الأيام: ' + st.daysLeft : '') +
      '<br>حد العقارات النشطة: ' + limLabel +
      ' · المستخدم: ' + (lim.used != null ? lim.used : PROPS.length);
  }
  var grid = document.getElementById('pkg-grid');
  if (!grid) return;
  var list = [];
  try {
    if (window.RizqPackagesConfig && typeof RizqPackagesConfig.getCatalog === 'function') {
      list = RizqPackagesConfig.getCatalog('estate', 'ar') || [];
    }
  } catch (e) {}
  if (!list.length) {
    grid.innerHTML = '<p style="color:var(--text-muted)">كتالوج الباقات غير متاح حالياً.</p>';
    return;
  }
  grid.innerHTML = list.map(function (pkg) {
    var name = (window.RizqPackagesConfig && RizqPackagesConfig.localizedName)
      ? RizqPackagesConfig.localizedName(pkg, 'ar')
      : (pkg.name_ar || pkg.name || pkg.id);
    var feats = pkg.features || [];
    var maxItems = pkg.maxCatalogItems === Infinity ? '∞' : (pkg.maxCatalogItems != null ? pkg.maxCatalogItems : '—');
    return '<div class="pkg-card' + (pkg.highlight ? ' highlight' : '') + '">' +
      '<h3>' + escapeHtml(name) + '</h3>' +
      '<div style="margin:8px 0 4px">' + fmtPrice(pkg.price) + '</div>' +
      '<div style="font-size:12px;color:#64748b;font-weight:700">' + (pkg.durationDays || 30) + ' يوماً · حتى ' +
      maxItems + ' عقار</div>' +
      '<ul>' + feats.map(function (f) { return '<li>' + escapeHtml(f) + '</li>'; }).join('') + '</ul>' +
      '<button type="button" class="btn btn-gold btn-sm" style="margin-top:12px;width:100%" data-pkg="' + escapeAttr(pkg.id) + '">اشترك / ارفع الوصل</button>' +
      '</div>';
  }).join('');
  grid.querySelectorAll('[data-pkg]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      requestPackage(btn.getAttribute('data-pkg'));
    });
  });
}

function requestPackage(pkgId) {
  if (!ACCOUNT || IS_DEMO) {
    toast('في الوضع التجريبي — سجّل حساباً حقيقياً لطلب الباقة', 'ok');
    return;
  }
  var pkg = null;
  try {
    var list = (window.RizqPackagesConfig && RizqPackagesConfig.getCatalog)
      ? (RizqPackagesConfig.getCatalog('estate', 'ar') || []) : [];
    pkg = list.filter(function (p) { return p && p.id === pkgId; })[0] || null;
  } catch (e) {}
  if (!pkg) {
    toast('الباقة غير موجودة', 'error');
    return;
  }
  var name = (window.RizqPackagesConfig && RizqPackagesConfig.localizedName)
    ? RizqPackagesConfig.localizedName(pkg, 'ar')
    : (pkg.name_ar || pkg.name || pkg.id);
  openPayModal(name, pkg.price, 'package', pkgId);
}

function renderReferral() {
  var inp = document.getElementById('referral-link-input');
  if (inp && ACCOUNT && ACCOUNT.id) {
    inp.value = location.origin + '/rizq_real_estate_register.html?ref=' + encodeURIComponent(ACCOUNT.id);
  }
  var stats = document.getElementById('referral-stats');
  if (stats) stats.innerHTML = '<p style="font-size:12.5px;color:var(--text-muted)">ستظهر إحصاءات الإحالات هنا بعد تفعيل البرنامج على حسابك.</p>';
}

function renderVerifiedPlus() {
  var el = document.getElementById('vplus-status');
  if (!el) return;
  var on = !!(ACCOUNT && ACCOUNT.verifiedPlus);
  el.innerHTML = on
    ? '<div style="padding:12px;border-radius:12px;background:#ecfdf5;color:#065f46;font-weight:800">شارة موثّق⁺ مفعّلة على حسابك.</div>'
    : '<div style="padding:12px;border-radius:12px;background:#fff7ed;color:#9a3412;font-weight:700;line-height:1.7">غير مفعّلة بعد. اطلب التفعيل من الإدارة عبر طلب موثّق⁺ في المنصة.</div>';
}

function renderPayments() {
  var root = document.getElementById('mypayments-root');
  if (!root) return;
  if (typeof RizqAccountPayments !== 'undefined' && ACCOUNT && !IS_DEMO) {
    root.innerHTML = '<div id="estate-pay-mount"></div>';
    try {
      if (typeof RizqAccountPayments.render === 'function') {
        RizqAccountPayments.render('estate-pay-mount', ACCOUNT.id, (CTX && CTX.accessToken) || window.REAL_ACCESS_TOKEN);
      } else if (typeof RizqAccountPayments.mount === 'function') {
        RizqAccountPayments.mount(root, ACCOUNT.id);
      } else {
        root.innerHTML = '<p style="font-size:12.5px;color:var(--text-muted)">أضف Bankily / Masrivi / تحويل بنكي من إعدادات الدفع في المنصة. ستظهر هنا بعد الربط.</p>';
      }
    } catch (e) {
      root.innerHTML = '<p style="font-size:12.5px;color:var(--text-muted)">وحدة طرق الدفع جاهزة للربط مع حسابك.</p>';
    }
  } else {
    root.innerHTML = '<p style="font-size:12.5px;color:var(--text-muted)">طرق الدفع (Bankily، Masrivi، نقداً، تحويل بنكي) تُدار من نفس محرك المنصة بعد تسجيل الدخول الحقيقي.</p>';
  }
}

function renderTenders() {
  var box = document.getElementById('tender-sub-status');
  if (box) {
    box.innerHTML = '<div style="padding:12px;border-radius:12px;background:#f8faff;border:1px solid rgba(27,58,107,.1);font-size:12.5px;color:var(--text-muted);line-height:1.7">غرفة المناقصات موحّدة عبر منصة رزق. افتح الصفحة العامة للمناقصات للنشر أو التقديم.</div>';
  }
  var list = document.getElementById('tenders-mine-list');
  if (list) list.innerHTML = '';
}

function renderAll() {
  renderSidebarMeta();
  renderOverview();
  renderRequests();
  renderProps();
  renderHours();
  fillProfile();
}

/* ── Media helpers (file → compressed data URL) ───────────────────── */
function _readImageAsDataUrl(file, maxBytes, cb) {
  if (!file || !/^image\//.test(file.type || '')) {
    toast('اختر ملف صورة صالح (JPG / PNG / WebP)', 'error');
    return;
  }
  if (file.size > maxBytes) {
    toast('حجم الصورة كبير (الحد 1.5MB) — صغّرها وأعد المحاولة', 'error');
    return;
  }
  var reader = new FileReader();
  reader.onload = function () {
    var src = reader.result;
    var img = new Image();
    img.onload = function () {
      try {
        var maxW = 1600;
        var w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(canvas.toDataURL('image/jpeg', 0.82));
      } catch (e) { cb(src); }
    };
    img.onerror = function () { cb(src); };
    img.src = src;
  };
  reader.onerror = function () { toast('تعذّر قراءة الصورة', 'error'); };
  reader.readAsDataURL(file);
}

function renderPropPhotosPreview() {
  var wrap = document.getElementById('pf-photos-preview');
  var hidden = document.getElementById('pf-photos');
  if (hidden) hidden.value = _propPhotosDraft.join(',');
  if (!wrap) return;
  if (!_propPhotosDraft.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = _propPhotosDraft.map(function (src, i) {
    return '<div style="position:relative;width:72px;height:72px;border-radius:10px;overflow:hidden;border:1px solid rgba(27,58,107,.15)">' +
      '<img src="' + src + '" alt="" style="width:100%;height:100%;object-fit:cover"/>' +
      '<button type="button" onclick="removePropPhoto(' + i + ')" style="position:absolute;top:2px;left:2px;background:#ef4444;color:#fff;border:none;border-radius:6px;width:20px;height:20px;cursor:pointer;font-size:11px">×</button></div>';
  }).join('');
}
function removePropPhoto(i) {
  _propPhotosDraft.splice(i, 1);
  renderPropPhotosPreview();
}
function handlePropPhotosInput(inp) {
  var files = inp && inp.files ? Array.prototype.slice.call(inp.files) : [];
  inp.value = '';
  files.forEach(function (file) {
    if (_propPhotosDraft.length >= MAX_PROP_PHOTOS) {
      toast('وصلت للحد الأقصى: ' + MAX_PROP_PHOTOS + ' صور', 'error');
      return;
    }
    _readImageAsDataUrl(file, MAX_LISTING_PHOTO_BYTES, function (dataUrl) {
      if (_propPhotosDraft.length >= MAX_PROP_PHOTOS) return;
      _propPhotosDraft.push(dataUrl);
      renderPropPhotosPreview();
    });
  });
}
function renderFloorplanPreview() {
  var wrap = document.getElementById('pf-floorplan-preview');
  var el = document.getElementById('pf-floorplan');
  if (!wrap || !el) return;
  if (!el.value) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = '<img src="' + el.value + '" alt="" style="max-height:120px;border-radius:10px;border:1px solid rgba(27,58,107,.12)"/>';
}
function handlePropFloorplanInput(inp) {
  var file = inp && inp.files && inp.files[0];
  inp.value = '';
  if (!file) return;
  _readImageAsDataUrl(file, MAX_LISTING_PHOTO_BYTES, function (dataUrl) {
    var el = document.getElementById('pf-floorplan');
    if (el) el.value = dataUrl;
    renderFloorplanPreview();
  });
}
function renderAgencyCoverPreview() {
  var wrap = document.getElementById('ph-cover-preview');
  var el = document.getElementById('ph-cover');
  if (!wrap || !el) return;
  if (!el.value) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = '<img src="' + el.value + '" alt="" style="max-height:140px;width:100%;object-fit:cover;border-radius:12px;border:1px solid rgba(27,58,107,.12)"/>';
}
function handleAgencyCoverInput(inp) {
  var file = inp && inp.files && inp.files[0];
  inp.value = '';
  if (!file) return;
  _readImageAsDataUrl(file, MAX_LISTING_PHOTO_BYTES, function (dataUrl) {
    var el = document.getElementById('ph-cover');
    if (el) el.value = dataUrl;
    renderAgencyCoverPreview();
  });
}
function renderAgencyGalleryPreview() {
  var wrap = document.getElementById('ph-gallery-preview');
  if (!wrap) return;
  if (!_agencyGalleryDraft.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = _agencyGalleryDraft.map(function (src, i) {
    return '<div style="position:relative;width:72px;height:72px;border-radius:10px;overflow:hidden;border:1px solid rgba(27,58,107,.15)">' +
      '<img src="' + src + '" alt="" style="width:100%;height:100%;object-fit:cover"/>' +
      '<button type="button" onclick="removeAgencyGalleryPhoto(' + i + ')" style="position:absolute;top:2px;left:2px;background:#ef4444;color:#fff;border:none;border-radius:6px;width:20px;height:20px;cursor:pointer;font-size:11px">×</button></div>';
  }).join('');
}
function removeAgencyGalleryPhoto(i) {
  _agencyGalleryDraft.splice(i, 1);
  renderAgencyGalleryPreview();
}
function handleAgencyGalleryInput(inp) {
  var files = inp && inp.files ? Array.prototype.slice.call(inp.files) : [];
  inp.value = '';
  files.forEach(function (file) {
    if (_agencyGalleryDraft.length >= MAX_AGENCY_GALLERY) {
      toast('وصلت للحد الأقصى: ' + MAX_AGENCY_GALLERY + ' صور', 'error');
      return;
    }
    _readImageAsDataUrl(file, MAX_LISTING_PHOTO_BYTES, function (dataUrl) {
      if (_agencyGalleryDraft.length >= MAX_AGENCY_GALLERY) return;
      _agencyGalleryDraft.push(dataUrl);
      renderAgencyGalleryPreview();
    });
  });
}

/* ── Payment receipt modal ────────────────────────────────────────── */
function openPayModal(pkgName, pkgPrice, category, pkgId) {
  _payPkg = { name: pkgName, price: pkgPrice, category: category || 'package', id: pkgId || '' };
  _payFile = null;
  var nameEl = document.getElementById('pay-pkg-name');
  var amtEl = document.getElementById('pay-amount');
  var recName = document.getElementById('pay-receipt-name');
  var recFile = document.getElementById('pay-receipt-file');
  var zone = document.getElementById('pay-upload-zone');
  if (nameEl) nameEl.textContent = pkgName || '';
  if (amtEl) {
    if (window.RizqSub && RizqSub.isPriceUnset && RizqSub.isPriceUnset(pkgPrice)) {
      amtEl.textContent = '—';
    } else if (window.RizqSub && RizqSub.isExplicitFreePrice && RizqSub.isExplicitFreePrice(pkgPrice)) {
      amtEl.textContent = 'مجاناً';
    } else {
      amtEl.textContent = Number(pkgPrice).toLocaleString('ar-MR') + ' MRU';
    }
  }
  if (recName) { recName.style.display = 'none'; recName.textContent = ''; }
  if (recFile) recFile.value = '';
  if (zone) zone.style.borderColor = 'rgba(27,58,107,.2)';

  var codes = [];
  try { codes = JSON.parse(localStorage.getItem('rizq_bank_codes') || '[]').filter(function (b) { return b.active !== false; }); } catch (e) {}
  var el = document.getElementById('pay-banks');
  if (el) {
    if (!codes.length) {
      el.innerHTML = '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:12px;font-size:12.5px;color:#92400e;text-align:center">⚠️ لا توجد طرق دفع ظاهرة — تواصل مع الدعم أو راجع إعدادات الأدمن</div>';
    } else {
      el.innerHTML = codes.map(function (b) {
        return '<div style="background:#f8f9ff;border:1.5px solid #e0e8ff;border-radius:10px;padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">' +
          '<div><div style="font-size:13px;font-weight:700;color:#1B3A6B">' + escapeHtml(b.bank) + '</div>' +
          (b.instruction ? '<div style="font-size:11px;color:#777;margin-top:2px">' + escapeHtml(b.instruction) + '</div>' : '') + '</div>' +
          '<span style="font-family:monospace;font-size:14px;font-weight:700;color:#0f2347;background:#e0e8ff;padding:5px 10px;border-radius:7px;direction:ltr">' + escapeHtml(b.code) + '</span></div>';
      }).join('');
    }
  }

  if (typeof RizqSub !== 'undefined' && typeof RizqSub.configurePayModalFreeMode === 'function') {
    RizqSub.configurePayModalFreeMode(pkgPrice, _estIsFr() ? 'fr' : 'ar');
  }
  var m = document.getElementById('pay-modal');
  if (m) { m.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}
function closePayModal() {
  var m = document.getElementById('pay-modal');
  if (m) m.style.display = 'none';
  document.body.style.overflow = '';
  _payPkg = null;
  _payFile = null;
}
function handlePayReceipt(inp) {
  if (!inp.files || !inp.files[0]) return;
  var f = inp.files[0];
  if (f.size > MAX_LISTING_PHOTO_BYTES) {
    toast('حجم الوصل كبير (الحد 1.5MB)', 'error');
    inp.value = '';
    return;
  }
  _payFile = f;
  var el = document.getElementById('pay-receipt-name');
  if (el) { el.textContent = '✅ ' + f.name; el.style.display = 'block'; }
  var zone = document.getElementById('pay-upload-zone');
  if (zone) zone.style.borderColor = '#059669';
}
function submitPayment() {
  if (!_payPkg) return;
  if (typeof RizqSub === 'undefined' || typeof RizqSub.submitSubscriptionRequest !== 'function') {
    toast('محرك الاشتراك غير محمّل', 'error');
    return;
  }
  if (RizqSub.isPriceUnset && RizqSub.isPriceUnset(_payPkg.price)) {
    toast('السعر غير مضبوط — حدّده السوبر أدمن من لوحة الباقات أولاً', 'error');
    return;
  }
  var isFree = RizqSub.isExplicitFreePrice && RizqSub.isExplicitFreePrice(_payPkg.price);
  if (!isFree && Number(_payPkg.price) > 0 && !_payFile) {
    toast('يرجى رفع صورة وصل الدفع أولاً', 'error');
    return;
  }
  var submitBtn = document.getElementById('pay-submit-btn');
  var prevLabel = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) {
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    submitBtn.textContent = '...جارٍ الإرسال';
  }
  RizqSub.submitSubscriptionRequest({
    file: _payFile,
    pkgName: _payPkg.name,
    price: _payPkg.price,
    accountName: (ACCOUNT && ACCOUNT.name) || 'وكالة عقارية',
    accountId: (ACCOUNT && ACCOUNT.id) || SESSION_ID || '',
    accessToken: (CTX && CTX.accessToken) || window.REAL_ACCESS_TOKEN || '',
    category: 'package'
  }).then(function () {
    closePayModal();
    toast('تم إرسال الطلب — مراجعة الإدارة / المالية / الوكيل خلال 24 ساعة', 'ok');
    renderPackages();
  }).catch(function (err) {
    toast((err && err.msg) || 'تعذّر إرسال الطلب', 'error');
  }).finally(function () {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = prevLabel; }
  });
}
document.getElementById('pay-modal') && document.getElementById('pay-modal').addEventListener('click', function (e) {
  if (e.target === this) closePayModal();
});

function boot() {
  bindPropForm();
  RizqDash.bootstrapDashboard({
    expectedType: 'estate',
    writeRoot: document.getElementById('dash-root'),
    onDenied: function () {
      document.getElementById('app-shell').style.display = 'none';
      var sb = document.getElementById('sidebar');
      if (sb) sb.style.display = 'none';
      RizqDash.showAccessDenied();
    },
    onReady: function (acc, ctx) {
      ACCOUNT = acc;
      CTX = ctx;
      SESSION_ID = acc.id || '';
      SESSION_TOKEN = ctx.sessionToken || '';
      IS_DEMO = !!ctx.isDemo;
      document.getElementById('app-shell').style.display = '';
      var denied = document.getElementById('access-denied');
      if (denied) denied.style.display = 'none';
      if (window.RizqDash && RizqDash.applySubscriptionLock) {
        RizqDash.applySubscriptionLock(acc.id, document.getElementById('dash-root'), { isDemo: IS_DEMO });
      }
      if (typeof RizqSub !== 'undefined' && RizqSub.runLifecycleCheck && !IS_DEMO) {
        try {
          RizqSub.runLifecycleCheck(acc.id, {
            onExpired: function () {},
            onTrial: function () {},
            onActive: function () {},
            onExpiringReminder: function () {},
            onNoSubscription: function () {}
          });
        } catch (e) {}
      }
      applyEstateLangShell();
      loadLocal();
      renderAll();
      showPanel('overview', document.querySelector('.sb-item'));
    }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
