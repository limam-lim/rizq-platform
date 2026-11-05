/* extracted */

  (function(){
    var DISCOVERY_MIN_READY_ACCOUNTS = 1;
    var DISCOVERY_MIN_READY_FEEDS = 3;
    var DISCOVERY_MAX_CARDS = 20;
    /* على الجوال بطاقتان لا تفيضان العرض فلا يتحرك الشريط — نضمن عدداً كافياً مثل المعارض/المكاتب */
    var DISCOVERY_MIN_STRIP_CARDS = 5;

    function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function isFr(){ try{ return (localStorage.getItem('rizq_lang')||'ar')==='fr'; }catch(e){ return false; } }

    var TYPE_CFG = {
      store: { page:'rizq_store.html',   icon:'🏪', badge:{ar:'محل',fr:'Boutique'},
        emptyTitle:{ar:'كن أول من يفتح محله هنا',fr:'Soyez le premier à ouvrir votre boutique ici'},
        emptyDesc:{ar:'محلات رزق التجارية ستظهر هنا فور فتحها — سجّل الآن وابدأ حضورك على المنصة.',fr:'Les boutiques Rizq apparaîtront ici dès leur ouverture — inscrivez-vous maintenant.'},
        emptyCta:{ar:'افتح محلك الآن',fr:'Ouvrez votre boutique maintenant'},
        bizType:'store' },
      office: { page:'rizq_office.html', icon:'🏢', badge:{ar:'مكتب',fr:'Bureau'},
        emptyTitle:{ar:'كن أول من يفتح مكتبه هنا',fr:'Soyez le premier à ouvrir votre bureau ici'},
        emptyDesc:{ar:'المكاتب الافتراضية ستظهر هنا فور فتحها — سجّل الآن وابدأ حضورك على المنصة.',fr:'Les bureaux virtuels apparaîtront ici dès leur ouverture — inscrivez-vous maintenant.'},
        emptyCta:{ar:'أنشئ مكتبك الآن',fr:'Créez votre bureau maintenant'},
        bizType:'office' },
      corp: { page:'rizq_showroom.html', icon:'🏬', badge:{ar:'معرض',fr:'Showroom'},
        emptyTitle:{ar:'كن أول من يفتح معرضه هنا',fr:'Soyez le premier à ouvrir votre showroom ici'},
        emptyDesc:{ar:'المعارض ستظهر هنا فور فتحها — سجّل الآن وابدأ حضورك على المنصة.',fr:'Les showrooms apparaîtront ici dès leur ouverture — inscrivez-vous maintenant.'},
        emptyCta:{ar:'أنشئ معرضك الآن',fr:'Créez votre showroom maintenant'},
        bizType:'corp' },
      estate: { page:'rizq_estate.html', icon:'🏠', badge:{ar:'سوق العقارات',fr:'Marché immobilier'},
        emptyTitle:{ar:'كن أول من يفتح بوابته العقارية هنا',fr:'Soyez le premier à ouvrir votre portail immobilier'},
        emptyDesc:{ar:'الوكالات والعروض العقارية ستظهر هنا فور نشرها — سجّل الآن وابدأ بصور فخمة.',fr:'Les agences et offres immobilières apparaîtront ici dès publication — inscrivez-vous et commencez avec de belles photos.'},
        emptyCta:{ar:'افتح بوابتك العقارية',fr:'Ouvrez votre portail immobilier'},
        bizType:'estate' },
      tenders: { page:'rizq_tenders.html', icon:'📑', badge:{ar:'مناقصة',fr:'Appel d\'offres'},
        emptyTitle:{ar:'كن أول من ينشر مناقصته هنا',fr:'Soyez le premier à publier un appel d\'offres'},
        emptyDesc:{ar:'المناقصات المفتوحة ستظهر هنا فور نشرها — اشترك في الغرفة وابدأ.',fr:'Les appels d\'offres ouverts apparaîtront ici dès leur publication.'},
        emptyCta:{ar:'انشر مناقصة',fr:'Publier un AO'},
        bizType:'tenders' },
      investments: { page:'rizq_investments.html', icon:'📈', badge:{ar:'استثمار',fr:'Investissement'},
        emptyTitle:{ar:'كن أول من ينشر فرصته الاستثمارية هنا',fr:'Soyez le premier à publier une opportunité'},
        emptyDesc:{ar:'فرص الاستثمار ستظهر هنا فور نشرها ومراجعتها — ادخل الغرفة وابدأ.',fr:'Les opportunités d\'investissement apparaîtront ici dès publication et revue.'},
        emptyCta:{ar:'انشر فرصة',fr:'Publier une opportunité'},
        bizType:'investments' }
    };

    /** معاينات عند الفراغ التام فقط — بصور غلاف حقيقية مثل واجهة المحل */
    var EMPTY_EXAMPLES = {
      store: [
        { href:'rizq_store.html?demo=1', nameAr:'محل النور', nameFr:'Boutique Al-Nour', tagAr:'أزياء وعطور وإكسسوارات', tagFr:'Mode, parfums et accessoires', icon:'🏪', cover:'/demo-media/u-1441986300917-64674bd600d8.svg' },
        { href:'rizq_store.html?demo=1', nameAr:'واجهة محل بالصور والاسم', nameFr:'Vitrine photo + nom', tagAr:'أزياء وموضة', tagFr:'Mode', icon:'👗', cover:'/demo-media/u-1483985988355-763728e1935b.svg' }
      ],
      corp: [
        { href:'rizq_showroom.html?demo=1', nameAr:'معرض نموذجي على رزق', nameFr:'Showroom modèle Rizq', tagAr:'معارض سيارات', tagFr:'Showroom auto', icon:'🚗', cover:'/demo-media/u-1492144534655-ae79c964c9d7.svg' },
        { href:'rizq_showroom.html?demo=1', nameAr:'كتالوج معرض بالصور', nameFr:'Catalogue showroom', tagAr:'أثاث وإلكترونيات', tagFr:'Meubles & tech', icon:'🏬', cover:'/demo-media/u-1555041469-a586c61ea9bc.svg' }
      ],
      office: [
        { href:'rizq_office.html?demo=1', nameAr:'مكتب محاماة نموذجي', nameFr:'Cabinet d\'avocats modèle', tagAr:'محامون وقانون', tagFr:'Avocats & droit', icon:'⚖️', cover:'/demo-media/u-1497366216548-37526070297c.svg' },
        { href:'rizq_office.html?demo=1', nameAr:'مكتب خدمات إدارية', nameFr:'Bureau administratif', tagAr:'خدمات إدارية', tagFr:'Services admin.', icon:'🏛️', cover:'/demo-media/u-1521791136064-7986c2920216.svg' }
      ],
      estate: [
        { href:'rizq_estate.html?demo=1', nameAr:'فيلا بإطلالة غروب', nameFr:'Villa vue coucher de soleil', tagAr:'فلل راقية', tagFr:'Villas premium', icon:'🏡', cover:'/demo-media/u-1613490493576-7fde63acd811.svg' },
        { href:'rizq_estate.html?demo=1', nameAr:'شقة فاخرة في المدينة', nameFr:'Appartement premium', tagAr:'شقق للكراء والبيع', tagFr:'Appartements', icon:'🏠', cover:'/demo-media/u-1502672260266-1c1ef2d93688.svg' }
      ]
    };

    var DEMO_COVER_BY_TYPE = {
      store: '/demo-media/u-1441986300917-64674bd600d8.svg',
      corp: '/demo-media/u-1492144534655-ae79c964c9d7.svg',
      office: '/demo-media/u-1497366216548-37526070297c.svg',
      estate: '/demo-media/u-1613490493576-7fde63acd811.svg'
    };

    function safeDiscMediaUrl(u){
      var s = String(u == null ? '' : u).trim();
      if(!s || /javascript:/i.test(s) || /[\s<>"']/.test(s)) return '';
      if(!/^(https?:\/\/|\/|data:image\/)/i.test(s)) return '';
      return s;
    }
    function accountCardMedia(acc, type){
      if(!acc) return '';
      var media = safeDiscMediaUrl(acc.cover) || safeDiscMediaUrl(acc.thumb);
      if(media) return media;
      var id = String(acc.id || '');
      if(id === 'demo_store' || id === 'demo_corp' || id === 'demo_office' || id === 'demo_law' || /^acc_promo_/.test(id) || acc.graduationDemo){
        return DEMO_COVER_BY_TYPE[type] || DEMO_COVER_BY_TYPE.store;
      }
      /* محل النور التجريبي غالباً بلا thumb في localStorage */
      if(type === 'store' && /محل النور|Al-Nour|Al Nour/i.test(String(acc.name || ''))){
        return DEMO_COVER_BY_TYPE.store;
      }
      return '';
    }

    /** احتياطي واجهة إن تعذّر الـ API — نفس أسماء بذور التخرج (acc_grad_*) */
    function showcaseAccounts(type){
      var now = Date.now();
      var mk = function(id, name, tagline, city, photo, offsetHrs){
        var media = photo || DEMO_COVER_BY_TYPE[type] || '';
        return {
          id: id, type: type, status: 'approved', graduationDemo: true,
          name: name, tagline: tagline, city: city,
          cover: media, thumb: media,
          approvedAt: new Date(now - offsetHrs * 3600000).toISOString()
        };
      };
      if(type === 'store'){
        return [
          mk('acc_grad_store_01', 'تقنية الشنقيط', 'هواتف وإكسسوارات أصلية بأسعار واضحة', 'نواكشوط', '/demo-media/u-1511707171634-5f897ff02aa9.svg', 2),
          mk('acc_grad_store_02', 'أناقة موريتانيا', 'دراعة وأزياء رجالية ونسائية', 'نواكشوط', '/demo-media/u-1483985988355-763728e1935b.svg', 8),
          mk('acc_grad_store_03', 'سوق الأمل للأغذية', 'تموين يومي ومواد غذائية جملة وتجزئة', 'نواذيبو', '/demo-media/u-1542838132-92c53300491e.svg', 14),
          mk('acc_grad_store_04', 'ذهبيات روصو', 'ذهب ومجوهرات بأوزان وأسعار معلنة', 'روصو', '/demo-media/u-1515562141207-7a88fb7ce338.svg', 20),
          mk('acc_grad_store_05', 'بيت الديكور', 'أثاث ومفروشات منزلية عصرية', 'نواكشوط', '/demo-media/u-1555041469-a586c61ea9bc.svg', 30)
        ];
      }
      if(type === 'corp'){
        return [
          mk('acc_grad_corp_01', 'معرض أمل للسيارات', 'سيارات جديدة ومستعملة موثّقة بالوثائق', 'نواكشوط', '/demo-media/u-1492144534655-ae79c964c9d7.svg', 3),
          mk('acc_grad_corp_02', 'معرض المحيط للإلكترونيات', 'أجهزة وشاشات وكمبيوترات للجملة والتجزئة', 'نواكشوط', '/demo-media/u-1498049860655-afd7e5aa8d6f.svg', 12),
          mk('acc_grad_corp_03', 'معرض الواحة للأثاث', 'أطقم وصالات ومكاتب للشركات والمنازل', 'نواذيبو', '/demo-media/u-1555041469-a586c61ea9bc.svg', 22)
        ];
      }
      if(type === 'office'){
        return [
          mk('acc_grad_office_01', 'مكتب أطوار للعقارات', 'بيع وإيجار واستشارات عقارية في كل الولايات', 'نواكشوط', '/demo-media/u-1560518883-ce09059eeffa.svg', 5),
          mk('acc_grad_office_02', 'مكتب النخبة للمحاماة', 'استشارات وقضايا مدنية وتجارية', 'نواكشوط', '/demo-media/u-1497366216548-37526070297c.svg', 16),
          mk('acc_grad_office_03', 'وكالة الصدى الإدارية', 'خدمات إدارية ومعاملات بسرعة ووضوح', 'روصو', '/demo-media/u-1521791136064-7986c2920216.svg', 28)
        ];
      }
      if(type === 'estate'){
        return [
          mk('acc_grad_estate_01', 'أطوار للعقارات', 'فلل وشقق وأراضي بصور احترافية', 'نواكشوط', '/demo-media/u-1613490493576-7fde63acd811.svg', 4),
          mk('acc_grad_estate_02', 'واجهة القطب السكني', 'شقق فاخرة للكراء والبيع', 'تفرغ زينة', '/demo-media/u-1502672260266-1c1ef2d93688.svg', 11),
          mk('acc_grad_estate_03', 'أراضي الساحل', 'قطع سكنية وتجارية بوثائق واضحة', 'نواذيبو', '/demo-media/u-1500382017468-9049fed747ef.svg', 19),
          mk('acc_grad_estate_04', 'منزل الواحة', 'منازل عائلية بحدائق خاصة', 'كيفة', '/demo-media/u-1600596542815-ffad4c1539a9.svg', 27)
        ];
      }
      return [];
    }

    /** صياغة مميّزة لكل قسم — نفس إيقاع شريط الإعلانات: [أحدث … على رزق] — [ميزة القسم] */
    function liveHeadHTML(type, fr){
      var sub = {
        ads: {
          ar: 'الإعلانات على رزق — عروض تخطف الأنظار',
          fr: 'Dernières annonces sur Rizq — offres qui impressionnent'
        },
        store: {
          ar: 'المحلات على رزق — واجهات تفتح أبوابها للزبائن',
          fr: 'Dernières boutiques sur Rizq — des vitrines ouvertes aux clients'
        },
        corp: {
          ar: 'المعارض على رزق — كتالوج يلفت أنظار الجادّين',
          fr: 'Derniers showrooms sur Rizq — un catalogue qui attire les acheteurs sérieux'
        },
        office: {
          ar: 'المكاتب على رزق — حضور مهني يصل لطالبي الخدمة',
          fr: 'Derniers bureaux sur Rizq — une présence pro qui trouve ses clients'
        },
        estate: {
          ar: 'العقارات على رزق — عروض تليق بالجادّين',
          fr: 'Dernières offres immobilières sur Rizq — des offres pour acheteurs sérieux'
        },
        tenders: {
          ar: 'المناقصات على رزق — فرص توريد وتعاقد حقيقية',
          fr: 'Derniers appels d\'offres sur Rizq — de vraies opportunités de contrat'
        },
        investments: {
          ar: 'الاستثمارات على رزق — شراكات نمو بثقة ووضوح',
          fr: 'Derniers investissements sur Rizq — des partenariats de croissance en confiance'
        }
      }[type] || {
        ar: 'على رزق — ما يستحق انتباهك الآن',
        fr: 'Récent sur Rizq — ce qui mérite votre attention'
      };
      var live = fr ? 'Récent' : 'أحدث';
      return '<div class="rzq-disc-live-head">'
        + '<span class="live-capsule"><span class="live-capsule-light" aria-hidden="true"></span><strong class="live-capsule-txt">'+live+'</strong></span>'
        + '<span class="live-label-sub">'+esc(fr ? sub.fr : sub.ar)+'</span>'
        + '</div>';
    }

    var TENDER_CAT = {
      'سيارات':{ar:'🚗 سيارات',fr:'🚗 Voitures'},
      'إلكترونيات':{ar:'📱 إلكترونيات',fr:'📱 Électronique'},
      'أثاث':{ar:'🛋️ أثاث',fr:'🛋️ Meubles'},
      'معدات':{ar:'⚙️ معدات',fr:'⚙️ Équipements'},
      'بناء':{ar:'🏗️ مواد بناء',fr:'🏗️ Matériaux'},
      'ذهب':{ar:'💎 مجوهرات',fr:'💎 Bijoux'},
      'أخرى':{ar:'🏷️ أخرى',fr:'🏷️ Autre'}
    };

    function cardHTML(acc, cfg, fr){
      var media = accountCardMedia(acc, acc && acc.type || cfg.bizType);
      var img = media
        ? '<img src="'+esc(media)+'" alt="" width="210" height="132" loading="lazy" decoding="async"'+(typeof _rizqImgPlaceholderOnError==='function'?_rizqImgPlaceholderOnError():'')+'/>'
        : '<div class="rzq-disc-img-fallback" aria-hidden="true">'+cfg.icon+'</div>';
      var tagline = (acc.tagline||'').slice(0,50);
      return '<a class="rzq-disc-card" href="'+cfg.page+'?id='+encodeURIComponent(acc.id)+'">'
        + '<div class="rzq-disc-img">'+img+'</div>'
        + '<div class="rzq-disc-body">'
        +   '<div class="rzq-disc-name">'+esc(acc.name||'')+'</div>'
        +   (tagline ? '<div class="rzq-disc-tag">'+esc(tagline)+'</div>' : '')
        +   '<span class="rzq-disc-badge">'+cfg.icon+' '+esc(cfg.badge[fr?'fr':'ar'])+'</span>'
        + '</div></a>';
    }

    function tenderCardHTML(t, fr){
      var cfg = TYPE_CFG.tenders;
      var cat = TENDER_CAT[t.category] ? TENDER_CAT[t.category][fr?'fr':'ar'] : (t.category || (fr?'Appel d\'offres':'مناقصة'));
      var days = '';
      if(t.deadline){
        var d = Math.max(1, Math.ceil((new Date(t.deadline).getTime() - Date.now()) / 86400000));
        days = fr ? (d + ' j restants') : ('متبقٍ ' + d + ' يوم');
      }
      return '<a class="rzq-disc-card" href="'+cfg.page+'">'
        + '<div class="rzq-disc-img" style="display:flex;align-items:center;justify-content:center;font-size:34px">📋</div>'
        + '<div class="rzq-disc-body">'
        +   '<div class="rzq-disc-name">'+esc(cat)+'</div>'
        +   '<div class="rzq-disc-tag">'+esc((t.city||'')+(t.city&&days?' · ':'')+days)+'</div>'
        +   '<span class="rzq-disc-badge">'+cfg.icon+' '+esc(cfg.badge[fr?'fr':'ar'])+'</span>'
        + '</div></a>';
    }

    function investmentCardHTML(o, fr){
      var cfg = TYPE_CFG.investments;
      var title = (o.title || '').slice(0, 48) || (fr ? 'Opportunité' : 'فرصة استثمارية');
      var meta = [o.sector, o.wilaya, o.stage].filter(Boolean).join(' · ');
      return '<a class="rzq-disc-card" href="'+cfg.page+'">'
        + '<div class="rzq-disc-img" style="display:flex;align-items:center;justify-content:center;font-size:34px">📈</div>'
        + '<div class="rzq-disc-body">'
        +   '<div class="rzq-disc-name">'+esc(title)+'</div>'
        +   (meta ? '<div class="rzq-disc-tag">'+esc(meta)+'</div>' : '')
        +   '<span class="rzq-disc-badge">'+cfg.icon+' '+esc(cfg.badge[fr?'fr':'ar'])+'</span>'
        + '</div></a>';
    }

    function emptyHTML(cfg, fr){
      var samples = EMPTY_EXAMPLES[cfg.bizType] || [];
      var exLabel = fr
        ? 'Aperçu — cliquez une carte pour ouvrir la page'
        : 'معاينة — اضغط البطاقة لفتح الصفحة';
      var examples = '';
      if(samples.length){
        examples = '<div class="rzq-disc-empty-examples">'
          + '<p class="rzq-disc-ex-label">'+esc(exLabel)+'</p>'
          +           samples.map(function(ex){
            var name = fr ? ex.nameFr : ex.nameAr;
            var tag = fr ? ex.tagFr : ex.tagAr;
            var cover = safeDiscMediaUrl(ex.cover);
            var mediaHtml = cover
              ? '<img src="'+esc(cover)+'" alt="" loading="lazy" decoding="async"/>'
              : '<div class="rzq-disc-img-fallback" aria-hidden="true">'+ex.icon+'</div>';
            return '<a class="rzq-disc-card" href="'+esc(ex.href)+'">'
              + '<div class="rzq-disc-img">'+mediaHtml+'</div>'
              + '<div class="rzq-disc-body">'
              +   '<div class="rzq-disc-name">'+esc(name)+'</div>'
              +   (tag ? '<div class="rzq-disc-tag">'+esc(tag)+'</div>' : '')
              +   '<span class="rzq-disc-badge">'+(fr?'Démo':'مثال')+'</span>'
              + '</div></a>';
          }).join('')
          + '</div>';
      }
      return '<div class="rzq-disc-empty">'
        + '<div class="rzq-disc-empty-icon">'+cfg.icon+'</div>'
        + '<div class="rzq-disc-empty-title">'+esc(cfg.emptyTitle[fr?'fr':'ar'])+'</div>'
        + '<div class="rzq-disc-empty-desc">'+esc(cfg.emptyDesc[fr?'fr':'ar'])+'</div>'
        + examples
        + '</div>';
    }

    /** يضمن أن الشريط أعرض من الشاشة — وإلا بطاقة/بطاقتان تتجمدان على الهاتف */
    function ensureStripOverflow(strip){
      if(!strip) return;
      var track = strip.querySelector('.rzq-disc-track');
      if(!track) return;
      var unit = track.getAttribute('data-loop-unit') || '';
      if(!unit){
        /* استخرج نسخة واحدة من عدد النسخ الحالية */
        var n0 = parseInt(track.getAttribute('data-loop-copies') || '2', 10) || 2;
        var html = track.innerHTML;
        if(n0 > 1 && html){
          /* تقريب: لا نجزّئ HTML؛ نستخدم المحتوى كاملاً كوحدة إن لم تُحفظ */
          unit = html;
        } else {
          unit = html;
        }
      }
      if(!unit) return;
      var copies = parseInt(track.getAttribute('data-loop-copies') || '2', 10) || 2;
      var guard = 0;
      while(track.scrollWidth <= strip.clientWidth + 12 && guard < 16){
        track.insertAdjacentHTML('beforeend', unit);
        copies += 1;
        guard += 1;
      }
      track.setAttribute('data-loop-copies', String(Math.max(2, copies)));
    }

    function mountStrip(mount, cardsHTML, cfg, fr, opts){
      opts = opts || {};
      if(!cardsHTML){
        mount.innerHTML = emptyHTML(cfg, fr);
        return;
      }
      /* عند وجود محلات/حسابات: لا خلفية فارغة ولا نص «كن أول…» — شريط مباشر فقط */
      var head = opts.liveType ? liveHeadHTML(opts.liveType, fr) : '';
      var cardCount = (cardsHTML.match(/class="rzq-disc-card"/g) || []).length;
      /* بطاقة واحدة (~170px) على هاتف ~390px: نسختان فقط تملآن الشاشة وتتجمد — نكرّر حتى يفيض */
      var copies = cardCount >= DISCOVERY_MIN_STRIP_CARDS
        ? 2
        : Math.max(6, Math.ceil(14 / Math.max(1, cardCount)));
      var loopHTML = '';
      for(var ci = 0; ci < copies; ci++) loopHTML += cardsHTML;
      mount.innerHTML = head
        + '<div class="rzq-disc-strip">'
        + '<div class="rzq-disc-track" data-loop-copies="'+copies+'">' + loopHTML + '</div>'
        + '</div>';
      var strip = mount.querySelector('.rzq-disc-strip');
      var track = strip && strip.querySelector('.rzq-disc-track');
      if(track){
        try{ track.setAttribute('data-loop-unit', cardsHTML); }catch(eU){}
      }
      if(strip){
        ensureStripOverflow(strip);
        try{
          requestAnimationFrame(function(){ ensureStripOverflow(strip); });
        }catch(eR){}
        initAutoScroll(strip);
      }
    }

    function padDiscoveryList(list, type){
      var out = Array.isArray(list) ? list.slice() : [];
      if(out.length >= DISCOVERY_MIN_STRIP_CARDS) return out;
      var known = {};
      out.forEach(function(a){ if(a && a.id) known[a.id] = true; });
      /* عيّنات التخرج أولاً — تنوّع بصري بدل تكرار نفس المحل مرتين */
      showcaseAccounts(type).forEach(function(a){
        if(out.length >= DISCOVERY_MIN_STRIP_CARDS) return;
        if(!a || !a.id || known[a.id]) return;
        known[a.id] = true;
        out.push(a);
      });
      /* لا تكرار هوية ظاهرية (أمل×N) — التكرار البصري لدورة الـ marquee فقط عبر mountStrip */
      return out;
    }

    function initAutoScroll(strip){
      var track = strip.querySelector('.rzq-disc-track');
      if(!track) return;
      if(strip._rzqScrollBound) return;
      strip._rzqScrollBound = true;
      /* إن لم تُكرَّر البطاقات (أشرطة أخرى) — انسخ الوحدة لدورة سلسة */
      if(!track.getAttribute('data-loop-copies')){
        var unit0 = track.innerHTML;
        if(unit0){
          track.innerHTML = unit0 + unit0;
          track.setAttribute('data-loop-unit', unit0);
          track.setAttribute('data-loop-copies', '2');
        }
      }
      try{ strip.style.overflow = 'hidden'; }catch(eOv){}
      var dragging = false;
      var pos = 0;
      var basePx = 42; /* بكسل/ثانية — يتحرك حتى لو بطاقة واحدة */
      var boostPx = 0;
      var decayTimer = 0;
      var lastX = null;
      var lastT = 0;
      var lastTs = 0;
      var dir = 1;
      var userPaused = false;
      var hoverPaused = false;
      var ctl = {
        get boostPx(){ return boostPx; },
        set boostPx(v){ boostPx = v; },
        get dir(){ return dir; },
        set dir(v){ dir = v < 0 ? -1 : 1; },
        get userPaused(){ return userPaused; },
        set userPaused(v){ userPaused = !!v; },
        get hoverPaused(){ return hoverPaused; },
        set hoverPaused(v){ hoverPaused = !!v; }
      };
      function isRtl(){ return document.documentElement.getAttribute('dir') !== 'ltr'; }
      function loopSpan(){
        var n = parseInt(track.getAttribute('data-loop-copies') || '2', 10) || 2;
        var w = track.scrollWidth / Math.max(2, n);
        return w > 1 ? w : Math.max(1, track.scrollWidth / 2);
      }
      function apply(){
        var span = loopSpan();
        if(span > 1){
          if(pos >= span) pos = pos % span;
          if(pos < 0) pos = (pos % span + span) % span;
        }
        /* نفس منطق أشرطة المباشر: عربي من -span نحو 0 */
        var x = isRtl() ? (-span + pos) : (-pos);
        track.style.transform = 'translate3d(' + x.toFixed(3) + 'px,0,0)';
      }
      function applyBoost(raw){
        boostPx = Math.max(0, Math.min(220, raw));
        if(decayTimer) clearTimeout(decayTimer);
        decayTimer = setTimeout(function(){ boostPx = 0; }, 900);
      }
      function samplePointer(clientX, drag){
        var t = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if(lastX != null){
          var dx = clientX - lastX;
          var dt = Math.max(8, t - lastT);
          if(!(userPaused || hoverPaused)) applyBoost(Math.abs(dx) / dt * 1000 * 0.42);
          if(drag){
            if(dx) dir = dx < 0 ? -1 : 1;
            /* سحب يدوي يزيح الشريط فوراً */
            pos += isRtl() ? dx : -dx;
            apply();
          }
        }
        lastX = clientX;
        lastT = t;
      }
      strip.addEventListener('pointerdown', function(ev){
        dragging = true; lastX = ev.clientX; lastT = 0;
      }, {passive:true});
      strip.addEventListener('pointerup', function(){ dragging = false; lastX = null; }, {passive:true});
      strip.addEventListener('pointercancel', function(){ dragging = false; lastX = null; }, {passive:true});
      strip.addEventListener('pointerleave', function(){ if(!dragging) lastX = null; }, {passive:true});
      strip.addEventListener('pointermove', function(ev){
        if(ev.pointerType === 'mouse' && ev.buttons === 0){
          if(!(userPaused || hoverPaused)) samplePointer(ev.clientX, false);
          return;
        }
        if(ev.buttons || ev.pointerType === 'touch' || ev.pointerType === 'pen'){
          dragging = true;
          samplePointer(ev.clientX, true);
        }
      }, {passive:true});
      strip.addEventListener('touchmove', function(ev){
        if(!ev.touches || !ev.touches[0]) return;
        dragging = true;
        samplePointer(ev.touches[0].clientX, true);
      }, {passive:true});
      strip.addEventListener('touchend', function(){ dragging = false; lastX = null; }, {passive:true});
      strip.addEventListener('wheel', function(ev){
        var dx = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
        if(!dx) return;
        dir = dx > 0 ? 1 : -1;
        if(userPaused || hoverPaused){
          pos += (isRtl() ? -dx : dx) * 0.35;
          apply();
          return;
        }
        applyBoost(Math.min(220, Math.abs(dx) * 2.4));
        pos += (isRtl() ? -dx : dx) * 0.35;
        apply();
      }, {passive:true});
      function step(ts){
        if(!lastTs) lastTs = ts;
        var dt = Math.min(48, ts - lastTs);
        lastTs = ts;
        var span = loopSpan();
        var paused = !!(userPaused || hoverPaused);
        if(!dragging && !paused && span > 1){
          pos += (basePx + boostPx) * (dt / 1000) * (dir < 0 ? -1 : 1);
          if(pos >= span) pos -= span;
          if(pos < 0) pos += span;
          apply();
        }
        requestAnimationFrame(step);
      }
      try {
        pos = 0;
        apply();
      } catch (e0) {}
      try{
        strip._kitCtl = ctl;
        if(window.RizqMarqueeKit && typeof RizqMarqueeKit.enhanceDiscStrip === 'function'){
          RizqMarqueeKit.enhanceDiscStrip(strip, ctl);
        }
      }catch(eKitD){}
      requestAnimationFrame(step);
    }

    var _backendAccountsPromise = null;
    function _fetchBackendAccounts(){
      if(_backendAccountsPromise) return _backendAccountsPromise;
      _backendAccountsPromise = new Promise(function(resolve){
        if(!window.RIZQ_BACKEND_BASE){ resolve([]); return; }
        fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/accounts/public')
          .then(function(r){ return r.ok ? r.json() : null; })
          .then(function(data){ resolve(data && Array.isArray(data.accounts) ? data.accounts : []); })
          .catch(function(){ resolve([]); });
      });
      return _backendAccountsPromise;
    }

    /** حسابات (محل/مكتب/معرض): موافَق + اسم + جملة — الأحدث موافقة أولاً؛ شريط مباشر بلا بانر فارغ */
    function renderStrip(mountId, type){
      var mount = document.getElementById(mountId);
      if(!mount) return;
      var cfg = TYPE_CFG[type];
      var fr = isFr();
      var localAccs;
      try{ localAccs = JSON.parse(localStorage.getItem('rizq_pending_accounts')||'[]'); }catch(e){ localAccs = []; }
      _fetchBackendAccounts().then(function(remoteAccs){
        var known = {};
        var merged = [];
        localAccs.forEach(function(a){ if(a && a.id && !known[a.id]){ known[a.id]=true; merged.push(a); } });
        remoteAccs.forEach(function(a){ if(a && a.id && !known[a.id]){ known[a.id]=true; merged.push(a); } });
        var list = merged.filter(function(a){
          if(!a || String(a.id||'').indexOf('acc_demo')===0) return false;
          if(String(a.id||'').indexOf('acc_showcase_')===0) return false;
          /* صورة اختيارية: الاسم + الجملة يكفيان للظهور الحي */
          return a.status==='approved' && a.type===type && a.name && a.tagline;
        });
        list.sort(function(a,b){
          var am = accountCardMedia(a, type) ? 1 : 0;
          var bm = accountCardMedia(b, type) ? 1 : 0;
          if(bm !== am) return bm - am;
          return new Date(b.approvedAt||0) - new Date(a.approvedAt||0);
        });

        /* عيّنات العرض فقط قبل الإطلاق (أو ?demo=1) — بعد الإطلاق تبقى الحاوية فارغة/حية */
        var discDemoOk = (window.RizqDemo && typeof RizqDemo.inventoryAllowed === 'function')
          ? RizqDemo.inventoryAllowed()
          : !(window.RIZQ_LAUNCH && RIZQ_LAUNCH.launchDate);
        if(discDemoOk){
          if(list.length < DISCOVERY_MIN_READY_ACCOUNTS){
            list = showcaseAccounts(type);
          } else if(!list.some(function(a){ return !!accountCardMedia(a, type); })){
            list = showcaseAccounts(type).concat(list);
          }
          list = padDiscoveryList(list, type);
        }
        if(!list.length){
          mountStrip(mount, '', cfg, fr);
          return;
        }
        var cardsHTML = list.slice(0, DISCOVERY_MAX_CARDS).map(function(a){ return cardHTML(a, cfg, fr); }).join('');
        mountStrip(mount, cardsHTML, cfg, fr, { liveType: type });
      });
    }

    /** مناقصات / استثمارات: عتبة أعلى للعناصر المنشورة */
    function renderFeedStrip(mountId, kind){
      var mount = document.getElementById(mountId);
      if(!mount) return;
      var cfg = TYPE_CFG[kind];
      var fr = isFr();
      if(!window.RIZQ_BACKEND_BASE){
        mountStrip(mount, '', cfg, fr);
        return;
      }
      var url = window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + (kind==='tenders'
        ? '/api/tenders/public-stats'
        : '/api/investments/public-stats');
      fetch(url)
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(data){
          var teasers = data && data.ok && Array.isArray(data.teasers) ? data.teasers : [];
          var count = data && data.ok ? Number(data.count||teasers.length) : 0;
          if(count < DISCOVERY_MIN_READY_FEEDS || teasers.length < DISCOVERY_MIN_READY_FEEDS){
            mountStrip(mount, '', cfg, fr);
            return;
          }
          var cardsHTML = teasers.slice(0, DISCOVERY_MAX_CARDS).map(function(row){
            return kind==='tenders' ? tenderCardHTML(row, fr) : investmentCardHTML(row, fr);
          }).join('');
          mountStrip(mount, cardsHTML, cfg, fr, { liveType: kind });
        })
        .catch(function(){ mountStrip(mount, '', cfg, fr); });
    }

    // ── ⏳ "ينتهي قريباً" — إعلانات مثبَّتة + مناقصات مفتوحة قاربت الانتهاء
    // (مهمة #234/#237) — GET /api/discovery/ending-soon العام والآمن ──
    function endingSoonAdCardHTML(a, fr){
      var hrsLeft = Math.max(1, Math.round((new Date(a.endsAt).getTime() - Date.now()) / 3600000));
      var timeLbl = fr ? ('⏳ ' + hrsLeft + 'h restantes') : ('⏳ متبقٍ ' + hrsLeft + ' س');
      var priceTxt = a.price ? (a.price + ' MRU') : (fr ? 'À négocier' : 'تفاوض');
      var pNum = parseInt(String(a.price||'0').replace(/[^\d]/g,''))||0;
      var oNum = parseInt(String(a.originalPrice||'0').replace(/[^\d]/g,''))||0;
      var discPct = (oNum>0 && pNum>0 && oNum>pNum) ? Math.round((1-(pNum/oNum))*100) : 0;
      return '<a class="rzq-disc-card" href="rizq_browse.html?id='+encodeURIComponent(a.adId)+'">'
        + '<div class="rzq-disc-img" style="display:flex;align-items:center;justify-content:center;font-size:38px;position:relative">'+esc(a.emoji||'📦')
        +   (discPct>0?'<span style="position:absolute;top:4px;left:4px;background:#dc2626;color:#fff;font-size:9px;font-weight:800;padding:1px 5px;border-radius:4px">-'+discPct+'%</span>':'')
        + '</div>'
        + '<div class="rzq-disc-body">'
        +   '<div class="rzq-disc-name">'+esc(a.title||'')+'</div>'
        +   '<div class="rzq-disc-tag">'+esc(priceTxt)+(a.wilaya?(' · '+esc(a.wilaya)):'')+'</div>'
        +   '<span class="rzq-disc-badge" style="background:rgba(220,38,38,.1);color:#dc2626;border-color:rgba(220,38,38,.3)">'+timeLbl+'</span>'
        + '</div></a>';
    }
    function endingSoonTenderTeaserHTML(count, fr){
      return '<a class="rzq-disc-card" href="rizq_tenders.html" style="background:linear-gradient(135deg,#0D1B2A,#1B3A6B)">'
        + '<div class="rzq-disc-img" style="display:flex;align-items:center;justify-content:center;font-size:38px;background:transparent">📋</div>'
        + '<div class="rzq-disc-body" style="text-align:center">'
        +   '<div class="rzq-disc-name" style="color:#fff">'+(fr?(count+(count===1?' appel d\'offres se termine bientôt':' appels d\'offres se terminent bientôt')):(count+' مناقصة مفتوحة تنتهي قريباً'))+'</div>'
        +   '<span class="rzq-disc-badge">'+(fr?'📋 Voir la salle':'📋 ادخل الغرفة')+'</span>'
        + '</div></a>';
    }
    function renderEndingSoon(){
      var block = document.getElementById('ending-soon-block');
      var mount = document.getElementById('ending-soon-mount');
      if(!block || !mount || !window.RIZQ_BACKEND_BASE) return Promise.resolve(false);
      var fr = isFr();
      return fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/discovery/ending-soon?hours=72')
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(data){
          if(!data || !data.ok) return false;
          var ads = Array.isArray(data.ads) ? data.ads : [];
          var tendersCount = Number(data.tendersTotalOpen) || 0;
          if(!ads.length && !tendersCount) return false;
          var cardsHTML = ads.map(function(a){ return endingSoonAdCardHTML(a, fr); }).join('');
          if(tendersCount > 0) cardsHTML += endingSoonTenderTeaserHTML(tendersCount, fr);
          mount.innerHTML = '<div class="rzq-disc-strip"><div class="rzq-disc-track">' + cardsHTML + '</div></div>';
          initAutoScroll(mount.querySelector('.rzq-disc-strip'));
          block.style.display = '';
          return true;
        }).catch(function(){ return false; });
    }

    // ── ⭐ "بائعون موثوقون" — أعلى الحسابات تقييماً فعلياً (مهمة #235/#237)
    // من نظام المراجعات الحقيقي (#244)، عبر GET /api/discovery/top-sellers ──
    function starsHTML(n){ var s=''; var r=Math.round(n); for(var i=1;i<=5;i++) s += (i<=r?'★':'☆'); return s; }
    function topSellerCardHTML(seller, fr){
      var cfg = TYPE_CFG[seller.type] || TYPE_CFG.store;
      var media = accountCardMedia(seller, seller && seller.type || 'store');
      var img = media
        ? '<img src="'+esc(media)+'" alt="" loading="lazy" decoding="async"/>'
        : '<div class="rzq-disc-img-fallback" aria-hidden="true">'+cfg.icon+'</div>';
      return '<a class="rzq-disc-card" href="'+cfg.page+'?id='+encodeURIComponent(seller.id)+'">'
        + '<div class="rzq-disc-img">'+img+'</div>'
        + '<div class="rzq-disc-body">'
        +   '<div class="rzq-disc-name">'+esc(seller.name||'')+'</div>'
        +   '<div class="rzq-disc-tag" style="color:#F5A623;font-weight:700">'+starsHTML(seller.average)+' <span style="color:#5b6b85;font-weight:400">('+seller.count+')</span></div>'
        +   '<span class="rzq-disc-badge">'+cfg.icon+' '+esc(cfg.badge[fr?'fr':'ar'])+'</span>'
        + '</div></a>';
    }
    function renderTopSellers(){
      var block = document.getElementById('top-sellers-block');
      var mount = document.getElementById('top-sellers-mount');
      if(!block || !mount || !window.RIZQ_BACKEND_BASE) return Promise.resolve(false);
      var fr = isFr();
      return fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/discovery/top-sellers?limit=12&minReviews=2')
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(data){
          var sellers = data && data.ok && Array.isArray(data.sellers) ? data.sellers : [];
          if(sellers.length < 3) return false; // أقل من 3 لا يستحق شريطاً كاملاً (نفس منطق أشرطة الاكتشاف أعلاه)
          var cardsHTML = sellers.map(function(s){ return topSellerCardHTML(s, fr); }).join('');
          mount.innerHTML = '<div class="rzq-disc-strip"><div class="rzq-disc-track">' + cardsHTML + '</div></div>';
          initAutoScroll(mount.querySelector('.rzq-disc-strip'));
          block.style.display = '';
          return true;
        }).catch(function(){ return false; });
    }

    function recentlyViewedCardHTML(a, fr){
      var pNum = parseInt(String(a.price||'0').replace(/[^\d]/g,''))||0;
      var oNum = parseInt(String(a.originalPrice||'0').replace(/[^\d]/g,''))||0;
      var discPct = (oNum>0 && pNum>0 && oNum>pNum) ? Math.round((1-(pNum/oNum))*100) : 0;
      var priceTxt = a.price ? (pNum.toLocaleString()+' MRU') : (fr ? 'À négocier' : 'تفاوض');
      var stockQty = (a.stockQty!=null && Number.isFinite(Number(a.stockQty))) ? Number(a.stockQty) : null;
      return '<a class="rzq-disc-card" href="rizq_browse.html?id='+encodeURIComponent(a.id)+'">'
        + '<div class="rzq-disc-img" style="display:flex;align-items:center;justify-content:center;font-size:38px;position:relative">'+esc(a.emoji||'📦')
        +   (discPct>0?'<span style="position:absolute;top:4px;left:4px;background:#dc2626;color:#fff;font-size:9px;font-weight:800;padding:1px 5px;border-radius:4px">-'+discPct+'%</span>':'')
        + '</div>'
        + '<div class="rzq-disc-body">'
        +   '<div class="rzq-disc-name">'+esc(a.title||'')+'</div>'
        +   '<div class="rzq-disc-tag">'+esc(priceTxt)+(a.wilaya?(' · '+esc(a.wilaya)):'')+'</div>'
        +   (a.boosted?'<span class="rzq-disc-badge">⭐ '+(fr?'Sponsorisé':'مُموَّل')+'</span>':'')
        +   ((stockQty!=null && stockQty<=5)?'<span class="rzq-disc-badge" style="background:rgba(217,119,6,.12);color:#b45309;border-color:rgba(217,119,6,.3)">⚡ '+(fr?('Il ne reste que '+stockQty+' !'):('متبقي '+stockQty+' فقط'))+'</span>':'')
        + '</div></a>';
    }
    // شريط "تابع التصفح" — يقرأ معرّفات الإعلانات التي زارها هذا المتصفح
    // فعلياً (localStorage['rizq_recently_viewed']، مُسجَّلة من rizq_listing.html)
    // ويجلب بياناتها الحية دفعة واحدة عبر GET /api/ads/batch (بدل تخزين نسخة
    // قديمة محلياً قد لا تعكس السعر/الحالة الحالية للإعلان).
    function renderRecentlyViewed(){
      var block = document.getElementById('recently-viewed-block');
      var mount = document.getElementById('recently-viewed-mount');
      if(!block || !mount || !window.RIZQ_BACKEND_BASE) return Promise.resolve(false);
      var ids = [];
      try{ ids = JSON.parse(localStorage.getItem('rizq_recently_viewed') || '[]'); }catch(e){}
      if(!Array.isArray(ids) || ids.length < 2) return Promise.resolve(false);
      var fr = isFr();
      return fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/ads/batch?ids=' + ids.map(encodeURIComponent).join(','))
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(data){
          var ads = data && data.ok && Array.isArray(data.ads) ? data.ads : [];
          if(ads.length < 2) return false;
          var cardsHTML = ads.map(function(a){ return recentlyViewedCardHTML(a, fr); }).join('');
          mount.innerHTML = '<div class="rzq-disc-strip"><div class="rzq-disc-track">' + cardsHTML + '</div></div>';
          initAutoScroll(mount.querySelector('.rzq-disc-strip'));
          block.style.display = '';
          return true;
        }).catch(function(){ return false; });
    }

    // ── ❤️ "المفضلة لديك" — تقرأ localStorage['rizq_wishlist'] (مُصلَحة هذه
    // الجولة في browse/search/listing لتُخزَّن فعلياً بدل Set في الذاكرة كانت
    // تُفرَّغ مع كل تحميل صفحة) وتجلب بياناتها الحيّة دفعة واحدة عبر
    // GET /api/ads/batch، بنفس نمط "تابع التصفح" تماماً. ──
    function renderWishlist(forceReveal){
      var block = document.getElementById('wishlist-block');
      var mount = document.getElementById('wishlist-mount');
      if(!block || !mount) return Promise.resolve(false);
      // بدون حساب: لا مفضلة محلية — يمنع عداد 2 مع قائمة فارغة
      if (window.RizqUx && typeof RizqUx.hasWishlistAccount === 'function' && !RizqUx.hasWishlistAccount()) {
        if (typeof RizqUx.clearGuestWishlist === 'function') RizqUx.clearGuestWishlist();
        if (typeof RizqUx.updateFavBadges === 'function') RizqUx.updateFavBadges();
        if(forceReveal) {
          mount.innerHTML = (window.RizqUx && RizqUx.wishlistEmptyHtml) ? RizqUx.wishlistEmptyHtml() : '<p class="rzq-empty">—</p>';
          block.style.display = '';
          return Promise.resolve(true);
        }
        block.style.display = 'none';
        return Promise.resolve(false);
      }
      var ids = [];
      try{ ids = JSON.parse(localStorage.getItem('rizq_wishlist') || '[]'); }catch(e){}
      if(!Array.isArray(ids) || ids.length < 1) {
        if(forceReveal) {
          mount.innerHTML = (window.RizqUx && RizqUx.wishlistEmptyHtml) ? RizqUx.wishlistEmptyHtml() : '<p class="rzq-empty">—</p>';
          block.style.display = '';
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      }
      if(!window.RIZQ_BACKEND_BASE) {
        if(forceReveal) {
          mount.innerHTML = (window.RizqUx && RizqUx.wishlistEmptyHtml) ? RizqUx.wishlistEmptyHtml() : '<p class="rzq-empty">—</p>';
          block.style.display = '';
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      }
      var fr = isFr();
      return fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/ads/batch?ids=' + ids.map(encodeURIComponent).join(','))
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(data){
          var ads = data && data.ok && Array.isArray(data.ads) ? data.ads : [];
          // مزامنة العداد مع الإعلانات الموجودة فعلياً فقط
          if (window.RizqUx && typeof RizqUx.pruneWishlistToExisting === 'function') {
            RizqUx.pruneWishlistToExisting(ads.map(function (a) { return a && a.id; }).filter(Boolean));
          }
          if(!ads.length) {
            if(forceReveal) {
              mount.innerHTML = (window.RizqUx && RizqUx.wishlistEmptyHtml) ? RizqUx.wishlistEmptyHtml() : '<p class="rzq-empty">—</p>';
              block.style.display = '';
              return true;
            }
            return false;
          }
          var cardsHTML = ads.map(function(a){ return recentlyViewedCardHTML(a, fr); }).join('');
          mount.innerHTML = '<div class="rzq-disc-strip"><div class="rzq-disc-track">' + cardsHTML + '</div></div>';
          initAutoScroll(mount.querySelector('.rzq-disc-strip'));
          block.style.display = '';
          return true;
        }).catch(function(){
          if(forceReveal) {
            mount.innerHTML = (window.RizqUx && RizqUx.wishlistEmptyHtml) ? RizqUx.wishlistEmptyHtml() : '<p class="rzq-empty">—</p>';
            block.style.display = '';
            return true;
          }
          return false;
        });
    }
    window.RizqRenderWishlist = renderWishlist;

    function renderLiveActivitySection(){
      var section = document.getElementById('rizq-live-activity');
      if(!section) return;
      Promise.all([renderEndingSoon(), renderTopSellers(), renderRecentlyViewed(), renderWishlist()]).then(function(results){
        section.style.display = results.some(Boolean) ? '' : 'none';
      });
    }

    function renderAllStrips(){
      renderStrip('rzq-disc-store', 'store');
      renderStrip('rzq-disc-office', 'office');
      renderStrip('rzq-disc-corp', 'corp');
      /* العقارات: شريط نماذج واحد فقط — بلا شريط اكتشاف منفصل */
      /* المناقصات/الاستثمارات: دليل مستقل — لا شريط اكتشاف على الرئيسية */
      renderLiveActivitySection();
      /* بعد ملء الشرائط: أعد التمرير لهاش الصفحة — وإلا يفشل التمرير الأصلي
         لأن #rzq-disc-* تكون فارغة عند وصول الرابط من صفحة أخرى */
      if(typeof window.rizqScrollLandingHash === 'function') window.rizqScrollLandingHash(true);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderAllStrips);
    } else {
      setTimeout(renderAllStrips, 0);
    }
    try{
      var _origSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(k, v){
        _origSetItem.call(this, k, v);
        if(k === 'rizq_lang' || k === 'rizq_pending_accounts' || k === 'rizq_wishlist') renderAllStrips();
      };
    }catch(e){}
  })();

  /* تمرير موثوق لهاش أقسام الاكتشاف / الفضاءات (من أزرار تصفّح المحلات/المكاتب/…) */
  (function(){
    var DISC_TO_SECTION = {
      'rzq-disc-store': 'virtual-stores',
      'rzq-disc-corp': 'virtual-showrooms',
      'rzq-disc-office': 'virtual-offices',
      /* estate: promo at #virtual-estate; models at #rizq-estate-models — no discovery strip */
      /* moved: tenders/investments directories */
    };
    var _scrollTimer = null;
    function resolveTarget(hash){
      var id = String(hash || '').replace(/^#/, '');
      if(!id) return null;
      var disc = DISC_TO_SECTION[id] ? document.getElementById(id) : null;
      /* بعد ملء الشريط: مرّر إلى بطاقة الاكتشاف نفسها (كن أول من…) */
      if(disc && disc.offsetHeight > 40) return disc;
      var sectionId = DISC_TO_SECTION[id];
      if(sectionId){
        var sec = document.getElementById(sectionId);
        if(sec) return sec;
      }
      return disc || document.getElementById(id);
    }
    function rizqScrollLandingHash(force){
      var el = resolveTarget(location.hash);
      if(!el) return false;
      var top = el.getBoundingClientRect().top + window.pageYOffset;
      var headerPad = 0;
      try{
        headerPad = (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0);
      }catch(e){}
      var y = Math.max(0, top - headerPad);
      var near = Math.abs((window.pageYOffset || 0) - y) < 48;
      if(!force && near) return true;
      try{ el.scrollIntoView({ behavior: force ? 'auto' : 'smooth', block: 'start' }); }
      catch(e2){ window.scrollTo(0, y); }
      return true;
    }
    window.rizqScrollLandingHash = rizqScrollLandingHash;
    function scheduleScroll(){
      if(_scrollTimer) clearTimeout(_scrollTimer);
      rizqScrollLandingHash(true);
      _scrollTimer = setTimeout(function(){ rizqScrollLandingHash(true); }, 120);
      setTimeout(function(){ rizqScrollLandingHash(true); }, 400);
      setTimeout(function(){ rizqScrollLandingHash(true); }, 900);
    }
    window.addEventListener('hashchange', function(){ scheduleScroll(); });
    window.addEventListener('pageshow', function(){ if(location.hash) scheduleScroll(); });
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', function(){ if(location.hash) scheduleScroll(); });
    } else if(location.hash){
      scheduleScroll();
    }
    /* نقر داخلي على روابط الهاش: فرض التمرير حتى لو كان الهاش نفسه */
    document.addEventListener('click', function(e){
      var a = e.target && e.target.closest ? e.target.closest('a[href*="#"]') : null;
      if(!a) return;
      var href = a.getAttribute('href') || '';
      var m = href.match(/#(rzq-disc-[a-z]+|virtual-[a-z-]+|listings|categories|pricing|about)\b/i);
      if(!m) return;
      var hash = '#' + m[1];
      var samePage = href.charAt(0) === '#' || /rizq_landing_v8\.html|\/(?:index\.html)?$/i.test(href.split('#')[0]);
      if(!samePage && href.indexOf('rizq_landing_v8.html') === -1) return;
      setTimeout(function(){
        if(location.hash.toLowerCase() === hash.toLowerCase()) scheduleScroll();
      }, 0);
    }, true);
  })();
  