(function(){
  try {
    var savedLang = localStorage.getItem('rizq_lang');
    if (savedLang === 'fr') {
      document.documentElement.lang = 'fr';
      document.documentElement.dir = 'ltr';
      document.documentElement.classList.add('rizq-lang-fr');
      if (document.body) document.body.classList.add('rizq-lang-fr');
      else document.addEventListener('DOMContentLoaded', function () {
        try { document.body.classList.add('rizq-lang-fr'); } catch (eBody) {}
      });
    }
  } catch (e1) {}
  function unlockRizqPage(){
    var splash = document.getElementById('rizq-splash');
    if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
    var promo = document.getElementById('rizq-promo-overlay');
    if (promo && !promo.classList.contains('active')) {
      promo.style.display = 'none';
      promo.style.pointerEvents = 'none';
    }
    try {
      if (window.matchMedia('(min-width:769px)').matches) {
        var hdr = document.getElementById('rizq-app-header');
        if (hdr && hdr.parentNode) hdr.parentNode.removeChild(hdr);
      }
    } catch (e) {}
    var regModal = document.getElementById('modal');
    if (regModal && regModal.classList.contains('open')) {
      regModal.style.pointerEvents = 'auto';
      regModal.style.display = 'flex';
    }
    document.querySelectorAll('.modal-overlay:not(.open),.mobile-drawer-overlay,.disc-overlay,.cs-modal-overlay:not(.active),.rzq-sheet-backdrop:not(.open)').forEach(function(el){
      el.style.pointerEvents = 'none';
      el.style.display = 'none';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', unlockRizqPage);
  else unlockRizqPage();
  window.addEventListener('load', unlockRizqPage);
})();
