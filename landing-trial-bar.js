/* شريط الفترة المجانية — معطّل في الواجهة (الخلفية كما هي) */
(function () {
  function hideFreeUi() {
    var el = document.getElementById('rizq-free-countdown');
    if (!el) return;
    el.hidden = true;
    el.classList.remove('is-on');
    el.textContent = '';
    el.setAttribute('aria-hidden', 'true');
  }
  document.addEventListener('rizq:launch', hideFreeUi);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideFreeUi);
  } else {
    hideFreeUi();
  }
})();
