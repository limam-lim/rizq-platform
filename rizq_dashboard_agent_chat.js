/**
 * rizq_dashboard_agent_chat.js
 * اختبار اتصال Claude + محادثة تجريبية من لوحة الوكيل الذكي
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

  function fetchAiStatus() {
    var base = _backendBase();
    if (!base) return Promise.resolve({ configured: false, offline: true });
    return fetch(base + '/api/ai/status')
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return { configured: false, offline: true }; });
  }

  function _agentCfg() {
    try {
      if (typeof global.RizqSub !== 'undefined' && typeof global.RizqSub.getAgentConfig === 'function') {
        return global.RizqSub.getAgentConfig() || {};
      }
    } catch (e) {}
    return { backendUrl: _backendBase(), backendSecret: '' };
  }

  function _accountToken(accountId) {
    try {
      var accounts = JSON.parse(global.localStorage.getItem('rizq_accounts') || '{}');
      var row = accounts[accountId] || {};
      return row.server_token || row.accessToken || '';
    } catch (e) { return ''; }
  }

  function fetchQuotaUsage(accountId) {
    var cfg = _agentCfg();
    var token = _accountToken(accountId);
    if (!cfg.backendUrl || !accountId || !token) return Promise.resolve(null);
    return fetch(cfg.backendUrl.replace(/\/$/, '') + '/api/quota/mine/' + encodeURIComponent(accountId), {
      headers: { 'x-account-token': token },
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { return data && data.ok ? data.usage : null; })
      .catch(function () { return null; });
  }

  function requestQuotaAddon(accountId) {
    var cfg = _agentCfg();
    var token = _accountToken(accountId);
    if (!cfg.backendUrl || !accountId || !token) return Promise.reject(new Error('no_backend'));
    return fetch(cfg.backendUrl.replace(/\/$/, '') + '/api/quota/mine/' + encodeURIComponent(accountId) + '/addon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-account-token': token },
    }).then(function (r) { return r.json(); });
  }

  function _quotaBarHtml(pct) {
    var p = Math.max(0, Math.min(100, Number(pct) || 0));
    var col = p >= 100 ? '#dc2626' : p >= 80 ? '#d97706' : '#16a34a';
    return '<div style="height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;margin-top:8px"><div style="height:100%;width:' + p + '%;background:' + col + ';border-radius:99px"></div></div>';
  }

  function paintQuotaBanner(el, usage, accountId) {
    if (!el) return;
    usage = usage || { pct: 0, messages: 0, callMinutes: 0 };
    var pct = usage.pct || 0;
    var msg;
    var extra = '';
    if (pct >= 100) {
      msg = _t2(
        '⚠️ استنفدت الحصة العادلة لهذا الشهر — الوكيل يعمل الآن بالوضع الاقتصادي. اشترِ حزمة إضافية لاستعادة الرد المتقدم.',
        '⚠️ Quota mensuel atteint — l\'adjoint fonctionne en mode économique. Achetez un pack pour retrouver les réponses avancées.'
      );
      extra = '<button type="button" id="' + el.id + '-addon" style="margin-top:10px;padding:8px 14px;background:linear-gradient(135deg,#B8860B,#DAA520);color:#fff;border:none;border-radius:9px;font-size:12px;font-weight:800;cursor:pointer">' +
        _t2('شراء حزمة إضافية (' + (usage.addon && usage.addon.priceMru || 1500) + ' أوقية)', 'Acheter un pack (' + (usage.addon && usage.addon.priceMru || 1500) + ' MRU)') + '</button>';
    } else if (pct >= 80) {
      msg = _t2(
        'وشوك انتهاء حصتك الماسية هذا الشهر (' + pct + '%). يمكنك شراء حزمة إضافية قبل التحويل التلقائي للوضع الاقتصادي.',
        'Votre quota Diamant touche à sa fin (' + pct + '%). Achetez un pack avant le passage automatique au mode économique.'
      );
      extra = '<button type="button" id="' + el.id + '-addon" style="margin-top:10px;padding:8px 14px;background:#1B3A6B;color:#fff;border:none;border-radius:9px;font-size:12px;font-weight:800;cursor:pointer">' +
        _t2('طلب حزمة إضافية', 'Demander un pack') + '</button>';
    } else {
      msg = _t2('استهلاك هذا الشهر: ' + pct + '% من الحصة العادلة', 'Consommation du mois : ' + pct + '% du quota');
    }
    if (usage.pendingAddon) {
      extra = '<div style="margin-top:8px;font-size:12px;font-weight:700;color:#9a3412">' + _t2('طلب الحزمة الإضافية قيد مراجعة الإدارة', 'Demande de pack en cours de validation') + '</div>';
    }
    el.innerHTML =
      '<div style="background:' + (pct >= 100 ? '#fef2f2' : pct >= 80 ? '#fff7ed' : '#f0fdf4') + ';border:1px solid ' + (pct >= 100 ? '#fecaca' : pct >= 80 ? '#fed7aa' : '#bbf7d0') + ';border-radius:12px;padding:12px 14px;margin-bottom:12px">' +
        '<div style="font-size:12.5px;font-weight:800;color:#1B3A6B">💎 ' + _t2('الحصة العادلة — الباقة الماسية', 'Quota équitable — Diamant') + '</div>' +
        '<div style="font-size:12px;color:#475569;margin-top:4px;line-height:1.6">' + msg + '</div>' +
        _quotaBarHtml(pct) +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;font-size:11px;color:#64748b">' +
          '<span>' + _t2('رسائل', 'Msgs') + ' ' + (usage.messages || 0) + '/' + ((usage.limits && usage.limits.messages) || 0) + '</span>' +
          '<span>' + _t2('دقائق', 'Min') + ' ' + (usage.minutes || 0) + '/' + ((usage.limits && usage.limits.minutes) || 0) + '</span>' +
          '<span>' + _t2('توكنز', 'Tokens') + ' ' + (usage.tokens || 0) + '/' + ((usage.limits && usage.limits.tokens) || 0) + '</span>' +
        '</div>' + extra +
      '</div>';
    var btn = document.getElementById(el.id + '-addon');
    if (btn && !usage.pendingAddon) {
      btn.onclick = function () {
        btn.disabled = true;
        requestQuotaAddon(accountId).then(function () {
          fetchQuotaUsage(accountId).then(function (u) { paintQuotaBanner(el, u, accountId); });
        }).catch(function () { btn.disabled = false; });
      };
    }
  }

  function sendAgentTestChat(accountId, message, history) {
    var base = _backendBase();
    if (!base || !accountId) return Promise.reject(new Error('no_backend'));
    return fetch(base + '/api/subscriber/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: accountId, message: message, history: history || [] }),
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok || !data.ok) throw new Error((data && data.error) || 'request_failed');
        return data;
      });
    });
  }

  function renderAgentChatPanel(opts) {
    opts = opts || {};
    var mountId = opts.mountId || 'agent-chat-test';
    var accountId = opts.accountId || '';
    var el = document.getElementById(mountId);
    if (!el) return;

    el.innerHTML =
      '<div id="' + mountId + '-quota"></div>' +
      '<div style="margin-top:16px;border:1px solid rgba(27,58,107,.12);border-radius:14px;padding:14px;background:#f8fafc">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
          '<div style="font-size:13px;font-weight:800;color:#1B3A6B">🧪 ' + _t2('اختبار الوكيل (Claude)', 'Test agent (Claude)') + '</div>' +
          '<span id="' + mountId + '-status" style="font-size:11px;font-weight:700;color:#64748b">…</span>' +
        '</div>' +
        '<div id="' + mountId + '-log" style="max-height:160px;overflow-y:auto;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px;font-size:12px;line-height:1.6;margin-bottom:10px"></div>' +
        '<div style="display:flex;gap:8px">' +
          '<input id="' + mountId + '-input" type="text" placeholder="' + _t2('اكتب سؤالاً تجريبياً…', 'Écrivez une question test…') + '" style="flex:1;padding:9px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:12.5px;font-family:inherit">' +
          '<button id="' + mountId + '-btn" type="button" style="padding:9px 16px;background:#1B3A6B;color:#fff;border:none;border-radius:10px;font-size:12.5px;font-weight:700;cursor:pointer">' + _t2('إرسال', 'Envoyer') + '</button>' +
        '</div>' +
      '</div>';

    var statusEl = document.getElementById(mountId + '-status');
    var logEl = document.getElementById(mountId + '-log');
    var inputEl = document.getElementById(mountId + '-input');
    var btnEl = document.getElementById(mountId + '-btn');
    var history = [];

    function appendLog(role, text) {
      if (!logEl) return;
      var line = document.createElement('div');
      line.style.marginBottom = '6px';
      line.innerHTML = '<strong>' + (role === 'user' ? _t2('أنت', 'Vous') : '🤖') + ':</strong> ' + String(text || '').replace(/</g, '&lt;');
      logEl.appendChild(line);
      logEl.scrollTop = logEl.scrollHeight;
    }

    fetchQuotaUsage(accountId).then(function (usage) {
      paintQuotaBanner(document.getElementById(mountId + '-quota'), usage, accountId);
    });

    fetchAiStatus().then(function (st) {
      if (!statusEl) return;
      if (st && st.configured) {
        statusEl.textContent = '✅ Claude · ' + (st.model || 'AI');
        statusEl.style.color = '#059669';
      } else if (st && st.offline) {
        statusEl.textContent = '⚠️ ' + _t2('الخادم غير متصل', 'Serveur hors ligne');
        statusEl.style.color = '#d97706';
      } else {
        statusEl.textContent = '❌ ' + _t2('المفتاح غير مضبوط', 'Clé API absente');
        statusEl.style.color = '#dc2626';
      }
    });

    function onSend() {
      var msg = (inputEl && inputEl.value || '').trim();
      if (!msg || !accountId) return;
      appendLog('user', msg);
      if (inputEl) inputEl.value = '';
      if (btnEl) btnEl.disabled = true;
      sendAgentTestChat(accountId, msg, history)
        .then(function (data) {
          appendLog('agent', data.reply);
          history.push({ role: 'user', text: msg });
          history.push({ role: 'agent', text: data.reply });
          if (history.length > 12) history = history.slice(-12);
        })
        .catch(function (err) {
          appendLog('agent', _t2('تعذّر الرد: ', 'Échec : ') + (err.message || ''));
        })
        .finally(function () { if (btnEl) btnEl.disabled = false; });
    }

    if (btnEl) btnEl.onclick = onSend;
    if (inputEl) {
      inputEl.onkeypress = function (e) { if (e.key === 'Enter') onSend(); };
    }
  }

  global.RizqDashboardAgentChat = {
    fetchAiStatus: fetchAiStatus,
    sendAgentTestChat: sendAgentTestChat,
    fetchQuotaUsage: fetchQuotaUsage,
    requestQuotaAddon: requestQuotaAddon,
    renderAgentChatPanel: renderAgentChatPanel,
  };
})(typeof window !== 'undefined' ? window : global);
