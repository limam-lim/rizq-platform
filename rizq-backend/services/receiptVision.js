'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const { getAdvancedModel, getAnthropicApiKey } = require('../config/anthropic');

/**
 * تحليل صورة وصل دفع عبر Claude Vision — نفس منطق POST /api/verify-receipt
 * @returns {{ ok: boolean, result?: object, error?: string }}
 */
async function analyzeReceiptImage(imageBase64, opts = {}) {
  if (!imageBase64 || !String(imageBase64).startsWith('data:image')) {
    return { ok: false, error: 'invalid_image', result: null };
  }
  const match = String(imageBase64).match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) return { ok: false, error: 'invalid_format', result: null };

  const [, mediaType, b64] = match;
  const pkgName = opts.pkgName || '';
  const expectedPrice = opts.expectedPrice;
  const client = opts.anthropic || new Anthropic({ apiKey: getAnthropicApiKey() });

  const prompt =
    'هذه صورة وصل دفع لمنصة إعلانات موريتانية. استخرج منها فقط: التاريخ، المبلغ، ' +
    'اسم البنك أو مشغل الدفع، رقم/مرجع العملية إن وجد. ثم أعطِ رأياً عاماً في معقولية ' +
    'الوصل (وضوح، تناسق الخطوط، وجود علامات تحرير واضحة) — بدون الجزم بتزوير أو صحة. ' +
    (pkgName ? 'الباقة المطلوبة: ' + pkgName + '. ' : '') +
    (expectedPrice ? 'السعر المتوقع: ' + expectedPrice + ' أوقية. ' : '') +
    'أجب بصيغة JSON فقط بهذا الشكل: ' +
    '{"date":"","amount":"","reference":"","bankOrOperator":"","plausibilityLevel":"clear|low|medium|high","notes":["..."]}';

  try {
    const msg = await client.messages.create({
      model: getAdvancedModel(),
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } },
          { type: 'text', text: prompt },
        ],
      }],
    });

    const text = (msg.content || []).map((c) => c.text || '').join('');
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      parsed = {
        date: '',
        amount: '',
        reference: '',
        bankOrOperator: '',
        plausibilityLevel: 'low',
        notes: ['تعذّر تحليل رد النموذج تلقائياً — راجع يدوياً'],
      };
    }
    return { ok: true, result: parsed };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
      result: {
        plausibilityLevel: 'unreviewed',
        notes: ['فشل التحليل الآلي — راجع الوصل يدوياً'],
      },
    };
  }
}

module.exports = { analyzeReceiptImage };
