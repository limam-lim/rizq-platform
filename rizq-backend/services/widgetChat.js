/**
 * مدير رزق الذكي — محادثة الويدجت مع function calling + مراجعة الرد
 */
const Anthropic = require('@anthropic-ai/sdk');
const { WIDGET_TOOLS, executeWidgetTool, resolvePageContextFacts } = require('./widgetAgentTools');
const { detectUserLanguage, normalizeUiLang, getLangLabel, pickLang } = require('./widgetLang');
const { getAnthropicApiKey, isAnthropicConfigured, getFastModel, createCachedMessage } = require('../config/anthropic');
const { buildPackagesPromptBlock } = require('../../rizq_packages_config');

const client = new Anthropic({ apiKey: getAnthropicApiKey() });

function buildLanguageInstructions(detectedLang, uiLang) {
  const label = getLangLabel(detectedLang);
  const ui = normalizeUiLang(uiLang);
  return (
    `\n## اللغة — إلزامي (Language — CRITICAL)\n` +
    `- كشف تلقائي: ردّ **حصرياً** بنفس لغة رسالة المستخدم الأخيرة.\n` +
    `- لغة هذه الرسالة المكتشفة: **${label}** (${detectedLang}).\n` +
    `- مدعوم: العربية، الحسانية، الفرنسية، الإنجليزية، الإسبانية — طابق المستخدم حرفياً.\n` +
    `- إذا خلط لغات، استخدم اللغة السائدة في رسالته.\n` +
    `- لغة واجهة الصفحة الافتراضية: ${getLangLabel(ui)} — استخدمها فقط إن كانت الرسالة غامضة (؟ أو emoji فقط).\n` +
    `\n## فهم مختصر ومبتور (Rizq slang)\n` +
    `افهم الطلبات القصيرة والعامية في سياق منصة رزق:\n` +
    `- عربي/حسانية: كم، ثمن، موثوق، نشر، باقة، إعلان، محل، شنو، كيفاش، بغيت، شحال\n` +
    `- FR: prix, pub, annonce, forfait, fiabilité, combien, vendeur\n` +
    `- EN: price, post, package, trust, seller, how much, reliable\n` +
    `- ES: precio, publicar, paquete, confianza, vendedor, cuánto\n` +
    `لا تطلب إعادة صياغة إن كان القصد واضحاً في سياق الإعلانات/المتاجر/الباقات.\n`
  );
}

function buildSystemPrompt({ lang, detectedLang, profile, pageContext, pageFacts }) {
  const uiLang = normalizeUiLang(lang);
  const replyLang = detectedLang || uiLang;
  let prompt = buildLanguageInstructions(replyLang, uiLang);

  if (profile && profile.businessName) {
    const agentTitle = (profile.persona && profile.persona.agentTitle) || pickLang({
      ar: 'المساعد الذكي',
      fr: 'Assistant intelligent',
      en: 'Smart assistant',
      es: 'Asistente inteligente',
    }, replyLang);
    prompt +=
      `\n# Role\n` +
      `You are ${agentTitle} for "${profile.businessName}" on Rizq platform.\n` +
      `Rules: never invent prices or details — use tools or direct to contact channels.\n`;
  } else {
    prompt +=
      `\n# Role\n` +
      `You are "Rizq Smart Manager" — the official AI agent for Rizq (rizq.mr).\n` +
      `Personality: friendly and professional.\n` +
      `CRITICAL: For any ad price, seller trust, or listing question — call tools first ` +
      `(get_ad_details, search_ads, get_seller_profile, get_seller_reputation) then answer ONLY from results.\n` +
      `If an ad id is open: call get_ad_details with that id before stating price or trust.\n` +
      `For trust questions: call get_seller_reputation after you know account_id from the ad.\n` +
      `Never guess prices or trust scores — if no data, say so clearly.\n` +
      `Rizq payments: Bankily, Sedad, or cash with seller. Registration is free at rizq.mr.\n` +
      `Keep replies short (2-4 sentences).\n`;
  }

  prompt += `\n${buildPackagesPromptBlock()}\nCall get_packages_info before quoting any Rizq plan price.\n`;

  const openAdId = pageContext && (pageContext.urlAdId || (pageContext.ad && pageContext.ad.id));
  if (pageContext && pageContext.page) {
    prompt += `\n[Page context] ${pageContext.page}${openAdId ? ' — id=' + openAdId : ''}\n`;
  }
  if (openAdId) {
    prompt += `[Open ad] Required id: ${openAdId} — call get_ad_details(ad_id="${openAdId}") before price/trust/details.\n`;
  }

  if (pageFacts && (pageFacts.ads.length || pageFacts.sellers.length)) {
    prompt += '\n[Verified DB snapshot — match tool results, do not contradict]\n';
    prompt += JSON.stringify(pageFacts, null, 0).slice(0, 3500) + '\n';
  }

  prompt +=
    '\n[Security]\n' +
    '- Do not expose seller phone numbers — point to "show number" on the page.\n' +
    '- Do not invent ad ids or account ids.\n' +
    '- For complaints: create_support_ticket or the report button.\n';

  return prompt;
}

function collectFactsFromTools(toolResults) {
  const facts = { prices: [], trustScores: [], adIds: [], ads: [] };
  toolResults.forEach((raw) => {
    try {
      const r = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (r.ad && r.ad.price) facts.prices.push(String(r.ad.price));
      if (r.ad && r.ad.id) facts.adIds.push(r.ad.id);
      if (r.ad && r.ad.seller_trust_score != null) facts.trustScores.push(String(r.ad.seller_trust_score));
      if (r.ad) facts.ads.push(r.ad);
      if (Array.isArray(r.ads)) {
        r.ads.forEach((a) => {
          if (a.price) facts.prices.push(String(a.price));
          if (a.id) facts.adIds.push(a.id);
          if (a.seller_trust_score != null) facts.trustScores.push(String(a.seller_trust_score));
          facts.ads.push(a);
        });
      }
      if (r.seller_trust_score != null) facts.trustScores.push(String(r.seller_trust_score));
      if (r.reviews) facts.reviewAverage = r.reviews.average;
    } catch (e) { /* ignore */ }
  });
  return facts;
}

function normalizeAmount(value) {
  return String(value || '').replace(/\D/g, '');
}

function isAdFlowQuery(message, pageContext) {
  const adId = pageContext && (pageContext.urlAdId || (pageContext.ad && pageContext.ad.id));
  if (!adId) return { active: false, adId: '' };
  const adLike = /سعر|ثمن|موثوق|ثقة|بائع|إعلان|تفاصيل|price|prix|trust|seller|annonce|combien|fiab|precio|confian|vendedor|cu[aá]nto|how much|reliable|detalle/i.test(String(message || ''));
  return { active: adLike, adId: String(adId) };
}

function stripNonPriceNumbers(text) {
  return String(text || '')
    .replace(/\d+\s*(GB|TB|gb|tb|جيجا|غيغا|ميجا|بوصة|inch|"|مقاعد|غرف|غرفة|لتر|cc|سي\s*سي)\b/gi, ' ')
    .replace(/\b(?:yamaha|iphone|آيفون|galaxy|redmi|samsung|lg|huawei)\s*\d+\b/gi, ' ')
    .replace(/\b(?:موديل|model|année|سنة)\s*\d{4}\b/gi, ' ')
    .replace(/\b(?:19|20)\d{2}\b/g, ' ');
}

function extractMoneyMentions(reply) {
  const cleaned = stripNonPriceNumbers(reply);
  const mentions = [];
  const withCurrency = cleaned.match(/\d[\d\s,.]*\s*(?:MRU|أوقية|ouguiya)/gi) || [];
  withCurrency.forEach((m) => mentions.push(m));
  const bare = cleaned.match(/\d{4,}/g) || [];
  bare.forEach((m) => mentions.push(m));
  return mentions;
}

function mergePageAndToolFacts(toolFacts, pageFacts) {
  const sellerTrust = [];
  (pageFacts.sellers || []).forEach((s) => {
    const score = s && s.reputation && s.reputation.seller_trust_score;
    if (score != null) sellerTrust.push(String(score));
  });
  return {
    prices: toolFacts.prices.concat((pageFacts.ads || []).map((a) => String(a.price || '')).filter(Boolean)),
    adIds: toolFacts.adIds.concat((pageFacts.ads || []).map((a) => a.id).filter(Boolean)),
    trustScores: toolFacts.trustScores
      .concat((pageFacts.ads || []).map((a) => String(a.seller_trust_score)).filter((x) => x !== 'undefined' && x !== 'null'))
      .concat(sellerTrust),
    reviewAverage: toolFacts.reviewAverage,
    ads: (toolFacts.ads || []).concat(pageFacts.ads || []),
  };
}

function buildFactReply(mergedFacts, lang, message) {
  const ad = (mergedFacts.ads || []).find((a) => a && a.id) || null;
  if (!ad) return '';
  const q = String(message || '');

  if (/موثوق|ثقة|trust|fiab|بائع|seller|confian|vendedor|reliable/i.test(q) && ad.seller_trust_score != null) {
    return pickLang({
      ar: `درجة ثقة البائع على «${ad.title}»: ${ad.seller_trust_score}/100 (من بيانات الإعلان).`,
      hs: `درجة الثقة ديال البائع ف «${ad.title}»: ${ad.seller_trust_score}/100.`,
      fr: `Score de confiance du vendeur pour «${ad.title}» : ${ad.seller_trust_score}/100.`,
      en: `Seller trust score for "${ad.title}": ${ad.seller_trust_score}/100 (from listing data).`,
      es: `Puntuación de confianza del vendedor para «${ad.title}»: ${ad.seller_trust_score}/100.`,
    }, lang);
  }

  if (/سعر|ثمن|price|prix|combien|كم|precio|cu[aá]nto|how much/i.test(q) && ad.price) {
    return pickLang({
      ar: `السعر المعروض لـ«${ad.title}»: ${ad.price} (من بيانات الإعلان).`,
      hs: `الثمن ديال «${ad.title}»: ${ad.price}.`,
      fr: `Prix affiché pour «${ad.title}» : ${ad.price}.`,
      en: `Listed price for "${ad.title}": ${ad.price}.`,
      es: `Precio publicado de «${ad.title}»: ${ad.price}.`,
    }, lang);
  }

  return pickLang({
    ar: `تفاصيل «${ad.title}»: السعر ${ad.price || '—'}، الولاية ${ad.wilaya || '—'}.`,
    hs: `«${ad.title}» — الثمن ${ad.price || '—'}، الولاية ${ad.wilaya || '—'}.`,
    fr: `Annonce «${ad.title}» — prix ${ad.price || '—'}, wilaya ${ad.wilaya || '—'}.`,
    en: `Listing "${ad.title}" — price ${ad.price || '—'}, region ${ad.wilaya || '—'}.`,
    es: `Anuncio «${ad.title}» — precio ${ad.price || '—'}, wilaya ${ad.wilaya || '—'}.`,
  }, lang);
}

function validateReply(reply, mergedFacts, lang) {
  if (!reply || !reply.trim()) {
    return {
      reply: pickLang({
        ar: 'آسف، لم أستطع الإجابة — حاول إعادة صياغة سؤالك.',
        fr: 'Désolé, je n\'ai pas pu répondre — reformulez votre question.',
        en: 'Sorry, I could not answer — please rephrase your question.',
        es: 'Lo siento, no pude responder — reformule su pregunta.',
      }, lang),
      grounded: false,
      reviewed: true,
    };
  }

  const uncertain = /\b(ربما|أظن|قد يكون|I think|maybe|probably|je pense|quizás|tal vez)\b/i.test(reply);
  const hasGrounding = !!(mergedFacts.prices.length || mergedFacts.adIds.length || mergedFacts.trustScores.length || mergedFacts.reviewAverage);

  if (uncertain && !hasGrounding) {
    return {
      reply: pickLang({
        ar: 'لا تتوفر لدي بيانات مؤكدة في قاعدة البيانات. راجع بطاقة الإعلان أو تواصل مع direction@rizq.mr.',
        fr: 'Je n\'ai pas de données confirmées en base. Consultez la fiche ou écrivez à direction@rizq.mr.',
        en: 'I have no confirmed data in the database. Check the listing card or email direction@rizq.mr.',
        es: 'No tengo datos confirmados. Revise la ficha del anuncio o escriba a direction@rizq.mr.',
      }, lang),
      grounded: false,
      reviewed: true,
    };
  }

  if (!hasGrounding && /سعر|price|prix|ثمن|combien|كم|precio|cu[aá]nto|how much|موثوق|trust|fiab|confian/i.test(reply)) {
    return {
      reply: pickLang({
        ar: 'للسعر أو الموثوقية الدقيقة، افتح بطاقة الإعلان — لا أستطيع اختلاق أرقام.',
        fr: 'Pour un prix ou une fiabilité exacts, ouvrez la fiche — je ne peux pas inventer de chiffres.',
        en: 'For exact price or trust, open the listing card — I cannot invent numbers.',
        es: 'Para precio o confianza exactos, abra la ficha — no puedo inventar cifras.',
      }, lang),
      grounded: false,
      reviewed: true,
    };
  }

  const priceMentions = extractMoneyMentions(reply);
  if (priceMentions.length && mergedFacts.prices.length) {
    const known = [...new Set(mergedFacts.prices.map(normalizeAmount).filter((d) => d.length >= 3))];
    const knownSet = new Set(known);
    const suspicious = priceMentions.some((m) => {
      const digits = normalizeAmount(m);
      if (digits.length < 4) return false;
      return !knownSet.has(digits) && !known.some((p) => p.includes(digits) || digits.includes(p));
    });
    if (suspicious) {
      const mentionsKnown = known.some((p) => normalizeAmount(reply).includes(p));
      if (!mentionsKnown) {
        return {
          reply: pickLang({
            ar: 'للسعر الدقيق، راجع بطاقة الإعلان المعروضة — لا أستطيع تأكيد مبلغ مختلف عن البيانات الرسمية.',
            fr: 'Pour le prix exact, consultez la fiche — je ne peux pas confirmer un montant différent des données officielles.',
            en: 'For the exact price, check the listing — I cannot confirm an amount different from official data.',
            es: 'Para el precio exacto, consulte la ficha — no puedo confirmar un monto distinto de los datos oficiales.',
          }, lang),
          grounded: false,
          reviewed: true,
        };
      }
    }
  }

  return { reply: reply.trim(), grounded: hasGrounding, reviewed: true };
}

async function handleWidgetChat(body) {
  const { message, lang, profile, history, pageContext } = body || {};
  const text = String(message || '').trim().slice(0, 1000);
  if (!text) {
    const err = new Error('message مطلوب');
    err.status = 400;
    throw err;
  }
  if (!isAnthropicConfigured()) {
    const err = new Error('AI غير مفعّل على الخادم');
    err.status = 503;
    throw err;
  }

  const uiLang = normalizeUiLang(body.uiLang || lang);
  const detectedLang = detectUserLanguage(text, uiLang);
  const pageFacts = resolvePageContextFacts(pageContext);
  const systemPrompt = buildSystemPrompt({ lang: uiLang, detectedLang, profile, pageContext, pageFacts });
  const adFlow = isAdFlowQuery(text, pageContext);
  const preferredModel = getFastModel();

  const messages = [];
  if (Array.isArray(history)) {
    history.slice(-6).forEach((h) => {
      if (h && h.text && (h.role === 'user' || h.role === 'agent')) {
        messages.push({ role: h.role === 'agent' ? 'assistant' : 'user', content: String(h.text).slice(0, 500) });
      }
    });
  }
  messages.push({ role: 'user', content: text });

  const toolResultsRaw = [];
  let response;
  let currentMessages = [...messages];
  let loops = 0;
  let lastModel = preferredModel;
  const usageAcc = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };

  while (loops < 5) {
    loops++;
    const createParams = {
      model: preferredModel,
      max_tokens: 500,
      system: systemPrompt,
      tools: WIDGET_TOOLS,
      messages: currentMessages,
    };
    if (loops === 1 && adFlow.active) {
      createParams.tool_choice = { type: 'tool', name: 'get_ad_details' };
    }

    const created = await createCachedMessage(client, createParams);
    response = created.response;
    lastModel = created.model || lastModel;
    const u = response.usage || {};
    usageAcc.input_tokens += u.input_tokens || 0;
    usageAcc.output_tokens += u.output_tokens || 0;
    usageAcc.cache_creation_input_tokens += u.cache_creation_input_tokens || 0;
    usageAcc.cache_read_input_tokens += u.cache_read_input_tokens || 0;

    if (response.stop_reason === 'end_turn') break;

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');
      currentMessages.push({ role: 'assistant', content: response.content });

      const toolResults = toolUseBlocks.map((tool) => {
        const input = Object.assign({}, tool.input || {});
        if (tool.name === 'get_packages_info' && !input.lang) {
          input.lang = detectedLang;
        }
        if (adFlow.adId && (tool.name === 'get_ad_details' || tool.name === 'get_seller_reputation')) {
          if (tool.name === 'get_ad_details' || !String(input.ad_id || '').trim()) {
            input.ad_id = adFlow.adId;
          }
        }
        const result = executeWidgetTool(tool.name, input);
        toolResultsRaw.push(result);
        return {
          type: 'tool_result',
          tool_use_id: tool.id,
          content: JSON.stringify(result),
        };
      });

      currentMessages.push({ role: 'user', content: toolResults });
      continue;
    }
    break;
  }

  const textBlock = (response.content || []).find((b) => b.type === 'text');
  let replyText = textBlock ? textBlock.text.trim() : '';

  const toolFacts = collectFactsFromTools(toolResultsRaw);
  const pageMerged = mergePageAndToolFacts(toolFacts, pageFacts);

  if (!replyText) {
    replyText = buildFactReply(pageMerged, detectedLang, text)
      || pickLang({
        ar: 'آسف، ممكن تعيد صياغة السؤال؟',
        fr: 'Désolé, pouvez-vous reformuler?',
        en: 'Sorry, could you rephrase that?',
        es: 'Lo siento, ¿puede reformular la pregunta?',
      }, detectedLang);
  }

  let validated = validateReply(replyText, pageMerged, detectedLang);
  if (!validated.grounded && (pageMerged.prices.length || pageMerged.adIds.length || pageMerged.trustScores.length)) {
    const fromFacts = buildFactReply(pageMerged, detectedLang, text);
    if (fromFacts) {
      validated = { reply: fromFacts, grounded: true, reviewed: true };
    }
  }

  return {
    ok: true,
    reply: validated.reply,
    lang: detectedLang,
    uiLang,
    grounded: validated.grounded,
    reviewed: validated.reviewed,
    toolsUsed: toolResultsRaw.length,
    model: lastModel,
    usage: usageAcc,
  };
}

module.exports = {
  handleWidgetChat,
  buildSystemPrompt,
  validateReply,
  detectUserLanguage,
};
