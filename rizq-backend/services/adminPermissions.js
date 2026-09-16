/**
 * adminPermissions.js — كatalog صلاحيات لوحة الأدمن (ديناميكية)
 */
'use strict';

const MAX_TEAM_MEMBERS = 15;

/** panelId → permission key (نفس مفتاح اللوحة في rizq_cp_panel.html) */
const PERMISSION_DEFS = [
  { key: '*', group: 'system', labelAr: '⭐ صلاحيات كاملة (Super)', labelFr: '⭐ Accès total (Super)' },
  { key: 'overview', group: 'general', panel: 'overview', labelAr: 'نظرة عامة', labelFr: 'Vue d\'ensemble' },
  { key: 'users', group: 'ops', panel: 'users', labelAr: 'المستخدمون', labelFr: 'Utilisateurs' },
  { key: 'ads', group: 'ops', panel: 'ads', labelAr: 'الإعلانات', labelFr: 'Annonces' },
  { key: 'reports', group: 'ops', panel: 'reports', labelAr: 'البلاغات', labelFr: 'Signalements' },
  { key: 'moderation', group: 'ops', panel: 'moderation', labelAr: 'مراقبة المحتوى', labelFr: 'Modération contenu' },
  { key: 'tenders', group: 'ops', panel: 'tenders-mod', labelAr: 'مراقبة المناقصات (موافقة/رفض)', labelFr: 'Appels d\'offres (approuver/refuser)' },
  { key: 'payments', group: 'finance', panel: 'payments', labelAr: 'المدفوعات والاشتراكات', labelFr: 'Paiements & abonnements' },
  { key: 'analytics', group: 'general', panel: 'analytics', labelAr: 'الإحصائيات', labelFr: 'Statistiques' },
  { key: 'accounts', group: 'ops', panel: 'accounts', labelAr: 'حسابات معلّقة (موافقة)', labelFr: 'Comptes en attente' },
  { key: 'packages', group: 'config', panel: 'packages', labelAr: 'إدارة الباقات', labelFr: 'Forfaits' },
  { key: 'prices', group: 'config', panel: 'prices', labelAr: 'أسعار المواد', labelFr: 'Prix matériaux' },
  { key: 'extra-categories', group: 'config', panel: 'extra-categories', labelAr: 'أقسام جديدة', labelFr: 'Nouvelles catégories' },
  { key: 'promo-video', group: 'config', panel: 'promo-video', labelAr: 'الفيديو الإعلاني', labelFr: 'Vidéo promo' },
  { key: 'siteconfig', group: 'config', panel: 'siteconfig', labelAr: 'إعدادات الموقع', labelFr: 'Config. site' },
  { key: 'modules', group: 'config', panel: 'modules', labelAr: 'إدارة الأقسام', labelFr: 'Modules' },
  { key: 'settings', group: 'config', panel: 'settings', labelAr: 'الإعدادات العامة', labelFr: 'Paramètres généraux' },
  { key: 'legal', group: 'config', panel: 'legal', labelAr: 'القانوني', labelFr: 'Juridique' },
  { key: 'legal-editor', group: 'config', panel: 'legal-editor', labelAr: 'تعديل نصوص القانون', labelFr: 'Éditeur juridique' },
  { key: 'channels', group: 'config', panel: 'channels', labelAr: 'الهاتف والبريد والواتساب', labelFr: 'Canaux contact' },
  { key: 'announcements', group: 'config', panel: 'announcements', labelAr: 'الإشعارات والإعلانات', labelFr: 'Annonces plateforme' },
  { key: 'subscriber-agents', group: 'ai', panel: 'subscriber-agents', labelAr: 'وكلاء الباقة الماسية', labelFr: 'Agents Diamond' },
  { key: 'quota-guard', group: 'ai', panel: 'quota-guard', labelAr: 'مراقبة الاستهلاك', labelFr: 'Quota guard' },
  { key: 'ai-manager', group: 'ai', panel: 'ai-manager', labelAr: 'مدير رزق الذكي', labelFr: 'AI Manager' },
  { key: 'moderator-config', group: 'ai', panel: 'moderator-config', labelAr: 'إعدادات المراقب الآلي', labelFr: 'Config. modérateur IA' },
  { key: 'team.manage', group: 'system', panel: 'team', labelAr: 'إدارة فريق العمل (إضافة/تعديل)', labelFr: 'Gérer l\'équipe admin' },
];

const PERMISSION_PRESETS = {
  tender_reviewer: {
    labelAr: '📋 مراجع مناقصات فقط',
    labelFr: '📋 Revue appels d\'offres',
    permissions: ['overview', 'tenders'],
  },
  content_moderator: {
    labelAr: '🔍 مراجع محتوى (إعلانات + بلاغات)',
    labelFr: '🔍 Modération contenu',
    permissions: ['overview', 'moderation', 'ads', 'reports'],
  },
  accounts_officer: {
    labelAr: '⏳ موافقة حسابات جديدة',
    labelFr: '⏳ Validation comptes',
    permissions: ['overview', 'accounts', 'users'],
  },
  finance: {
    labelAr: '💳 مالية واشتراكات',
    labelFr: '💳 Finance & abonnements',
    permissions: ['overview', 'payments', 'analytics'],
  },
  support: {
    labelAr: '💬 دعم المستخدمين',
    labelFr: '💬 Support utilisateurs',
    permissions: ['overview', 'users', 'channels', 'reports'],
  },
  platform_config: {
    labelAr: '⚙️ إعدادات المنصة',
    labelFr: '⚙️ Configuration plateforme',
    permissions: ['overview', 'siteconfig', 'modules', 'settings', 'packages', 'prices', 'channels'],
  },
  deputy_admin: {
    labelAr: '🟣 نائب مدير (كل شيء ما عدا فريق الإدارة)',
    labelFr: '🟣 Admin adjoint',
    permissions: PERMISSION_DEFS.map((p) => p.key).filter((k) => k !== '*' && k !== 'team.manage'),
  },
};

const PANEL_PERMISSION_MAP = PERMISSION_DEFS.reduce((acc, p) => {
  if (p.panel) acc[p.panel] = p.key;
  return acc;
}, {});

function normalizePermissions(list) {
  if (!Array.isArray(list)) return [];
  const unique = [];
  list.forEach((k) => {
    const key = String(k || '').trim();
    if (key && unique.indexOf(key) === -1) unique.push(key);
  });
  if (unique.includes('*')) return ['*'];
  return unique;
}

function hasAdminPermission(userPerms, required) {
  const perms = normalizePermissions(userPerms);
  if (!required) return perms.length > 0;
  if (perms.includes('*')) return true;
  if (Array.isArray(required)) return required.some((r) => perms.includes(r));
  return perms.includes(required);
}

function permissionsForLegacyRole(role) {
  if (role === 'super') return ['*'];
  if (role === 'admin') {
    return PERMISSION_DEFS.map((p) => p.key).filter((k) => k !== '*');
  }
  if (role === 'moderator') {
    return ['overview', 'users', 'ads', 'reports', 'moderation', 'tenders', 'accounts',
      'packages', 'siteconfig', 'modules', 'legal', 'channels', 'announcements',
      'ai-manager', 'moderator-config', 'subscriber-agents', 'quota-guard', 'analytics',
      'extra-categories', 'promo-video', 'legal-editor'];
  }
  if (role === 'finance') return ['overview', 'payments', 'analytics', 'accounts'];
  if (role === 'support') return ['overview', 'users', 'channels', 'reports'];
  return ['overview'];
}

module.exports = {
  MAX_TEAM_MEMBERS,
  PERMISSION_DEFS,
  PERMISSION_PRESETS,
  PANEL_PERMISSION_MAP,
  normalizePermissions,
  hasAdminPermission,
  permissionsForLegacyRole,
};
