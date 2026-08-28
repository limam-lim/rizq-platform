/**
 * rizq_agent_brain.js
 * ═══════════════════════════════════════════════════════
 * العقل المركزي لمدير رزق الذكي — مدعوم بـ Claude API
 * يُستخدَم من: call_handler · whatsapp_handler · email_handler
 *
 * التثبيت:
 *   npm install @anthropic-ai/sdk
 *
 * متغيرات البيئة المطلوبة (.env):
 *   ANTHROPIC_API_KEY=sk-ant-...
 *   RIZQ_FAST_MODEL=claude-haiku-4-5-20251001
 *   RIZQ_ADVANCED_MODEL=claude-sonnet-4-5-20250929
 * ═══════════════════════════════════════════════════════
 */

'use strict';

if (!process.env.ANTHROPIC_API_KEY && process.env.CLAUDE_API_KEY) {
  process.env.ANTHROPIC_API_KEY = process.env.CLAUDE_API_KEY;
}

const Anthropic = require('@anthropic-ai/sdk');
const { getAdvancedModel, createCachedMessage } = require('./rizq-backend/config/anthropic');
const {
  getPackagesForTool,
  buildLiveCatalogPolicyBlock,
  buildDiamondTiersPromptBlock,
} = require('./rizq_packages_config');
const RizqAgent = require('./rizq_agent');
const {
  inferCatalogFromMessage,
  inferCatalogFromRef,
  getLivePackagesForAI,
  replyUsesUnknownPackagePrice,
  buildCategoryDiamondChatSummary,
  buildLivePackagesChatSummary,
} = require('./rizq-backend/services/packageCatalogLive');

function isPackagePricingQuery(message) {
  return /(?:باق|باقة|اشتراك|سعر|ثمن|كم|forfait|package|plan|abonn|pricing|price|cost|mru|أوقية|ouguiya|ماس|diamond|diamant)/i.test(String(message || ''));
}

function isDiamondPackageQuery(message) {
  return /(?:ماس|diamond|diamant|\bpro\b|باق|forfait|package|plan|abonn)/i.test(String(message || ''));
}

function buildSystemPrompt(liveCatalog, catalogHint) {
  let prompt = `${RizqAgent.buildMasterSystemPrompt({ agentTier: 'general' })}

${buildLiveCatalogPolicyBlock()}

${buildDiamondTiersPromptBlock()}

عند سؤال عن الأسعار استدعِ get_packages_info أولاً مع catalog=store|office|corp عند ذكر الفئة — ممنوع تخمين أي رقم MRU.`;
  if (liveCatalog && Array.isArray(liveCatalog.packages)) {
    const rows = liveCatalog.packages.map((p) => ({
      id: p.id, catalog: p.catalog, name: p.name, price: p.price, priceLabel: p.priceLabel,
    }));
    const hintLine = catalogHint ? ('STRICT catalog: ' + catalogHint + '\n') : '';
    prompt += '\n' + hintLine + '[LIVE CATALOG — quote ONLY these prices]\n' + JSON.stringify(rows).slice(0, 8000);
  }
  return prompt + `

📋 تواصل رزق: direction@rizq.mr · rizq.mr · +222 44 88 22 12

🎭 أسلوب القناة:
- مكالمة: جمل قصيرة (≤15 ثانية)، بدون قوائم.
- واتساب/تيليغرام: ردود واضحة ومحفّزة، emoji باعتدال.
- بريد: رد رسمي كامل مع تحية وختام.

⚡ عند طلب تفعيل/اشتراك/تجربة/خصم/إدارة:
① اجمع: اسم المنشأة، واتساب، الباقة.
② استدعِ register_interest (يحفظ في DB + يرسل Telegram فوراً) — لا تختلق رقم مرجع.
③ أكّد للزبون أن الإدارة ستتواصل فوراً.

📋 عند سؤال الإدارة عن الطلبات المعلّقة: استدعِ get_pending_leads واقرأ من النتيجة فقط — لا تخترع.`;
}

// ── إعداد العميل ──────────────────────────────────────
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || ''
});

// ── أدوات الوكيل (Tools) ───────────────────────────────
const AGENT_TOOLS = [
  {
    name: 'create_support_ticket',
    description: 'إنشاء تذكرة دعم تقني مرقّمة عند وصول مشكلة من عميل',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['technical', 'billing', 'account', 'report', 'other'],
          description: 'نوع المشكلة'
        },
        summary: { type: 'string', description: 'ملخص المشكلة' },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'الأولوية'
        }
      },
      required: ['type', 'summary']
    }
  },
  {
    name: 'register_interest',
    description: 'تسجيل رغبة جادة في الاشتراك أو شراء باقة — اجمع أولاً: اسم المنشأة، واتساب، الباقة المطلوبة',
    input_schema: {
      type: 'object',
      properties: {
        business_name: { type: 'string', description: 'اسم المنشأة أو التاجر' },
        whatsapp: { type: 'string', description: 'رقم الواتساب للتواصل' },
        package_requested: { type: 'string', description: 'الباقة المطلوبة (مثلاً: ماسية، سنوية، Pro)' },
        interest_type: {
          type: 'string',
          enum: ['subscription', 'partnership', 'ads', 'info'],
          description: 'نوع الاهتمام'
        },
        notes: { type: 'string', description: 'ملخص قصير لمحادثة الزبون / ملاحظات' }
      },
      required: ['business_name', 'whatsapp', 'package_requested']
    }
  },
  {
    name: 'get_packages_info',
    description: 'جلب معلومات الباقات المحدّثة والأسعار — مرّر catalog عند تحديد نوع النشاط',
    input_schema: {
      type: 'object',
      properties: {
        lang: { type: 'string', enum: ['ar', 'fr'], description: 'اللغة المطلوبة' },
        catalog: {
          type: 'string',
          enum: ['store', 'office', 'corp', 'general', 'individual'],
          description: 'فئة النشاط: store=محل، office=مكتب، corp=شركة — إلزامي عند ذكر الفئة',
        },
      },
    }
  },
  {
    name: 'get_pending_leads',
    description: 'جلب طلبات Leads المعلّقة (pending) من قاعدة البيانات — استخدمها عند سؤال الإدارة عن الطلبات الجديدة',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'escalate_to_human',
    description: 'تصعيد للإدارة عند طلب التحدث مع مدير أو مشكلة تقنية معقدة — اجمع: اسم المنشأة، واتساب، الباقة إن وُجدت',
    input_schema: {
      type: 'object',
      properties: {
        business_name: { type: 'string', description: 'اسم المنشأة أو التاجر' },
        whatsapp: { type: 'string', description: 'رقم الواتساب' },
        package_requested: { type: 'string', description: 'الباقة المعنية إن وُجدت' },
        reason: { type: 'string', description: 'سبب التصعيد' },
        urgency: { type: 'string', enum: ['normal', 'urgent'] }
      },
      required: ['business_name', 'whatsapp', 'reason']
    }
  }
];

// ── معالجة نتائج الأدوات ───────────────────────────────
async function executeTool(toolName, toolInput, meta) {
  meta = meta || {};
  let saveTicketFn;
  try { saveTicketFn = require('./rizq-backend/services/agentTickets').saveTicket; } catch (e) {
    saveTicketFn = (x) => { console.log('[ticket]', x); return { id: 'LOG-' + Date.now() }; };
  }

  const { handleLeadEscalation } = require('./rizq-backend/services/leadEscalation');

  switch(toolName) {
    case 'create_support_ticket':
      const t1 = saveTicketFn({ source: meta.channel || 'brain', type: toolInput.type, summary: toolInput.summary });
      console.log(`🎫 تذكرة جديدة #${t1.id}: [${toolInput.type}] ${toolInput.summary}`);
      return {
        ticket_id: t1.id,
        status: 'created',
        message: `تم إنشاء تذكرة رقم ${t1.id}. سيتواصل الفريق خلال ${toolInput.priority === 'urgent' ? '2 ساعات' : '24 ساعة'}`
      };

    case 'register_interest':
      console.log(`📋 اهتمام جديد: ${toolInput.package_requested || toolInput.interest_type} — ${toolInput.whatsapp || toolInput.contact}`);
      return await handleLeadEscalation('register_interest', toolInput, { source: 'brain', channel: meta.channel || 'brain' });

    case 'get_packages_info': {
      const { getLivePackagesForAI, normalizeCatalogKey } = require('./rizq-backend/services/packageCatalogLive');
      const lang = toolInput && toolInput.lang ? String(toolInput.lang).toLowerCase() : 'ar';
      const catalog = normalizeCatalogKey(
        (toolInput && toolInput.catalog) || (meta && meta.catalogHint)
      );
      return getLivePackagesForAI(lang, { catalog });
    }

    case 'get_pending_leads': {
      const { getPendingLeads, formatPendingLeadsForAdmin } = require('./rizq-backend/services/leadEscalation');
      const pending = getPendingLeads();
      return {
        source: 'leads.json',
        count: pending.length,
        leads: pending.slice(0, 20),
        formatted: formatPendingLeadsForAdmin(pending),
      };
    }

    case 'escalate_to_human':
      console.log(`🔺 تصعيد للإنسان: ${toolInput.reason} [${toolInput.urgency || 'normal'}]`);
      return await handleLeadEscalation('escalate_to_human', toolInput, { source: 'brain', channel: meta.channel || 'brain' });

    default:
      return { error: 'أداة غير معروفة' };
  }
}

// ══════════════════════════════════════════════════════
//  الدالة الرئيسية: askAgent
//  channel: 'call' | 'whatsapp' | 'email'
//  message: نص الرسالة الواردة
//  context: { sender, name, subject, history[] }
// ══════════════════════════════════════════════════════
async function askAgent({ channel, message, context = {} }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY غير موجود في .env');
  }

  const catalogHint = inferCatalogFromMessage(message, {
    pageContext: context.pageContext,
    catalogHint: context.catalogHint,
  }) || inferCatalogFromRef(message) || null;
  const packageFlow = isPackagePricingQuery(message);
  let liveCatalogPrefetch = null;
  if (packageFlow) {
    liveCatalogPrefetch = catalogHint
      ? getLivePackagesForAI('ar', { catalog: catalogHint })
      : getLivePackagesForAI('ar');
  }

  // تعليمات خاصة بكل قناة
  const channelInstructions = {
    call: '\n\n[القناة: مكالمة هاتفية] ردّك سيُقرأ بصوت عالٍ. استخدم جملاً قصيرة جداً (15 ثانية كحد أقصى). لا تستخدم تنسيقات أو قوائم.',
    whatsapp: '\n\n[القناة: واتساب] رسالة نصية قصيرة. يمكن استخدام emoji باعتدال. تجنب الإطالة.',
    email: '\n\n[القناة: بريد إلكتروني] رد رسمي كامل مع تحية وختام مهني. يمكن استخدام فقرات منظّمة.',
    telegram: '\n\n[القناة: Telegram] رد نصي قصير وواضح. يمكن استخدام emoji باعتدال.',
  };

  const systemPrompt = buildSystemPrompt(liveCatalogPrefetch, catalogHint) + (channelInstructions[channel] || '');

  // بناء رسائل المحادثة
  const messages = [];
  const toolResultsRaw = liveCatalogPrefetch ? [liveCatalogPrefetch] : [];

  // إضافة السياق إن وُجد
  if(context.history && context.history.length > 0) {
    messages.push(...context.history);
  }

  // الرسالة الحالية
  let userContent = message;
  if(context.name) userContent = `[من: ${context.name}]\n${message}`;
  if(context.subject) userContent = `[الموضوع: ${context.subject}]\n${message}`;

  messages.push({ role: 'user', content: userContent });

  // ── حلقة الوكيل (agent loop) ──────────────────────
  let response;
  let currentMessages = [...messages];

  let loops = 0;
  const model = getAdvancedModel();
  while (loops < 5) {
    loops++;
    const createParams = {
      model,
      max_tokens: channel === 'call' ? 300 : 1024,
      system    : systemPrompt,
      tools     : AGENT_TOOLS,
      messages  : currentMessages
    };
    if (loops === 1 && packageFlow) {
      createParams.tool_choice = { type: 'tool', name: 'get_packages_info' };
    }
    const created = await createCachedMessage(client, createParams);
    response = created.response;

    // لو انتهى بنص → رجّعه
    if(response.stop_reason === 'end_turn') {
      break;
    }

    // لو طلب أدوات → نفّذها وأكمل
    if(response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');

      // أضف رد الوكيل (مع tool_use) للمحادثة
      currentMessages.push({ role: 'assistant', content: response.content });

      // نفّذ كل أداة وأضف نتيجتها
      const toolResults = await Promise.all(toolUseBlocks.map(async (tool) => {
        const input = Object.assign({}, tool.input || {});
        if (tool.name === 'get_packages_info') {
          if (!input.lang) input.lang = 'ar';
          if (!input.catalog && catalogHint) input.catalog = catalogHint;
        }
        const result = await executeTool(tool.name, input, { channel, catalogHint });
        toolResultsRaw.push(result);
        return {
          type      : 'tool_result',
          tool_use_id: tool.id,
          content   : JSON.stringify(result),
        };
      }));

      currentMessages.push({ role: 'user', content: toolResults });
      continue; // كمّل الحلقة
    }

    break; // حالة غير متوقعة
  }

  // استخراج النص من آخر رد
  const textBlock = response.content.find(b => b.type === 'text');
  let replyText = textBlock ? textBlock.text.trim() : 'شكراً لتواصلكم. سنرد عليكم قريباً.';

  if (packageFlow) {
    const usedTool = toolResultsRaw.some((r) => r && r.source === 'live_catalog');
    const badPrice = replyUsesUnknownPackagePrice(replyText, 'ar', catalogHint, message);
    if (!usedTool || badPrice) {
      replyText = (catalogHint && isDiamondPackageQuery(message))
        ? buildCategoryDiamondChatSummary('ar', catalogHint)
        : buildLivePackagesChatSummary('ar', { catalogHint });
    }
  }

  return {
    text     : replyText,
    model,
    channel  : channel,
    usage    : response.usage,
    stop_reason: response.stop_reason
  };
}

// ── تصدير ─────────────────────────────────────────────
module.exports = { askAgent, executeTool, AGENT_TOOLS };

// ── اختبار مباشر (node rizq_agent_brain.js) ───────────
if(require.main === module) {
  require('dotenv').config();

  console.log('🧠 اختبار عقل مدير رزق الذكي...\n');

  askAgent({
    channel: 'whatsapp',
    message: 'السلام عليكم، أريد معرفة أسعار الباقات',
    context: { name: 'أحمد' }
  })
  .then(result => {
    console.log('✅ رد الوكيل:');
    console.log(result.text);
    console.log('\n📊 استخدام:', result.usage);
  })
  .catch(err => {
    console.error('❌ خطأ:', err.message);
  });
}
