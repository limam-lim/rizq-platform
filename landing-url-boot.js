(function () {
  try {
    var p = new URLSearchParams(window.location.search);
    if (p.get('regPage') === '1' || p.get('openRegister') === '1') {
      document.documentElement.classList.add('rizq-reg-page');
    }
  } catch (e) {}
})();
