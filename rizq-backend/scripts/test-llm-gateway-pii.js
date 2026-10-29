#!/usr/bin/env node
/**
 * PHASE B step 5 fix — PII pseudonymization in llmGateway (no live Anthropic).
 *   node scripts/test-llm-gateway-pii.js
 *
 * 1) الأسعار لا تُعامل كأرقام هواتف.
 * 2) رقم الزبون يصل كاملاً لأداة تسجيل الطلب، ولا يصل أبداً للمزوّد.
 * 3) رقم المحل داخل tool_result يظهر صحيحاً للزبون.
 * 4) الصيغ المفصولة بمسافات تُلتقط.
 */
'use strict';

const llm = require('../services/llmGateway');
const { getAdvancedModel } = require('../config/anthropic');

let failed = 0;
function ok(name, cond, detail) {
  if (!cond) {
    failed += 1;
    console.error('FAIL', name, detail || '');
  } else {
    console.log('OK  ', name);
  }
}

async function main() {
  // ── 1) prices are not phones ────────────────────────────────
  const prices = [
    'فيلا في تفرغ زينة بسعر 35000000 أوقية',
    'Prix: 42000000',
    'السعر 25000000',
    'شقة 32000000 MRU',
    'سيارة 2400000',
    'السعر 35 000 000 أوقية',
    'ثمنها 35.000.000',
    'loyer 3500000 UM',
    'أرض بسعر 1500000000 أوقية قديمة',
  ];
  prices.forEach((p) => {
    const r = llm.redactPii(p);
    ok('price kept: ' + p, r === p, r);
  });

  // ── 2) phones are still masked (incl. spaced formats) ───────
  const phones = [
    ['اتصل بي على 22334455', '22334455'],
    ['رقم المحل 36 12 34 56', '36 12 34 56'],
    ['واتساب 4612 3456', '4612 3456'],
    ['هاتف المحل: +222 46 11 22 33', '46 11 22 33'],
    ['رقمي 22334455 والسعر 35000000 أوقية', '22334455'],
  ];
  phones.forEach(([text, raw]) => {
    const r = llm.redactPii(text);
    ok('phone masked: ' + text, !r.includes(raw) && r.includes('[PHONE]'), r);
  });
  const mixed = llm.redactPii('رقمي 22334455 والسعر 35000000 أوقية');
  ok('mixed: price kept next to phone', mixed.includes('35000000'), mixed);

  // ── 3) lead tool receives the real customer number ──────────
  let providerPayload = null;
  const leadClient = {
    messages: {
      create: async (params) => {
        providerPayload = JSON.stringify(params);
        // النموذج يرى الرمز فقط، ويمرره للأداة كما هو
        const m = providerPayload.match(/\[PHONE_\d+\]/);
        return {
          content: [
            { type: 'text', text: 'تم تسجيل طلبك، سنتواصل معك على ' + (m ? m[0] : '?') },
            {
              type: 'tool_use',
              id: 'tu_1',
              name: 'create_subscription_request',
              input: { business_name: 'محل النور', whatsapp: m ? m[0] : '?', package_requested: 'gold' },
            },
          ],
          usage: { input_tokens: 10, output_tokens: 5 },
        };
      },
    },
  };
  const out = await llm.complete({
    agent: 'widget',
    client: leadClient,
    params: {
      model: getAdvancedModel(),
      max_tokens: 100,
      system: 'أنت مساعد رزق',
      messages: [{ role: 'user', content: 'أريد الباقة الذهبية لمحل النور، رقمي 22334455' }],
    },
  });
  ok('provider never sees real phone', !providerPayload.includes('22334455'), providerPayload);
  ok('provider sees a stable token', /\[PHONE_1\]/.test(providerPayload));
  const toolUse = out.response.content.find((b) => b.type === 'tool_use');
  ok('tool input restored to real number', toolUse && toolUse.input.whatsapp === '22334455', JSON.stringify(toolUse));
  const text = out.response.content.find((b) => b.type === 'text').text;
  ok('reply text restored for the customer', text.includes('22334455') && !text.includes('[PHONE'), text);

  // ── 4) store phone from tool_result shown correctly ─────────
  let payload2 = null;
  const storeClient = {
    messages: {
      create: async (params) => {
        payload2 = JSON.stringify(params);
        const m = payload2.match(/\[PHONE_\d+\]/);
        return {
          content: [{ type: 'text', text: 'رقم محل النور هو ' + (m ? m[0] : '?') + ' والسعر 35000000 أوقية' }],
          usage: {},
        };
      },
    },
  };
  const out2 = await llm.complete({
    agent: 'widget',
    client: storeClient,
    params: {
      model: getAdvancedModel(),
      max_tokens: 100,
      messages: [
        { role: 'user', content: 'ما رقم محل النور؟' },
        { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'get_store', input: { name: 'محل النور' } }] },
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'محل النور — هاتف 46112233 — فيلا بسعر 35000000 أوقية' }] },
      ],
    },
  });
  ok('store phone hidden from provider', !payload2.includes('46112233'), payload2);
  ok('price visible to provider (needed to answer)', payload2.includes('35000000'));
  const t2 = out2.response.content[0].text;
  ok('customer sees store phone', t2.includes('46112233'), t2);
  ok('customer sees price', t2.includes('35000000'), t2);

  // ── 5) history tool_use with real values is masked before resend ──
  let payload3 = null;
  await llm.complete({
    agent: 'widget',
    client: { messages: { create: async (p) => { payload3 = JSON.stringify(p); return { content: [{ type: 'text', text: 'ok' }], usage: {} }; } } },
    params: {
      model: getAdvancedModel(),
      max_tokens: 20,
      messages: [
        { role: 'user', content: 'رقمي 22334455' },
        { role: 'assistant', content: [{ type: 'tool_use', id: 't9', name: 'create_lead', input: { whatsapp: '22334455' } }] },
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't9', content: 'ok' }] },
      ],
    },
  });
  ok('history tool_use masked', !payload3.includes('22334455'), payload3);
  ok('same number → same token across turns', (payload3.match(/\[PHONE_1\]/g) || []).length >= 2, payload3);

  // ── 6) vault is per request and never in call log ───────────
  const recent = llm.getRecentCalls();
  ok('call log has no vault/values', !JSON.stringify(recent).includes('22334455') && !JSON.stringify(recent).includes('vault'));

  // ── 7) skipRedaction path unchanged ─────────────────────────
  let payload4 = null;
  await llm.complete({
    agent: 'translate',
    skipRedaction: true,
    client: { messages: { create: async (p) => { payload4 = JSON.stringify(p); return { content: [{ type: 'text', text: '{}' }], usage: {} }; } } },
    params: { model: getAdvancedModel(), messages: [{ role: 'user', content: 'هاتف 22334455' }] },
  });
  ok('skipRedaction keeps raw text', payload4.includes('22334455'));

  if (failed) {
    console.error('\n[test-llm-gateway-pii] FAILED:', failed);
    process.exit(1);
  }
  console.log('\n[test-llm-gateway-pii] ALL PASSED');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
