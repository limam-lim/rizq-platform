/* إشعار قانوني: لا يُفتح تلقائياً — فقط من الزر/الفوتر/التسجيل */
(function(){
  function ensureDiscClosed(){
    try{
      var ov=document.getElementById('discOverlay');
      if(!ov) return;
      ov.classList.remove('open');
      ov.style.display='none';
      ov.style.pointerEvents='none';
    }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', ensureDiscClosed);
  else ensureDiscClosed();
  window.addEventListener('load', ensureDiscClosed);
})();
