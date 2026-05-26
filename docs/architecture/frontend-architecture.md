# Frontend Architecture
## Customer Support & Ticket Management Platform

**Document Version:** 1.0  
**Date:** 2026-05-26

---

## 1. Technology Decisions

| Technology | Choice | Rationale |
|-----------|--------|-----------|
| UI Framework | React 18 | Component model, hooks, ecosystem |
| Routing | React Router v6 | Nested routes, lazy loading |
| State Management | Redux Toolkit + Context API | RTK for server state, Context for auth/notif |
| HTTP Client | Axios | Interceptors, cancellation, instance config |
| Styling | Tailwind CSS | Utility-first, no CSS file bloat |
| Form Handling | React Hook Form + Yup | Performance, validation schema reuse |
| Charts | Recharts | Lightweight, React-native charts |
| Real-time | Socket.IO Client | WebSocket abstraction |
| Notifications | React Hot Toast | Lightweight, stackable toasts |
| Table | TanStack Table v8 | Headless, flexible |
| Date | Day.js | Lightweight moment.js alternative |
| Icons | Heroicons / Lucide React | Consistent icon set |

---

## 2. Folder Structure

```
frontend/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── assets/
├── src/
│   ├── api/                     # Axios service functions
│   │   ├── axiosInstance.js     # Base Axios config + interceptors
│   │   ├── authApi.js
│   │   ├── ticketApi.js
│   │   ├── customerApi.js
│   │   ├── slaApi.js
│   │   ├── workflowApi.js
│   │   ├── knowledgeBaseApi.js
│   │   ├── reportApi.js
│   │   ├── notificationApi.js
│   │   ├── teamApi.js
│   │   ├── auditApi.js
│   │   └── settingsApi.js
│   │
│   ├── components/              # Reusable UI components
│   │   ├── common/
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Select.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Table.jsx
│   │   │   ├── Pagination.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Avatar.jsx
│   │   │   ├── Spinner.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── ConfirmDialog.jsx
│   │   │   ├── FileUpload.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   ├── DateRangePicker.jsx
│   │   │   └── Tooltip.jsx
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── Breadcrumb.jsx
│   │   │   └── PageWrapper.jsx
│   │   ├── tickets/
│   │   │   ├── TicketCard.jsx
│   │   │   ├── TicketStatusBadge.jsx
│   │   │   ├── TicketPriorityBadge.jsx
│   │   │   ├── TicketTimeline.jsx
│   │   │   ├── TicketReplyBox.jsx
│   │   │   └── SLATimer.jsx
│   │   ├── dashboard/
│   │   │   ├── MetricCard.jsx
│   │   │   ├── TicketChart.jsx
│   │   │   ├── SLAWidget.jsx
│   │   │   └── AgentLeaderboard.jsx
│   │   └── notifications/
│   │       ├── NotificationBell.jsx
│   │       └── NotificationPanel.jsx
│   │
│   ├── context/
│   │   ├── AuthContext.jsx      # User auth state
│   │   └── NotificationContext.jsx  # Real-time notifications
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAuth.js
│   │   ├── useTickets.js
│   │   ├── useNotifications.js
│   │   ├── usePagination.js
│   │   ├── useDebounce.js
│   │   ├── useSocket.js
│   │   └── usePermission.js
│   │
│   ├── layouts/
│   │   ├── AppLayout.jsx        # Main agent/admin layout
│   │   ├── AuthLayout.jsx       # Login/register layout
│   │   └── PortalLayout.jsx     # Customer portal layout
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── ForgotPasswordPage.jsx
│   │   │   ├── ResetPasswordPage.jsx
│   │   │   └── MFAPage.jsx
│   │   ├── dashboard/
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── ManagerDashboard.jsx
│   │   │   └── AgentDashboard.jsx
│   │   ├── tickets/
│   │   │   ├── TicketListPage.jsx
│   │   │   ├── TicketDetailPage.jsx
│   │   │   └── CreateTicketPage.jsx
│   │   ├── customers/
│   │   │   ├── CustomerListPage.jsx
│   │   │   ├── CustomerDetailPage.jsx
│   │   │   └── CreateCustomerPage.jsx
│   │   ├── sla/
│   │   │   ├── SLAPoliciesPage.jsx
│   │   │   └── SLACreateEditPage.jsx
│   │   ├── workflows/
│   │   │   ├── WorkflowListPage.jsx
│   │   │   └── WorkflowBuilderPage.jsx
│   │   ├── knowledge-base/
│   │   │   ├── KBListPage.jsx
│   │   │   ├── KBArticlePage.jsx
│   │   │   └── KBEditorPage.jsx
│   │   ├── reports/
│   │   │   ├── ReportsDashboard.jsx
│   │   │   ├── TicketReport.jsx
│   │   │   ├── SLAReport.jsx
│   │   │   └── AgentReport.jsx
│   │   ├── teams/
│   │   │   ├── TeamListPage.jsx
│   │   │   └── TeamDetailPage.jsx
│   │   ├── audit-logs/
│   │   │   └── AuditLogPage.jsx
│   │   ├── settings/
│   │   │   ├── SettingsPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   └── SecurityPage.jsx
│   │   └── portal/
│   │       ├── PortalLoginPage.jsx
│   │       ├── PortalDashboard.jsx
│   │       ├── PortalTicketDetail.jsx
│   │       └── PortalKBPage.jsx
│   │
│   ├── redux/
│   │   ├── store.js
│   │   └── slices/
│   │       ├── ticketSlice.js
│   │       ├── customerSlice.js
│   │       └── uiSlice.js
│   │
│   ├── routes/
│   │   ├── index.jsx            # Main route tree
│   │   ├── PrivateRoute.jsx     # Auth guard
│   │   └── RoleRoute.jsx        # Role-based guard
│   │
│   ├── services/
│   │   ├── socketService.js     # Socket.IO client
│   │   └── storageService.js    # LocalStorage helpers
│   │
│   ├── utils/
│   │   ├── dateUtils.js
│   │   ├── formatUtils.js
│   │   ├── colorUtils.js
│   │   └── downloadUtils.js
│   │
│   ├── validations/
│   │   ├── authValidation.js
│   │   ├── ticketValidation.js
│   │   └── customerValidation.js
│   │
│   ├── constants/
│   │   ├── routes.js            # Route path constants
│   │   ├── ticketConstants.js   # Status, priority enums
│   │   └── roleConstants.js     # Role names
│   │
│   ├── styles/
│   │   └── index.css            # Tailwind directives
│   │
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── tailwind.config.js
├── vite.config.js
└── package.json
```

---

## 3. State Management Strategy

### When to use Context API:
- Auth state (user, token, permissions)
- Notification state (unread count, WebSocket connection)
- Theme/UI preferences

### When to use Redux Toolkit:
- Ticket list state (filters, pagination, selected items)
- Customer list state
- Complex cross-component shared state

### When to use Local Component State (useState):
- Form state (React Hook Form)
- Modal open/close
- Dropdown toggles
- Loading states per component

---

## 4. Routing Architecture

```
/                          → Redirect based on role
/login                     → LoginPage (AuthLayout)
/forgot-password           → ForgotPasswordPage (AuthLayout)
/reset-password/:token     → ResetPasswordPage (AuthLayout)
/mfa                       → MFAPage (AuthLayout)

/app                       → PrivateRoute → AppLayout
  /app/dashboard           → Role-based dashboard
  /app/tickets             → TicketListPage
  /app/tickets/:id         → TicketDetailPage
  /app/tickets/create      → CreateTicketPage
  /app/customers           → CustomerListPage
  /app/customers/:id       → CustomerDetailPage
  /app/customers/create    → CreateCustomerPage
  /app/sla                 → SLAPoliciesPage
  /app/sla/create          → SLACreateEditPage
  /app/sla/:id/edit        → SLACreateEditPage
  /app/workflows           → WorkflowListPage
  /app/workflows/builder   → WorkflowBuilderPage
  /app/knowledge-base      → KBListPage
  /app/knowledge-base/:id  → KBArticlePage
  /app/knowledge-base/new  → KBEditorPage
  /app/reports             → ReportsDashboard
  /app/reports/tickets     → TicketReport
  /app/reports/sla         → SLAReport
  /app/reports/agents      → AgentReport
  /app/teams               → TeamListPage
  /app/teams/:id           → TeamDetailPage
  /app/audit-logs          → AuditLogPage
  /app/settings            → SettingsPage
  /app/profile             → ProfilePage

/portal                    → PortalLayout (Customer only)
  /portal/login            → PortalLoginPage
  /portal/dashboard        → PortalDashboard
  /portal/tickets/:id      → PortalTicketDetail
  /portal/knowledge-base   → PortalKBPage
```

---

## 5. Axios Interceptor Strategy

```javascript
// Request interceptor: inject Authorization header
axiosInstance.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle 401, refresh token
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      // On success: retry original request
      // On failure: logout user
    }
    return Promise.reject(error);
  }
);
```

---

## 6. Performance Strategy

| Technique | Implementation |
|-----------|--------------|
| Code splitting | React.lazy() + Suspense per route |
| Bundle size | Tree-shaking via Vite |
| Memoization | React.memo, useMemo, useCallback |
| Virtual scrolling | react-window for large ticket lists |
| Image optimization | Lazy loading, WebP format |
| API caching | Axios cache adapter (5 min TTL) |
| Debounce | Search inputs debounced 300ms |

---

*Frontend Architecture v1.0 — Solution Architecture Team*
