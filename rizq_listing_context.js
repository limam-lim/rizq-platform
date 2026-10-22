/**
 * rizq_listing_context.js
 * Contextual listing creation for business dashboards (store / office / estate / corp).
 * Binds seller identity + marketplace category_id / sub_category_id + dynamic attrs.
 *
 * Depends (optional): RizqMerchantActivities, RizqCategories, RizqDynFilters
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.RizqListingContext = api;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : global, function (global) {
  'use strict';

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _t2(ar, fr, lang) {
    return (lang === 'fr') ? (fr || ar) : ar;
  }

  /** Build seller/storefront context from an account row. */
  function sellerContext(account, opts) {
    account = account || {};
    opts = opts || {};
    var accountId = account.id || opts.accountId || '';
    var accountType = account.type || opts.accountType || '';
    var activityId = account.activityId || opts.activityId || '';
    var spec = null;
    if (global.RizqMerchantActivities && typeof global.RizqMerchantActivities.marketplaceSpecForActivity === 'function') {
      spec = global.RizqMerchantActivities.marketplaceSpecForActivity(activityId);
    }
    var verifiedPlus = !!(account.verifiedPlus || (account.verifiedPlusExpiresAt && new Date(account.verifiedPlusExpiresAt) > new Date()));
    var verified = !!(account.verified || account.nniVerified || account.identityVerified || verifiedPlus);
    return {
      store_id: accountId,
      account_id: accountId,
      account_type: accountType,
      activity_id: activityId,
      store_name: account.name || opts.storeName || '',
      verified: verified,
      verified_plus: verifiedPlus,
      badges: {
        verified: verified,
        verifiedPlus: verifiedPlus,
        trusted: !!(account.trusted || account.trustBadge || account.trustedSeller),
      },
      marketplace: spec,
      listing_source: 'dashboard_catalog',
    };
  }

  function resolveSubcats(categoryId, spec) {
    if (spec && Array.isArray(spec.allowedSubcats) && spec.allowedSubcats.length) {
      return spec.allowedSubcats.slice();
    }
    if (global.RizqCategories && typeof global.RizqCategories.getByKey === 'function') {
      var cat = global.RizqCategories.getByKey(categoryId);
      if (cat && Array.isArray(cat.subcats)) return cat.subcats.slice();
    }
    return [];
  }

  function categoryLabel(categoryId, lang) {
    if (global.RizqCategories && typeof global.RizqCategories.getByKey === 'function') {
      var cat = global.RizqCategories.getByKey(categoryId);
      if (cat) return (lang === 'fr' ? (cat.nameFr || cat.nameAr) : (cat.nameAr || cat.nameFr)) || categoryId;
    }
    return categoryId || '';
  }

  /**
   * Fill category + subcategory selects and optional attrs mount.
   * opts: {
   *   categorySelect, subcatSelect, attrsMount,
   *   activityId | context,
   *   lockCategory?: true,
   *   selectedSubcat?, attrs?,
   *   lang?: 'ar'|'fr',
   *   onChange?: fn
   * }
   */
  function mountSelectors(opts) {
    opts = opts || {};
    var lang = opts.lang || 'ar';
    var ctx = opts.context || sellerContext({ activityId: opts.activityId, type: opts.accountType, id: opts.accountId });
    var spec = ctx.marketplace || (global.RizqMerchantActivities && global.RizqMerchantActivities.marketplaceSpecForActivity
      ? global.RizqMerchantActivities.marketplaceSpecForActivity(ctx.activity_id || opts.activityId)
      : null);
    var categoryId = (opts.categoryId || (spec && spec.categoryId) || '').trim();
    var catEl = typeof opts.categorySelect === 'string'
      ? document.getElementById(opts.categorySelect)
      : opts.categorySelect;
    var subEl = typeof opts.subcatSelect === 'string'
      ? document.getElementById(opts.subcatSelect)
      : opts.subcatSelect;
    var attrsMount = typeof opts.attrsMount === 'string'
      ? document.getElementById(opts.attrsMount)
      : opts.attrsMount;

    if (catEl) {
      var lock = opts.lockCategory !== false;
      var label = categoryLabel(categoryId, lang);
      catEl.innerHTML = '';
      var opt = document.createElement('option');
      opt.value = categoryId;
      opt.textContent = label || _t2('اختر القسم', 'Choisir la catégorie', lang);
      catEl.appendChild(opt);
      catEl.value = categoryId;
      catEl.disabled = !!lock;
      if (lock) catEl.setAttribute('title', _t2('مربوط بنشاط حسابك المسجّل', 'Lié à l\'activité enregistrée', lang));
    }

    function fillSubcats(selected) {
      if (!subEl) return;
      var subs = resolveSubcats(categoryId, spec);
      var preferred = selected || opts.selectedSubcat || (spec && spec.preferredSubcat) || '';
      subEl.innerHTML = '<option value="">' + _esc(_t2('— اختر النوع / الفرع —', '— Choisir le sous-type —', lang)) + '</option>';
      subs.forEach(function (s) {
        var o = document.createElement('option');
        o.value = s;
        o.textContent = s;
        if (s === preferred) o.selected = true;
        subEl.appendChild(o);
      });
      if (preferred && subs.indexOf(preferred) >= 0) subEl.value = preferred;
    }

    fillSubcats(opts.selectedSubcat);

    function refreshAttrs() {
      var sub = subEl ? subEl.value : (opts.selectedSubcat || '');
      renderAttrForm(attrsMount, categoryId, sub, lang, opts.attrs || {});
      if (typeof opts.onChange === 'function') {
        opts.onChange(collectForm({
          categorySelect: catEl,
          subcatSelect: subEl,
          attrsMount: attrsMount,
          context: ctx,
        }));
      }
    }

    if (subEl && !subEl._rizqCtxBound) {
      subEl.addEventListener('change', refreshAttrs);
      subEl._rizqCtxBound = true;
    }
    refreshAttrs();
    return { context: ctx, categoryId: categoryId, spec: spec };
  }

  /** Dynamic specification fields from RizqDynFilters profile (create-form mode). */
  function renderAttrForm(mount, categoryId, subcat, lang, existing) {
    if (!mount) return null;
    existing = existing || {};
    lang = lang || 'ar';
    var fr = lang === 'fr';
    var profile = null;
    if (global.RizqDynFilters && typeof global.RizqDynFilters.profileFor === 'function') {
      profile = global.RizqDynFilters.profileFor(categoryId);
    }
    if (!profile || !Array.isArray(profile.fields) || !profile.fields.length) {
      mount.innerHTML = '';
      mount.style.display = 'none';
      return null;
    }
    var fields = profile.fields.filter(function (f) {
      if (!f.whenSubcat) return true;
      try { return f.whenSubcat.test(String(subcat || '')); } catch (e) { return true; }
    });
    if (!fields.length) {
      mount.innerHTML = '';
      mount.style.display = 'none';
      return profile;
    }
    var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
    fields.forEach(function (f) {
      var label = fr ? (f.labelFr || f.labelAr) : (f.labelAr || f.labelFr);
      var val = existing[f.id];
      if (val == null && f.type === 'num-range') {
        val = existing[f.minKey] != null ? existing[f.minKey] : existing[f.maxKey];
      }
      if (f.type === 'chips') {
        html += '<div class="form-group" style="margin:0"><label class="form-label">' + _esc(label) + '</label>'
          + '<select class="form-input" data-listing-attr="' + _esc(f.id) + '">'
          + '<option value="">—</option>'
          + (f.options || []).map(function (o) {
            var selected = String(val || '') === String(o.v) ? ' selected' : '';
            return '<option value="' + _esc(o.v) + '"' + selected + '>' + _esc(fr ? o.fr : o.ar) + '</option>';
          }).join('')
          + '</select></div>';
      } else if (f.type === 'num-range') {
        html += '<div class="form-group" style="margin:0"><label class="form-label">' + _esc(label)
          + (f.unitAr ? ' <span style="color:#94a3b8;font-weight:500">(' + _esc(fr ? f.unitFr : f.unitAr) + ')</span>' : '')
          + '</label>'
          + '<input class="form-input" type="number" min="0" data-listing-attr="' + _esc(f.id) + '" value="' + _esc(val != null ? val : '') + '" placeholder="0"/></div>';
      } else if (f.type === 'year-range') {
        var yOpts = '';
        var yMax = (new Date()).getFullYear() + 1;
        for (var y = yMax; y >= 1980; y--) {
          yOpts += '<option value="' + y + '"' + (String(val) === String(y) ? ' selected' : '') + '>' + y + '</option>';
        }
        html += '<div class="form-group" style="margin:0"><label class="form-label">' + _esc(label) + '</label>'
          + '<select class="form-input" data-listing-attr="' + _esc(f.id) + '"><option value="">—</option>' + yOpts + '</select></div>';
      } else {
        html += '<div class="form-group" style="margin:0"><label class="form-label">' + _esc(label) + '</label>'
          + '<input class="form-input" data-listing-attr="' + _esc(f.id) + '" value="' + _esc(val != null ? val : '') + '"/></div>';
      }
    });
    html += '</div>';
    mount.innerHTML = html;
    mount.style.display = 'block';
    return profile;
  }

  function collectAttrs(mount) {
    mount = typeof mount === 'string' ? document.getElementById(mount) : mount;
    var out = {};
    if (!mount) return out;
    var nodes = mount.querySelectorAll('[data-listing-attr]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute('data-listing-attr');
      var v = (el.value || '').trim();
      if (key && v !== '') out[key] = v;
    }
    return out;
  }

  function collectForm(opts) {
    opts = opts || {};
    var catEl = typeof opts.categorySelect === 'string' ? document.getElementById(opts.categorySelect) : opts.categorySelect;
    var subEl = typeof opts.subcatSelect === 'string' ? document.getElementById(opts.subcatSelect) : opts.subcatSelect;
    var categoryId = catEl ? String(catEl.value || '').trim() : String(opts.categoryId || '').trim();
    var subcat = subEl ? String(subEl.value || '').trim() : String(opts.selectedSubcat || '').trim();
    var attrs = collectAttrs(opts.attrsMount);
    var ctx = opts.context || null;
    return {
      category_id: categoryId,
      categoryId: categoryId,
      categoryKey: categoryId,
      sub_category_id: subcat,
      subCategoryId: subcat,
      subcat: subcat,
      attrs: attrs,
      context: ctx,
    };
  }

  /**
   * Merge seller context + category form into a catalog/API payload.
   * Ensures products are storefront-bound (not individual ads).
   */
  function enrichPayload(base, ctx, form) {
    base = base || {};
    ctx = ctx || {};
    form = form || {};
    var categoryId = form.categoryId || form.category_id || base.categoryId || '';
    var subcat = form.subcat || form.subCategoryId || form.sub_category_id || base.subcat || '';
    return Object.assign({}, base, {
      accountId: ctx.account_id || base.accountId || '',
      storeId: ctx.store_id || base.storeId || ctx.account_id || '',
      accountType: ctx.account_type || base.accountType || '',
      activityId: ctx.activity_id || base.activityId || '',
      categoryId: categoryId,
      category: categoryId,
      categoryKey: categoryId,
      subCategoryId: subcat,
      subcat: subcat,
      attrs: form.attrs || base.attrs || {},
      listingSource: 'dashboard_catalog',
      sellerContext: {
        storeId: ctx.store_id || ctx.account_id,
        storeName: ctx.store_name || '',
        accountType: ctx.account_type || '',
        badges: ctx.badges || {},
        verified: !!ctx.verified,
        verifiedPlus: !!ctx.verified_plus,
      },
      // Keep legacy cat for storefront topic shelves when topic name is set separately
      cat: base.cat != null ? base.cat : (subcat || categoryId || ''),
    });
  }

  function syncHintHtml(lang) {
    return '<p style="font-size:11px;color:#64748b;margin:6px 0 0;line-height:1.55">'
      + _esc(_t2(
        'يُنشر في كتالوج واجهتك (محل/مكتب/وكالة) وليس كإعلان فردي في التصفح العام. القسم مربوط بنشاطك المسجّل.',
        'Publié dans le catalogue de votre vitrine — pas comme une annonce individuelle. La catégorie suit votre activité enregistrée.',
        lang
      ))
      + '</p>';
  }

  return {
    sellerContext: sellerContext,
    mountSelectors: mountSelectors,
    renderAttrForm: renderAttrForm,
    collectAttrs: collectAttrs,
    collectForm: collectForm,
    enrichPayload: enrichPayload,
    categoryLabel: categoryLabel,
    resolveSubcats: resolveSubcats,
    syncHintHtml: syncHintHtml,
  };
});
