# Component List
## Customer Support & Ticket Management Platform

**Document Version:** 1.0  
**Date:** 2026-05-26

---

## Common Components (`src/components/common/`)

| Component | Props | Description |
|-----------|-------|-------------|
| `Button` | `variant, size, loading, disabled, onClick, children` | Primary, secondary, danger, ghost variants |
| `Input` | `label, error, placeholder, type, register, required` | RHF-compatible form input |
| `Select` | `label, options, error, register, required` | Dropdown select |
| `Textarea` | `label, rows, error, register` | Multi-line text input |
| `Modal` | `isOpen, onClose, title, size, children` | Accessible modal dialog |
| `Table` | `columns, data, loading, pagination, onSort` | Sortable, paginated data table |
| `Pagination` | `page, totalPages, total, limit, onChange` | Page navigation |
| `Badge` | `variant, color, dot` | Status/priority badge |
| `Avatar` | `name, src, size` | User avatar with fallback initials |
| `Spinner` | `size, color` | Loading spinner |
| `EmptyState` | `icon, title, description, action` | Empty list/search state |
| `ErrorBoundary` | `fallback, children` | React error boundary |
| `ConfirmDialog` | `isOpen, title, message, onConfirm, onCancel, variant` | Confirmation modal |
| `FileUpload` | `accept, maxFiles, maxSize, onUpload, files` | Drag-and-drop file upload |
| `SearchBar` | `placeholder, value, onChange, onSearch` | Search input with debounce |
| `DateRangePicker` | `startDate, endDate, onChange` | Date range selector |
| `Tooltip` | `content, position, children` | Hover tooltip |
| `Dropdown` | `trigger, items, align` | Action dropdown menu |
| `Tabs` | `tabs, activeTab, onChange` | Tab navigation |
| `Alert` | `type, title, message, dismissible` | Alert banner |
| `Skeleton` | `width, height, variant` | Loading skeleton |
| `Tag` | `label, color, onRemove` | Removable tag chip |

---

## Layout Components (`src/components/layout/`)

| Component | Props | Description |
|-----------|-------|-------------|
| `Sidebar` | `isCollapsed, onToggle` | Main navigation sidebar |
| `Header` | `onMenuToggle` | Top navigation bar |
| `Breadcrumb` | `items` | Page breadcrumb trail |
| `PageWrapper` | `title, actions, breadcrumb, children` | Consistent page container |
| `SidebarItem` | `icon, label, path, badge, roles` | Individual nav item |

---

## Ticket Components (`src/components/tickets/`)

| Component | Props | Description |
|-----------|-------|-------------|
| `TicketCard` | `ticket, onClick` | Compact ticket card for list view |
| `TicketStatusBadge` | `status` | Color-coded status badge |
| `TicketPriorityBadge` | `priority` | Color-coded priority badge |
| `TicketTimeline` | `history` | Ticket activity timeline |
| `TicketReplyBox` | `ticketId, onSubmit` | Rich text reply composer |
| `SLATimer` | `frtDeadline, rtDeadline, status` | Countdown timer with color coding |
| `AgentSelector` | `value, onChange, teamId` | Searchable agent assignment dropdown |
| `TicketFilterPanel` | `filters, onChange, onReset` | Side panel filter controls |
| `InternalNoteToggle` | `isInternal, onChange` | Toggle between public/internal reply |
| `AttachmentList` | `attachments, onDownload, onDelete` | File attachment display |
| `TicketMeta` | `ticket` | Ticket metadata sidebar (channel, dept, tags) |

---

## Dashboard Components (`src/components/dashboard/`)

| Component | Props | Description |
|-----------|-------|-------------|
| `MetricCard` | `title, value, change, icon, color` | KPI metric card with trend |
| `TicketTrendChart` | `data, period` | Line/bar chart of ticket volume |
| `SLAWidget` | `compliance, breached, atRisk` | SLA compliance donut chart |
| `AgentLeaderboard` | `agents, metric` | Ranked agent performance table |
| `TicketStatusPie` | `data` | Donut chart of ticket by status |
| `ChannelChart` | `data` | Bar chart of channel distribution |
| `RecentTickets` | `tickets` | Latest tickets mini-list |

---

## Notification Components (`src/components/notifications/`)

| Component | Props | Description |
|-----------|-------|-------------|
| `NotificationBell` | `count, onClick` | Header notification icon with badge |
| `NotificationPanel` | `notifications, onMarkRead, onMarkAllRead` | Slide-in notification drawer |
| `NotificationItem` | `notification, onRead` | Single notification row |

---

## Form Components (used across modules)

| Component | Props | Description |
|-----------|-------|-------------|
| `FormField` | `label, error, children, required` | Field wrapper with label and error |
| `RichTextEditor` | `value, onChange, placeholder` | WYSIWYG editor (react-quill) |
| `TagInput` | `value, onChange, suggestions` | Multi-tag input |
| `PrioritySelect` | `value, onChange` | Priority selector with colors |
| `StatusSelect` | `value, onChange, allowedTransitions` | Status selector |
| `DepartmentSelect` | `value, onChange` | Department dropdown |
| `TeamSelect` | `value, onChange, departmentId` | Team dropdown |

---

## Page Components Summary

### Auth Pages
- `LoginPage` — Email/password form + MFA code input
- `ForgotPasswordPage` — Email input + success state
- `ResetPasswordPage` — New password + confirm fields
- `MFAPage` — 6-digit code input

### Dashboard Pages
- `AdminDashboard` — Metric cards + charts + recent activity
- `ManagerDashboard` — Team metrics + agent workload
- `AgentDashboard` — Personal queue + stats

### Ticket Pages
- `TicketListPage` — Filter panel + sortable table + bulk actions
- `TicketDetailPage` — Split view: details (left) + conversation (right)
- `CreateTicketPage` — Multi-field creation form

### Customer Pages
- `CustomerListPage` — Searchable table
- `CustomerDetailPage` — Profile + ticket history tabs
- `CreateCustomerPage` — Customer creation form

### Portal Pages
- `PortalLoginPage` — Simplified login
- `PortalDashboard` — My tickets list
- `PortalTicketDetail` — Ticket view + reply box
- `PortalKBPage` — Article browser + search

---

*Component List v1.0 — UI/UX Architecture Team*
