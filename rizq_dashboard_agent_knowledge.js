/**
 * rizq_dashboard_agent_knowledge.js
 * رفع Excel/CSV + تعليمات خاصة للوكيل الماسي (معزول per accountId)
 */
(function (global) {
  'use strict';

  function _backendBase() {
    if (typeof global.RIZQ_BACKEND_BASE === 'string' && global.RIZQ_BACKEND_BASE) {
      return global.RIZQ_BACKEND_BASE.replace(/\/$/, '');
    }
    return '';
  }

  function _t2(ar, fr) {
    var lang = 'ar';
    try { lang = global.localStorage.getItem('rizq_lang') || 'ar'; } catch (e) {}
    return lang === 'fr' ? fr : ar;
  }

  function _accountToken(accountId) {
    try {
      if (global.REAL_ACCESS_TOKEN) return global.REAL_ACCESS_TOKEN;
      var accounts = JSON.parse(global.localStorage.getItem('rizq_accounts') || '{}');
      if (accounts[accountId] && accounts[accountId].accessToken) return accounts[accountId].accessToken;
      var pending = JSON.parse(global.localStorage.getItem('rizq_pending_accounts') || '[]');
      var row = pending.find(function (a) { return a.id === accountId; });
      return (row && (row.accessToken || row.backendAccessToken)) || '';
    } catch (e) { return ''; }
  }

  function fetchKnowledgeMeta(accountId) {
    var base = _backendBase();
    var token = _accountToken(accountId);
    if (!base || !accountId || !token) return Promise.resolve(null);
    return fetch(base + '/api/subscriber/knowledge/mine/' + encodeURIComponent(accountId), {
      headers: { 'x-account-token': token },
    }).then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function saveCustomInstructions(accountId, customInstructions) {
    var base = _backendBase();
    var token = _accountToken(accountId);
    if (!base || !accountId || !token) return Promise.reject(new Error('no_backend'));
    return fetch(base + '/api/subscriber/knowledge/instructions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-account-token': token },
      body: JSON.stringify({ accountId: accountId, customInstructions: customInstructions }),
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (res.ok && res.body && res.body.ok) return res.body;
        throw new Error((res.body && res.body.error) || 'save_failed');
      });
  }

  function uploadKnowledgeFile(accountId, file) {
    var base = _backendBase();
    var token = _accountToken(accountId);
    if (!base || !accountId || !token) return Promise.reject(new Error('no_backend'));
    var name = (file && file.name) || 'data.csv';
    var ext = name.toLowerCase().split('.').pop();
    if (['csv', 'xlsx', 'xls'].indexOf(ext) === -1) {
      return Promise.reject(new Error('unsupported_format'));
    }
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var arr = new Uint8Array(reader.result);
        var bin = '';
        for (var i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
        var b64 = btoa(bin);
        fetch(base + '/api/subscriber/knowledge/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-account-token': token,
          },
          body: JSON.stringify({
            accountId: accountId,
            fileName: name,
            fileDataBase64: b64,
          }),
        }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
          .then(function (res) {
            if (res.ok && res.body && res.body.ok) resolve(res.body);
            else reject(new Error((res.body && res.body.error) || 'upload_failed'));
          })
          .catch(reject);
      };
      reader.onerror = function () { reject(new Error('read_failed')); };
      reader.readAsArrayBuffer(file);
    });
  }

  function renderKnowledgePanel(opts) {
    opts = opts || {};
    var mountId = opts.mountId || 'agent-knowledge-upload';
    var accountId = opts.accountId || '';
    var el = document.getElementById(mountId);
    if (!el || !accountId) return;

    el.innerHTML =
      '<div style="margin:14px 0;padding:14px;border:1px dashed #c4b5fd;border-radius:12px;background:#faf5ff">' +
        '<div style="font-size:13px;font-weight:700;color:#6d28d9;margin-bottom:8px">' +
          _t2('📊 تحديث بيانات الوكيل (Excel / CSV)', '📊 Mettre à jour les données de l\'agent (Excel / CSV)') +
        '</div>' +
        '<p style="font-size:12px;color:#5b21b6;margin:0 0 10px;line-height:1.5">' +
          _t2(
            'ارفع قائمة أسعار، غرف، مواعيد، أو خدمات — يقرأها الوكيل فوراً في المحادثات.',
            'Téléversez tarifs, chambres, horaires ou services — l\'agent les utilise immédiatement.'
          ) +
        '</p>' +
        '<input type="file" id="agent-knowledge-file" accept=".csv,.xlsx,.xls" style="font-size:12px;margin-bottom:8px;width:100%" />' +
        '<button type="button" id="agent-knowledge-btn" style="padding:8px 14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">' +
          _t2('⬆️ رفع وتحديث', '⬆️ Téléverser et mettre à jour') +
        '</button>' +
        '<div id="agent-knowledge-status" style="margin-top:10px;font-size:11px;color:#64748b"></div>' +
        '<div id="agent-knowledge-preview" style="margin-top:8px;font-size:11px;color:#334155;max-height:80px;overflow:auto;white-space:pre-wrap;background:#f8fafc;padding:8px;border-radius:6px;display:none"></div>' +
      '</div>' +
      '<div style="margin:14px 0;padding:14px;border:1px solid #e2e8f0;border-radius:12px;background:#fff">' +
        '<div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:8px">' +
          _t2('📌 تعليمات خاصة للوكيل', '📌 Instructions spéciales pour l\'agent') +
        '</div>' +
        '<p style="font-size:12px;color:#64748b;margin:0 0 8px;line-height:1.5">' +
          _t2(
            'اكتب قواعد إضافية: أسلوب الرد، عروض اليوم، سياسات الحجز… تُدمج مع بيانات الملف.',
            'Règles supplémentaires : ton, offres du jour, politique de réservation… fusionnées avec le fichier.'
          ) +
        '</p>' +
        '<textarea id="agent-custom-instructions" rows="4" maxlength="4000" ' +
          'style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:12px;font-family:inherit;resize:vertical" ' +
          'placeholder="' + _t2('مثال: لا تذكر أسعار الغرف إلا من ملف الأسعار المرفوع. رحّب بالضيوف بالفرنسية إن تحدثوا بها.', 'Ex. : Ne citez les prix que depuis le fichier. Accueillez en français si le client parle français.') + '"></textarea>' +
        '<button type="button" id="agent-instructions-btn" style="margin-top:8px;padding:8px 14px;background:#1e3a5f;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">' +
          _t2('💾 حفظ التعليمات', '💾 Enregistrer les instructions') +
        '</button>' +
        '<div id="agent-instructions-status" style="margin-top:8px;font-size:11px;color:#64748b"></div>' +
      '</div>';

    var statusEl = document.getElementById('agent-knowledge-status');
    var previewEl = document.getElementById('agent-knowledge-preview');
    var btn = document.getElementById('agent-knowledge-btn');
    var instrTa = document.getElementById('agent-custom-instructions');
    var instrBtn = document.getElementById('agent-instructions-btn');
    var instrStatus = document.getElementById('agent-instructions-status');

    fetchKnowledgeMeta(accountId).then(function (data) {
      if (!data) return;
      if (data.customInstructions && instrTa) instrTa.value = data.customInstructions;
      if (!data.dynamicKnowledge) return;
      var dk = data.dynamicKnowledge;
      statusEl.textContent = _t2(
        '✅ آخر تحديث: ' + (dk.updatedAt ? dk.updatedAt.slice(0, 16).replace('T', ' ') : '—') +
          (dk.sourceFile ? ' · ' + dk.sourceFile : '') +
          (dk.rowCount ? ' · ' + dk.rowCount + ' صف' : ''),
        '✅ Dernière MAJ : ' + (dk.updatedAt ? dk.updatedAt.slice(0, 16).replace('T', ' ') : '—')
      );
      if (dk.text) {
        previewEl.style.display = 'block';
        previewEl.textContent = dk.text.slice(0, 400) + (dk.text.length > 400 ? '…' : '');
      }
    });

    if (btn) {
      btn.addEventListener('click', function () {
        var input = document.getElementById('agent-knowledge-file');
        var file = input && input.files && input.files[0];
        if (!file) {
          statusEl.textContent = _t2('⚠️ اختر ملفاً أولاً', '⚠️ Choisissez un fichier d\'abord');
          statusEl.style.color = '#b45309';
          return;
        }
        btn.disabled = true;
        statusEl.textContent = _t2('جارٍ الرفع والتحليل…', 'Téléversement et analyse…');
        statusEl.style.color = '#64748b';
        uploadKnowledgeFile(accountId, file).then(function (res) {
          statusEl.textContent = _t2('✅ ' + (res.message || 'تم التحديث'), '✅ Mise à jour réussie');
          statusEl.style.color = '#15803d';
          if (res.preview) {
            previewEl.style.display = 'block';
            previewEl.textContent = res.preview;
          }
          if (input) input.value = '';
        }).catch(function (err) {
          statusEl.textContent = _t2('❌ فشل الرفع: ', '❌ Échec : ') + (err.message || 'error');
          statusEl.style.color = '#dc2626';
        }).finally(function () {
          btn.disabled = false;
        });
      });
    }

    if (instrBtn && instrTa) {
      instrBtn.addEventListener('click', function () {
        instrBtn.disabled = true;
        instrStatus.textContent = _t2('جارٍ الحفظ…', 'Enregistrement…');
        instrStatus.style.color = '#64748b';
        saveCustomInstructions(accountId, instrTa.value).then(function (res) {
          instrStatus.textContent = _t2('✅ ' + (res.message || 'تم الحفظ'), '✅ Enregistré');
          instrStatus.style.color = '#15803d';
        }).catch(function (err) {
          instrStatus.textContent = _t2('❌ ', '❌ ') + (err.message || 'error');
          instrStatus.style.color = '#dc2626';
        }).finally(function () {
          instrBtn.disabled = false;
        });
      });
    }
  }

  global.RizqDashboardAgentKnowledge = {
    renderKnowledgePanel: renderKnowledgePanel,
    fetchKnowledgeMeta: fetchKnowledgeMeta,
    uploadKnowledgeFile: uploadKnowledgeFile,
    saveCustomInstructions: saveCustomInstructions,
  };
})(typeof window !== 'undefined' ? window : global);
