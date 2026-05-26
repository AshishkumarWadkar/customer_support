# Page Flow Documentation
## Customer Support & Ticket Management Platform

**Document Version:** 1.0  
**Date:** 2026-05-26

---

## 1. Authentication Flow

```
[Browser] → / (root)
     │
     ├── User NOT authenticated → /login
     │        │
     │        ├── Login Success (no MFA) → /app/dashboard (role-based redirect)
     │        ├── Login Success (MFA enabled) → /mfa → /app/dashboard
     │        ├── Login Fail (account locked) → Error message + unlock timer
     │        └── "Forgot Password" → /forgot-password
     │                   │
     │                   └── Email sent → /reset-password?token=xxx
     │                               │
     │                               └── Reset success → /login (with success toast)
     │
     └── User IS authenticated → /app/dashboard (role-based)
```

---

## 2. Role-Based Dashboard Routing

```
/app/dashboard
     │
     ├── role = SUPER_ADMIN → AdminDashboard
     │      Contains:
     │      ├── [Metric Cards] Total Tickets | Open | Resolved Today | SLA Compliance
     │      ├── [Ticket Trend Chart] Line chart (last 30 days)
     │      ├── [SLA Compliance Widget] Donut chart + breach count
     │      ├── [Channel Distribution] Bar chart
     │      ├── [Agent Leaderboard] Top 5 agents by resolution
     │      └── [Recent Tickets] Last 10 tickets with status
     │
     ├── role = MANAGER → ManagerDashboard
     │      Contains:
     │      ├── [Team Metrics] Open | Escalated | Avg Handle Time
     │      ├── [Agent Workload] Table: agent | open tickets | availability
     │      ├── [SLA Alerts] At-risk and breached tickets for my team
     │      └── [My Queue] Escalated tickets assigned to me
     │
     └── role = AGENT → AgentDashboard
            Contains:
            ├── [My Metrics] Assigned | Resolved Today | Avg CSAT
            ├── [My Ticket Queue] Filtered to assigned_to = me
            ├── [SLA Countdown] Tickets near breach
            └── [Shortcuts] Quick create ticket button
```

---

## 3. Ticket Management Flow

```
/app/tickets (Ticket List Page)
     │
     ├── Toolbar: [Search Bar] [Status Filter] [Priority Filter] [Date Range] [Sort]
     │
     ├── Results: Paginated table with columns:
     │   #Ticket | Subject | Customer | Status | Priority | Assigned | SLA | Created
     │
     ├── Row Actions: [View] [Assign] [Change Status]
     │
     └── [Create Ticket] button → /app/tickets/create

/app/tickets/create (Create Ticket Form)
     ├── Field: Subject (required)
     ├── Field: Description (rich text)
     ├── Field: Customer (typeahead search)
     ├── Field: Priority (dropdown with colors)
     ├── Field: Category / Sub-Category (cascading dropdown)
     ├── Field: Department / Team (optional)
     ├── Field: Channel (dropdown)
     ├── Field: Attachments (drag-drop)
     └── [Submit] → POST /tickets → redirect to /app/tickets/:id

/app/tickets/:id (Ticket Detail - Split View)
     ├── LEFT PANEL (ticket info)
     │   ├── Ticket Header: #TKT-XXXXX | Subject | Status Badge | Priority Badge
     │   ├── SLA Timer: FRT countdown | RT countdown | Status bar
     │   ├── Customer Info: Name | Email | Org | [View Profile]
     │   ├── Assignment: Assigned Agent | Team | [Reassign]
     │   ├── Metadata: Channel | Category | Created | Updated
     │   ├── Tags: Tag chips + [Add Tag]
     │   └── Actions: [Escalate] [Merge] [Link Ticket] [Close]
     │
     └── RIGHT PANEL (conversation)
         ├── Conversation thread (oldest first)
         │   ├── System events (assignment, status change) — grayed
         │   ├── Public replies — white bubble
         │   └── Internal notes — yellow/amber bubble
         │
         ├── Reply Box:
         │   ├── [Public Reply] | [Internal Note] toggle
         │   ├── Rich text editor (formatting, @mention)
         │   ├── [Canned Response] picker
         │   ├── [Attach File] button
         │   └── [Send] button
         │
         └── [History] tab — full field change log
```

---

## 4. Customer Management Flow

```
/app/customers (Customer List)
     ├── Search: [Search by name/email]
     ├── Table: Name | Email | Organization | Tickets | Last Contact
     └── [Add Customer] → /app/customers/create

/app/customers/create (Create Customer Form)
     ├── First Name, Last Name (required)
     ├── Email (required, unique)
     ├── Phone, Organization (typeahead)
     ├── Timezone, Notes
     └── [Save] → redirect to /app/customers/:id

/app/customers/:id (Customer Profile)
     ├── Profile Header: Avatar | Name | Email | Phone | Org
     ├── Tabs:
     │   ├── [Tickets] — All tickets from this customer
     │   ├── [Interactions] — Email/chat history
     │   ├── [Feedback] — CSAT ratings history
     │   └── [Notes] — Internal notes
     └── Action Bar: [Edit] [Merge] [Deactivate]
```

---

## 5. SLA Management Flow

```
/app/settings/sla (SLA Policies List)
     ├── Table: Name | Priority | FRT | RT | Business Hours | Status
     └── [Create Policy] → SLA Create/Edit form

SLA Create/Edit Form:
     ├── Name, Description
     ├── Apply to Priority (multi-select)
     ├── Apply to Customer Tier (multi-select)
     ├── FRT Hours (decimal)
     ├── RT Hours (decimal)
     ├── Business Hours Toggle
     ├── If enabled: Day + Time range picker (Mon-Sun)
     ├── Holiday Calendar (date picker + name)
     └── [Save] → validate → POST/PUT /sla/policies
```

---

## 6. Knowledge Base Flow

```
/app/knowledge-base (Article List)
     ├── Category tree (left sidebar)
     ├── Article list (right area): Title | Status | Views | Updated
     └── [New Article] → /app/knowledge-base/new

/app/knowledge-base/new (Editor)
     ├── Title input (required)
     ├── Category selector (tree picker)
     ├── Visibility toggle (Public / Internal)
     ├── Rich text body editor (WYSIWYG)
     ├── Tags input
     └── Actions: [Save Draft] [Submit for Review] [Publish (manager+)]

/app/knowledge-base/:id (Article View)
     ├── Breadcrumb: KB > Category > Article
     ├── Article content (read-only)
     ├── Actions (if editor): [Edit] [View Versions] [Publish/Unpublish]
     └── Feedback: [Helpful] / [Not Helpful] buttons
```

---

## 7. Reports Flow

```
/app/reports (Reports Dashboard)
     ├── Report Type Tabs: [Tickets] [SLA] [Agents] [CSAT] [Channels]
     ├── Global Filters: [Date Range] [Department] [Team] [Agent]
     └── [Export] button (CSV/PDF)

Each Report Tab:
     ├── Summary metric cards (top row)
     ├── Chart (line/bar/donut depending on report type)
     ├── Data table (sortable, paginated)
     └── [Export This View] button
```

---

## 8. Customer Portal Flow

```
/portal (Customer Portal Home)
     │
     ├── /portal/login → Customer Login Form
     │   └── Login Success → /portal/dashboard
     │
     └── /portal/dashboard (My Support)
         ├── My Tickets: Status badges, last update time
         ├── [New Ticket] button → Create ticket form
         ├── Search: Search my tickets
         └── [Browse Help Articles] → /portal/knowledge-base

/portal/tickets/:id (Customer Ticket View)
     ├── Ticket status bar
     ├── Conversation thread (public replies only — no internal notes)
     ├── Reply box (customer reply)
     ├── Attachments
     └── CSAT survey (if resolved, not yet rated)
```

---

## 9. Settings Flow

```
/app/settings (Settings Tabs)
     ├── [General] — Company name, logo, timezone, locale
     ├── [Security] — Password policy, MFA, session timeout, IP restrictions
     ├── [Email] — SMTP configuration
     ├── [Notifications] — Default notification preferences
     └── [Integrations] — Webhook config, API keys
```

---

*Page Flow v1.0 — UI/UX Architecture Team*
