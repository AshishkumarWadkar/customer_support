export const ROUTES = {
  // Auth
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  MFA: '/mfa',

  // App
  APP: '/app',
  DASHBOARD: '/app/dashboard',

  // Tickets
  TICKETS: '/app/tickets',
  TICKET_CREATE: '/app/tickets/create',
  TICKET_DETAIL: (id = ':id') => `/app/tickets/${id}`,

  // Customers
  CUSTOMERS: '/app/customers',
  CUSTOMER_CREATE: '/app/customers/create',
  CUSTOMER_DETAIL: (id = ':id') => `/app/customers/${id}`,

  // Settings
  SETTINGS: '/app/settings',
  PROFILE: '/app/profile',
  SLA: '/app/settings/sla',
  WORKFLOWS: '/app/workflows',
  TEAMS: '/app/teams',
  AUDIT_LOGS: '/app/audit-logs',

  // Reports
  REPORTS: '/app/reports',

  // Knowledge Base
  KNOWLEDGE_BASE: '/app/knowledge-base',
  KB_ARTICLE: (id = ':id') => `/app/knowledge-base/${id}`,
  KB_NEW: '/app/knowledge-base/new',

  // Portal
  PORTAL: '/portal',
  PORTAL_LOGIN: '/portal/login',
  PORTAL_DASHBOARD: '/portal/dashboard',
  PORTAL_TICKET: (id = ':id') => `/portal/tickets/${id}`,
  PORTAL_KB: '/portal/knowledge-base',
};
