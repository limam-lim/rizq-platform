/* inject below-fold modals + footer after parse — ASSET_V=31.30 */
(function () {
  var V = '31.30';
  var inflight = null;
  function inject(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var ph = document.getElementById('rizq-footer-placeholder');
    var foot = tmp.querySelector('footer');
    if (ph && foot) ph.replaceWith(foot);
    else if (foot) document.body.appendChild(foot);
    Array.prototype.slice.call(tmp.children).forEach(function (ch) {
      if (ch && ch.tagName !== 'FOOTER') document.body.appendChild(ch);
    });
    try { document.dispatchEvent(new CustomEvent('rizq:modals-ready')); } catch (e) {}
  }
  function go() {
    if (window.__rizqModalsLoaded) return Promise.resolve();
    if (inflight) return inflight;
    inflight = fetch('rizq_landing_modals.fragment.html?v=' + V, { credentials: 'same-origin' })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        window.__rizqModalsLoaded = true;
        inject(html);
      })
      .catch(function () { inflight = null; });
    return inflight;
  }
  window.__rizqEnsureModals = go;
  if ('requestIdleCallback' in window) requestIdleCallback(function () { go(); }, { timeout: 1800 });
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(go, 0); });
  else setTimeout(go, 0);
})();
