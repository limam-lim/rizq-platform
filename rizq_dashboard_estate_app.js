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
    { icon: '🏠', title: 'عقاراتي', tip: 'إدارة العقارات والمواصفات', panel: 'properties', ok: true },
    { icon: '📩', title: 'طلبات معاينة', tip: 'استفسارات المشترين والمستأجرين', panel: 'requests', ok: true },
    { icon: '📋', title: 'مناقصات', tip: 'مناقصات وفرص عقارية', panel: 'tenders', ok: true },
    { icon: '🕐', title: 'ساعات عمل', tip: 'جدول الفتح والإغلاق', panel: 'hours', ok: true },
    { icon: '📸', title: 'معرض صور', tip: 'صور وخطط أرضية', panel: 'photos', ok: true },
    { icon: '🎁', title: 'إحالة', tip: 'دعوة الأصدقاء', panel: 'referral', ok: true },
    { icon: '🛡️', title: 'موثّق⁺', tip: 'شارة الثقة', panel: 'verifiedplus', ok: true },
    { icon: '🏦', title: 'طرق دفع', tip: 'حسابات التحويل', panel: 'mypayments', ok: true },
    { icon: '💳', title: 'اشتراكي', tip: 'الباقة وحدود العقارات', panel: 'subscription', ok: true }
  ];
  root.innerHTML = tiles.map(function (t) {
    if (window.RizqDashUI && typeof RizqDashUI.buildSvcTile === 'function') {
      return RizqDashUI.buildSvcTile({
        icon: t.icon, label: t.title, tip: t.tip, avail: !!t.ok, action: t.panel
      });
    }
    return '<div class="svc-tile" onclick="showPanel(\'' + t.panel + '\',null)">' +
      '<div class="svc-tile__badge ok">متاح</div>' +
      '<div class="svc-tile__icon">' + t.icon + '</div>' +
      '<div class="svc-tile__label">' + escapeHtml(t.title) + '</div>' +
      '<div class="svc-tile__tip">' + escapeHtml(t.tip) + '</div>' +
      '<div class="svc-tile__dot"></div></div>';
  }).join('');
  try { if (window.RizqDashUI && RizqDashUI.refreshPackageWidget) RizqDashUI.refreshPackageWidget(); } catch (eSC) {}
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
  document.getElementById('pf-photos').value = (existing && existing.photos) ? existing.photos.join(', ') : '';
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
    var photos = document.getElementById('pf-photos').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
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
  document.getElementById('ph-cover').value = ACCOUNT.cover || '';
  document.getElementById('ph-gallery').value = Array.isArray(ACCOUNT.gallery) ? ACCOUNT.gallery.join(', ') : (ACCOUNT.gallery || '');
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
  ACCOUNT.cover = document.getElementById('ph-cover').value.trim();
  ACCOUNT.gallery = document.getElementById('ph-gallery').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
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
  if (p == null || p === '' || Number.isNaN(Number(p))) {
    return '<span class="price-pending">السعر قريباً</span>';
  }
  return '<strong style="font-size:18px;color:#1B3A6B">' + Number(p).toLocaleString('ar-MR') + '</strong> <span style="font-size:12px;color:#64748b">MRU</span>';
}

function renderPackages() {
  var st = subStatus();
  var lim = listingLimit();
  var cur = document.getElementById('sub-current');
  if (cur) {
    cur.innerHTML = 'الحالة: ' + escapeHtml(st.status || '—') +
      ' · الباقة: ' + escapeHtml(st.pkg || st.package || '—') +
      (st.daysLeft != null ? ' · الأيام: ' + st.daysLeft : '') +
      '<br>حد العقارات النشطة: ' + (lim.limit === Infinity ? 'غير محدود' : lim.limit) +
      ' · المستخدم: ' + lim.used;
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
    var name = (window.RizqPackagesConfig && RizqPackagesConfig.packageDisplayName)
      ? RizqPackagesConfig.packageDisplayName(pkg.id, 'ar')
      : (pkg.name_ar || pkg.name || pkg.id);
    var feats = pkg.features || [];
    return '<div class="pkg-card' + (pkg.highlight ? ' highlight' : '') + '">' +
      '<h3>' + escapeHtml(name) + '</h3>' +
      '<div style="margin:8px 0 4px">' + fmtPrice(pkg.pricePending ? null : pkg.price) + '</div>' +
      '<div style="font-size:12px;color:#64748b;font-weight:700">' + (pkg.durationDays || 30) + ' يوماً · حتى ' +
      (pkg.maxCatalogItems === Infinity ? '∞' : (pkg.maxCatalogItems || '—')) + ' عقار</div>' +
      '<ul>' + feats.map(function (f) { return '<li>' + escapeHtml(f) + '</li>'; }).join('') + '</ul>' +
      '<button type="button" class="btn btn-gold btn-sm" style="margin-top:12px;width:100%" data-pkg="' + escapeAttr(pkg.id) + '">طلب تفعيل</button>' +
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
  if (!window.RIZQ_BACKEND_BASE) {
    toast('الخادم غير متصل', 'error');
    return;
  }
  var base = window.RIZQ_BACKEND_BASE.replace(/\/$/, '');
  var tok = (CTX && CTX.accessToken) || window.REAL_ACCESS_TOKEN || '';
  fetch(base + '/api/sub-requests', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { 'x-account-token': tok } : {}),
    body: JSON.stringify({
      accountId: ACCOUNT.id,
      category: 'estate',
      packageId: pkgId,
      note: 'طلب باقة عقارات من لوحة التحكم'
    })
  }).then(function (r) { return r.json().catch(function () { return null; }); })
    .then(function (d) {
      if (d && (d.ok || d.id)) toast('تم إرسال طلب الباقة للإدارة', 'ok');
      else toast((d && d.error) || 'تعذّر إرسال الطلب — تواصل مع الإدارة', 'error');
    }).catch(function () { toast('خطأ شبكة', 'error'); });
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
