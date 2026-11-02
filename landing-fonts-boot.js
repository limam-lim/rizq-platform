/* Deferred web fonts — CLS-safe */
(function(){
  function loadFonts(){
    var l=document.createElement('link');
    l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Noto+Naskh+Arabic:wght@500;600;700&display=optional';
    document.head.appendChild(l);
  }
  if('requestIdleCallback' in window) requestIdleCallback(loadFonts,{timeout:4000});
  else window.addEventListener('load', function(){ setTimeout(loadFonts, 2000); });
})();
