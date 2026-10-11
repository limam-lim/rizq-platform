/**
 * rizq_room_protocol.js
 * ═══════════════════════════════════════════════════════════════════
 * وثائق إدارية / توثيق إجراءات — غرفة المناقصات وغرفة الاستثمارات
 *
 * ليست عقداً رسمياً موثّقاً لدى جهة حكومية، بل:
 *   · محضر إداري لتوثيق الإجراءات
 *   · وثيقة اتفاق إداري إرشادي بصياغة قانونية احترافية
 *   · مذكرة تفاهم استثمارية إدارية
 *
 * ملاحظة ثابتة على كل مستند: «تم عن طريق منصة رزق»
 * رزق وسيط نشر إلكتروني فقط — ليست طرفاً في الاتفاق النهائي.
 * ═══════════════════════════════════════════════════════════════════
 */
(function (global) {
  'use strict';

  var KEY = 'rizq_room_protocols';
  var KEY_SEQ = 'rizq_room_protocol_seq';
  var PLATFORM_NOTE = {
    ar: 'تم عن طريق منصة رزق',
    fr: 'Établi via la plateforme Rizq'
  };

  function _isFr() {
    try {
      var lang = (localStorage.getItem('rizq_lang') || document.documentElement.lang || 'ar').toLowerCase();
      return lang.indexOf('fr') === 0 || (document.documentElement.dir || '') === 'ltr';
    } catch (e) { return false; }
  }
  function _t(ar, fr) { return _isFr() ? fr : ar; }
  function _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function _load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function _save(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e) {}
  }
  function _nextNumber(prefix) {
    var year = new Date().getFullYear();
    var seq = 1;
    try { seq = parseInt(localStorage.getItem(KEY_SEQ) || '0', 10) + 1; } catch (e) {}
    try { localStorage.setItem(KEY_SEQ, String(seq)); } catch (e) {}
    return (prefix || 'RZQ-DOC') + '-' + year + '-' + String(seq).padStart(5, '0');
  }
  function _fmtDate(iso) {
    try {
      return new Date(iso || Date.now()).toLocaleDateString(_isFr() ? 'fr-FR' : 'ar-EG-u-nu-latn', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch (e) { return iso || '—'; }
  }
  function _fmtMoney(n) {
    n = Number(n) || 0;
    if (!n) return '—';
    return n.toLocaleString(_isFr() ? 'fr-FR' : 'ar-EG-u-nu-latn') + ' MRU';
  }

  function _docTitles(kind) {
    if (kind === 'investment') {
      return {
        ar: 'وثيقة تفاهم استثمارية إدارية وتوثيق إجراءات',
        fr: 'Protocole d’entente administrative — investissement',
        shortAr: 'توثيق استثماري إداري',
        shortFr: 'Protocole investissement',
        prefix: 'RZQ-INV'
      };
    }
    return {
      ar: 'محضر إداري لتوثيق إجراءات المناقصة واتفاق إرشادي',
      fr: 'Procès-verbal administratif — appel d’offres',
      shortAr: 'محضر مناقصة إداري',
      shortFr: 'PV appel d’offres',
      prefix: 'RZQ-TND'
    };
  }

  function _clauses(kind, data) {
    data = data || {};
    var fr = _isFr();
    if (kind === 'investment') {
      return fr ? [
        { title: 'Article 1 — Objet', body: 'La présente pièce constitue un protocole administratif de documentation et une entente indicative entre le porteur du projet et le partenaire intéressé, concernant le dossier « ' + (data.title || '—') + ' ». Elle n’est pas un contrat notarié ni un acte officiel d’État.' },
        { title: 'Article 2 — Nature du document', body: 'Il s’agit d’un acte administratif professionnel, à rédaction juridique prudente, destiné à tracer les échanges, les intentions et les modalités de revue. Les parties restent libres de conclure ultérieurement un contrat formel distinct, selon le droit applicable.' },
        { title: 'Article 3 — Rôle de Rizq', body: 'Rizq Platform (ADMINIA SARL) agit uniquement comme intermédiaire de publication et de mise en relation. Elle n’est pas partie à l’investissement, ne gère aucun fonds et n’émet aucune garantie de rendement ou de financement.' },
        { title: 'Article 4 — Diligence et vérifications', body: 'Chaque partie s’engage à procéder, sous sa seule responsabilité, aux vérifications nécessaires (identité, titres, capacités financières, conformité) avant tout engagement effectif.' },
        { title: 'Article 5 — Confidentialité', body: 'Les informations échangées via la salle des investissements sont traitées avec prudence. Les contacts privés ne sont pas destinés à une diffusion publique.' },
        { title: 'Article 6 — Non-engagement financier de la plateforme', body: 'Aucune disposition des présentes n’emporte engagement financier, caution ou obligation de résultat à la charge de Rizq.' },
        { title: 'Article 7 — Mentions finales', body: 'Le présent protocole est établi pour les besoins administratifs des parties. Toute contestation relative à l’opération relève des parties elles-mêmes, hors responsabilité de la plateforme.' }
      ] : [
        { title: 'المادة 1 — الموضوع', body: 'تشكّل هذه الوثيقة محضراً إدارياً للتوثيق واتفاقاً إرشادياً بين صاحب المشروع والطرف المهتم، بخصوص الملف « ' + (data.title || '—') + ' ». وهي ليست عقداً رسمياً موثّقاً لدى جهة حكومية ولا سنداً رسمياً للدولة.' },
        { title: 'المادة 2 — طبيعة المستند', body: 'مستند إداري احترافي بصياغة قانونية حذرة، يهدف إلى ضبط مسار التواصل والنيّات وإجراءات المراجعة. للأطراف لاحقاً إبرام عقد رسمي مستقل وفق القانون الواجب التطبيق.' },
        { title: 'المادة 3 — دور منصة رزق', body: 'منصة رزق (ADMINIA SARL) وسيط نشر وربط إلكتروني فقط. ليست طرفاً في الاستثمار، ولا تدير أموالاً، ولا تقدّم ضمان عائد أو تمويل.' },
        { title: 'المادة 4 — العناية الواجبة', body: 'يلتزم كل طرف، على مسؤوليته الخاصة، بإجراء التحقّقات اللازمة (الهوية، السندات، القدرة المالية، الامتثال) قبل أي التزام فعلي.' },
        { title: 'المادة 5 — السرّية', body: 'تُعامل المعلومات المتبادلة عبر غرفة الاستثمارات بحذر. بيانات التواصل الخاصة ليست للنشر العام.' },
        { title: 'المادة 6 — عدم الالتزام المالي للمنصة', body: 'لا ترتّب هذه الوثيقة أي التزام مالي أو كفالة أو ضمان نتيجة على عاتق رزق.' },
        { title: 'المادة 7 — أحكام ختامية', body: 'حُرّر هذا المحضر للأغراض الإدارية للأطراف. أي نزاع يتعلق بالعملية يبقى بين الأطراف أنفسهم، خارج مسؤولية المنصة.' }
      ];
    }
    return fr ? [
      { title: 'Article 1 — Objet', body: 'Le présent procès-verbal administratif documente la procédure d’appel d’offres « ' + (data.title || '—') + ' » et fixe un cadre d’accord indicatif entre l’émetteur et le soumissionnaire retenu ou pressenti. Il ne constitue pas un marché public officiel ni un contrat notarié.' },
      { title: 'Article 2 — Nature du document', body: 'Document administratif à rédaction juridique professionnelle : constat des étapes, traçabilité des offres, et formulation d’un accord de principe. Les parties peuvent, si elles le souhaitent, signer ultérieurement un contrat formel distinct.' },
      { title: 'Article 3 — Déroulement', body: 'Publication du besoin, réception d’offres privées, examen par l’émetteur, et — le cas échéant — désignation d’une offre retenue selon les critères qu’il définit seul. Rizq n’intervient pas dans le choix du gagnant.' },
      { title: 'Article 4 — Prix et délais', body: 'Le prix indicatif et le délai de livraison figurant ci-dessous sont ceux communiqués entre les parties. Toute modification doit être confirmée par écrit entre elles.' },
      { title: 'Article 5 — Rôle de Rizq', body: 'Rizq Platform est un intermédiaire de publication électronique uniquement. Elle ne garantit ni la qualité des offres, ni l’exécution, ni les paiements.' },
      { title: 'Article 6 — Paiements et exécution', body: 'Les paiements, livraisons et garanties se règlent directement entre l’émetteur et le soumissionnaire, hors plateforme.' },
      { title: 'Article 7 — Mentions finales', body: 'Le présent acte est établi à des fins administratives et de traçabilité. Il n’emporte pas, à lui seul, la force d’un contrat officiel d’État.' }
    ] : [
      { title: 'المادة 1 — الموضوع', body: 'يثبّت هذا المحضر الإداري إجراءات المناقصة « ' + (data.title || '—') + ' » ويضع إطار اتفاق إرشادي بين ناشر المناقصة ومقدّم العرض المختار أو المرشّح. وهو ليس صفقة عمومية رسمية ولا عقداً موثّقاً لدى جهة حكومية.' },
      { title: 'المادة 2 — طبيعة المستند', body: 'مستند إداري بصياغة قانونية احترافية: توثيق للمراحل، تتبّع للعروض، وصياغة اتفاق مبدئي. للأطراف لاحقاً توقيع عقد رسمي مستقل إن رغبا.' },
      { title: 'المادة 3 — سير الإجراءات', body: 'نشر الاحتياج، استقبال عروض خاصة، فحصها من الناشر، وعند الاقتضاء اختيار عرض وفق معاييره وحده. رزق لا تتدخل في اختيار الفائز.' },
      { title: 'المادة 4 — السعر والآجال', body: 'السعر الإرشادي ومدة التسليم المبيّنان أدناه هما ما تمّت مشاركته بين الأطراف. أي تعديل يُثبَّت كتابةً بينهما.' },
      { title: 'المادة 5 — دور منصة رزق', body: 'منصة رزق وسيط نشر إلكتروني فقط. لا تضمن جودة العروض ولا التنفيذ ولا المدفوعات.' },
      { title: 'المادة 6 — الدفع والتنفيذ', body: 'المدفوعات والتسليم والضمانات تُدار مباشرة بين ناشر المناقصة ومقدّم العرض، خارج المنصة.' },
      { title: 'المادة 7 — أحكام ختامية', body: 'حُرّر هذا المحضر لأغراض إدارية وتتبعية. لا يكتسب بذاته قوة العقد الرسمي للدولة.' }
    ];
  }

  /**
   * create({
   *   kind: 'tender'|'investment',
   *   title, description, category, city, sector,
   *   issuerName, counterpartyName,
   *   amount, deliveryDays, deadline, notes, meta
   * })
   */
  function create(opts) {
    opts = opts || {};
    var kind = opts.kind === 'investment' ? 'investment' : 'tender';
    var titles = _docTitles(kind);
    var now = new Date().toISOString();
    var doc = {
      id: 'RDOC_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      number: _nextNumber(titles.prefix),
      kind: kind,
      titleAr: titles.ar,
      titleFr: titles.fr,
      shortAr: titles.shortAr,
      shortFr: titles.shortFr,
      subject: String(opts.title || opts.subject || '').slice(0, 200),
      description: String(opts.description || opts.desc || '').slice(0, 2000),
      category: String(opts.category || opts.sector || '').slice(0, 80),
      city: String(opts.city || '').slice(0, 80),
      issuerName: String(opts.issuerName || opts.ownerName || opts.sellerName || '').slice(0, 120),
      counterpartyName: String(opts.counterpartyName || opts.bidderName || opts.partnerName || opts.buyerName || '').slice(0, 120),
      amount: Number(opts.amount != null ? opts.amount : opts.price) || 0,
      deliveryDays: Number(opts.deliveryDays) || 0,
      deadline: opts.deadline || '',
      notes: String(opts.notes || '').slice(0, 1000),
      clauses: _clauses(kind, { title: opts.title || opts.subject }),
      platformNote: PLATFORM_NOTE,
      status: opts.status || 'issued',
      meta: opts.meta || {},
      createdAt: now,
      updatedAt: now
    };
    var all = _load();
    all.unshift(doc);
    _save(all);
    return doc;
  }

  function createFromTender(tender, bid) {
    tender = tender || {};
    bid = bid || {};
    return create({
      kind: 'tender',
      title: tender.title,
      description: tender.desc || tender.description,
      category: tender.category,
      city: tender.city,
      issuerName: tender.ownerName || tender.issuerName,
      counterpartyName: bid.bidderName || bid.accountName || bid.name || _t('مقدّم العرض', 'Soumissionnaire'),
      amount: bid.price != null ? bid.price : (tender.budgetMax || tender.budgetMin || 0),
      deliveryDays: bid.deliveryDays,
      deadline: tender.deadline,
      notes: bid.notes || '',
      meta: { tenderId: tender.id || '', bidId: bid.id || '', source: 'tender_room' }
    });
  }

  function createFromInvestment(opp, partner) {
    opp = opp || {};
    partner = partner || {};
    var capital = opp.capital;
    var amount = 0;
    if (typeof capital === 'number') amount = capital;
    else if (capital) {
      var m = String(capital).replace(/[^\d.]/g, '');
      amount = Number(m) || 0;
    }
    return create({
      kind: 'investment',
      title: opp.title,
      description: opp.description || opp.desc,
      sector: opp.sector || opp.category,
      city: opp.city,
      issuerName: opp.ownerName || opp.contactName || opp.issuerName || _t('صاحب المشروع', 'Porteur du projet'),
      counterpartyName: partner.name || partner.partnerName || _t('الشريك المهتم', 'Partenaire intéressé'),
      amount: amount,
      notes: partner.notes || opp.notes || '',
      meta: { opportunityId: opp.id || '', source: 'investment_room' }
    });
  }

  function get(id) {
    return _load().find(function (d) { return d.id === id || d.number === id; }) || null;
  }

  function listByKind(kind) {
    return _load().filter(function (d) { return !kind || d.kind === kind; });
  }

  function renderDocumentHTML(doc) {
    if (!doc) return '';
    var fr = _isFr();
    var title = fr ? (doc.titleFr || doc.titleAr) : (doc.titleAr || doc.titleFr);
    var note = (doc.platformNote && (fr ? doc.platformNote.fr : doc.platformNote.ar)) || (fr ? PLATFORM_NOTE.fr : PLATFORM_NOTE.ar);
    var clauses = (doc.clauses && doc.clauses.length) ? doc.clauses : _clauses(doc.kind, { title: doc.subject });
    var articles = clauses.map(function (c, i) {
      return '<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #e8ecf2">'
        + '<div style="font-size:13px;font-weight:900;color:#0F2347;margin-bottom:5px">' + _esc(c.title || (_t('مادة', 'Article') + ' ' + (i + 1))) + '</div>'
        + '<div style="font-size:12.5px;line-height:1.85;color:#334155">' + _esc(c.body) + '</div>'
        + '</div>';
    }).join('');

    var partyA = doc.kind === 'investment'
      ? _t('صاحب المشروع', 'Porteur du projet')
      : _t('ناشر المناقصة', 'Émetteur de l’appel');
    var partyB = doc.kind === 'investment'
      ? _t('الشريك / المستثمر المهتم', 'Partenaire / investisseur')
      : _t('مقدّم العرض', 'Soumissionnaire');

    return '<!DOCTYPE html><html lang="' + (fr ? 'fr' : 'ar') + '" dir="' + (fr ? 'ltr' : 'rtl') + '"><head><meta charset="UTF-8">'
      + '<title>' + _esc(doc.number) + '</title>'
      + '<style>@media print{.no-print{display:none!important}body{background:#fff!important}}</style></head>'
      + '<body style="margin:0;background:#eef2f7;font-family:Georgia,\'Amiri\',\'Times New Roman\',serif">'
      + '<div style="max-width:760px;margin:20px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 36px rgba(13,27,42,.12);border:1px solid #d9e0ea">'
      + '<div style="background:linear-gradient(135deg,#0F2347,#163a66);color:#fff;padding:22px 26px">'
      + '<div style="font-size:10px;letter-spacing:2px;color:#E8C96A;font-weight:800">RIZQ · PROTOCOL</div>'
      + '<div style="font-size:20px;font-weight:900;margin-top:6px;line-height:1.35">' + _esc(title) + '</div>'
      + '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:12px;font-size:12px">'
      + '<div>' + _esc(_t('الرقم', 'N°')) + ': <strong style="color:#E8C96A">' + _esc(doc.number) + '</strong></div>'
      + '<div>' + _esc(_fmtDate(doc.createdAt)) + '</div>'
      + '</div></div>'
      + '<div style="padding:22px 26px">'
      + '<div style="padding:10px 12px;border-radius:10px;background:#fff8e8;border:1px solid rgba(201,168,76,.45);font-size:12px;line-height:1.7;color:#5b4a1e;margin-bottom:16px">'
      + _esc(_t(
        'تنبيه: هذه وثيقة إدارية / اتفاق إرشادي بصياغة قانونية احترافية — وليست عقداً رسمياً موثّقاً لدى جهة حكومية.',
        'Avis : pièce administrative / accord indicatif à rédaction juridique — et non un contrat officiel notarié.'
      ))
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">'
      + '<div style="background:#f7f9fc;border-radius:10px;padding:12px"><div style="font-size:11px;color:#64748b;margin-bottom:4px">' + _esc(partyA) + '</div>'
      + '<div style="font-weight:800;color:#0F2347">' + _esc(doc.issuerName || '—') + '</div></div>'
      + '<div style="background:#f7f9fc;border-radius:10px;padding:12px"><div style="font-size:11px;color:#64748b;margin-bottom:4px">' + _esc(partyB) + '</div>'
      + '<div style="font-weight:800;color:#0F2347">' + _esc(doc.counterpartyName || '—') + '</div></div>'
      + '</div>'
      + '<div style="margin-bottom:16px;padding:12px 14px;border:1px solid #e5eaf2;border-radius:10px">'
      + '<div style="font-size:11px;color:#64748b;margin-bottom:4px">' + _esc(_t('موضوع الملف', 'Objet du dossier')) + '</div>'
      + '<div style="font-weight:800;color:#0F2347;font-size:15px">' + _esc(doc.subject || '—') + '</div>'
      + (doc.category ? '<div style="font-size:12px;color:#475569;margin-top:6px">' + _esc(_t('الفئة / القطاع', 'Catégorie / secteur') + ': ' + doc.category) + '</div>' : '')
      + (doc.city ? '<div style="font-size:12px;color:#475569;margin-top:2px">' + _esc(_t('المكان', 'Lieu') + ': ' + doc.city) + '</div>' : '')
      + (doc.description ? '<div style="font-size:12.5px;color:#334155;margin-top:8px;line-height:1.75">' + _esc(doc.description) + '</div>' : '')
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px">'
      + '<div style="padding:10px;border-radius:10px;background:#f8fafc;border:1px solid #e8ecf2"><div style="font-size:10px;color:#94a3b8">' + _esc(_t('المبلغ الإرشادي', 'Montant indicatif')) + '</div><div style="font-weight:900;color:#0F2347;margin-top:3px">' + _esc(_fmtMoney(doc.amount)) + '</div></div>'
      + '<div style="padding:10px;border-radius:10px;background:#f8fafc;border:1px solid #e8ecf2"><div style="font-size:10px;color:#94a3b8">' + _esc(_t('مدة التسليم', 'Délai')) + '</div><div style="font-weight:900;color:#0F2347;margin-top:3px">' + _esc(doc.deliveryDays ? (doc.deliveryDays + ' ' + _t('يوم', 'j')) : '—') + '</div></div>'
      + '<div style="padding:10px;border-radius:10px;background:#f8fafc;border:1px solid #e8ecf2"><div style="font-size:10px;color:#94a3b8">' + _esc(_t('الموعد', 'Échéance')) + '</div><div style="font-weight:900;color:#0F2347;margin-top:3px;font-size:12px">' + _esc(doc.deadline ? _fmtDate(doc.deadline) : '—') + '</div></div>'
      + '</div>'
      + '<div style="font-size:13px;font-weight:900;color:#0F2347;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #C9A84C">'
      + _esc(_t('البنود الإدارية والقانونية', 'Clauses administratives et juridiques'))
      + '</div>'
      + articles
      + (doc.notes
        ? '<div style="margin-top:8px;padding:12px;border-radius:10px;background:#f8fafc;font-size:12.5px;line-height:1.7;color:#475569"><strong>' + _esc(_t('ملاحظات الأطراف', 'Notes des parties')) + ':</strong> ' + _esc(doc.notes) + '</div>'
        : '')
      + '<div style="margin-top:22px;padding:16px;border:2px dashed #C9A84C;border-radius:12px;background:linear-gradient(135deg,rgba(201,168,76,.1),rgba(15,35,71,.04));text-align:center">'
      + '<div style="font-size:10px;letter-spacing:2px;color:#C9A84C;font-weight:800">RIZQ PLATFORM</div>'
      + '<div style="font-size:17px;font-weight:900;color:#0F2347;margin-top:6px">' + _esc(note) + '</div>'
      + '<div style="font-size:11px;color:#64748b;margin-top:6px">ADMINIA SARL · ' + _esc(_t('وسيط نشر إلكتروني فقط', 'Intermédiaire de publication uniquement')) + '</div>'
      + '</div>'
      + '<div style="margin-top:14px;font-size:10px;color:#94a3b2;line-height:1.65">'
      + _esc(_t(
        'مستند إداري داخلي عبر منصة رزق — لا يُعد عقداً رسمياً ولا فاتورة ضريبية. الاتفاق النهائي والتنفيذ والدفع بين الأطراف مباشرة.',
        'Document administratif interne via Rizq — ni contrat officiel ni facture fiscale. Accord final, exécution et paiement entre les parties.'
      ))
      + '</div>'
      + '</div></div></body></html>';
  }

  function openPrint(id) {
    var doc = typeof id === 'object' ? id : get(id);
    if (!doc) return false;
    var w = window.open('', '_blank');
    if (!w) return false;
    w.document.write(renderDocumentHTML(doc));
    w.document.close();
    w.focus();
    setTimeout(function () { try { w.print(); } catch (e) {} }, 350);
    return true;
  }

  function _ensureCss() {
    if (document.getElementById('rizq-room-protocol-css')) return;
    var style = document.createElement('style');
    style.id = 'rizq-room-protocol-css';
    style.textContent = [
      '.rizq-rdoc-overlay{position:fixed;inset:0;z-index:12100;background:rgba(6,14,28,.78);backdrop-filter:blur(10px);display:flex;align-items:flex-end;justify-content:center;padding:0;opacity:0;pointer-events:none;transition:opacity .25s}',
      '.rizq-rdoc-overlay.is-open{opacity:1;pointer-events:auto}',
      '@media(min-width:720px){.rizq-rdoc-overlay{align-items:center;padding:18px}}',
      '.rizq-rdoc-sheet{position:relative;width:min(560px,100%);max-height:min(92dvh,900px);display:flex;flex-direction:column;overflow:hidden;background:#f4f6fa;border-radius:20px 20px 0 0;box-shadow:0 24px 60px rgba(0,0,0,.45);transform:translateY(18px);transition:transform .25s;font-family:Georgia,"Amiri","Times New Roman",serif;color:#0d1b2a}',
      '.rizq-rdoc-overlay.is-open .rizq-rdoc-sheet{transform:none}',
      '@media(min-width:720px){.rizq-rdoc-sheet{border-radius:18px}}',
      '.rizq-rdoc-close{position:absolute;top:12px;inset-inline-end:12px;width:34px;height:34px;border:0;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;font-size:20px;cursor:pointer;z-index:2}',
      '.rizq-rdoc-head{flex-shrink:0;padding:20px 22px 14px;background:linear-gradient(135deg,#0f2347,#1b3a6b);color:#fff}',
      '.rizq-rdoc-brand{display:inline-block;font-size:10px;font-weight:900;letter-spacing:1.5px;color:#0d1b2a;background:linear-gradient(135deg,#C9A84C,#E8C96A);padding:4px 10px;border-radius:999px;margin-bottom:8px}',
      '.rizq-rdoc-head h2{margin:0;font-size:18px;font-weight:900;line-height:1.35}',
      '.rizq-rdoc-num{margin-top:4px;font-size:12px;color:#E8C96A;font-weight:800}',
      '.rizq-rdoc-scroll{flex:1;min-height:0;overflow-y:auto;padding:14px 16px}',
      '.rizq-rdoc-warn{padding:10px 12px;border-radius:10px;background:#fff8e8;border:1px solid rgba(201,168,76,.4);font-size:12px;line-height:1.7;color:#5b4a1e;margin-bottom:12px}',
      '.rizq-rdoc-parties{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}',
      '.rizq-rdoc-parties div{background:#fff;border:1px solid #e5eaf2;border-radius:10px;padding:10px}',
      '.rizq-rdoc-parties span{display:block;font-size:10px;color:#94a3b8;margin-bottom:3px}',
      '.rizq-rdoc-parties strong{font-size:13px;color:#0F2347}',
      '.rizq-rdoc-meta{background:#fff;border:1px solid #e5eaf2;border-radius:10px;padding:12px;margin-bottom:12px}',
      '.rizq-rdoc-meta .k{font-size:10px;color:#94a3b8}',
      '.rizq-rdoc-meta .v{font-size:14px;font-weight:800;color:#0F2347;margin-top:2px}',
      '.rizq-rdoc-article{background:#fff;border:1px solid #e8ecf2;border-radius:10px;padding:11px 12px;margin-bottom:8px}',
      '.rizq-rdoc-article h4{margin:0 0 5px;font-size:12.5px;color:#0F2347}',
      '.rizq-rdoc-article p{margin:0;font-size:12px;line-height:1.75;color:#475569}',
      '.rizq-rdoc-stamp{margin:14px 0 6px;padding:14px;border:2px dashed #C9A84C;border-radius:12px;background:linear-gradient(135deg,rgba(201,168,76,.1),rgba(15,35,71,.04));text-align:center}',
      '.rizq-rdoc-stamp .lbl{font-size:10px;letter-spacing:2px;color:#C9A84C;font-weight:800}',
      '.rizq-rdoc-stamp strong{display:block;margin-top:5px;font-size:15px;color:#0F2347}',
      '.rizq-rdoc-footer{flex-shrink:0;padding:12px 14px calc(12px + env(safe-area-inset-bottom,0));background:#fff;border-top:1px solid #e5eaf2}',
      '.rizq-rdoc-actions{display:flex;gap:8px;flex-wrap:wrap}',
      '.rizq-rdoc-btn{flex:1;min-width:120px;padding:11px 12px;border:0;border-radius:11px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit}',
      '.rizq-rdoc-btn-primary{background:linear-gradient(135deg,#C9A84C,#E8C96A);color:#0f2347}',
      '.rizq-rdoc-btn-ghost{background:#eef2f7;color:#0F2347}',
      '.rizq-rdoc-disc{margin:8px 0 0;font-size:10.5px;color:#94a3b8;line-height:1.5;text-align:center}',
      '.rizq-rdoc-panel{margin:0 0 22px;padding:18px 16px;border-radius:16px;border:1px solid rgba(15,35,71,.1);background:linear-gradient(180deg,#fbfcff,#f3f6fb)}',
      '.rizq-rdoc-panel .eyebrow{font-size:11px;font-weight:800;letter-spacing:1.2px;color:#C9A84C;text-transform:uppercase;margin-bottom:6px}',
      '.rizq-rdoc-panel h3{margin:0 0 6px;font-size:18px;color:#0F2347}',
      '.rizq-rdoc-panel p{margin:0 0 12px;font-size:13px;line-height:1.7;color:#5b6472}',
      '.rizq-rdoc-panel-actions{display:flex;gap:8px;flex-wrap:wrap}',
      '.rizq-rdoc-panel-actions button{padding:10px 14px;border-radius:11px;border:1px solid rgba(201,168,76,.45);background:linear-gradient(135deg,#0F2347,#163a66);color:#E8C96A;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit}',
      '.rizq-rdoc-panel-actions button.secondary{background:#fff;color:#0F2347;border-color:#d5deea}'
    ].join('');
    document.head.appendChild(style);
  }

  function closeModal() {
    var el = document.getElementById('rizq-rdoc-overlay');
    if (el) el.remove();
  }

  function openModal(id) {
    _ensureCss();
    var doc = typeof id === 'object' ? id : get(id);
    if (!doc) return false;
    closeModal();
    var fr = _isFr();
    var title = fr ? doc.titleFr : doc.titleAr;
    var note = fr ? (doc.platformNote && doc.platformNote.fr) || PLATFORM_NOTE.fr
      : (doc.platformNote && doc.platformNote.ar) || PLATFORM_NOTE.ar;
    var partyA = doc.kind === 'investment' ? _t('صاحب المشروع', 'Porteur') : _t('ناشر المناقصة', 'Émetteur');
    var partyB = doc.kind === 'investment' ? _t('الشريك المهتم', 'Partenaire') : _t('مقدّم العرض', 'Soumissionnaire');
    var clauses = (doc.clauses && doc.clauses.length) ? doc.clauses : _clauses(doc.kind, { title: doc.subject });
    var articlesHtml = clauses.map(function (c) {
      return '<div class="rizq-rdoc-article"><h4>' + _esc(c.title) + '</h4><p>' + _esc(c.body) + '</p></div>';
    }).join('');

    var overlay = document.createElement('div');
    overlay.id = 'rizq-rdoc-overlay';
    overlay.className = 'rizq-rdoc-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML =
      '<div class="rizq-rdoc-sheet">'
      + '<button type="button" class="rizq-rdoc-close" data-rdoc-act="close" aria-label="close">×</button>'
      + '<div class="rizq-rdoc-head">'
      + '<div class="rizq-rdoc-brand">PROTOCOL</div>'
      + '<h2>' + _esc(title) + '</h2>'
      + '<div class="rizq-rdoc-num">' + _esc(doc.number) + '</div>'
      + '</div>'
      + '<div class="rizq-rdoc-scroll">'
      + '<div class="rizq-rdoc-warn">' + _esc(_t(
        'وثيقة إدارية / اتفاق إرشادي — ليست عقداً رسمياً موثّقاً.',
        'Pièce administrative / accord indicatif — pas un contrat officiel notarié.'
      )) + '</div>'
      + '<div class="rizq-rdoc-parties">'
      + '<div><span>' + _esc(partyA) + '</span><strong>' + _esc(doc.issuerName || '—') + '</strong></div>'
      + '<div><span>' + _esc(partyB) + '</span><strong>' + _esc(doc.counterpartyName || '—') + '</strong></div>'
      + '</div>'
      + '<div class="rizq-rdoc-meta">'
      + '<div class="k">' + _esc(_t('موضوع الملف', 'Objet')) + '</div>'
      + '<div class="v">' + _esc(doc.subject || '—') + '</div>'
      + '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:12px;color:#475569">'
      + '<span>' + _esc(_t('المبلغ', 'Montant') + ': ' + _fmtMoney(doc.amount)) + '</span>'
      + (doc.deliveryDays ? '<span>' + _esc(_t('التسليم', 'Délai') + ': ' + doc.deliveryDays + ' ' + _t('يوم', 'j')) + '</span>' : '')
      + '</div></div>'
      + articlesHtml
      + '<div class="rizq-rdoc-stamp"><div class="lbl">RIZQ</div><strong>' + _esc(note) + '</strong></div>'
      + '</div>'
      + '<div class="rizq-rdoc-footer">'
      + '<div class="rizq-rdoc-actions">'
      + '<button type="button" class="rizq-rdoc-btn rizq-rdoc-btn-primary" data-rdoc-act="print">' + _esc(_t('طباعة / حفظ', 'Imprimer / enregistrer')) + '</button>'
      + '<button type="button" class="rizq-rdoc-btn rizq-rdoc-btn-ghost" data-rdoc-act="close">' + _esc(_t('إغلاق', 'Fermer')) + '</button>'
      + '</div>'
      + '<p class="rizq-rdoc-disc">' + _esc(_t(
        'رزق وسيط نشر فقط — الاتفاق النهائي والدفع بين الأطراف.',
        'Rizq est un intermédiaire — accord final et paiement entre les parties.'
      )) + '</p>'
      + '</div></div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
      var btn = e.target.closest('[data-rdoc-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-rdoc-act');
      if (act === 'close') closeModal();
      if (act === 'print') openPrint(doc);
    });
    return true;
  }

  function issueAndOpen(opts) {
    var doc = create(opts);
    if (!doc) return null;
    openModal(doc);
    return doc;
  }

  function issueTenderProtocol(tender, bid) {
    var doc = createFromTender(tender, bid);
    openModal(doc);
    return doc;
  }

  function issueInvestmentProtocol(opp, partner) {
    var doc = createFromInvestment(opp, partner);
    openModal(doc);
    return doc;
  }

  /** Demo / empty-state sample for the room panels */
  function issueDemo(kind) {
    if (kind === 'investment') {
      return issueAndOpen({
        kind: 'investment',
        title: _t('مشروع خدمات لوجستية محلية', 'Projet de services logistiques locaux'),
        description: _t(
          'ملف استثماري للشرح الأولي بين صاحب المشروع وشريك مهتم — للمراجعة الإدارية فقط.',
          'Dossier d’investissement pour revue administrative initiale entre porteur et partenaire intéressé.'
        ),
        sector: _t('خدمات', 'Services'),
        city: _t('نواكشوط', 'Nouakchott'),
        issuerName: _t('صاحب المشروع (نموذج)', 'Porteur (modèle)'),
        counterpartyName: _t('شريك مهتم (نموذج)', 'Partenaire (modèle)'),
        amount: 500000,
        notes: _t('نموذج توضيحي من غرفة الاستثمارات.', 'Modèle illustratif de la salle des investissements.')
      });
    }
    return issueAndOpen({
      kind: 'tender',
      title: _t('توريد معدات مكتبية', 'Fourniture de matériel de bureau'),
      description: _t(
        'محضر إداري نموذجي لتوثيق إجراءات المناقصة واتفاق إرشادي بين الناشر ومقدّم العرض.',
        'Procès-verbal modèle pour documenter la procédure et un accord indicatif.'
      ),
      category: _t('معدات', 'Équipements'),
      city: _t('نواكشوط', 'Nouakchott'),
      issuerName: _t('ناشر المناقصة (نموذج)', 'Émetteur (modèle)'),
      counterpartyName: _t('مقدّم العرض (نموذج)', 'Soumissionnaire (modèle)'),
      amount: 180000,
      deliveryDays: 14,
      notes: _t('نموذج توضيحي من غرفة المناقصات.', 'Modèle illustratif de la salle des appels d’offres.')
    });
  }

  function mountPanel(container, kind) {
    if (!container) return;
    _ensureCss();
    var k = kind === 'investment' ? 'investment' : 'tender';
    container.innerHTML =
      '<div class="rizq-rdoc-panel" id="rizq-rdoc-panel-' + k + '">'
      + '<div class="eyebrow">' + _esc(_t('توثيق إداري', 'Documentation administrative')) + '</div>'
      + '<h3>' + _esc(k === 'investment'
        ? _t('وثيقة تفاهم واستثمار إداري', 'Protocole d’entente — investissement')
        : _t('محضر المناقصة واتفاق إرشادي', 'PV d’appel d’offres et accord indicatif')) + '</h3>'
      + '<p>' + _esc(_t(
        'في هذه الغرفة يتوفّر توثيق إداري بصياغة قانونية احترافية — ليس عقداً رسمياً فقط، بل محضر إجراءات واتفاق إرشادي. كل مستند يحمل ملاحظة: تم عن طريق منصة رزق.',
        'Cette salle propose une documentation administrative à rédaction juridique — pas seulement un contrat officiel : procès-verbal et accord indicatif. Chaque pièce porte la mention : Établi via la plateforme Rizq.'
      )) + '</p>'
      + '<div class="rizq-rdoc-panel-actions">'
      + '<button type="button" data-rdoc-demo="' + k + '">' + _esc(_t('معاينة نموذج التوثيق', 'Voir un modèle')) + '</button>'
      + '<button type="button" class="secondary" data-rdoc-info="1">' + _esc(_t('ما الفرق عن العقد الرسمي؟', 'Différence avec un contrat officiel ?')) + '</button>'
      + '</div></div>';
    container.querySelector('[data-rdoc-demo]').addEventListener('click', function () {
      issueDemo(k);
    });
    container.querySelector('[data-rdoc-info]').addEventListener('click', function () {
      if (typeof global.showToast === 'function') {
        global.showToast(_t(
          'العقد الرسمي يُبرم خارج المنصة إن رغب الطرفان. هنا: محضر إداري + اتفاق إرشادي + ملاحظة «تم عن طريق منصة رزق».',
          'Le contrat officiel se signe hors plateforme si les parties le souhaitent. Ici : PV administratif + accord indicatif + mention « Établi via Rizq ».'
        ));
      } else {
        alert(_t(
          'العقد الرسمي يُبرم خارج المنصة إن رغب الطرفان. هنا: محضر إداري + اتفاق إرشادي + ملاحظة «تم عن طريق منصة رزق».',
          'Le contrat officiel se signe hors plateforme si les parties le souhaitent. Ici : PV administratif + accord indicatif + mention « Établi via Rizq ».'
        ));
      }
    });
  }

  global.RizqRoomProtocol = {
    PLATFORM_NOTE: PLATFORM_NOTE,
    create: create,
    createFromTender: createFromTender,
    createFromInvestment: createFromInvestment,
    get: get,
    listByKind: listByKind,
    renderDocumentHTML: renderDocumentHTML,
    openPrint: openPrint,
    openModal: openModal,
    closeModal: closeModal,
    issueAndOpen: issueAndOpen,
    issueTenderProtocol: issueTenderProtocol,
    issueInvestmentProtocol: issueInvestmentProtocol,
    issueDemo: issueDemo,
    mountPanel: mountPanel
  };
})(typeof window !== 'undefined' ? window : this);
