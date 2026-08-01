export const MC_VERSIONS = ['1.21', '1.21.1', '1.20.6', '1.20.4', '1.20.1', '1.19.4', '1.18.2'] as const;
export const PLATFORMS = ['Paper', 'Spigot', 'Purpur', 'Folia'] as const;
export const JAVA_VERSIONS = ['21', '17', '11'] as const;
export const DIFFICULTIES = ['Beginner', 'Standard', 'Advanced'] as const;

export const FREE_PLAN_LIMIT = 5;

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Projects', href: '/projects', icon: 'FolderKanban' },
  { label: 'Templates', href: '/templates', icon: 'LayoutTemplate' },
  { label: 'Marketplace', href: '/marketplace', icon: 'Store' },
  { label: 'Billing', href: '/billing', icon: 'CreditCard' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
] as const;

export const ADMIN_NAV_ITEMS = [
  { label: 'Admin', href: '/admin', icon: 'ShieldCheck' },
] as const;

export const TEMPLATE_CATEGORIES = [
  'Economy', 'Kits', 'Ranks', 'Chat', 'Teleport', 'Homes',
  'Crates', 'NPC', 'Minigames', 'AntiCheat', 'Moderation',
] as const;

export const MARKETPLACE_CATEGORIES = [
  'All', 'Economy', 'Kits', 'Ranks', 'Chat', 'Teleport', 'Homes',
  'Crates', 'NPC', 'Minigames', 'AntiCheat', 'Moderation', 'Other',
] as const;
