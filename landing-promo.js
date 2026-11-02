function openRizqPromo(){document.getElementById('rizq-promo-overlay').classList.add('active')}
function closeRizqPromo(){document.getElementById('rizq-promo-overlay').classList.remove('active')}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeRizqPromo();});
