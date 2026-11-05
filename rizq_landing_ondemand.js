/* On-demand loaders for landing — packages / verification / contact / register.
 * Keeps first paint free of ~180KB+ of non-critical scripts. */
(function () {
  var V = '31.31';
  var loading = {};
  var loaded = {};
  var groupPromises = {};

  function has(srcBase) {
    return !!document.querySelector('script[src*="' + srcBase + '"]');
  }

  function loadScript(src) {
    var base = src.split('?')[0];
    if (loaded[base] || has(base)) {
      loaded[base] = true;
      return Promise.resolve();
    }
    if (loading[base]) return loading[base];
    loading[base] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () {
        loaded[base] = true;
        resolve();
      };
      s.onerror = function () {
        delete loading[base];
        reject(new Error('fail ' + src));
      };
      document.head.appendChild(s);
    });
    return loading[base];
  }

  function seq(list) {
    return list.reduce(function (p, src) {
      return p.then(function () { return loadScript(src); });
    }, Promise.resolve());
  }

  var GROUPS = {
    packages: [
      'rizq_packages_config.js?v=23.0',
      'rizq_packages_ui.js?v=23.0',
      'rizq_landing_pkg_modal.js?v=' + V
    ],
    register: [
      'rizq_packages_config.js?v=23.0',
      'rizq_packages_ui.js?v=23.0',
      'rizq_merchant_activities.js?v=23.0',
      'rizq_activity_select.js?v=23.0',
      'rizq_verification_policy.js'
    ],
    contact: ['rizq_contact_gate.js'],
    video: ['rizq_video_ads.js?v=promo22'],
    disclaimer: ['rizq_disclaimer.js']
  };

  function ensure(group) {
    var files = GROUPS[group];
    if (!files) return Promise.resolve();
    if (groupPromises[group]) return groupPromises[group];
    groupPromises[group] = seq(files).catch(function () {
      delete groupPromises[group];
    });
    return groupPromises[group];
  }

  var contactStub = {
    onMaskedContactClick: function () {
      var args = arguments;
      return ensure('contact').then(function () {
        var g = window.RizqContactGate;
        if (g && g !== contactStub && typeof g.onMaskedContactClick === 'function') {
          return g.onMaskedContactClick.apply(g, args);
        }
      });
    }
  };
  if (!window.RizqContactGate) window.RizqContactGate = contactStub;

  function openPkgModalStub(cardEl, origin) {
    return ensure('packages').then(function () {
      if (typeof window.__rizqEnsureModals === 'function') {
        return Promise.resolve(window.__rizqEnsureModals()).then(function () {
          if (window.openPkgModal !== openPkgModalStub) {
            return window.openPkgModal(cardEl, origin);
          }
        });
      }
      if (window.openPkgModal !== openPkgModalStub) {
        return window.openPkgModal(cardEl, origin);
      }
    });
  }
  window.openPkgModal = openPkgModalStub;
  function closePkgModalStub(){
    if (window.closePkgModal !== closePkgModalStub) return window.closePkgModal.apply(window, arguments);
    var m=document.getElementById('pkg-modal'); if(m) m.style.display='none';
  }
  window.closePkgModal = closePkgModalStub;

  function openDiscStub() {
    var args = arguments;
    return Promise.all([
      ensure('disclaimer'),
      typeof window.__rizqEnsureModals === 'function' ? window.__rizqEnsureModals() : Promise.resolve()
    ]).then(function () {
      if (window.openDisc !== openDiscStub) {
        return window.openDisc.apply(window, args);
      }
    });
  }
  var prevOpenDisc = window.openDisc;
  window.openDisc = openDiscStub;
  if (typeof prevOpenDisc === 'function') {
    /* landing_page may redefine later — restore wrap after */
    Object.defineProperty(window, '__rizqPrevOpenDisc', { value: prevOpenDisc, writable: true });
  }

  /* URL ?openRegister=1 — preload register stack + modals */
  try {
    var p = new URLSearchParams(window.location.search || '');
    if (p.get('openRegister') === '1' || p.get('regPage') === '1') {
      ensure('register').then(function () {
        if (typeof window.__rizqEnsureModals === 'function') window.__rizqEnsureModals();
      });
    }
  } catch (eReg) {}

  window.RizqEnsure = {
    packages: function () { return ensure('packages'); },
    register: function () { return ensure('register'); },
    contact: function () { return ensure('contact'); },
    video: function () { return ensure('video'); },
    disclaimer: function () { return ensure('disclaimer'); },
    ensure: ensure
  };

  function watchPricing() {
    function fill() {
      ensure('packages').then(function () {
        if (typeof window.renderPricingSection === 'function') {
          try { window.renderPricingSection(); } catch (e) {}
        }
      });
    }
    var root = document.getElementById('pricing') || document.querySelector('.pricing-grid');
    if (!root || !('IntersectionObserver' in window)) {
      if ('requestIdleCallback' in window) requestIdleCallback(fill, { timeout: 6000 });
      else setTimeout(fill, 4000);
      return;
    }
    var once = false;
    var io = new IntersectionObserver(function (entries) {
      if (once) return;
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        once = true;
        io.disconnect();
        fill();
        break;
      }
    }, { rootMargin: '240px 0px' });
    io.observe(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchPricing);
  } else {
    watchPricing();
  }
})();
