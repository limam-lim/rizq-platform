/**
 * rizq_invoice_engine.js
 * ═══════════════════════════════════════════════════════════════════
 * محرك الفواتير/إيصالات الدفع — رزق
 * يُولّد إيصال تأكيد دفع تلقائياً عند تفعيل/تجديد باقة (يُستدعى من
 * rizq_subscription_engine.js عند activatePackage). تخزين محلي بالكامل
 * (لا خادم فواتير حقيقي) — لذا الإيصال هنا "تأكيد دفع داخلي بعد مراجعة
 * يدوية لوصل التحويل البنكي"، وليس فاتورة ضريبية رسمية.
 * ═══════════════════════════════════════════════════════════════════
 */
(function(global){

  var KEY_INVOICES = 'rizq_invoices';
  var KEY_SEQ       = 'rizq_invoice_seq';

  function _load(){ try{ return JSON.parse(localStorage.getItem(KEY_INVOICES)||'[]'); }catch(e){ return []; } }
  function _save(arr){ try{ localStorage.setItem(KEY_INVOICES, JSON.stringify(arr)); }catch(e){} }

  // ── رقم إيصال تسلسلي: RZQ-2026-000123 ─────────────────────────────
  function _nextNumber(){
    var year = new Date().getFullYear();
    var seq = 1;
    try{ seq = parseInt(localStorage.getItem(KEY_SEQ)||'0',10) + 1; }catch(e){}
    try{ localStorage.setItem(KEY_SEQ, String(seq)); }catch(e){}
    return 'RZQ-'+year+'-'+String(seq).padStart(6,'0');
  }

  function _esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function _fmtDate(iso, locale){ try{ return new Date(iso).toLocaleDateString(locale||'ar-EG-u-nu-latn',{year:'numeric',month:'2-digit',day:'2-digit'}); }catch(e){ return iso||'-'; } }
  function _fmtMoney(n){ n = Number(n)||0; return n.toLocaleString()+' MRU'; }

  // ── توليد إيصال جديد ───────────────────────────────────────────────
  // opts: { accountId, accountName, accountPhone, accountEmail, accountType,
  //         pkgName, price, days, periodStart, periodEnd, activatedBy }
  function generateInvoice(opts){
    opts = opts || {};
    if(!opts.accountId || !opts.pkgName) return null;
    var inv = {
      id          : 'INV_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),
      number      : _nextNumber(),
      accountId   : opts.accountId,
      accountName : opts.accountName || opts.accountId,
      accountPhone: opts.accountPhone || '',
      accountEmail: opts.accountEmail || '',
      accountType : opts.accountType || '',
      pkgName     : opts.pkgName,
      price       : Number(opts.price)||0,
      days        : Number(opts.days)||0,
      periodStart : opts.periodStart || new Date().toISOString(),
      periodEnd   : opts.periodEnd || null,
      issuedAt    : new Date().toISOString(),
      activatedBy : opts.activatedBy || 'admin',
      status      : 'paid'
    };
    var all = _load();
    all.unshift(inv); // الأحدث أولاً
    _save(all);
    return inv;
  }

  function getAllInvoices(){ return _load(); }
  function getInvoicesForAccount(accountId){ return _load().filter(function(i){ return i.accountId===accountId; }); }
  function getInvoice(id){ return _load().find(function(i){ return i.id===id; }) || null; }

  // ── بناء صفحة إيصال HTML قابلة للطباعة/الحفظ كـ PDF (ثنائية اللغة) ──
  function renderInvoiceHTML(inv){
    if(!inv) return '<p>الإيصال غير موجود</p>';
    var ar = '\
      <div style="font-family:\'Segoe UI\',Tahoma,Arial,sans-serif;max-width:680px;margin:0 auto;padding:32px;color:#1B3A6B" dir="rtl">\
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #C9A84C;padding-bottom:16px;margin-bottom:20px">\
          <div><div style="font-size:22px;font-weight:800;color:#1B3A6B">رزق <span style="color:#C9A84C">Rizq</span></div>\
          <div style="font-size:11px;color:#6b7280">ADMINIA SARL — موريتانيا</div></div>\
          <div style="text-align:left"><div style="font-size:13px;font-weight:700">إيصال تأكيد دفع</div>\
          <div style="font-size:12px;color:#6b7280">رقم: '+_esc(inv.number)+'</div>\
          <div style="font-size:12px;color:#6b7280">التاريخ: '+_fmtDate(inv.issuedAt,'ar-EG-u-nu-latn')+'</div></div>\
        </div>\
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px">\
          <tr><td style="padding:6px 0;color:#6b7280;width:140px">الحساب</td><td style="padding:6px 0;font-weight:700">'+_esc(inv.accountName)+'</td></tr>\
          '+(inv.accountPhone?'<tr><td style="padding:6px 0;color:#6b7280">الهاتف</td><td style="padding:6px 0">'+_esc(inv.accountPhone)+'</td></tr>':'')+'\
          '+(inv.accountEmail?'<tr><td style="padding:6px 0;color:#6b7280">البريد</td><td style="padding:6px 0">'+_esc(inv.accountEmail)+'</td></tr>':'')+'\
        </table>\
        <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e5e7eb">\
          <thead><tr style="background:#f8faff"><th style="padding:10px;text-align:right">البيان</th><th style="padding:10px;text-align:right">المدة</th><th style="padding:10px;text-align:right">المبلغ</th></tr></thead>\
          <tbody><tr><td style="padding:10px;border-top:1px solid #e5e7eb">باقة: '+_esc(inv.pkgName)+'</td>\
          <td style="padding:10px;border-top:1px solid #e5e7eb">'+inv.days+' يوم ('+_fmtDate(inv.periodStart,'ar-EG-u-nu-latn')+' → '+_fmtDate(inv.periodEnd,'ar-EG-u-nu-latn')+')</td>\
          <td style="padding:10px;border-top:1px solid #e5e7eb;font-weight:700;color:#C9A84C">'+(inv.price>0?_fmtMoney(inv.price):'مجاناً')+'</td></tr></tbody>\
        </table>\
        <div style="margin-top:10px;text-align:left;font-size:15px;font-weight:800">الإجمالي: '+(inv.price>0?_fmtMoney(inv.price):'0 MRU')+'</div>\
        <div style="margin-top:24px;padding:12px;background:#f8faff;border-radius:8px;font-size:11px;color:#6b7280;line-height:1.7">\
          هذا إيصال داخلي يؤكد مراجعة الإدارة لوصل التحويل/الدفع المُرسَل من المشترك وتفعيل الباقة بناءً عليه. لا يُعد فاتورة ضريبية رسمية، ولا يُستخدم كمستند محاسبي/جبائي معتمد. لأي استفسار: contact@rizq.mr\
        </div>\
      </div>';
    var fr = '\
      <div style="font-family:\'Segoe UI\',Tahoma,Arial,sans-serif;max-width:680px;margin:24px auto 0;padding:32px;color:#1B3A6B;border-top:1px dashed #d1d5db" dir="ltr">\
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #C9A84C;padding-bottom:16px;margin-bottom:20px">\
          <div><div style="font-size:22px;font-weight:800;color:#1B3A6B">Rizq</div>\
          <div style="font-size:11px;color:#6b7280">ADMINIA SARL — Mauritanie</div></div>\
          <div style="text-align:right"><div style="font-size:13px;font-weight:700">Reçu de confirmation de paiement</div>\
          <div style="font-size:12px;color:#6b7280">N°: '+_esc(inv.number)+'</div>\
          <div style="font-size:12px;color:#6b7280">Date: '+_fmtDate(inv.issuedAt,'fr-FR')+'</div></div>\
        </div>\
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px">\
          <tr><td style="padding:6px 0;color:#6b7280;width:140px">Compte</td><td style="padding:6px 0;font-weight:700">'+_esc(inv.accountName)+'</td></tr>\
          '+(inv.accountPhone?'<tr><td style="padding:6px 0;color:#6b7280">Téléphone</td><td style="padding:6px 0">'+_esc(inv.accountPhone)+'</td></tr>':'')+'\
          '+(inv.accountEmail?'<tr><td style="padding:6px 0;color:#6b7280">Email</td><td style="padding:6px 0">'+_esc(inv.accountEmail)+'</td></tr>':'')+'\
        </table>\
        <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e5e7eb">\
          <thead><tr style="background:#f8faff"><th style="padding:10px;text-align:left">Désignation</th><th style="padding:10px;text-align:left">Période</th><th style="padding:10px;text-align:left">Montant</th></tr></thead>\
          <tbody><tr><td style="padding:10px;border-top:1px solid #e5e7eb">Forfait: '+_esc(inv.pkgName)+'</td>\
          <td style="padding:10px;border-top:1px solid #e5e7eb">'+inv.days+' j ('+_fmtDate(inv.periodStart,'fr-FR')+' → '+_fmtDate(inv.periodEnd,'fr-FR')+')</td>\
          <td style="padding:10px;border-top:1px solid #e5e7eb;font-weight:700;color:#C9A84C">'+(inv.price>0?_fmtMoney(inv.price):'Gratuit')+'</td></tr></tbody>\
        </table>\
        <div style="margin-top:10px;text-align:right;font-size:15px;font-weight:800">Total: '+(inv.price>0?_fmtMoney(inv.price):'0 MRU')+'</div>\
        <div style="margin-top:24px;padding:12px;background:#f8faff;border-radius:8px;font-size:11px;color:#6b7280;line-height:1.7">\
          Ce reçu confirme la vérification interne du justificatif de paiement par l\'équipe Rizq et l\'activation du forfait correspondant. Il ne constitue pas une facture fiscale officielle ni un document comptable certifié. Contact: contact@rizq.mr\
        </div>\
      </div>';
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+_esc(inv.number)+'</title></head><body style="margin:0;background:#fff">'+ar+fr+'</body></html>';
  }

  // ── فتح نافذة طباعة/حفظ كـ PDF عبر متصفح المستخدم ──────────────────
  function openInvoice(id){
    var inv = getInvoice(id);
    if(!inv) return false;
    var w = window.open('', '_blank');
    if(!w) return false;
    w.document.write(renderInvoiceHTML(inv));
    w.document.close();
    w.focus();
    setTimeout(function(){ try{ w.print(); }catch(e){} }, 350);
    return true;
  }

  global.RizqInvoice = {
    generateInvoice        : generateInvoice,
    getAllInvoices          : getAllInvoices,
    getInvoicesForAccount   : getInvoicesForAccount,
    getInvoice              : getInvoice,
    renderInvoiceHTML        : renderInvoiceHTML,
    openInvoice              : openInvoice
  };

})(typeof window !== 'undefined' ? window : this);
