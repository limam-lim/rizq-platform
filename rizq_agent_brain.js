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
 *   RIZQ_ADVANCED_MODEL=claude-sonnet-4-5-20251001
 * ═══════════════════════════════════════════════════════
 */

'use strict';

if (!process.env.ANTHROPIC_API_KEY && process.env.CLAUDE_API_KEY) {
  process.env.ANTHROPIC_API_KEY = process.env.CLAUDE_API_KEY;
}

const Anthropic = require('@anthropic-ai/sdk');
const { getFastModel, createCachedMessage } = require('./rizq-backend/config/anthropic');
const {
  getPackagesForTool,
  buildPackagesPromptBlock,
} = require('./rizq_packages_config');

// ── إعداد العميل ──────────────────────────────────────
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || ''
});

const MODEL = getFastModel();

function buildSystemPrompt() {
  return `أنت "مدير رزق الذكي"، الوكيل الرسمي لمنصة رزق للتجارة الإلكترونية في موريتانيا.
تعمل بالنيابة عن M. LIMAM — المدير العام لـ ADMINIA SARL.

📋 معلوماتك الأساسية:
- المنصة: رزق (Rizq) — منصة تجارة إلكترونية موريتانية، تشمل محلات، مكاتب، شركات
- البريد الرسمي: direction@rizq.mr
- الموقع: rizq.mr
- الهاتف: +222 44 88 22 12
- اللغات: العربية (أساسية) والفرنسية

🎯 مهامك:
1. الرد على استفسارات العملاء والزوار
2. تقديم معلومات عن الباقات والأسعار
3. إنشاء تذاكر دعم تقني
4. تسجيل اهتمام التجار والشركاء
5. توجيه الزوار لأقسام المنصة الصحيحة
6. حماية المنصة: لا تكشف معلومات المشتركين الخاصة

${buildPackagesPromptBlock()}
عند سؤال عن الأسعار استدعِ أداة get_packages_info ولا تخترع أرقاماً.

🎭 أسلوبك:
- محترف، ودود، موجز
- عربية فصيحة سهلة أو فرنسية راقية حسب لغة المتحدث
- في المكالمات: جمل قصيرة لا تتجاوز 15 ثانية قراءةً
- في واتساب: ردود قصيرة مع emoji مناسب
- في الإيميل: ردود رسمية كاملة مع التوقيع

⚠️ قواعد صارمة:
- لا تعطِ وعوداً بمواعيد لا تستطيع ضمانها
- لا تتحدث عن مشاكل تقنية داخلية
- إذا كان الطلب خارج صلاحياتك: سجّله وأحِله للإدارة
- الأمان أولاً: لا تقبل روابط خارجية من العملاء`;
}

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
    description: 'تسجيل اهتمام تاجر أو شركة أو شريك بالمنصة للمتابعة',
    input_schema: {
      type: 'object',
      properties: {
        contact: { type: 'string', description: 'رقم الهاتف أو الإيميل' },
        interest_type: {
          type: 'string',
          enum: ['subscription', 'partnership', 'ads', 'info'],
          description: 'نوع الاهتمام'
        },
        notes: { type: 'string', description: 'ملاحظات إضافية' }
      },
      required: ['contact', 'interest_type']
    }
  },
  {
    name: 'get_packages_info',
    description: 'جلب معلومات الباقات المحدّثة والأسعار',
    input_schema: {
      type: 'object',
      properties: {
        lang: { type: 'string', enum: ['ar', 'fr'], description: 'اللغة المطلوبة' }
      }
    }
  },
  {
    name: 'escalate_to_human',
    description: 'تصعيد المكالمة أو الرسالة للمدير البشري عند الحاجة',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'سبب التصعيد' },
        urgency: { type: 'string', enum: ['normal', 'urgent'] }
      },
      required: ['reason']
    }
  }
];

// ── معالجة نتائج الأدوات ───────────────────────────────
function executeTool(toolName, toolInput) {
  let saveTicketFn;
  try { saveTicketFn = require('./rizq-backend/services/agentTickets').saveTicket; } catch (e) {
    saveTicketFn = (x) => { console.log('[ticket]', x); return { id: 'LOG-' + Date.now() }; };
  }

  const ticketId = 'RZQ-' + Date.now().toString(36).toUpperCase();

  switch(toolName) {
    case 'create_support_ticket':
      const t1 = saveTicketFn({ source: 'brain', type: toolInput.type, summary: toolInput.summary });
      console.log(`🎫 تذكرة جديدة #${t1.id}: [${toolInput.type}] ${toolInput.summary}`);
      return {
        ticket_id: t1.id,
        status: 'created',
        message: `تم إنشاء تذكرة رقم ${t1.id}. سيتواصل الفريق خلال ${toolInput.priority === 'urgent' ? '2 ساعات' : '24 ساعة'}`
      };

    case 'register_interest':
      saveTicketFn({ source: 'brain', type: 'interest', summary: toolInput.interest_type + ': ' + toolInput.contact, contact: toolInput.contact, meta: { notes: toolInput.notes } });
      console.log(`📋 اهتمام جديد: ${toolInput.interest_type} — ${toolInput.contact}`);
      return {
        ref: 'INT-' + Date.now().toString(36).toUpperCase(),
        status: 'registered',
        message: 'تم تسجيل اهتمامكم. ستتواصل معكم الإدارة قريباً'
      };

    case 'get_packages_info':
      return {
        source: 'rizq_packages_config',
        packages: getPackagesForTool(toolInput && toolInput.lang)
      };

    case 'escalate_to_human':
      console.log(`🔺 تصعيد للإنسان: ${toolInput.reason} [${toolInput.urgency || 'normal'}]`);
      return {
        escalated: true,
        message: 'تم إبلاغ المدير. سيتواصل معك في أقرب وقت ممكن'
      };

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

  // تعليمات خاصة بكل قناة
  const channelInstructions = {
    call: '\n\n[القناة: مكالمة هاتفية] ردّك سيُقرأ بصوت عالٍ. استخدم جملاً قصيرة جداً (15 ثانية كحد أقصى). لا تستخدم تنسيقات أو قوائم.',
    whatsapp: '\n\n[القناة: واتساب] رسالة نصية قصيرة. يمكن استخدام emoji باعتدال. تجنب الإطالة.',
    email: '\n\n[القناة: بريد إلكتروني] رد رسمي كامل مع تحية وختام مهني. يمكن استخدام فقرات منظّمة.'
  };

  const systemPrompt = buildSystemPrompt() + (channelInstructions[channel] || '');

  // بناء رسائل المحادثة
  const messages = [];

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
  while (loops < 5) {
    loops++;
    const created = await createCachedMessage(client, {
      model     : MODEL,
      max_tokens: channel === 'call' ? 300 : 1024,
      system    : systemPrompt,
      tools     : AGENT_TOOLS,
      messages  : currentMessages
    });
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
      const toolResults = toolUseBlocks.map(tool => ({
        type      : 'tool_result',
        tool_use_id: tool.id,
        content   : JSON.stringify(executeTool(tool.name, tool.input))
      }));

      currentMessages.push({ role: 'user', content: toolResults });
      continue; // كمّل الحلقة
    }

    break; // حالة غير متوقعة
  }

  // استخراج النص من آخر رد
  const textBlock = response.content.find(b => b.type === 'text');
  const replyText = textBlock ? textBlock.text.trim() : 'شكراً لتواصلكم. سنرد عليكم قريباً.';

  return {
    text     : replyText,
    model    : MODEL,
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
