  /* منع استعادة موضع التمرير قبل اكتمال المحتوى (قفزة F5) */
  try{ if('scrollRestoration' in history) history.scrollRestoration='manual'; }catch(eSR){}
  (function(){
    if(location.hash) return;
    function pinTop(){ try{ window.scrollTo(0,0); }catch(e){} }
    pinTop();
    window.addEventListener('pageshow', function(ev){
      if(location.hash) return;
      pinTop();
    });
  })();
  