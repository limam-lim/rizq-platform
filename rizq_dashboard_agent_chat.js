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
    renderAgentChatPanel: renderAgentChatPanel,
  };
})(typeof window !== 'undefined' ? window : global);
