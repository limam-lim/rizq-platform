'use strict';

/**
 * أدوار وصلاحيات لوحة الأدمن — مصدر الحقيقة للخادم والواجهة.
 *
 * الأدوار:
 *   super       — صلاحيات كاملة (المالك)
 *   admin       — إدارة تشغيلية واسعة (بدون إدارة الفريق/أسرار الموقع الحساسة)
 *   commercial  — تجاري: حسابات، إعلانات، باقات، أسعار
 *   finance     — مالي: مدفوعات، إيصالات، اشتراكات
 *   moderator   — مراجعة إعلانات وبلاغات
 *   support     — دعم المستخدمين والتذاكر
 */

const ROLES = Object.freeze({
  super: {
    id: 'super',
    labelAr: 'سوبر أدمن',
    labelFr: 'Super Admin',
    emoji: '👑',
  },
  admin: {
    id: 'admin',
    labelAr: 'مدير تشغيلي',
    labelFr: 'Admin',
    emoji: '🛡️',
  },
  commercial: {
    id: 'commercial',
    labelAr: 'مسؤول تجاري',
    labelFr: 'Commercial',
    emoji: '📈',
  },
  finance: {
    id: 'finance',
    labelAr: 'مراقب مالي',
    labelFr: 'Finance',
    emoji: '💰',
  },
  moderator: {
    id: 'moderator',
    labelAr: 'مشرف محتوى',
    labelFr: 'Modérateur',
    emoji: '👮',
  },
  support: {
    id: 'support',
    labelAr: 'دعم فني',
    labelFr: 'Support',
    emoji: '💬',
  },
});

/** صلاحيات ذرّية */
const ALL_PERMISSIONS = Object.freeze([
  'overview.read',
  'users.read',
  'users.write',
  'ads.read',
  'ads.write',
  'reports.read',
  'reports.write',
  'payments.read',
  'payments.write',
  'accounts.read',
  'accounts.write',
  'packages.read',
  'packages.write',
  'prices.write',
  'analytics.read',
  'moderation.write',
  'support.write',
  'siteconfig.write',
  'settings.write',
  'team.manage',
  'broadcast.write',
  'telegram.manage',
  'legal.write',
  'ai.manage',
]);

const ROLE_PERMISSIONS = Object.freeze({
  super: ALL_PERMISSIONS.slice(),
  admin: [
    'overview.read',
    'users.read', 'users.write',
    'ads.read', 'ads.write',
    'reports.read', 'reports.write',
    'payments.read', 'payments.write',
    'accounts.read', 'accounts.write',
    'packages.read', 'packages.write',
    'prices.write',
    'analytics.read',
    'moderation.write',
    'support.write',
    'settings.write',
    'broadcast.write',
    'legal.write',
    'ai.manage',
  ],
  commercial: [
    'overview.read',
    'users.read',
    'ads.read', 'ads.write',
    'accounts.read', 'accounts.write',
    'packages.read', 'packages.write',
    'prices.write',
    'analytics.read',
  ],
  finance: [
    'overview.read',
    'payments.read', 'payments.write',
    'packages.read',
    'accounts.read',
    'analytics.read',
  ],
  moderator: [
    'overview.read',
    'ads.read', 'ads.write',
    'reports.read', 'reports.write',
    'moderation.write',
  ],
  support: [
    'overview.read',
    'users.read',
    'accounts.read',
    'reports.read',
    'support.write',
  ],
});

/** ربط لوحات الشريط الجانبي بالصلاحية المطلوبة (أسماء showPanel) */
const PANEL_PERMISSION = Object.freeze({
  overview: 'overview.read',
  users: 'users.read',
  ads: 'ads.read',
  reports: 'reports.read',
  payments: 'payments.read',
  analytics: 'analytics.read',
  team: 'team.manage',
  packages: 'packages.read',
  prices: 'prices.write',
  'extra-categories': 'prices.write',
  siteconfig: 'siteconfig.write',
  modules: 'siteconfig.write',
  settings: 'settings.write',
  legal: 'legal.write',
  'legal-editor': 'legal.write',
  accounts: 'accounts.read',
  moderation: 'moderation.write',
  'tenders-mod': 'moderation.write',
  'moderator-config': 'moderation.write',
  'ai-manager': 'ai.manage',
  channels: 'telegram.manage',
  announcements: 'broadcast.write',
  'promo-video': 'ads.write',
  'subscriber-agents': 'packages.read',
  'quota-guard': 'packages.read',
});

function normalizeRole(raw) {
  const role = String(raw || 'moderator').trim().toLowerCase();
  // aliases
  if (role === 'تجاري' || role === 'commerce' || role === 'sales') return 'commercial';
  if (role === 'مالي' || role === 'comptable' || role === 'accountant') return 'finance';
  if (role === 'إداري' || role === 'اداري') return 'admin';
  if (role === 'مشرف') return 'moderator';
  if (role === 'دعم') return 'support';
  if (ROLES[role]) return role;
  return 'moderator';
}

function permissionsFor(role) {
  const id = normalizeRole(role);
  if (id === 'super') return ALL_PERMISSIONS.slice();
  return (ROLE_PERMISSIONS[id] || ROLE_PERMISSIONS.moderator).slice();
}

function hasPermission(role, permission) {
  if (!permission) return true;
  const perms = permissionsFor(role);
  return perms.includes(permission) || perms.includes('*');
}

function hasAnyPermission(role, list) {
  if (!list || !list.length) return true;
  return list.some((p) => hasPermission(role, p));
}

function allowedPanels(role) {
  const out = [];
  Object.keys(PANEL_PERMISSION).forEach((panel) => {
    if (hasPermission(role, PANEL_PERMISSION[panel])) out.push(panel);
  });
  return out;
}

function describeRole(role) {
  const id = normalizeRole(role);
  const meta = ROLES[id] || ROLES.moderator;
  return {
    id,
    labelAr: meta.labelAr,
    labelFr: meta.labelFr,
    emoji: meta.emoji,
    permissions: permissionsFor(id),
    panels: allowedPanels(id),
  };
}

function listRoles() {
  return Object.keys(ROLES).map((id) => describeRole(id));
}

module.exports = {
  ROLES,
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  PANEL_PERMISSION,
  normalizeRole,
  permissionsFor,
  hasPermission,
  hasAnyPermission,
  allowedPanels,
  describeRole,
  listRoles,
};
