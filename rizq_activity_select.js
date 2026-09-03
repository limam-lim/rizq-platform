/**
 * rizq_activity_select.js — قائمة نشاط تجاري مخصصة (تفتح للأسفل + max-height + تمرير)
 * Browser: window.RizqActivitySelect.enhance(selectEl)
 */
(function (root) {
  'use strict';

  var WRAP = 'rizq-act-select';
  var OPEN = 'rizq-act-select-open';

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function optionBtn(opt) {
    var val = opt.value;
    var selected = opt.selected;
    return (
      '<button type="button" class="rizq-act-select-option' + (selected && val ? ' is-selected' : '') + '"'
      + ' data-value="' + escapeHtml(val) + '" role="option"'
      + (!val ? ' data-placeholder="1"' : '') + '>'
      + escapeHtml(opt.textContent)
      + '</button>'
    );
  }

  function buildMenuHtml(select) {
    var html = '';
    Array.from(select.children).forEach(function (node) {
      if (node.tagName === 'OPTGROUP') {
        html += '<div class="rizq-act-select-group" role="presentation">' + escapeHtml(node.label) + '</div>';
        Array.from(node.children).forEach(function (opt) {
          html += optionBtn(opt);
        });
      } else if (node.tagName === 'OPTION') {
        html += optionBtn(node);
      }
    });
    return html;
  }

  function selectedLabel(select) {
    var opt = select.options[select.selectedIndex];
    return opt ? opt.textContent : '';
  }

  function getMenu(wrap) {
    if (!wrap) return null;
    var local = wrap.querySelector('.rizq-act-select-menu');
    if (local) return local;
    var menus = root.document.querySelectorAll('.rizq-act-select-menu');
    for (var i = 0; i < menus.length; i += 1) {
      if (menus[i]._rizqActWrap === wrap) return menus[i];
    }
    return null;
  }

  function shouldPortalMenu() {
    try {
      if (root.document.documentElement.classList.contains('rizq-reg-page')) return false;
      if (root.document.querySelector('#modal.reg-wizard-mode')) return false;
    } catch (e) {}
    return true;
  }

  function portalMenu(wrap, menu) {
    if (!shouldPortalMenu()) return;
    if (!menu || menu.parentNode === root.document.body) return;
    menu._rizqActWrap = wrap;
    root.document.body.appendChild(menu);
  }

  function restoreMenu(wrap, menu) {
    if (!menu || menu.parentNode !== root.document.body) return;
    if (menu._rizqActWrap !== wrap) return;
    var anchor = wrap.querySelector('.rizq-act-select-native') || wrap.lastElementChild;
    if (anchor) wrap.insertBefore(menu, anchor);
    else wrap.appendChild(menu);
    menu._rizqActWrap = null;
  }

  function positionMenu(wrap) {
    var trigger = wrap.querySelector('.rizq-act-select-trigger');
    var menu = getMenu(wrap);
    if (!trigger || !menu || menu.hidden) return;

    if (!shouldPortalMenu()) {
      restoreMenu(wrap, menu);
      menu.style.position = 'absolute';
      menu.style.left = '0';
      menu.style.right = '0';
      menu.style.top = 'calc(100% + 4px)';
      menu.style.bottom = 'auto';
      menu.style.width = '100%';
      menu.style.maxHeight = '250px';
      menu.style.zIndex = '80';
      menu.style.overflowY = 'auto';
      wrap.classList.remove('rizq-act-select-flip-up');
      return;
    }

    portalMenu(wrap, menu);

    var rect = trigger.getBoundingClientRect();
    var maxH = 250;
    var gutter = 8;
    var spaceBelow = root.innerHeight - rect.bottom - gutter;
    var spaceAbove = rect.top - gutter;
    var openDown = spaceBelow >= 120 || spaceBelow >= spaceAbove;

    menu.style.position = 'fixed';
    menu.style.left = Math.max(gutter, rect.left) + 'px';
    menu.style.width = Math.min(rect.width, root.innerWidth - gutter * 2) + 'px';
    menu.style.right = 'auto';
    menu.style.overflowY = 'auto';
    menu.style.maxHeight = maxH + 'px';
    menu.style.zIndex = '1000020';

    if (openDown) {
      menu.style.top = (rect.bottom + 4) + 'px';
      menu.style.bottom = 'auto';
      menu.style.maxHeight = Math.min(maxH, Math.max(80, spaceBelow)) + 'px';
      wrap.classList.remove('rizq-act-select-flip-up');
    } else {
      menu.style.top = 'auto';
      menu.style.bottom = (root.innerHeight - rect.top + 4) + 'px';
      menu.style.maxHeight = Math.min(maxH, Math.max(80, spaceAbove)) + 'px';
      wrap.classList.add('rizq-act-select-flip-up');
    }
  }

  function closeWrap(wrap) {
    if (!wrap) return;
    wrap.classList.remove(OPEN);
    var menu = getMenu(wrap);
    var trigger = wrap.querySelector('.rizq-act-select-trigger');
    if (menu) {
      menu.hidden = true;
      restoreMenu(wrap, menu);
    }
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  function closeAll(except) {
    root.document.querySelectorAll('.' + WRAP + '.' + OPEN).forEach(function (w) {
      if (w !== except) closeWrap(w);
    });
  }

  function refreshWrap(wrap, select) {
    var menu = getMenu(wrap);
    var label = wrap.querySelector('.rizq-act-select-label');
    if (menu) menu.innerHTML = buildMenuHtml(select);
    if (label) label.textContent = selectedLabel(select);
  }

  function openWrap(wrap) {
    closeAll(wrap);
    var menu = getMenu(wrap);
    var trigger = wrap.querySelector('.rizq-act-select-trigger');
    wrap.classList.add(OPEN);
    if (menu) menu.hidden = false;
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    positionMenu(wrap);
    var sel = menu && menu.querySelector('.rizq-act-select-option.is-selected');
    if (sel && typeof sel.scrollIntoView === 'function') {
      sel.scrollIntoView({ block: 'nearest' });
    }
  }

  function findWrapFromTarget(node) {
    if (!node || !node.closest) return null;
    var wrap = node.closest('.' + WRAP);
    if (wrap) return wrap;
    var menu = node.closest('.rizq-act-select-menu');
    return menu && menu._rizqActWrap ? menu._rizqActWrap : null;
  }

  function bindWrap(wrap, select) {
    var trigger = wrap.querySelector('.rizq-act-select-trigger');
    var menu = wrap.querySelector('.rizq-act-select-menu');

    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (wrap.classList.contains(OPEN)) closeWrap(wrap);
      else openWrap(wrap);
    });

    menu.addEventListener('click', function (e) {
      var btn = e.target.closest('.rizq-act-select-option');
      if (!btn) return;
      e.stopPropagation();
      select.value = btn.getAttribute('data-value') || '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      refreshWrap(wrap, select);
      closeWrap(wrap);
    });

    select.addEventListener('rizq-act-refresh', function () {
      refreshWrap(wrap, select);
    });
  }

  function enhance(select) {
    if (!select) return null;

    var existing = select.closest('.' + WRAP);
    if (existing) {
      refreshWrap(existing, select);
      return existing;
    }

    var wrap = root.document.createElement('div');
    wrap.className = WRAP;
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);

    var trigger = root.document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'rizq-act-select-trigger m-input';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = '<span class="rizq-act-select-label"></span><span class="rizq-act-select-caret" aria-hidden="true">▾</span>';

    var menu = root.document.createElement('div');
    menu.className = 'rizq-act-select-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'listbox');

    wrap.insertBefore(trigger, select);
    wrap.insertBefore(menu, select);

    select.classList.add('rizq-act-select-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    select.dataset.rizqActEnhanced = '1';

    refreshWrap(wrap, select);
    bindWrap(wrap, select);
    return wrap;
  }

  function refresh(select) {
    var wrap = select && select.closest('.' + WRAP);
    if (wrap) refreshWrap(wrap, select);
  }

  if (root && !root._rizqActSelectBound) {
    root._rizqActSelectBound = true;
    root.document.addEventListener('click', function (e) {
      if (findWrapFromTarget(e.target)) return;
      closeAll(null);
    });
    root.addEventListener('resize', function () {
      root.document.querySelectorAll('.' + WRAP + '.' + OPEN).forEach(positionMenu);
    });
    root.addEventListener('scroll', function () {
      root.document.querySelectorAll('.' + WRAP + '.' + OPEN).forEach(positionMenu);
    }, true);
  }

  root.RizqActivitySelect = { enhance: enhance, refresh: refresh };
})(typeof window !== 'undefined' ? window : globalThis);
