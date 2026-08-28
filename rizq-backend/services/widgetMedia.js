/**
 * widgetMedia.js — التحقق من مرفقات محادثة الويدجت + إعادة توجيه Telegram غير متزامن
 */
'use strict';

const { parseDataUriImage } = require('./imagePipeline');

const MIME_MAP = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function normalizeAttachment(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const dataUri = String(raw.dataUri || raw.image || raw.imageBase64 || '').trim();
  if (!dataUri) return null;
  const parsed = parseDataUriImage(dataUri);
  if (!parsed || parsed.error) {
    return { error: parsed.error || 'invalid_attachment' };
  }
  return {
    ok: true,
    buf: parsed.buf,
    mediaType: MIME_MAP[parsed.detected] || 'image/jpeg',
    fileName: String(raw.fileName || raw.name || 'attachment.jpg').slice(0, 120),
    kind: String(raw.kind || 'screenshot').slice(0, 40),
    dataUri,
  };
}

function extractBase64FromAttachment(attachment) {
  const m = String(attachment.dataUri || '').match(/^data:image\/[a-zA-Z+]+;base64,(.+)$/);
  return m ? m[1] : null;
}

function buildCustomerLabel(body) {
  const profile = (body && body.profile) || {};
  const pageContext = (body && body.pageContext) || {};
  const store = pageContext.store || {};
  const parts = [];
  if (profile.businessName) parts.push(profile.businessName);
  if (store.name && store.name !== profile.businessName) parts.push(store.name);
  if (profile.channels && profile.channels.whatsapp) parts.push('واتساب: ' + profile.channels.whatsapp);
  else if (profile.channels && profile.channels.phone) parts.push('هاتف: ' + profile.channels.phone);
  return parts.filter(Boolean).join(' · ') || '—';
}

function dispatchWidgetMediaToTelegram(body, attachment, messageText) {
  setImmediate(async () => {
    try {
      const { sendWidgetMediaAlert, isConfigured } = require('./telegramAdmin');
      if (!isConfigured()) {
        console.error('[widget-media] Telegram not configured — media alert skipped');
        return;
      }
      const result = await sendWidgetMediaAlert({
        customerLabel: buildCustomerLabel(body),
        message: messageText,
        imageBuffer: attachment.buf,
        mediaType: attachment.mediaType,
        fileName: attachment.fileName,
        channel: (body && body.pageContext && body.pageContext.page) || 'widget',
      });
      console.log('[widget-media] Telegram photo forwarded', {
        messageId: result && result.message_id,
      });
    } catch (e) {
      console.error('[widget-media] Telegram forward failed:', e && e.message);
    }
  });
}

function mediaAckFallback(lang) {
  const msgs = {
    ar: '✅ تم استلام الصورة/الإيصال بنجاح.\n\nتم إرسال المرفق مباشرة إلى الإدارة للمراجعة والتحقق من عملية الدفع. سيتواصل فريقنا معكم قريباً إن شاء الله.',
    fr: '✅ Image/reçu bien reçu(e).\n\nLa pièce jointe a été transmise à l\'administration pour vérification. Notre équipe vous contactera bientôt.',
    en: '✅ Image/receipt received.\n\nThe attachment was forwarded to management for verification. Our team will contact you soon.',
    es: '✅ Imagen/recibo recibido.\n\nEl archivo fue enviado a administración para verificación. Le contactaremos pronto.',
    hs: '✅ وصلات الصورة/الوصل. تم إرسالها للإدارة للتحقق.',
  };
  return msgs[lang] || msgs.ar;
}

function attachmentPromptHint(lang) {
  const hints = {
    ar: '\n[المستخدم أرفق صورة/إيصال — أكّد الاستلام باحترافية وأن المرفق أُرسل للإدارة للتحقق. لا تدّعِ تأكيد الدفع.]',
    fr: '\n[L\'utilisateur a joint une image/reçu — confirmez la réception et la transmission à l\'administration. Ne validez pas le paiement.]',
    en: '\n[User attached an image/receipt — acknowledge receipt and admin forwarding. Do not confirm payment verified.]',
    es: '\n[El usuario adjuntó imagen/recibo — confirme recepción y envío a administración. No confirme pago verificado.]',
  };
  return hints[lang] || hints.ar;
}

module.exports = {
  normalizeAttachment,
  extractBase64FromAttachment,
  buildCustomerLabel,
  dispatchWidgetMediaToTelegram,
  mediaAckFallback,
  attachmentPromptHint,
};
