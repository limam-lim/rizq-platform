(function(){
  /* شريط معاينة داخلي فقط — لا يظهر للزائر إلا بـ ?adsPreview=1 */
  try{
    var q = new URLSearchParams(location.search || '');
    if (q.get('adsPreview') !== '1') return;
    if(sessionStorage.getItem('rizq_ads_preview_hide')==='1') return;
  }catch(e){ return; }
  var b=document.getElementById('rizq-ads-preview-banner');
  var t=document.getElementById('rizq-ads-preview-text');
  var d=document.getElementById('rizq-ads-preview-dismiss');
  if(!b) return;
  var fr=(document.documentElement.lang==='fr')||(localStorage.getItem('rizq_lang')==='fr');
  if(t) t.textContent=fr
    ? 'Aperçu Rizq ADS — Annonces classées séparées · 1 emplacement homepage · Annulable via Git'
    : 'معاينة فكرة Rizq ADS — الإعلانات المبوبة منفصلة · مساحة إعلانية واحدة في الصفحة · يمكن الرجوع عبر Git';
  b.hidden=false;
  if(d) d.addEventListener('click',function(){
    b.hidden=true;
    try{sessionStorage.setItem('rizq_ads_preview_hide','1')}catch(e){}
  });
})();
