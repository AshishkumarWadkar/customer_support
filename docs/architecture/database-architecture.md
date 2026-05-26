# Database Architecture
## Customer Support & Ticket Management Platform

**Document Version:** 1.0  
**Date:** 2026-05-26

---

## 1. Database Overview

| Property | Value |
|----------|-------|
| RDBMS | MySQL 8.0+ |
| Character Set | utf8mb4 |
| Collation | utf8mb4_unicode_ci |
| Storage Engine | InnoDB (all tables) |
| Timezone | UTC (stored), user-local (displayed) |
| Normalization | 3NF with pragmatic denormalization for performance |

---

## 2. Core Entity Relationship Overview

```
organizations ──< customers ──< tickets >── ticket_comments
                                    │
                                    ├──< ticket_attachments
                                    ├──< ticket_tags >── tags
                                    ├──< ticket_history
                                    ├──< ticket_links
                                    │
                                    ├──> sla_policies
                                    ├──> users (assigned_to)
                                    └──> channels

users >── user_roles ──< roles >── role_permissions ──< permissions
users ──> departments
users ──> teams via agent_teams

sla_policies ──< sla_timers ──> tickets

workflows ──< workflow_conditions
          └──< workflow_actions

kb_categories ──< kb_articles ──< kb_article_versions

notifications ──> users
audit_logs ──> users

canned_responses ──> users (created_by)
```

---

## 3. Table Catalog

### 3.1 User & Auth Tables

| Table | Purpose |
|-------|---------|
| users | All system users (admin, manager, agent, customer) |
| roles | Role definitions (SUPER_ADMIN, MANAGER, AGENT, CUSTOMER) |
| permissions | Granular permission definitions |
| role_permissions | Role-to-permission mapping |
| user_sessions | Active session tracking |
| password_history | Last N password hashes for reuse prevention |
| mfa_settings | Per-user MFA configuration |

### 3.2 Core Business Tables

| Table | Purpose |
|-------|---------|
| organizations | Customer companies/organizations |
| customers | End customers (portal users + referenced in tickets) |
| tickets | Core ticket entity |
| ticket_comments | Replies and internal notes |
| ticket_attachments | File metadata (path, size, type) |
| ticket_tags | Tag-to-ticket assignment |
| ticket_links | Ticket-to-ticket relationships |
| ticket_history | Immutable audit trail of ticket field changes |
| tags | Tag definitions |
| channels | Communication channel definitions |

### 3.3 SLA Tables

| Table | Purpose |
|-------|---------|
| sla_policies | SLA policy definitions |
| sla_business_hours | Business hour windows per policy |
| sla_holidays | Holiday calendar per policy |
| sla_timers | Active SLA countdown per ticket |

### 3.4 Team Tables

| Table | Purpose |
|-------|---------|
| departments | Department definitions |
| teams | Team definitions |
| agent_teams | Agent-to-team assignment |
| agent_availability | Current agent status |

### 3.5 Automation Tables

| Table | Purpose |
|-------|---------|
| workflows | Workflow rule definitions |
| workflow_conditions | Trigger conditions per workflow |
| workflow_actions | Actions to execute per workflow |
| workflow_execution_logs | Execution history |
| canned_responses | Pre-written reply templates |

### 3.6 Knowledge Base Tables

| Table | Purpose |
|-------|---------|
| kb_categories | Article category hierarchy |
| kb_articles | Knowledge base articles |
| kb_article_versions | Article version snapshots |

### 3.7 Support Tables

| Table | Purpose |
|-------|---------|
| notifications | Notification records |
| notification_preferences | Per-user notification settings |
| audit_logs | System-wide audit trail |
| settings | Key-value system configuration |

---

## 4. Key Design Patterns

### 4.1 Soft Delete Pattern
All major tables include:
```sql
deleted_at TIMESTAMP NULL DEFAULT NULL
```
Queries always include `WHERE deleted_at IS NULL`.
Cascading soft-deletes are handled at the service layer.

### 4.2 Audit Columns (on all tables)
```sql
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
created_by INT UNSIGNED NULL,
updated_by INT UNSIGNED NULL
```

### 4.3 UUID vs Auto-Increment Strategy
- **Primary keys:** BIGINT UNSIGNED AUTO_INCREMENT (performance)
- **Public-facing IDs:** Separate `ticket_number` VARCHAR (TKT-YYYYMMDD-XXXXX) or UUID for API exposure

### 4.4 Indexing Strategy
```
- Foreign keys: Always indexed
- Query filters: Indexed (status, priority, assigned_to, created_at)
- Unique constraints: email, ticket_number, slug
- Full-text: tickets(subject, description), kb_articles(title, body)
- Composite: (status, assigned_to), (created_at, status)
```

---

## 5. Normalization Decisions

| Denormalization | Reason |
|----------------|--------|
| `tickets.customer_email` stored directly | Fast read without JOIN for notifications |
| `tickets.assigned_agent_name` NOT stored | Always JOIN to users table |
| `audit_logs.user_email` stored as snapshot | Historical accuracy even if user is deleted |
| `ticket_history.old_value / new_value` as TEXT JSON | Flexible field change tracking |

---

## 6. Partitioning Strategy (Future)

- `tickets` table: RANGE partitioning by `created_at` year (after 1M records)
- `audit_logs` table: RANGE partitioning by month (high-volume append-only)
- `notifications` table: Auto-archive after 90 days

---

*Database Architecture v1.0 — Solution Architecture Team*
