/* ── Style Ideas: أزياء وملابس وإكسسوارات فقط (لا سيارات/شاحنات/إلكترونيات…) ── */
var _rizqStyleGender = 'men';
var RIZQ_STYLE_GENDERS = { men:1, women:1, boys:1, girls:1 };
var RIZQ_STYLE_MEN_HINTS = /دراعة|رجالي|رجل|رجال|homme|men'?s?|daraa|قميص\s*رجالي|بدلة|حذاء\s*رجالي|ملابس\s*رجالي|سبحة|ساعة\s*رجالي/i;
var RIZQ_STYLE_WOMEN_HINTS = /ملحفة|نسائي|نساء|امرأة|femme|women|melhfa|عباية|فستان(?!\s*بنات)|حقيبة\s*نسائي|طرح|حجاب|مكياج|عطر\s*نسائي|مجوهرات\s*نسائي|ملابس\s*نسائي|أسورة|عقد|لؤلؤ|خلخال/i;
var RIZQ_STYLE_BOYS_HINTS = /أولاد|ولد|صبي|فتى|طفل\s*ذكر|garçon|boy|boys|ملابس\s*أولاد|حذاء\s*ولد|تي.?شيرت\s*أولاد|مدرسة\s*أولاد/i;
var RIZQ_STYLE_GIRLS_HINTS = /بنات|بنت|طفلة|فتاة|fille|girl|girls|ملابس\s*بنات|حذاء\s*بنت|فستان\s*بنات|مدرسة\s*بنات/i;
var RIZQ_STYLE_KIDS_HINTS = /أطفال|طفل|رضيع|رضيعة|أطفال\s*و?\s*رضّع|kids?|enfant|bébé|bebe|baby|مدرسة|مدرسي|لعب\s*أطفال|ألعاب|حذاء\s*أطفال|ملابس\s*أطفال|تي.?شيرت\s*أطفال/i;
/* أقسام فرعية رسمية من كتالوج الأزياء — مصدر حقيقة أقوى من تلميحات النص */
var RIZQ_STYLE_SUB_MEN = /دراعة\s*رجالية|ملابس\s*رجالية|عطور\s*رجالية/i;
var RIZQ_STYLE_SUB_WOMEN = /ملحفة\s*نسائية|طرح|عباية|مجوهرات\s*وذهب|عطور\s*ومستحضرات/i;
var RIZQ_STYLE_SUB_KIDS = /ملابس\s*أطفال|رضع|أطفال\s*ورضع/i;
var RIZQ_STYLE_SUB_MIXED_WOMEN_KIDS = /ملابس\s*نسائية\s*وأطفال/i;
/* فئات وأنماط مسموحة: أزياء، ملابس، ذهب/مجوهرات، إكسسوارات، أحذية، حقائب، عطور */
var RIZQ_STYLE_ALLOW_CAT = /أزياء|موضة|ذهب|مجوهرات|إكسسوار|أحذية|حقائب|عطور|fashion|mode|bijou|accessoire|chaussure|sac|parfum/i;
var RIZQ_STYLE_ALLOW_HINTS = /دراعة|ملحفة|قميص|فستان|عباية|حجاب|طرح|حذاء|حقيبة|أسورة|خلخال|خاتم|عقد|ساعة(?:\s|$)|مجوهرات|ذهب\s*عيار|ملابس|ثوب|بدلة|جاكيت|معطف|حقيبة|إكسسوار|daraa|melhfa|robe|bijou|bracelet|bague|chaussure|vêtement|montre|sac|accessoire/i;
/* استبعاد صريح: مركبات، معدات، عقارات، ماشية، إلكترونيات، أثاث… */
var RIZQ_STYLE_BLOCK = /سيارات|شاحنة|شاحنات|حافلة|حفارة|موتوسيكل|دراجة\s*نارية|عقارات|شقق|أراضي|ماشية|إبل|بقر|غنم|إلكترون|هواتف|لابتوب|تلفزيون|أثاث|معدات|آليات|caterpillar|excavator|truck|camion|voiture|moto|iphone|samsung|laptop|appartement|terrain|engin|bulldozer/i;
var RIZQ_STYLE_MEN_TEMPLATES = [
  { ar:'أناقة الدراعة', fr:'Élégance Daraa', emoji:['👔','📿','🩴'], cats:['أزياء'], browseSub:'دراعة رجالية', kind:'daraa' },
  { ar:'إطلالة رجالية يومية', fr:'Look homme du quotidien', emoji:['🧥','⌚','👟'], cats:['أزياء'], browseSub:'ملابس رجالية', kind:'shirt' },
  { ar:'لمسة ذهبية رجالية', fr:'Touche d\'or homme', emoji:['🪙','⌚','📿'], cats:['ذهب','أزياء'], browseSub:'', kind:'gold' },
  { ar:'إكسسوارات رجالية', fr:'Accessoires homme', emoji:['⌚','📿','👞'], cats:['ذهب','أزياء'], browseSub:'', kind:'watch' }
];
var RIZQ_STYLE_WOMEN_TEMPLATES = [
  { ar:'أناقة الملحفة', fr:'Élégance Melhfa', emoji:['🧕','💍','👜'], cats:['أزياء'], browseSub:'ملحفة نسائية', kind:'melhfa' },
  { ar:'إطلالة ذهبية نسائية', fr:'Touche d\'or femme', emoji:['🪙','💍','✨'], cats:['ذهب','أزياء'], browseSub:'', kind:'gold' },
  { ar:'إكسسوارات نسائية', fr:'Accessoires femme', emoji:['👜','👠','💍'], cats:['أزياء','ذهب'], browseSub:'أحذية وحقائب', kind:'shoe' },
  { ar:'أناقة نسائية يومية', fr:'Look femme du quotidien', emoji:['👗','👜','👠'], cats:['أزياء'], browseSub:'ملابس نسائية وأطفال', kind:'shirt' }
];
var RIZQ_STYLE_BOYS_TEMPLATES = [
  { ar:'إطلالة يومية للأولاد', fr:'Look garçon du quotidien', emoji:['👦','👕','👟'], cats:['أزياء'], browseSub:'ملابس أطفال ورضع', kind:'shirt' },
  { ar:'حذاء وأناقة للأولاد', fr:'Chaussures & style garçon', emoji:['👟','🧢','🎒'], cats:['أزياء'], browseSub:'ملابس أطفال ورضع', kind:'shoe' },
  { ar:'إطلالة مدرسية للأولاد', fr:'Look scolaire garçon', emoji:['🎒','📗','✏️'], cats:['أزياء'], browseSub:'ملابس أطفال ورضع', kind:'' }
];
var RIZQ_STYLE_GIRLS_TEMPLATES = [
  { ar:'إطلالة يومية للبنات', fr:'Look fille du quotidien', emoji:['👧','👗','👟'], cats:['أزياء'], browseSub:'ملابس أطفال ورضع', kind:'shirt' },
  { ar:'حذاء وأناقة للبنات', fr:'Chaussures & style fille', emoji:['👟','🎀','🎒'], cats:['أزياء'], browseSub:'ملابس أطفال ورضع', kind:'shoe' },
  { ar:'فستان أنيق للبنات', fr:'Robe fille élégante', emoji:['👗','✨','👒'], cats:['أزياء'], browseSub:'ملابس أطفال ورضع', kind:'' }
];
function _styTemplatesFor(gender){
  if(gender === 'women') return RIZQ_STYLE_WOMEN_TEMPLATES;
  if(gender === 'boys') return RIZQ_STYLE_BOYS_TEMPLATES;
  if(gender === 'girls') return RIZQ_STYLE_GIRLS_TEMPLATES;
  return RIZQ_STYLE_MEN_TEMPLATES;
}
function _styGenderBadge(gender, fr){
  if(gender === 'women') return fr ? 'Femmes' : 'نساء';
  if(gender === 'boys') return fr ? 'Garçons' : 'أولاد';
  if(gender === 'girls') return fr ? 'Filles' : 'بنات';
  return fr ? 'Hommes' : 'رجال';
}
function _styTabIdFor(gender){
  if(gender === 'women') return 'sty-tab-women';
  if(gender === 'boys') return 'sty-tab-boys';
  if(gender === 'girls') return 'sty-tab-girls';
  return 'sty-tab-men';
}

function _styShuffle(arr){
  var a = arr.slice();
  for(var i=a.length-1;i>0;i--){
    var j = Math.floor(Math.random()*(i+1));
    var t=a[i]; a[i]=a[j]; a[j]=t;
  }
  return a;
}
function _styEsc(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _styAdBlob(a){
  if(!a) return '';
  return [a.title,a.titleFR,a.titleFr,a.desc,a.descFR,a.cat,a.catKey,a.subcat,a.category,(a.tags||[]).join(' '),(a.tagsFR||[]).join(' ')].join(' ');
}
function _styDetectGender(a){
  if(!a) return 'neutral';
  /* جنس محفوظ من بذرة مشاهدة / متجر */
  if(a.gender && RIZQ_STYLE_GENDERS[a.gender]) return a.gender;
  if(a.gender === 'kids') return 'kids';
  var sub = String(a.subcat || '');
  var cat = String(a.cat || a.category || '');
  var blob = _styAdBlob(a);
  var section = sub + ' ' + cat;

  /* 1) القسم الفرعي الرسمي أولاً — لا خلط رجال/نساء/أطفال */
  if(RIZQ_STYLE_SUB_MEN.test(section)) return 'men';
  if(RIZQ_STYLE_SUB_WOMEN.test(section) && !RIZQ_STYLE_SUB_KIDS.test(section)) return 'women';
  if(RIZQ_STYLE_SUB_KIDS.test(section) || RIZQ_STYLE_SUB_MIXED_WOMEN_KIDS.test(section)) {
    var boysInKids = RIZQ_STYLE_BOYS_HINTS.test(blob);
    var girlsInKids = RIZQ_STYLE_GIRLS_HINTS.test(blob);
    if(boysInKids && !girlsInKids) return 'boys';
    if(girlsInKids && !boysInKids) return 'girls';
    /* قسم أطفال بلا تلميح جنس صريح — لا يُعرض في رجال/نساء */
    return 'kids';
  }

  var boys = RIZQ_STYLE_BOYS_HINTS.test(blob);
  var girls = RIZQ_STYLE_GIRLS_HINTS.test(blob);
  if(boys && !girls) return 'boys';
  if(girls && !boys) return 'girls';

  var men = RIZQ_STYLE_MEN_HINTS.test(blob);
  var women = RIZQ_STYLE_WOMEN_HINTS.test(blob);
  if(men && !women) return 'men';
  if(women && !men) return 'women';

  /* ذهب/لؤلؤ بلا تلميح رجالي → نسائي (لا يظهر تحت رجال) */
  if(/ذهب|لؤلؤ|أسورة|عقد|خلخال|خاتم|bracelet|collier|bijou|\bgold\b/i.test(blob) && !men) {
    return 'women';
  }

  /* بلا جنس صريح: لا نُسقطه في كل التبويبات (كان يسبب خلط رجال↔نساء↔أولاد) */
  return 'neutral';
}
/** هل نشاط/اسم المحل يخص الموضة والملابس؟ */
function _styIsFashionStoreAcc(acc){
  if(!acc) return false;
  var typ = String(acc.type || 'store').toLowerCase();
  if(typ && typ !== 'store' && typ !== 'shop' && typ !== 'boutique') return false;
  var blob = [acc.name, acc.nameF, acc.activity, acc.category, acc.cat, acc.tagline, acc.desc, acc.businessType]
    .filter(Boolean).join(' ');
  if(/سيارة|عقارات|مكتب|مناقصة|إلكترون|بقالة|مواد غذائية|صيدلية|auto|immobilier|bureau|épicerie|pharmacie/i.test(blob)
    && !/أزياء|ملابس|موضة|fashion|mode|vêtement/i.test(blob)){
    return false;
  }
  if(/أزياء|ملابس|موضة|دراعة|ملحفة|أحذية|إكسسوار|عطور|أطفال|خياط|بوتيك|fashion|mode|vêtement|boutique|habillement|chaussure|parfum|enfant|kids|couture/i.test(blob)){
    return true;
  }
  /* بلا نشاط واضح — يُقبل إن وُجدت منتجات أزياء لاحقاً */
  return !acc.activity && !acc.category && !acc.cat;
}
function _styStoreGenderHint(acc){
  if(!acc) return '';
  var blob = [acc.name, acc.activity, acc.category, acc.cat, acc.tagline, acc.desc].join(' ');
  if(/أولاد|بنات|أطفال|رضع|enfant|kids|child|garçon|fille/i.test(blob)) return 'kids';
  if(/نساء|نسائي|سيدات|femme|women|lady|melhfa|ملحفة/i.test(blob)) return 'women';
  if(/رجال|رجالي|homme|men|daraa|دراعة/i.test(blob)) return 'men';
  return '';
}
function _styFormatStorePrice(n){
  var num = Number(n);
  if(!isFinite(num) || num <= 0) return '';
  try { return num.toLocaleString('fr-FR') + ' MRU'; }
  catch(e){ return String(Math.round(num)) + ' MRU'; }
}
function _styNormalizeStoreProduct(p, store){
  if(!p) return null;
  var storeId = String((store && (store.id || store.storeId)) || 'store');
  var storeName = String((store && (store.name || store.title)) || storeId);
  var storeNameF = String((store && (store.nameF || store.nameFr || storeName)) || storeName);
  var pid = String(p.id != null ? p.id : '');
  if(!pid) return null;
  var priceNum = Number(p.price);
  if(!isFinite(priceNum)) priceNum = 0;
  var priceStr = _styFormatStorePrice(priceNum);
  var imgs = [];
  if(Array.isArray(p.images)) imgs = p.images.filter(Boolean).slice(0, 4);
  else if(Array.isArray(p.imgDataArr)) imgs = p.imgDataArr.filter(Boolean).slice(0, 4);
  else if(p.imgData) imgs = [p.imgData];
  else if(p.image) imgs = [p.image];
  var item = {
    id: 'store:' + storeId + ':' + pid,
    productId: pid,
    storeId: storeId,
    storeName: storeName,
    title: String(p.name || p.title || pid),
    titleFR: String(p.nameF || p.nameFr || p.titleFR || p.name || pid),
    emoji: p.emoji || '🛍️',
    cat: p.cat || 'أزياء',
    catKey: 'أزياء',
    subcat: p.subcat || p.cat || '',
    price: priceStr,
    priceFR: priceStr,
    priceNum: priceNum,
    images: imgs,
    bg: p.bg || 'linear-gradient(145deg,#0f2347,#1B3A6B)',
    gender: p.gender || '',
    href: 'rizq_store.html?id=' + encodeURIComponent(storeId),
    source: 'store',
    module: 'store',
    seller: storeName,
    sellerFR: storeNameF,
    tags: [p.cat, storeName].filter(Boolean),
    fromStore: true
  };
  var storeHint = _styStoreGenderHint(store);
  if(!item.gender || !RIZQ_STYLE_GENDERS[item.gender]){
    var detected = _styDetectGender(item);
    if(detected && detected !== 'neutral' && detected !== 'both' && detected !== 'kids'){
      item.gender = detected;
    } else if(storeHint === 'women') {
      item.gender = 'women';
    } else if(storeHint === 'men') {
      item.gender = 'men';
    } else if(storeHint === 'kids') {
      var kidsG = _styDetectGender(Object.assign({}, item, { subcat: 'ملابس أطفال ورضع', cat: 'أطفال' }));
      item.gender = (kidsG === 'boys' || kidsG === 'girls') ? kidsG : 'kids';
    } else {
      item.gender = detected === 'kids' ? 'kids' : (detected || 'neutral');
    }
  }
  return item;
}
/** كتالوجات محلات أزياء تجريبية — عندما لا توجد محلات موضة مسجّلة بعد */
function _styDemoFashionStores(){
  return [
    {
      id: 'demo_fashion_men',
      name: 'محل الأناقة الرجالية',
      nameF: 'Boutique Élégance Homme',
      type: 'store',
      activity: 'ملابس رجالية',
      products: [
        { id: 'M1', name: 'دراعة رجالية فاخرة', nameF: 'Daraa homme premium', price: 45000, cat: 'أزياء', emoji: '👔', gender: 'men' },
        { id: 'M2', name: 'قميص قطني رجالي', nameF: 'Chemise coton homme', price: 12000, cat: 'أزياء', emoji: '👔', gender: 'men' },
        { id: 'M3', name: 'ساعة رجالية كلاسيكية', nameF: 'Montre homme', price: 28000, cat: 'إكسسوارات', emoji: '⌚', gender: 'men' },
        { id: 'M4', name: 'حذاء رسمي رجالي', nameF: 'Chaussures formal', price: 32000, cat: 'أحذية', emoji: '👞', gender: 'men' },
        { id: 'M5', name: 'صندل رجالي جلد', nameF: 'Sandale homme cuir', price: 6500, cat: 'أحذية', emoji: '🩴', gender: 'men' },
        { id: 'M6', name: 'سبحة كهرمان', nameF: 'Chapelet ambre', price: 18000, cat: 'إكسسوارات', emoji: '📿', gender: 'men' },
        { id: 'M7', name: 'تيشيرت قطن رجالي', nameF: 'T-shirt homme', price: 5000, cat: 'أزياء', emoji: '👕', gender: 'men' },
        { id: 'M8', name: 'معطف خفيف رجالي', nameF: 'Manteau léger', price: 40000, cat: 'أزياء', emoji: '🧥', gender: 'men' }
      ]
    },
    {
      id: 'demo_fashion_women',
      name: 'بوتيك لمسة نسائية',
      nameF: 'Boutique Touche Femme',
      type: 'store',
      activity: 'ملابس نسائية',
      products: [
        { id: 'W1', name: 'ملحفة حريرية فاخرة', nameF: 'Melhfa soie', price: 38000, cat: 'أزياء', emoji: '🧕', gender: 'women' },
        { id: 'W2', name: 'فستان سهرة', nameF: 'Robe de soirée', price: 55000, cat: 'أزياء', emoji: '👗', gender: 'women' },
        { id: 'W3', name: 'حقيبة نسائية أنيقة', nameF: 'Sac femme', price: 9800, cat: 'إكسسوارات', emoji: '👜', gender: 'women' },
        { id: 'W4', name: 'عطر نسائي', nameF: 'Parfum femme', price: 21000, cat: 'عطور', emoji: '🌸', gender: 'women' },
        { id: 'W5', name: 'صندل صيفي نسائي', nameF: 'Sandales femme', price: 8000, cat: 'أحذية', emoji: '👠', gender: 'women' },
        { id: 'W6', name: 'أسورة ذهب مظهر', nameF: 'Bracelet doré', price: 15000, cat: 'إكسسوارات', emoji: '💍', gender: 'women' },
        { id: 'W7', name: 'نظارة شمسية نسائية', nameF: 'Lunettes femme', price: 9000, cat: 'إكسسوارات', emoji: '🕶️', gender: 'women' },
        { id: 'W8', name: 'ملحفة نقش تقليدي', nameF: 'Melhfa traditionnelle', price: 42000, cat: 'أزياء', emoji: '🧕', gender: 'women' }
      ]
    },
    {
      id: 'demo_fashion_kids',
      name: 'عالم الأطفال للملابس',
      nameF: 'Monde Enfants Mode',
      type: 'store',
      activity: 'ملابس أطفال',
      products: [
        { id: 'B1', name: 'طقم أولاد يومي', nameF: 'Ensemble garçon', price: 8500, cat: 'أطفال', emoji: '👦', gender: 'boys', subcat: 'ملابس أطفال ورضع' },
        { id: 'B2', name: 'حذاء رياضي أولاد', nameF: 'Baskets garçon', price: 5200, cat: 'أطفال', emoji: '👟', gender: 'boys', subcat: 'ملابس أطفال ورضع' },
        { id: 'B3', name: 'حقيبة مدرسية أولاد', nameF: 'Cartable garçon', price: 4800, cat: 'أطفال', emoji: '🎒', gender: 'boys', subcat: 'ملابس أطفال ورضع' },
        { id: 'B4', name: 'كاب أولاد صيفي', nameF: 'Casquette garçon', price: 1900, cat: 'أطفال', emoji: '🧢', gender: 'boys', subcat: 'ملابس أطفال ورضع' },
        { id: 'G1', name: 'فستان يومي بنات', nameF: 'Robe fille', price: 7800, cat: 'أطفال', emoji: '👧', gender: 'girls', subcat: 'ملابس أطفال ورضع' },
        { id: 'G2', name: 'حذاء أنيق بنات', nameF: 'Chaussures fille', price: 4600, cat: 'أطفال', emoji: '👟', gender: 'girls', subcat: 'ملابس أطفال ورضع' },
        { id: 'G3', name: 'طقم فيونكات بنات', nameF: 'Accessoires fille', price: 2400, cat: 'أطفال', emoji: '🎀', gender: 'girls', subcat: 'ملابس أطفال ورضع' },
        { id: 'G4', name: 'قبعة صيفية بنات', nameF: 'Chapeau fille', price: 2100, cat: 'أطفال', emoji: '👒', gender: 'girls', subcat: 'ملابس أطفال ورضع' }
      ]
    }
  ];
}
function _styReadStoreAccounts(){
  var map = {};
  try {
    var accs = JSON.parse(localStorage.getItem('rizq_pending_accounts') || '[]');
    (accs || []).forEach(function(a){
      if(!a || !a.id) return;
      var typ = String(a.type || '').toLowerCase();
      if(typ && typ !== 'store' && typ !== 'shop' && typ !== 'boutique') return;
      map[String(a.id)] = a;
    });
  } catch(eA){}
  return map;
}
function _styCollectStoreStyleItems(){
  var seen = {};
  var out = [];
  var accounts = _styReadStoreAccounts();
  var storeIdsTouched = {};

  function pushProduct(p, store){
    var item = _styNormalizeStoreProduct(p, store);
    if(!item || !_styIsStyleCat(item)) return;
    if(seen[item.id]) return;
    seen[item.id] = 1;
    out.push(item);
  }

  /* 1) منتجات المحلات الحقيقية من localStorage */
  try {
    for(var i = 0; i < localStorage.length; i++){
      var key = localStorage.key(i);
      if(!key || key.indexOf('store_products_') !== 0) continue;
      var sid = key.slice('store_products_'.length);
      if(!sid) continue;
      var list = [];
      try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch(eP){ list = []; }
      if(!Array.isArray(list) || !list.length) continue;
      var acc = accounts[sid] || { id: sid, name: sid, type: 'store' };
      /* اقبل المحل إن كان موضة بالنشاط أو إن منتجاته أزياء */
      var fashionAcc = _styIsFashionStoreAcc(acc);
      var styleProds = list.filter(function(p){
        return p && _styIsStyleCat({ title: p.name, cat: p.cat, catKey: p.cat, tags: [p.cat] });
      });
      if(!fashionAcc && !styleProds.length) continue;
      storeIdsTouched[sid] = 1;
      (fashionAcc ? list : styleProds).forEach(function(p){ pushProduct(p, acc); });
    }
  } catch(eScan){}

  /* 2) حسابات موضة بلا مفتاح منتجات بعد — لا شيء تُضاف */
  Object.keys(accounts).forEach(function(sid){
    if(storeIdsTouched[sid]) return;
    if(!_styIsFashionStoreAcc(accounts[sid])) return;
    /* يبقى فارغاً حتى يرفع التاجر منتجات */
  });

  /* 3) إن لم تكفِ المنتجات — كتالوجات محلات أزياء تجريبية (فقط قبل الإطلاق) */
  var styDemoOk = (window.RizqDemo && typeof RizqDemo.inventoryAllowed === 'function')
    ? RizqDemo.inventoryAllowed()
    : !(window.RIZQ_LAUNCH && RIZQ_LAUNCH.launchDate);
  if(styDemoOk && out.length < 9){
    _styDemoFashionStores().forEach(function(demo){
      if(storeIdsTouched[demo.id]) return;
      (demo.products || []).forEach(function(p){ pushProduct(p, demo); });
    });
  }
  return out;
}
/**
 * مصدر الإطلالات = منتجات محلات الموضة (لا إعلانات فردية).
 * الإعلان قطعة واحدة؛ المحل يوفّر تشكيلة رجال/نساء/أطفال لإطلالة متكاملة.
 */
function _styPool(){
  return _styCollectStoreStyleItems();
}
/** مجمع إعلانات للمنصات الأخرى (نماذج العقارات…) — منفصل عن إطلالات المحلات ونماذج المعارض */
function _styAdsPool(){
  var seen = {};
  var out = [];
  function add(list){
    (list||[]).forEach(function(a){
      if(!a || a.id==null) return;
      var id = String(a.id);
      if(seen[id]) return;
      seen[id] = 1;
      out.push(a);
    });
  }
  if(typeof ADS !== 'undefined') add(ADS);
  var styAdsDemoOk = (window.RizqDemo && typeof RizqDemo.inventoryAllowed === 'function')
    ? RizqDemo.inventoryAllowed()
    : !(window.RIZQ_LAUNCH && RIZQ_LAUNCH.launchDate);
  if(styAdsDemoOk && typeof FEATURED_ADS !== 'undefined') add(FEATURED_ADS);
  if(typeof ALL_ADS_DATA !== 'undefined') add(ALL_ADS_DATA);
  return out;
}

/**
 * مصدر نماذج المعارض = كتالوج المعارض/المصانع (rizq_corp_prods_* + API)،
 * لا إعلانات التصفح الفردية — حتى تتطابق اللقطة مع منتج المعرض.
 */
function _srmReadShowroomAccounts(){
  var map = {};
  try {
    var accs = JSON.parse(localStorage.getItem('rizq_pending_accounts') || '[]');
    (accs || []).forEach(function(a){
      if(!a || !a.id) return;
      var typ = String(a.type || '').toLowerCase();
      if(typ !== 'corp' && typ !== 'showroom' && typ !== 'company') return;
      map[String(a.id)] = a;
    });
  } catch(eA){}
  return map;
}
function _srmParsePriceNum(p){
  if(!p) return 0;
  if(typeof p.priceNum === 'number' && isFinite(p.priceNum)) return p.priceNum;
  var raw = p.price != null ? p.price : 0;
  if(typeof raw === 'number' && isFinite(raw)) return raw;
  var n = Number(String(raw).replace(/[^\d.]/g, ''));
  return isFinite(n) ? n : 0;
}
function _srmNormalizeCatalogProduct(p, showroom){
  if(!p) return null;
  var showroomId = String((showroom && (showroom.id || showroom.storeId)) || 'showroom');
  var showroomName = String((showroom && (showroom.name || showroom.title)) || showroomId);
  var showroomNameF = String((showroom && (showroom.nameF || showroom.nameFr || showroomName)) || showroomName);
  var pid = String(p.id != null ? p.id : '');
  if(!pid) return null;
  var priceNum = _srmParsePriceNum(p);
  var priceStr = (typeof _styFormatStorePrice === 'function')
    ? _styFormatStorePrice(priceNum)
    : (priceNum ? (priceNum.toLocaleString('fr-FR') + ' MRU') : '');
  if(!priceStr && p.price != null && String(p.price).trim()){
    priceStr = String(p.price).indexOf('MRU') >= 0 ? String(p.price) : (String(p.price) + ' MRU');
  }
  var imgs = [];
  if(Array.isArray(p.images)) imgs = p.images.filter(Boolean).slice(0, 4);
  else if(Array.isArray(p.imgDataArr)) imgs = p.imgDataArr.filter(Boolean).slice(0, 4);
  else if(p.imgData) imgs = [p.imgData];
  else if(p.image) imgs = [p.image];
  var cat = String(p.cat || p.category || p.catKey || '').trim() || 'سيارات';
  return {
    id: 'showroom:' + showroomId + ':' + pid,
    productId: pid,
    storeId: showroomId,
    showroomId: showroomId,
    storeName: showroomName,
    title: String(p.name || p.title || pid),
    titleFR: String(p.nameF || p.nameFr || p.titleFR || p.name || pid),
    emoji: p.emoji || '🏬',
    cat: cat,
    catKey: cat,
    subcat: p.subcat || cat,
    price: priceStr,
    priceFR: priceStr,
    priceNum: priceNum,
    images: imgs,
    bg: p.bg || 'linear-gradient(145deg,#0f2347,#1B3A6B)',
    href: 'rizq_showroom.html?id=' + encodeURIComponent(showroomId),
    source: 'showroom',
    module: 'showroom',
    seller: showroomName,
    sellerFR: showroomNameF,
    tags: [cat, showroomName].filter(Boolean),
    fromShowroom: true,
    specs: p.specs || p.desc || ''
  };
}
/** كتالوجات معارض تجريبية — عندما لا يوجد كتالوج معرض مسجّل بعد */
function _srmDemoShowroomCatalogs(){
  var carImgs = [
    'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=800&q=70',
    'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=70',
    'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=800&q=70'
  ];
  var elecImgs = [
    'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=800&q=70',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=70',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=70'
  ];
  var furnImgs = [
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=70',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=70',
    'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=70'
  ];
  return [
    {
      id: 'demo-corp-001',
      name: 'معرض بريستيج',
      nameF: 'Showroom Prestige',
      type: 'corp',
      products: [
        { id: 'SR-C1', name: 'هيونداي توسان 2022 — SUV', nameF: 'Hyundai Tucson 2022 — SUV', price: 5800000, cat: 'سيارات', emoji: '🚙', images: carImgs.slice() },
        { id: 'SR-C2', name: 'تويوتا كورولا 2021', nameF: 'Toyota Corolla 2021', price: 4500000, cat: 'سيارات', emoji: '🚗', images: [carImgs[1], carImgs[2], carImgs[0]] },
        { id: 'SR-C3', name: 'مفتاح وريموت أصلي', nameF: 'Clé / télécommande', price: 8500, cat: 'سيارات', emoji: '🔑', images: ['https://picsum.photos/seed/rizq-sr-keys/640/480'] },
        { id: 'SR-C4', name: 'إطارات SUV طقم', nameF: 'Pneus SUV jeu', price: 68000, cat: 'سيارات', emoji: '🛞', images: ['https://picsum.photos/seed/rizq-sr-tires/640/480'] },
        { id: 'SR-E1', name: 'لابتوب احترافي', nameF: 'Laptop pro', price: 85000, cat: 'إلكترونيات', emoji: '💻', images: elecImgs.slice() },
        { id: 'SR-E2', name: 'شاشة Smart TV 55"', nameF: 'Smart TV 55"', price: 95000, cat: 'إلكترونيات', emoji: '📺', images: [elecImgs[0], elecImgs[2]] },
        { id: 'SR-F1', name: 'طقم صالون', nameF: 'Salon', price: 120000, cat: 'أثاث', emoji: '🛋️', images: furnImgs.slice() },
        { id: 'SR-Q1', name: 'مولد كهرباء', nameF: 'Groupe électrogène', price: 95000, cat: 'معدات', emoji: '⚙️', images: ['https://picsum.photos/seed/rizq-sr-gen/640/480'] }
      ]
    },
    {
      id: 'acc_grad_corp_01',
      name: 'معرض أمل للسيارات',
      nameF: 'Showroom Amal Auto',
      type: 'corp',
      products: [
        { id: 'GA1', name: 'Toyota Corolla 2021 — مفحوصة', nameF: 'Toyota Corolla 2021', price: 6200000, cat: 'سيارات', emoji: '🚗', images: ['https://picsum.photos/seed/rizq-grad-ad07a/640/480', 'https://picsum.photos/seed/rizq-grad-ad07b/640/480'] },
        { id: 'GA2', name: 'Hyundai Tucson 2019', nameF: 'Hyundai Tucson 2019', price: 7800000, cat: 'سيارات', emoji: '🚙', images: ['https://picsum.photos/seed/rizq-grad-ad08/640/480', carImgs[0]] },
        { id: 'GA3', name: 'إطارات 265/65 R17', nameF: 'Pneus 265/65 R17', price: 68000, cat: 'سيارات', emoji: '🛞', images: ['https://picsum.photos/seed/rizq-grad-ad11/640/480'] }
      ]
    },
    {
      id: 'acc_grad_corp_02',
      name: 'معرض المحيط للإلكترونيات',
      nameF: 'Showroom Océan Tech',
      type: 'corp',
      products: [
        { id: 'GE1', name: 'شاشة Smart TV 55 بوصة', nameF: 'Smart TV 55"', price: 95000, cat: 'إلكترونيات', emoji: '📺', images: ['https://picsum.photos/seed/rizq-grad-ad09/640/480'].concat(elecImgs.slice(0, 2)) },
        { id: 'GE2', name: 'لابتوب للعمل', nameF: 'Laptop travail', price: 110000, cat: 'إلكترونيات', emoji: '💻', images: elecImgs.slice() },
        { id: 'GE3', name: 'هاتف ذكي', nameF: 'Smartphone', price: 45000, cat: 'إلكترونيات', emoji: '📱', images: [elecImgs[2], elecImgs[0]] }
      ]
    },
    {
      id: 'acc_grad_corp_03',
      name: 'معرض الواحة للأثاث',
      nameF: 'Showroom Oasis Meubles',
      type: 'corp',
      products: [
        { id: 'GF1', name: 'مكتب إداري خشبي مع كرسي', nameF: 'Bureau bois + chaise', price: 45000, cat: 'أثاث', emoji: '🪑', images: ['https://picsum.photos/seed/rizq-grad-ad12/640/480'].concat(furnImgs.slice(0, 2)) },
        { id: 'GF2', name: 'طقم صالون أنيق', nameF: 'Salon élégant', price: 185000, cat: 'أثاث', emoji: '🛋️', images: furnImgs.slice() },
        { id: 'GF3', name: 'غرفة نوم متكاملة', nameF: 'Chambre complète', price: 220000, cat: 'أثاث', emoji: '🛏️', images: [furnImgs[1], furnImgs[2], furnImgs[0]] }
      ]
    }
  ];
}
function _srmCollectShowroomCatalogItems(){
  var seen = {};
  var out = [];
  var accounts = _srmReadShowroomAccounts();
  var touched = {};

  function pushProduct(p, showroom){
    var item = _srmNormalizeCatalogProduct(p, showroom);
    if(!item) return;
    if(seen[item.id]) return;
    seen[item.id] = 1;
    out.push(item);
  }

  /* 1) كتالوج المعارض المحلي rizq_corp_prods_<id> */
  try {
    for(var i = 0; i < localStorage.length; i++){
      var key = localStorage.key(i);
      if(!key || key.indexOf('rizq_corp_prods_') !== 0) continue;
      var sid = key.slice('rizq_corp_prods_'.length);
      if(!sid) continue;
      var list = [];
      try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch(eP){ list = []; }
      if(!Array.isArray(list) || !list.length) continue;
      var acc = accounts[sid] || { id: sid, name: sid, type: 'corp' };
      touched[sid] = 1;
      list.forEach(function(p){ pushProduct(p, acc); });
    }
  } catch(eScan){}

  /* 2) كتالوج مُحمَّل من API (يُملأ عبر _srmHydrateFromApi) */
  try {
    var apiRows = window.__rizqSrmApiCatalog;
    if(Array.isArray(apiRows)){
      apiRows.forEach(function(row){
        if(!row || !row.acc || !Array.isArray(row.items)) return;
        var aid = String(row.acc.id || '');
        if(!aid || touched[aid]) return;
        touched[aid] = 1;
        row.items.forEach(function(p){ pushProduct(p, row.acc); });
      });
    }
  } catch(eApi){}

  /* 3) احتياطي: كتالوجات معارض تجريبية (فقط قبل الإطلاق) */
  var srmDemoOk = (window.RizqDemo && typeof RizqDemo.inventoryAllowed === 'function')
    ? RizqDemo.inventoryAllowed()
    : !(window.RIZQ_LAUNCH && RIZQ_LAUNCH.launchDate);
  if(srmDemoOk && out.length < 9){
    _srmDemoShowroomCatalogs().forEach(function(demo){
      if(touched[demo.id]) return;
      (demo.products || []).forEach(function(p){ pushProduct(p, demo); });
    });
  }
  return out;
}
function _srmPool(){
  return _srmCollectShowroomCatalogItems();
}
function _styMatchGender(a, gender){
  var g = _styDetectGender(a);
  /* تطابق صارم — لا both/kids العامة ولا المنتجات المحايدة */
  if(gender === 'boys') return g === 'boys';
  if(gender === 'girls') return g === 'girls';
  if(gender === 'men') return g === 'men';
  if(gender === 'women') return g === 'women';
  return g === gender;
}
/** إطلالة أزياء/ملابس/إكسسوارات فقط — يرفض السيارات والشاحنات والإلكترونيات وغيرها */
function _styIsStyleCat(a){
  if(!a) return false;
  var k = String(a.catKey || a.cat || '');
  var blob = _styAdBlob(a) || [a.title, a.name, k].filter(Boolean).join(' ');
  if(RIZQ_STYLE_BLOCK.test(k) || RIZQ_STYLE_BLOCK.test(blob)) return false;
  if(RIZQ_STYLE_ALLOW_CAT.test(k)) return true;
  if(RIZQ_STYLE_ALLOW_HINTS.test(blob)) return true;
  return false;
}
function _styCatMatch(adCat, want){
  var k = String(adCat || '');
  var w = String(want || '');
  if(!k || !w) return false;
  return k === w || k.indexOf(w) >= 0 || w.indexOf(k) >= 0;
}
function _styPickCompanions(primary, pool, gender, n){
  var stylePool = pool.filter(_styIsStyleCat);
  var same = stylePool.filter(function(a){
    return a !== primary && String(a.id) !== String(primary.id) && _styMatchGender(a, gender) &&
      (_styCatMatch(a.catKey, primary.catKey) || /ذهب|أزياء|مجوهرات|موضة|إكسسوار|أحذية|حقائب/.test(String(a.catKey||'')));
  });
  var picks = _styShuffle(same).slice(0, n);
  if(picks.length < n){
    var rest = _styShuffle(stylePool.filter(function(a){
      return a !== primary && String(a.id) !== String(primary.id) && _styMatchGender(a, gender) &&
        !picks.some(function(p){ return String(p.id)===String(a.id); });
    }));
    picks = picks.concat(rest.slice(0, n - picks.length));
  }
  return picks;
}
/** مرافقو الإطلالة: منتجات مختلفة النوع (ساعة/حذاء/حقيبة…) — يُفضَّل نفس المحل */
function _styPickLookCompanions(primary, pool, gender, n){
  n = n || 2;
  /* المرافقون من نفس الجنس فقط — لا looseGender الذي كان يخلط الأقسام */
  var stylePool = (pool || []).filter(function(a){
    return _styIsStyleCat(a) && (!gender || _styMatchGender(a, gender));
  });
  var sameStoreId = primary && primary.storeId ? String(primary.storeId) : '';
  if(sameStoreId){
    var sameStore = stylePool.filter(function(a){ return String(a.storeId || '') === sameStoreId; });
    if(sameStore.length >= n) stylePool = sameStore.concat(stylePool.filter(function(a){
      return String(a.storeId || '') !== sameStoreId;
    }));
    else if(sameStore.length) stylePool = sameStore.concat(stylePool);
  }
  var primaryKind = typeof _styAdKind === 'function' ? _styAdKind(primary) : '';
  var used = {};
  if(primary && primary.id != null) used[String(primary.id)] = 1;
  var picks = [];
  var prefer = ['watch','shoe','bag','gold','shirt','daraa','melhfa'].filter(function(k){
    return k && k !== primaryKind;
  });
  for(var ki=0; ki<prefer.length && picks.length < n; ki++){
    var kind = prefer[ki];
    var cand = _styShuffle(stylePool.filter(function(a){
      return a && !used[String(a.id)] && _styAdKind(a) === kind;
    }));
    if(cand.length){
      picks.push(cand[0]);
      used[String(cand[0].id)] = 1;
    }
  }
  if(picks.length < n){
    var rest = _styShuffle(stylePool.filter(function(a){
      return a && !used[String(a.id)];
    }));
    for(var ri=0; ri<rest.length && picks.length < n; ri++){
      picks.push(rest[ri]);
      used[String(rest[ri].id)] = 1;
    }
  }
  return picks.slice(0, n);
}
function _styFindAdById(id){
  if(id == null || id === '') return null;
  var sid = String(id);
  var pool = _styPool();
  for(var i=0;i<pool.length;i++){
    if(String(pool[i].id) === sid) return pool[i];
  }
  if(typeof _srmPool === 'function'){
    var srmPool = _srmPool();
    for(var si=0;si<srmPool.length;si++){
      if(String(srmPool[si].id) === sid) return srmPool[si];
    }
  }
  if(typeof FEATURED_ADS !== 'undefined'){
    for(var j=0;j<FEATURED_ADS.length;j++){
      if(String(FEATURED_ADS[j].id) === sid) return FEATURED_ADS[j];
    }
  }
  try {
    var seeds = _styLoadSeeds();
    for(var s=0;s<seeds.length;s++){
      if(String(seeds[s].id) === sid) return seeds[s];
    }
  } catch(e){}
  return null;
}
function rizqOpenStyleItem(ev, adId){
  /* فتح المنتج المضغوط عليه فقط — لا تسريب لنقر بطاقة الإطلالة */
  if(ev){
    try { ev.preventDefault(); } catch(e0){}
    try { ev.stopPropagation(); } catch(e1){}
    if(ev.stopImmediatePropagation) try { ev.stopImmediatePropagation(); } catch(e2){}
  }
  if(adId == null || adId === '') return false;
  var ad = _styFindAdById(adId);
  if(!ad){
    /* معرّف محل: store:storeId:productId */
    var m = String(adId).match(/^store:([^:]+):/);
    if(m){
      window.location.href = 'rizq_store.html?id=' + encodeURIComponent(m[1]);
      return false;
    }
    var ms = String(adId).match(/^showroom:([^:]+):/);
    if(ms){
      window.location.href = 'rizq_showroom.html?id=' + encodeURIComponent(ms[1]);
      return false;
    }
    return false;
  }
  /* منتجات المعارض → صفحة المعرض / الكتالوج */
  if(ad.fromShowroom || ad.source === 'showroom' || String(ad.id).indexOf('showroom:') === 0){
    var srHref = ad.href || (ad.showroomId || ad.storeId
      ? ('rizq_showroom.html?id=' + encodeURIComponent(ad.showroomId || ad.storeId))
      : '');
    var safeSr = _rizqSafeNavHref(srHref);
    if(safeSr) window.location.href = safeSr;
    return false;
  }
  /* منتجات المحلات → صفحة المحل */
  if(ad.fromStore || ad.source === 'store' || String(ad.id).indexOf('store:') === 0){
    var storeHref = ad.href || (ad.storeId ? ('rizq_store.html?id=' + encodeURIComponent(ad.storeId)) : '');
    var safeStore = _rizqSafeNavHref(storeHref);
    if(safeStore) window.location.href = safeStore;
    return false;
  }
  if(ad.href && ad.fromView){
    var safeHref = _rizqSafeNavHref(ad.href);
    if(safeHref) window.location.href = safeHref;
    return false;
  }
  if(typeof goToListing === 'function') goToListing(ad);
  else window.location.href = 'rizq_browse.html?id=' + encodeURIComponent(ad.id);
  return false;
}
/** روابط تنقّل داخل المنصة فقط — يمنع javascript: وhttp://خارجي */
function _rizqSafeNavHref(href){
  try {
    var raw = String(href || '').trim();
    if(!raw) return '';
    if(/^\s*javascript:/i.test(raw) || /^\s*data:/i.test(raw)) return '';
    if(raw.charAt(0) === '/' || raw.charAt(0) === '?' || raw.charAt(0) === '#') return raw;
    if(/^[a-z0-9_\-]+\.html(\?|#|$)/i.test(raw)) return raw;
    var u = new URL(raw, window.location.href);
    if(u.origin !== window.location.origin) return '';
    return u.pathname + u.search + u.hash;
  } catch(e){ return ''; }
}
function rizqOpenStyleLook(ev, primaryId, fallbackHref){
  /* زر «تسوّق الإطلالة» فقط — بلا فتح عند نقر بلاطة منتج */
  if(ev){
    var t = ev.target;
    /* بلاطة مرتبطة بإعلانها — لا تسرق النقرة لبطاقة الإطلالة */
    if(t && t.closest && t.closest('.rizq-style-tile.is-linked')){
      try { ev.preventDefault(); } catch(eP){}
      return false;
    }
    try { ev.preventDefault(); } catch(e2){}
  }
  if(primaryId){
    return rizqOpenStyleItem(null, primaryId);
  }
  var safeFb = _rizqSafeNavHref(fallbackHref);
  if(safeFb) window.location.href = safeFb;
  return false;
}
window.rizqOpenStyleItem = rizqOpenStyleItem;
window.rizqOpenStyleLook = rizqOpenStyleLook;

function _styResolveBrandId(ad){
  if(!ad || !window.RizqBrands) return '';
  if(ad.brandId && RizqBrands.getById(ad.brandId)) return String(ad.brandId);
  var blob = [ad.brandName, ad.brandNameFr, ad.title, ad.titleFR, ad.titleFr, ad.modelName, ad.modelNameFr]
    .filter(Boolean).join(' ');
  try {
    var hit = RizqBrands.findByAlias(blob);
    if(hit && hit.id) return String(hit.id);
  } catch(e){}
  var s = String(blob || '').toLowerCase();
  if(/iphone|آيفون|ايفون|macbook|airpods|\bapple\b|آبل/.test(s)) return 'apple';
  if(/samsung|سامسونج|galaxy/.test(s)) return 'samsung';
  if(/toyota|تويوتا|كامري|كورولا|هايلوكس|لاند\s*كروزر/.test(s)) return 'toyota';
  if(/mercedes|مرسيدس|بنز/.test(s)) return 'mercedes';
  if(/hyundai|هيونداي|هونداي|توسان/.test(s)) return 'hyundai';
  if(/nike|نايك|اير\s*ماكس|jordan/.test(s)) return 'nike';
  if(/adidas|أديداس|اديداس|ultraboost/.test(s)) return 'adidas';
  if(/ساعة|watch|montre|g-?shock/.test(s)) return 'casio';
  if(/ذهب|خاتم|سوار|مجوهر|bijou|gold/.test(s)) return 'pandora';
  if(/نظار|ray-?ban|lunette/.test(s)) return 'ray-ban';
  if(/حقيبة|bag|sac\b/.test(s)) return 'guess';
  if(/حذاء|shoe|sneaker|كوتشي/.test(s)) return 'nike';
  return '';
}
function _styBrandLogoNameHtml(ad, fr, opts){
  opts = opts || {};
  if(!window.RizqBrands) return '';
  var brandId = _styResolveBrandId(ad);
  if(!brandId) return '';
  var modelId = (ad && ad.modelId) || '';
  /* inline افتراضياً على بطاقات الإطلالة — يوفر ارتفاعاً فلا يُقصّ النص */
  var useInline = opts.inline !== false;
  if(typeof RizqBrands.logoNameHtml === 'function'){
    return RizqBrands.logoNameHtml(brandId, { fr: !!fr, modelId: modelId, size: opts.size || 28, inline: useInline });
  }
  if(typeof RizqBrands.chipHtml === 'function'){
    return RizqBrands.chipHtml(brandId, { fr: !!fr, modelId: modelId, size: opts.size || 22 });
  }
  return '';
}
/** ماركة للإطلالة/النموذج: شعار + اسم بجانب بعض — من المنتج أولاً، وإلا من كتالوج القسم */
function _styBrandChipForLook(items, fr, catKey){
  items = Array.isArray(items) ? items : (items ? [items] : []);
  var i, html, ad, brandId;
  for(i = 0; i < items.length; i++){
    html = _styBrandLogoNameHtml(items[i], fr, { inline: true, size: 28 });
    if(html) return html;
  }
  if(!window.RizqBrands || typeof RizqBrands.forCategory !== 'function') return '';
  var brands = RizqBrands.forCategory(catKey || 'أزياء');
  if(!brands.length) brands = RizqBrands.list();
  if(!brands.length) return '';
  ad = items[0] || {};
  var key = String(ad.id != null ? ad.id : (ad.title || '0'));
  var hash = 0;
  for(i = 0; i < key.length; i++) hash = ((hash << 5) - hash) + key.charCodeAt(i) | 0;
  brandId = brands[Math.abs(hash) % brands.length].id;
  if(typeof RizqBrands.logoNameHtml === 'function'){
    return RizqBrands.logoNameHtml(brandId, { fr: !!fr, size: 28, inline: true });
  }
  return RizqBrands.chipHtml(brandId, { fr: !!fr, size: 22 });
}
/** وصف قصير واضح للبطاقة — بدون قصّ منتصف الكلمات */
function _styClearMeta(items, fr){
  items = Array.isArray(items) ? items.filter(Boolean) : [];
  if(!items.length) return fr ? 'Sélection boutiques' : 'من المحلات';
  var storeName = '';
  var i, d, p;
  for(i = 0; i < items.length; i++){
    if(items[i].storeName){ storeName = String(items[i].storeName); break; }
  }
  var prices = [];
  for(i = 0; i < items.length; i++){
    d = (typeof trAd === 'function') ? trAd(items[i]) : items[i];
    p = d && (d.price || items[i].price);
    if(p) prices.push(String(p).replace(/\s*MRU\s*/i,' ').trim());
  }
  var n = items.length;
  var countLbl = fr
    ? (n + ' article' + (n > 1 ? 's' : ''))
    : (n + ' منتجات');
  var parts = [];
  if(storeName) parts.push(storeName);
  parts.push(countLbl);
  if(prices.length) parts.push((fr ? 'dès ' : 'من ') + prices[0]);
  return parts.join(' · ');
}
function _styBuildCardHtml(opts){
  opts = opts || {};
  var attrs = ' class="rizq-style-card" role="listitem"';
  if(opts.gender) attrs += ' data-sty-gender="'+_styEsc(opts.gender)+'"';
  if(opts.srmCat) attrs += ' data-srm-cat="'+_styEsc(opts.srmCat)+'"';
  if(opts.seed) attrs += ' data-sty-seed="1"';
  var idAttr = opts.primaryId != null && opts.primaryId !== ''
    ? String(opts.primaryId).replace(/'/g,'&#39;')
    : '';
  var href = opts.href || 'rizq_browse.html';
  var hrefEsc = _styEsc(href).replace(/'/g,'&#39;');
  var fromView = opts.fromViewLbl
    ? '<div class="rizq-style-from-view">'+_styEsc(opts.fromViewLbl)+'</div>'
    : '';
  var brandRow = opts.brandHtml
    ? '<div class="rizq-style-brand-row" aria-label="الماركة">'+opts.brandHtml+'</div>'
    : '';
  return '<article'+attrs+'>'
    + '<div class="rizq-style-mosaic">'+(opts.tilesHtml || '')+'</div>'
    + '<div class="rizq-style-body">'
    +   fromView
    +   brandRow
    +   '<div class="rizq-style-badge">'+_styEsc(opts.badge || '')+'</div>'
    +   '<div class="rizq-style-name">'+_styEsc(opts.name || '')+'</div>'
    +   '<div class="rizq-style-meta">'+_styEsc(opts.meta || '')+'</div>'
    +   '<a class="rizq-style-cta" href="'+_styEsc(href)+'" onclick="return rizqOpenStyleLook(event,\''+idAttr+'\',\''+hrefEsc+'\')">'+_styEsc(opts.cta || '')+'</a>'
    + '</div></article>';
}

function _styTilePriceHtml(ad){
  if(!ad) return '';
  var price = '';
  try {
    var d = (typeof trAd === 'function') ? trAd(ad) : ad;
    price = String((d && (d.price || d.priceFR || d.priceFr)) || ad.price || ad.priceFR || ad.priceFr || '').trim();
  } catch(eP){
    price = String(ad.price || '').trim();
  }
  if(!price && ad.priceNum != null && isFinite(Number(ad.priceNum))){
    try { price = Number(ad.priceNum).toLocaleString('fr-FR') + ' MRU'; }
    catch(eN){ price = String(ad.priceNum) + ' MRU'; }
  }
  if(!price) return '';
  /* اختصار بصري مثل أمازون على الصورة */
  var short = price.replace(/\s*MRU\s*/i,' MRU').trim();
  if(short.length > 18) short = short.slice(0, 16) + '…';
  return '<span class="rizq-style-tile-price" dir="ltr">'+_styEsc(short)+'</span>';
}
function _styTileHtml(ad, fallbackEmoji, fallbackBg){
  var bg = (ad && ad.bg) || fallbackBg || 'linear-gradient(145deg,#1B3A6B,#0f2347)';
  var emoji = (ad && ad.emoji) || fallbackEmoji || '✨';
  var src = (ad && Array.isArray(ad.images) && ad.images[0]) ? String(ad.images[0]) : '';
  var linked = !!(ad && ad.id != null);
  var title = '';
  if(ad){
    try {
      var d = (typeof trAd === 'function') ? trAd(ad) : ad;
      title = String((d && (d.title || ad.title)) || '').trim();
    } catch(e){ title = String(ad.title || '').trim(); }
  }
  var priceBadge = _styTilePriceHtml(ad);
  var aria = linked
    ? ' aria-label="'+_styEsc((title ? title + ' — ' : '') + (priceBadge ? String(ad.price||'') : '') || String(ad.id))+'"'
    : ' aria-hidden="true"';
  /* span قابل للنقر — يعمل داخل الموزاييك ويفتح إعلان البلاطة */
  var openAttr = linked
    ? ' role="button" tabindex="0" data-sty-ad="'+_styEsc(String(ad.id))+'" onclick="return rizqOpenStyleItem(event,\''+_styEsc(String(ad.id)).replace(/'/g,'&#39;')+'\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();return rizqOpenStyleItem(event,\''+_styEsc(String(ad.id)).replace(/'/g,'&#39;')+'\');}" class="rizq-style-tile is-linked"'+aria
    : ' class="rizq-style-tile"'+aria;
  if(src){
    return '<span'+openAttr+' style="background:'+_styEsc(bg)+'"><img src="'+_styEsc(src)+'" alt="'+_styEsc(title)+'" loading="lazy" decoding="async"/>'+priceBadge+'</span>';
  }
  return '<span'+openAttr+' style="background:'+_styEsc(bg)+'">'+emoji+priceBadge+'</span>';
}
function _styTileFromSrc(src, fallbackEmoji, fallbackBg, adId, titleHint, priceHint){
  var bg = fallbackBg || 'linear-gradient(145deg,#1B3A6B,#0f2347)';
  var linked = adId != null && adId !== '';
  var title = String(titleHint || '').trim();
  var priceBadge = '';
  if(priceHint){
    priceBadge = '<span class="rizq-style-tile-price" dir="ltr">'+_styEsc(String(priceHint).slice(0,18))+'</span>';
  } else if(linked && typeof _styFindAdById === 'function'){
    priceBadge = _styTilePriceHtml(_styFindAdById(adId));
  }
  var aria = linked
    ? ' aria-label="'+_styEsc(title || String(adId))+'"'
    : ' aria-hidden="true"';
  var openAttr = linked
    ? ' role="button" tabindex="0" data-sty-ad="'+_styEsc(String(adId))+'" onclick="return rizqOpenStyleItem(event,\''+_styEsc(String(adId)).replace(/'/g,'&#39;')+'\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();return rizqOpenStyleItem(event,\''+_styEsc(String(adId)).replace(/'/g,'&#39;')+'\');}" class="rizq-style-tile is-linked"'+aria
    : ' class="rizq-style-tile"'+aria;
  if(src){
    return '<span'+openAttr+' style="background:'+_styEsc(bg)+'"><img src="'+_styEsc(src)+'" alt="'+_styEsc(title)+'" loading="lazy" decoding="async"/>'+priceBadge+'</span>';
  }
  return '<span'+openAttr+' style="background:'+_styEsc(bg)+'">'+(fallbackEmoji||'✨')+priceBadge+'</span>';
}

/* بذور الإطلالة من مشاهدة منتج/إعلان (محلي عبر localStorage) */
var RIZQ_STYLE_SEED_KEY = 'rizq_style_seeds';
var RIZQ_STYLE_AUTO_MS = 3 * 60 * 1000;
var _rizqStyleAutoTimer = null;
var _rizqStyleNextAt = 0;

function _styLoadSeeds(){
  try {
    var raw = JSON.parse(localStorage.getItem(RIZQ_STYLE_SEED_KEY) || '[]');
    if(!Array.isArray(raw)) return [];
    var now = Date.now();
    var cleaned = raw.filter(function(s){
      if(!s || !s.ts || (now - s.ts) >= 7*24*3600*1000) return false;
      return _styIsStyleCat(s);
    }).slice(0, 12);
    if(cleaned.length !== raw.length) _stySaveSeeds(cleaned);
    return cleaned;
  } catch(e){ return []; }
}
function _stySaveSeeds(list){
  try { localStorage.setItem(RIZQ_STYLE_SEED_KEY, JSON.stringify((list||[]).slice(0, 12))); } catch(e){}
}
function rizqFeedStyleSeed(item){
  if(!item) return;
  var title = String(item.title || item.name || '').trim();
  if(!title) return;
  /* لا بذور من سيارات/شاحنات/إلكترونيات — أزياء وملابس وإكسسوارات فقط */
  if(!_styIsStyleCat(item)) return;
  /* الإطلالات من المحلات — تجاهل بذور الإعلانات الفردية */
  var isStore = !!(item.fromStore || item.source === 'store' || item.storeId
    || String(item.id || '').indexOf('store:') === 0
    || /rizq_store\.html/i.test(String(item.href || '')));
  if(!isStore) return;
  var gender = (typeof _styDetectGender === 'function')
    ? _styDetectGender(Object.assign({}, item, { title: title }))
    : 'neutral';
  if(gender === 'neutral' || gender === 'both' || gender === 'kids') {
    /* لا بذور بلا جنس واضح — تمنع خلط التبويبات */
    return;
  }
  var images = [];
  if(Array.isArray(item.images)) images = item.images.filter(Boolean).slice(0, 6);
  else if(item.image) images = [item.image];
  var storeId = String(item.storeId || '');
  if(!storeId){
    var idm = String(item.id || '').match(/^store:([^:]+):/);
    if(idm) storeId = idm[1];
  }
  var seed = {
    id: String(item.id != null ? item.id : ('store:' + (storeId || 'store') + ':seed-' + Date.now())),
    title: title,
    titleFR: String(item.titleFR || item.nameF || title),
    emoji: item.emoji || '✨',
    cat: item.cat || '',
    catKey: item.catKey || item.cat || 'أزياء',
    subcat: item.subcat || '',
    images: images,
    gender: gender,
    storeId: storeId,
    storeName: item.storeName || '',
    href: item.href || (storeId ? ('rizq_store.html?id=' + encodeURIComponent(storeId)) : 'rizq_directory.html?type=store'),
    bg: item.bg || 'linear-gradient(145deg,#e8eef8,#f5f8fc)',
    fromView: true,
    fromStore: true,
    source: 'store',
    ts: Date.now()
  };
  var list = _styLoadSeeds().filter(function(s){ return String(s.id) !== String(seed.id); });
  list.unshift(seed);
  _stySaveSeeds(list);
  if(typeof buildStyleIdeas === 'function' && document.getElementById('rizq-styles-rail')){
    if(RIZQ_STYLE_GENDERS[seed.gender]) setStyleGender(seed.gender);
    else buildStyleIdeas(true);
  }
}
window.rizqFeedStyleSeed = rizqFeedStyleSeed;

function _styUpdateTick(fr){
  var el = document.getElementById('rizq-styles-tick');
  if(!el) return;
  if(!_rizqStyleNextAt){ el.textContent = ''; return; }
  el.textContent = fr
    ? ('✨ De nouveaux looks arrivent')
    : ('✨ إطلالات جديدة في الطريق');
}
function _styStartAutoRefresh(){
  if(_rizqStyleAutoTimer) clearInterval(_rizqStyleAutoTimer);
  _rizqStyleNextAt = Date.now() + RIZQ_STYLE_AUTO_MS;
  _rizqStyleAutoTimer = setInterval(function(){
    if(document.hidden) return;
    _rizqStyleNextAt = Date.now() + RIZQ_STYLE_AUTO_MS;
    try { buildStyleIdeas(true); } catch(e){}
  }, RIZQ_STYLE_AUTO_MS);
  setInterval(function(){
    var fr = false;
    try {
      if(typeof isAr !== 'undefined') fr = !isAr;
      else fr = (localStorage.getItem('rizq_lang')||'ar') === 'fr';
    } catch(e){}
    _styUpdateTick(fr);
  }, 1000);
  try {
    var fr0 = (typeof isAr !== 'undefined') ? !isAr : false;
    _styUpdateTick(fr0);
  } catch(e2){}
}

/* شريط شعارات الماركات فوق أنماط الأزياء / نماذج المعارض */
function _landingBrandFr(){
  try {
    if(typeof isAr !== 'undefined') return !isAr;
    return (localStorage.getItem('rizq_lang')||'ar') === 'fr';
  } catch(e){ return false; }
}
function _landingBrandCatForSrm(cat){
  var meta = (typeof RIZQ_SRM_CATS !== 'undefined' && RIZQ_SRM_CATS[cat]) ? RIZQ_SRM_CATS[cat] : null;
  if(meta && meta.dirCat) return meta.dirCat;
  if(cat === 'cars') return 'سيارات';
  if(cat === 'electronics') return 'إلكترونيات';
  return '';
}
function _landingBrandBrowse(brandId, catKey){
  if(!brandId) return;
  var fr = _landingBrandFr();
  var q = brandId;
  try {
    if(window.RizqBrands){
      var b = RizqBrands.getById(brandId);
      q = RizqBrands.displayName(b, fr) || brandId;
    }
  } catch(e){}
  var params = new URLSearchParams();
  if(catKey) params.set('cat', catKey);
  if(q) params.set('q', q);
  try { window.location.href = 'rizq_browse.html?' + params.toString(); } catch(e2){}
}
function _fillLandingBrandStrip(mountId, catKey, ariaAr, ariaFr){
  var mount = document.getElementById(mountId);
  if(!mount) return;
  var fr = _landingBrandFr();
  mount.setAttribute('aria-label', fr ? ariaFr : ariaAr);
  if(!window.RizqBrands || typeof RizqBrands.stripHtml !== 'function'){
    mount.innerHTML = '';
    mount.style.display = 'none';
    return;
  }
  var html = catKey ? RizqBrands.stripHtml(catKey, fr, {
    heading: fr ? 'Shop by Brand' : 'تسوّق حسب الماركة',
    imgSize: 64
  }) : '';
  if(!html){
    mount.innerHTML = '';
    mount.style.display = 'none';
    return;
  }
  mount.style.display = '';
  mount.innerHTML = html;
  mount.querySelectorAll('[data-brand-id]').forEach(function(btn){
    btn.addEventListener('click', function(){
      _landingBrandBrowse(btn.getAttribute('data-brand-id')||'', catKey);
    });
  });
}
function refreshLandingBrandStrips(){
  _fillLandingBrandStrip('rizq-styles-brand-strip', 'أزياء', 'ماركات الأزياء', 'Marques mode');
  var srmCat = (typeof _rizqSrmCat !== 'undefined') ? _rizqSrmCat : 'cars';
  _fillLandingBrandStrip('rizq-srm-brand-strip', _landingBrandCatForSrm(srmCat), 'ماركات المعارض', 'Marques showroom');
}
function setStyleGender(gender){
  if(!RIZQ_STYLE_GENDERS[gender]) gender = 'men';
  _rizqStyleGender = gender;
  document.querySelectorAll('.rizq-styles-gtab').forEach(function(btn){
    var on = btn.getAttribute('data-sty-gender') === gender;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  var rail = document.getElementById('rizq-styles-rail');
  if(rail) rail.setAttribute('aria-labelledby', _styTabIdFor(gender));
  buildStyleIdeas(false);
  try { refreshLandingBrandStrips(); } catch(eBrand){}
}
function _styAdKind(a){
  if(!a) return '';
  var blob = [a.title||'', a.titleFR||'', a.subcat||'', a.cat||'', a.catKey||'', (a.tags||[]).join(' ')].join(' ');
  if(/قميص|chemise|shirt|تي.?شيرت|t-?shirt/i.test(blob)) return 'shirt';
  if(/هاتف|iphone|samsung|phone|téléphone|telephone|جوال|موبايل/i.test(blob)) return 'phone';
  if(/حذاء|shoe|sneaker|صندل|صندلة|كوتشي|بوت/i.test(blob)) return 'shoe';
  if(/ساعة|watch|montre|smartwatch/i.test(blob)) return 'watch';
  if(/دراعة|daraa/i.test(blob)) return 'daraa';
  if(/ملحفة|melhfa|عباية/i.test(blob)) return 'melhfa';
  if(/حقيبة|sac|bag|handbag/i.test(blob)) return 'bag';
  if(/ذهب|or\b|bijou|سوار|خاتم|ring/i.test(blob)) return 'gold';
  return '';
}
function buildStyleIdeas(reshuffle){
  var rail = document.getElementById('rizq-styles-rail');
  if(!rail) return;
  var fr = false;
  try {
    if(typeof isAr !== 'undefined') fr = !isAr;
    else fr = (localStorage.getItem('rizq_lang')||'ar') === 'fr';
  } catch(e) {}
  var gender = (typeof RIZQ_STYLE_GENDERS !== 'undefined' && RIZQ_STYLE_GENDERS[_rizqStyleGender]) ? _rizqStyleGender : (_rizqStyleGender === 'women' ? 'women' : 'men');
  var templates = (typeof _styTemplatesFor === 'function') ? _styTemplatesFor(gender) : (gender === 'women' ? RIZQ_STYLE_WOMEN_TEMPLATES : RIZQ_STYLE_MEN_TEMPLATES);
  var pool = _styPool().filter(_styIsStyleCat);
  var gendered = pool.filter(function(a){ return _styMatchGender(a, gender); });
  var seeds = _styLoadSeeds().filter(function(s){
    if(!_styIsStyleCat(s)) return false;
    if(!_styMatchGender(s, gender)) return false;
    /* بذور من المحلات فقط — لا إعلانات فردية */
    return !!(s.fromStore || s.source === 'store' || s.storeId || String(s.id || '').indexOf('store:') === 0);
  });
  /* سلسلة كاملة مثل النماذج — كل القوالب في شريط أفقي */
  var tplList = _styShuffle(templates);
  var usedIds = {};
  var cards = [];
  /* لا نلمس معرف LANG هنا — يُعرَّف لاحقاً بـ const ويسبب TDZ إن استُدعي buildStyleIdeas مبكراً */
  var cta = fr ? 'Voir le look' : 'تسوّق الإطلالة';
  var fromViewLbl = fr ? 'Vu récemment' : 'من مشاهدتك';
  /* مصدر المنتجات لهذا التبويب فقط — ممنوع السقوط إلى أزياء جنس آخر */
  var styleGendered = gendered.slice();

  /* بطاقة أولى من آخر منتج أزياء/إكسسوار شاهدته — بلاطات مرافقة مختلفة بأسعارها */
  if(seeds.length && styleGendered.length >= 2){
    var seed = seeds[0];
    usedIds[String(seed.id)] = 1;
    var seedAsAd = Object.assign({}, seed, {
      price: seed.price || seed.priceFR || '',
      priceFR: seed.priceFR || seed.price || '',
      catKey: seed.catKey || 'أزياء',
      gender: seed.gender || gender
    });
    var seedComps = (typeof _styPickLookCompanions === 'function')
      ? _styPickLookCompanions(seedAsAd, styleGendered, gender, 2)
      : [];
    var seedItems = [seedAsAd].concat(seedComps);
    while(seedItems.length < 3){
      var fillSeed = styleGendered.find(function(a){
        return a && !seedItems.some(function(x){ return x && String(x.id)===String(a.id); });
      });
      if(!fillSeed) break;
      seedItems.push(fillSeed);
    }
    if(seedItems.length >= 3){
      var seedName = fr ? (seed.titleFR || seed.title) : seed.title;
      var seedTiles = '';
      for(var si=0; si<seedItems.length && si<3; si++){
        seedTiles += _styTileHtml(seedItems[si], (templates[0] && templates[0].emoji && templates[0].emoji[si]) || seedItems[si].emoji, seedItems[si].bg);
      }
      var genderBadge0 = _styGenderBadge(gender, fr);
      var seedHref = seed.href
        || (seed.storeId ? ('rizq_store.html?id=' + encodeURIComponent(seed.storeId)) : '')
        || 'rizq_directory.html?type=store';
      cards.push(_styBuildCardHtml({
        gender: gender,
        seed: true,
        tilesHtml: seedTiles,
        fromViewLbl: fromViewLbl,
        brandHtml: _styBrandChipForLook(seedItems, fr, 'أزياء'),
        badge: genderBadge0,
        name: seedName,
        meta: fr ? 'Inspiré par une boutique visitée' : 'مستوحى من محل زرته',
        cta: cta,
        href: seedHref,
        primaryId: seed.id
      }));
    }
  }

  tplList.forEach(function(tpl){
    if(styleGendered.length < 3) return;
    var kindPool = (tpl.kind ? styleGendered.filter(function(a){ return typeof _styAdKind==='function' && _styAdKind(a) === tpl.kind && !usedIds[String(a.id)]; }) : []);
    var catPool = styleGendered.filter(function(a){
      var k = String(a.catKey||a.cat||'');
      return (tpl.cats||[]).some(function(c){ return _styCatMatch(k, c); }) && !usedIds[String(a.id)];
    });
    if(kindPool.length) catPool = kindPool.concat(catPool.filter(function(a){
      return !kindPool.some(function(k){ return String(k.id)===String(a.id); });
    }));
    if(!catPool.length) catPool = styleGendered.filter(function(a){ return !usedIds[String(a.id)]; });
    /* لا fallback إلى pool العام — يمنع ظهور رجال تحت أولاد/بنات */
    var primary = catPool.length ? _styShuffle(catPool)[0] : null;
    if(!primary) return;
    usedIds[String(primary.id)] = 1;
    var companionPool = styleGendered.filter(function(a){
      return a && String(a.id) !== String(primary.id);
    });
    var companions = (typeof _styPickLookCompanions === 'function'
          ? _styPickLookCompanions(primary, companionPool, gender, 2)
          : _styPickCompanions(primary, companionPool, gender, 2));
    var items = [primary].concat(companions);
    while(items.length < 3){
      var fillSty = companionPool.find(function(a){
        return a && !items.some(function(x){ return x && String(x.id)===String(a.id); });
      });
      if(!fillSty) break;
      items.push(fillSty);
    }
    if(items.length < 3) return; /* لا بطاقة ناقصة ولا خلط أجناس */
    var name = fr ? tpl.fr : tpl.ar;
    var href;
    if(primary && primary.href){
      href = primary.href;
    } else if(primary && primary.storeId){
      href = 'rizq_store.html?id=' + encodeURIComponent(primary.storeId);
    } else if(primary && primary.id && String(primary.id).indexOf('store:') === 0){
      var sm = String(primary.id).match(/^store:([^:]+):/);
      href = sm ? ('rizq_store.html?id=' + encodeURIComponent(sm[1])) : 'rizq_directory.html?type=store';
    } else {
      href = 'rizq_directory.html?type=store';
    }
    var genderBadge = _styGenderBadge(gender, fr);
    var tiles = '';
    for(var ti=0; ti<3; ti++){
      tiles += _styTileHtml(items[ti], (tpl.emoji||[])[ti], items[ti] && items[ti].bg);
    }
    cards.push(_styBuildCardHtml({
      gender: gender,
      tilesHtml: tiles,
      brandHtml: _styBrandChipForLook(items, fr, 'أزياء'),
      badge: genderBadge,
      name: name,
      meta: _styClearMeta(items, fr),
      cta: cta,
      href: href,
      primaryId: primary && primary.id != null ? primary.id : ''
    }));
  });

  /* بطاقات إضافية لسلسلة أفقية أطول — من نفس الجنس فقط */
  var extras = _styShuffle(styleGendered.filter(function(a){ return !usedIds[String(a.id)]; }));
  var emojiSets = {
    men: [['👔','⌚','👟'],['🧥','📿','👞']],
    women: [['👗','👜','👠'],['🪙','💍','✨']],
    boys: [['👦','👕','🎒'],['🧢','👟','📗']],
    girls: [['👧','🎀','👟'],['👗','✨','👒']]
  };
  var emSet = emojiSets[gender] || emojiSets.men;
  for(var ex=0; cards.length < 6 && ex < extras.length; ex++){
    var adEx = extras[ex];
    usedIds[String(adEx.id)] = 1;
    var companionPoolEx = styleGendered.filter(function(a){
      return a && String(a.id) !== String(adEx.id);
    });
    var companionsEx = (typeof _styPickLookCompanions === 'function')
      ? _styPickLookCompanions(adEx, companionPoolEx, gender, 2)
      : ((typeof _styPickCompanions === 'function')
          ? _styPickCompanions(adEx, companionPoolEx, gender, 2)
          : []);
    var itemsEx = [adEx].concat(companionsEx);
    while(itemsEx.length < 3){
      var fillEx = companionPoolEx.find(function(a){
        return a && !itemsEx.some(function(x){ return x && String(x.id)===String(a.id); });
      });
      if(!fillEx) break;
      itemsEx.push(fillEx);
    }
    if(itemsEx.length < 3) continue;
    var emEx = emSet[ex % emSet.length];
    var tilesEx = '';
    for(var tj=0; tj<3; tj++){
      tilesEx += _styTileHtml(itemsEx[tj], emEx[tj], itemsEx[tj] && itemsEx[tj].bg);
    }
    var dEx = (typeof trAd === 'function') ? trAd(adEx) : adEx;
    var nameEx = String((dEx && (dEx.title || adEx.title)) || (fr ? 'Look Rizq' : 'إطلالة رزق'));
    if(nameEx.length > 52) nameEx = nameEx.slice(0, 49).trim() + '…';
    var hrefEx = adEx.href
      || (adEx.storeId ? ('rizq_store.html?id=' + encodeURIComponent(adEx.storeId)) : 'rizq_directory.html?type=store');
    cards.push(_styBuildCardHtml({
      gender: gender,
      tilesHtml: tilesEx,
      brandHtml: _styBrandChipForLook(itemsEx, fr, 'أزياء'),
      badge: _styGenderBadge(gender, fr),
      name: nameEx,
      meta: _styClearMeta(itemsEx, fr),
      cta: cta,
      href: hrefEx,
      primaryId: adEx.id
    }));
  }

  if(!cards.length){
    rail.classList.add('is-empty');
    var emptyGender = _styGenderBadge(gender, fr);
    rail.innerHTML = '<div class="rizq-styles-empty">'+(fr
      ? ('Pas encore assez de produits « '+emptyGender+' » dans les boutiques mode. Parcourez les magasins ou revenez bientôt.')
      : ('لا توجد منتجات كافية لقسم « '+emptyGender+' » في محلات الموضة. تصفّح المحلات أو عد لاحقاً.'))
      + '<div style="margin-top:12px"><a class="rizq-style-cta" href="rizq_directory.html?type=store">'
      + (fr ? 'Voir les boutiques' : 'عرض المحلات') + '</a></div></div>';
    return;
  }
  rail.classList.remove('is-empty');
  /* تكرار البطاقات مثل شريط «مباشر» لحركة slide سلسة */
  rail.innerHTML = cards.concat(cards).join('');
  if(reshuffle){
    try { _styStartAutoRefresh(); } catch(e3) {}
  }
  _styUpdateTick(fr);
  requestAnimationFrame(function(){ syncMarqueeShift(rail); });
}
try { buildStyleIdeas(false); } catch(eSty) {}
try { _styStartAutoRefresh(); } catch(eAuto) {}
