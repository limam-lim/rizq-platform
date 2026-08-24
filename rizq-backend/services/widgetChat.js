/**
 * مدير رزق الذكي — محادثة الويدجت مع function calling + مراجعة الرد
 */
const Anthropic = require('@anthropic-ai/sdk');
const { WIDGET_TOOLS, executeWidgetTool, resolvePageContextFacts } = require('./widgetAgentTools');
const { maybeAutoNotifyLead } = require('./leadEscalation');
const { detectUserLanguage, normalizeUiLang, getLangLabel, pickLang } = require('./widgetLang');
const { getAnthropicApiKey, isAnthropicConfigured, getAgentModel, createCachedMessage } = require('../config/anthropic');
const { buildPackagesPromptBlock, buildDiamondTiersPromptBlock } = require('../../rizq_packages_config');
const RizqAgent = require('../../rizq_agent');
const RizqPrompts = require('../../rizq_ai_prompts');
const { formatDynamicKnowledgeForPrompt } = require('./dynamicKnowledge');
const { sanitizeAgentText } = require('./widgetMarkdown');

const client = new Anthropic({ apiKey: getAnthropicApiKey() });
const WIDGET_MAX_TOKENS = Number(process.env.WIDGET_CHAT_MAX_TOKENS) || 1400;

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

function buildDiamondSystemBlock() {
  return RizqAgent.buildMasterSystemPrompt({ agentTier: 'diamond' });
}

function buildSystemPrompt({ lang, detectedLang, profile, pageContext, pageFacts, extraInstruction, agentTier }) {
  const uiLang = normalizeUiLang(lang);
  const replyLang = detectedLang || uiLang;
  const tier = agentTier || (profile && profile.businessName ? 'diamond' : 'general');
  let prompt = buildLanguageInstructions(replyLang, uiLang);
  prompt += '\n' + RizqAgent.buildMasterSystemPrompt({
    agentTier: tier,
    profile: profile || null
  });
  if (extraInstruction) {
    prompt += `\n## Extra language instruction\n${String(extraInstruction).slice(0, 1200)}\n`;
  }

  if (profile && profile.businessName) {
    const personaKey = RizqPrompts.resolveBusinessType(profile);
    const personaDef = RizqPrompts.getPersonaDef(personaKey);
    const agentTitle = (profile.persona && profile.persona.agentTitle) || pickLang({
      ar: personaDef.ar || 'المساعد الذكي',
      fr: 'Assistant intelligent',
      en: 'Smart assistant',
      es: 'Asistente inteligente',
    }, replyLang);
    prompt +=
      `\n# Role\n` +
      `You are ${agentTitle} for "${profile.businessName}" on Rizq platform.\n` +
      `Sector persona: ${personaKey} — tone: ${personaDef.tone || 'professional'}.\n` +
      `Rules: never invent prices or details — use tools, dynamic knowledge, or direct to contact channels.\n`;
    prompt += RizqPrompts.buildDynamicKnowledgeBlock(profile, formatDynamicKnowledgeForPrompt);
    prompt += RizqPrompts.buildCommercialLoyaltyBlock(Object.assign({}, profile, { businessType: personaKey }));
    if (profile.customInstructions) {
      prompt += `\n## Owner instructions\n${String(profile.customInstructions).slice(0, 2000)}\n`;
    }
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
      `For Rizq subscription/package/pricing questions: call get_packages_info and explain from official data — ` +
      `do NOT redirect to "open listing card" unless the user asks about a specific ad.\n` +
      `Rizq payments: Bankily, Sedad, or cash with seller. Registration is free at rizq.mr.\n` +
      `For general questions: keep replies concise (2-4 sentences).\n` +
      `For package/pricing questions (especially Diamond / الماسية): give a COMPLETE answer — ` +
      `explain BOTH الماسية الأساسية (5,000 MRU, text only) AND الماسية Pro (10,000 MRU, with voice calls). ` +
      `Never stop mid-sentence or mid-markdown (no dangling **). End with the diamond comparison table.\n` +
      `Never use Unicode bidi control characters (U+2066–U+2069) — write plain digits like 5000, 10000, 24/7.\n`;
  }

  prompt += `\n${buildPackagesPromptBlock()}\n${buildDiamondTiersPromptBlock()}\nCall get_packages_info before quoting any Rizq plan price.\n`;
  prompt += 'When user asks about diamond / ماسية / packages: you MUST cover Standard AND Pro in full before ending.\n';
  prompt += 'For serious subscription interest or admin requests: collect business name, WhatsApp, and package — then call register_interest or escalate_to_human.\n';
  prompt += 'For off-topic questions: politely decline and redirect to Rizq services only.\n';
  prompt += 'Understand Hassaniya/local Mauritanian terms but reply in simple fusaha Arabic (or French if user writes in French).\n';

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
    RizqAgent.buildSecurityBlock() + '\n' +
    '- Do not expose seller phone numbers — point to "show number" on the page.\n' +
    '- Do not invent ad ids or account ids.\n' +
    '- For complaints: create_support_ticket or the report button.\n' +
    '- For subscription leads or admin escalation: register_interest / escalate_to_human after collecting business name, WhatsApp, package.\n';

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

function isDiamondPackageQuery(message) {
  return /(?:ماس|diamond|diamant|\bpro\b|5000|5[\s,]?000|10000|10[\s,]?000|باق)/i.test(String(message || ''));
}

function diamondCompletionFooter(lang) {
  return pickLang({
    ar: '\n\n**الماسية Pro (10,000 MRU/شهر):** نائب ذكي متقدم + ويدجت + واتساب + **مكالمات صوتية تفاعلية** + 4,000 محادثة نصية + 300 دقيقة صوت/شهر.\n\n| المستوى | السعر | صوت |\n| الماسية الأساسية | 5,000 MRU | نصي فقط |\n| الماسية Pro | 10,000 MRU | نص + صوت تفاعلي |',
    fr: '\n\n**Diamant Pro (10 000 MRU/mois):** adjoint avancé + widget + WhatsApp + **appels vocaux interactifs** + 4 000 chats + 300 min voix/mois.\n\n| Niveau | Prix | Voix |\n| Diamant Standard | 5 000 MRU | Texte seul |\n| Diamant Pro | 10 000 MRU | Texte + voix |',
    en: '\n\n**Diamond Pro (10,000 MRU/month):** advanced agent + widget + WhatsApp + **interactive voice calls** + 4,000 text chats + 300 voice min/month.\n\n| Tier | Price | Voice |\n| Diamond Standard | 5,000 MRU | Text only |\n| Diamond Pro | 10,000 MRU | Text + voice |',
    es: '\n\n**Diamante Pro (10.000 MRU/mes):** agente avanzado + widget + WhatsApp + **llamadas de voz interactivas** + 4.000 chats + 300 min voz/mes.',
  }, lang);
}

function ensureDiamondReplyComplete(reply, userMessage, lang, stopReason) {
  let text = sanitizeAgentText(reply);
  if (!isDiamondPackageQuery(userMessage) && !/(?:ماس|diamond|diamant)/i.test(text)) return text;
  const hasPro = /(?:10[\s,]?000|10000|\bpro\b|صوت|voice|vocaux|مكالم)/i.test(text);
  const truncated = stopReason === 'max_tokens' || /\*\*\s*$/.test(String(reply || '')) || (/(?:5[\s,]?000|5000|أساس)/i.test(text) && !hasPro);
  if (truncated || !hasPro) {
    text = text.replace(/\*\*\s*$/, '').trim();
    if (!hasPro) text += diamondCompletionFooter(lang);
  }
  return text;
}

function isPlatformOrPackageQuery(message) {
  return /(?:باق|اشتراك|تفعيل|package|forfait|diamond|ماس|pro\b|trial|تجرب|rizq|رزق|واتساب|telegram|دعم|support|direction@|bankily|sedad|نشر|post|register|تسجيل|متجر|محل|office|corp|landing|pricing|اشتراكات|abonnement)/i.test(String(message || ''));
}

function isAdSpecificQuery(message) {
  return /(?:سعر\s*الإعلان|ثمن\s*الإعلان|موثوق|ثقة\s*البائع|بائع|إعلان|listing|annonce|seller|trust|vendeur|confian|vendeur|detalle\s*del\s*anuncio)/i.test(String(message || ''));
}

function validateReply(reply, mergedFacts, lang, userMessage) {
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
  const platformQuery = isPlatformOrPackageQuery(userMessage);
  const adQuery = isAdSpecificQuery(userMessage);
  const replyAboutPackages = /(?:باق|forfait|package|اشتراك|MRU|أوقية|ماس|diamond|pro\b|trial|get_packages)/i.test(reply);

  if (uncertain && !hasGrounding && adQuery && !platformQuery) {
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

  if (!hasGrounding && !platformQuery && !replyAboutPackages && adQuery && /سعر|price|prix|ثمن|combien|كم|precio|cu[aá]nto|how much|موثوق|trust|fiab|confian/i.test(reply)) {
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
    if (suspicious && adQuery && !platformQuery && !replyAboutPackages) {
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

  if (RizqAgent.isBlockedRequest(text)) {
    return {
      ok: true,
      reply: RizqAgent.resolveBlockedReply(text, detectedLang),
      lang: detectedLang,
      blocked: true,
      model: 'policy-guard',
    };
  }

  const pageFacts = resolvePageContextFacts(pageContext);
  const extraInstruction = (body.autoLang === true || body.systemInstruction)
    ? (body.systemInstruction || 'Detect the user language automatically (Arabic, Hassaniya/Darija, French, or English) and reply only in that language.')
    : '';
  const systemPrompt = buildSystemPrompt({
    lang: uiLang,
    detectedLang,
    profile,
    pageContext,
    pageFacts,
    extraInstruction,
    agentTier: body.agentTier || (profile && profile.businessName ? 'diamond' : 'general'),
  });
  const adFlow = isAdFlowQuery(text, pageContext);
  const preferredModel = getAgentModel();

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
      max_tokens: WIDGET_MAX_TOKENS,
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

      const toolResults = await Promise.all(toolUseBlocks.map(async (tool) => {
        const input = Object.assign({}, tool.input || {});
        if (tool.name === 'get_packages_info' && !input.lang) {
          input.lang = detectedLang;
        }
        if (adFlow.adId && (tool.name === 'get_ad_details' || tool.name === 'get_seller_reputation')) {
          if (tool.name === 'get_ad_details' || !String(input.ad_id || '').trim()) {
            input.ad_id = adFlow.adId;
          }
        }
        const result = await executeWidgetTool(tool.name, input);
        toolResultsRaw.push(result);
        return {
          type: 'tool_result',
          tool_use_id: tool.id,
          content: JSON.stringify(result),
        };
      }));

      currentMessages.push({ role: 'user', content: toolResults });
      continue;
    }
    break;
  }

  const textBlock = (response.content || []).find((b) => b.type === 'text');
  let replyText = textBlock ? textBlock.text.trim() : '';
  replyText = ensureDiamondReplyComplete(replyText, text, detectedLang, response.stop_reason);
  replyText = sanitizeAgentText(replyText);

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

  let validated = validateReply(replyText, pageMerged, detectedLang, text);
  if (!validated.grounded && (pageMerged.prices.length || pageMerged.adIds.length || pageMerged.trustScores.length)) {
    const fromFacts = buildFactReply(pageMerged, detectedLang, text);
    if (fromFacts) {
      validated = { reply: fromFacts, grounded: true, reviewed: true };
    }
  }

  const autoLead = await maybeAutoNotifyLead({
    userText: text,
    history: body.history,
    toolResultsRaw,
    channel: 'widget',
  });
  if (autoLead && autoLead.lead_id) {
    console.log('[widget-chat] lead persisted', autoLead.lead_id, 'telegram:', autoLead.telegram_sent);
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
    lead: autoLead && autoLead.lead_id ? {
      id: autoLead.lead_id,
      telegram_sent: autoLead.telegram_sent,
      duplicate: autoLead.duplicate || false,
    } : undefined,
  };
}

module.exports = {
  handleWidgetChat,
  buildSystemPrompt,
  buildDiamondSystemBlock,
  validateReply,
  detectUserLanguage,
};
