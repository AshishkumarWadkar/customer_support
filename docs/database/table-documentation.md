# Table Documentation
## Customer Support & Ticket Management Platform

**Document Version:** 1.0  
**Date:** 2026-05-26

---

## Table: `roles`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | TINYINT UNSIGNED PK | NO | AUTO | Role identifier |
| name | VARCHAR(50) UNIQUE | NO | | Machine name: SUPER_ADMIN, MANAGER, AGENT, CUSTOMER |
| display_name | VARCHAR(100) | NO | | Human-readable role name |
| description | TEXT | YES | NULL | Role description |
| created_at | TIMESTAMP | NO | NOW() | Creation timestamp |

---

## Table: `permissions`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | SMALLINT UNSIGNED PK | NO | AUTO | Permission identifier |
| name | VARCHAR(100) UNIQUE | NO | | Dot-notation: module.action (e.g., tickets.create) |
| display_name | VARCHAR(150) | NO | | Human-readable permission name |
| module | VARCHAR(50) | NO | | Module name for grouping |
| created_at | TIMESTAMP | NO | NOW() | Creation timestamp |

---

## Table: `role_permissions`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| role_id | TINYINT UNSIGNED FK | NO | | References roles.id |
| permission_id | SMALLINT UNSIGNED FK | NO | | References permissions.id |

---

## Table: `users`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INT UNSIGNED PK | NO | AUTO | User identifier |
| role_id | TINYINT UNSIGNED FK | NO | | References roles.id |
| department_id | INT UNSIGNED FK | YES | NULL | References departments.id |
| first_name | VARCHAR(80) | NO | | First name |
| last_name | VARCHAR(80) | NO | | Last name |
| email | VARCHAR(191) UNIQUE | NO | | Login email |
| password_hash | VARCHAR(255) | NO | | bcrypt hash of password |
| phone | VARCHAR(20) | YES | NULL | Phone number |
| avatar_url | VARCHAR(500) | YES | NULL | Profile image URL |
| timezone | VARCHAR(60) | NO | UTC | User's preferred timezone |
| locale | VARCHAR(10) | NO | en | Locale code (en, fr, etc.) |
| is_active | TINYINT(1) | NO | 1 | Account active flag |
| is_locked | TINYINT(1) | NO | 0 | Account locked flag |
| failed_login_attempts | TINYINT | NO | 0 | Consecutive failed logins |
| locked_until | TIMESTAMP | YES | NULL | Lock expiry time |
| last_login_at | TIMESTAMP | YES | NULL | Last successful login |
| last_login_ip | VARCHAR(45) | YES | NULL | IP of last login (IPv6 compatible) |
| password_changed_at | TIMESTAMP | YES | NULL | When password was last changed |
| must_change_password | TINYINT(1) | NO | 0 | Force password change on next login |
| email_verified | TINYINT(1) | NO | 0 | Email verification flag |
| email_verified_at | TIMESTAMP | YES | NULL | Email verification timestamp |
| created_at | TIMESTAMP | NO | NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NO | NOW() | Last update timestamp |
| deleted_at | TIMESTAMP | YES | NULL | Soft delete timestamp |
| created_by | INT UNSIGNED | YES | NULL | User who created this record |

---

## Table: `customers`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INT UNSIGNED PK | NO | AUTO | Customer identifier |
| organization_id | INT UNSIGNED FK | YES | NULL | References organizations.id |
| first_name | VARCHAR(80) | NO | | First name |
| last_name | VARCHAR(80) | NO | | Last name |
| email | VARCHAR(191) UNIQUE | NO | | Customer email |
| phone | VARCHAR(20) | YES | NULL | Phone number |
| avatar_url | VARCHAR(500) | YES | NULL | Profile image URL |
| timezone | VARCHAR(60) | NO | UTC | Customer timezone |
| locale | VARCHAR(10) | NO | en | Locale code |
| notes | TEXT | YES | NULL | Internal notes about customer |
| tags | JSON | YES | NULL | Array of custom tag strings |
| portal_user_id | INT UNSIGNED FK | YES | NULL | Linked portal user account |
| is_active | TINYINT(1) | NO | 1 | Active flag |
| created_at | TIMESTAMP | NO | NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NO | NOW() | Last update timestamp |
| deleted_at | TIMESTAMP | YES | NULL | Soft delete timestamp |

---

## Table: `tickets`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | BIGINT UNSIGNED PK | NO | AUTO | Internal ticket identifier |
| ticket_number | VARCHAR(30) UNIQUE | NO | | Public ticket ID: TKT-YYYYMMDD-XXXXX |
| customer_id | INT UNSIGNED FK | YES | NULL | References customers.id |
| customer_email | VARCHAR(191) | NO | | Denormalized customer email for performance |
| customer_name | VARCHAR(191) | NO | | Denormalized customer name |
| organization_id | INT UNSIGNED FK | YES | NULL | References organizations.id |
| channel_id | TINYINT UNSIGNED FK | YES | NULL | Source channel |
| department_id | INT UNSIGNED FK | YES | NULL | Assigned department |
| team_id | INT UNSIGNED FK | YES | NULL | Assigned team |
| assigned_to | INT UNSIGNED FK | YES | NULL | Assigned agent (users.id) |
| sla_policy_id | INT UNSIGNED FK | YES | NULL | Applied SLA policy |
| subject | VARCHAR(500) | NO | | Ticket subject line |
| description | LONGTEXT | YES | NULL | Ticket body/description |
| status | ENUM | NO | new | new, open, in_progress, pending_customer, escalated, resolved, closed |
| priority | ENUM | NO | medium | critical, high, medium, low |
| category | VARCHAR(100) | YES | NULL | Ticket category name |
| sub_category | VARCHAR(100) | YES | NULL | Ticket sub-category name |
| source | VARCHAR(50) | YES | NULL | Creation source (email, portal, api, etc.) |
| is_escalated | TINYINT(1) | NO | 0 | Escalation flag |
| escalated_at | TIMESTAMP | YES | NULL | Escalation timestamp |
| escalated_to | INT UNSIGNED FK | YES | NULL | Escalation target user |
| first_response_at | TIMESTAMP | YES | NULL | Timestamp of first agent response |
| resolved_at | TIMESTAMP | YES | NULL | Resolution timestamp |
| closed_at | TIMESTAMP | YES | NULL | Closure timestamp |
| due_at | TIMESTAMP | YES | NULL | SLA resolution deadline |
| frt_due_at | TIMESTAMP | YES | NULL | SLA first response deadline |
| sla_status | ENUM | NO | none | on_track, at_risk, breached, paused, none |
| csat_score | TINYINT UNSIGNED | YES | NULL | Customer satisfaction score (1-5) |
| csat_comment | TEXT | YES | NULL | CSAT feedback text |
| merge_into_id | BIGINT UNSIGNED | YES | NULL | If merged, points to surviving ticket |
| parent_ticket_id | BIGINT UNSIGNED | YES | NULL | Parent ticket for sub-tickets |
| custom_fields | JSON | YES | NULL | Flexible custom field values |
| created_at | TIMESTAMP | NO | NOW() | Ticket creation time |
| updated_at | TIMESTAMP | NO | NOW() | Last update time |
| deleted_at | TIMESTAMP | YES | NULL | Soft delete timestamp |

---

## Table: `ticket_comments`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | BIGINT UNSIGNED PK | NO | AUTO | Comment identifier |
| ticket_id | BIGINT UNSIGNED FK | NO | | Parent ticket |
| author_id | INT UNSIGNED FK | YES | NULL | Author user (NULL for anonymous) |
| author_type | ENUM | NO | agent | agent, customer, system |
| author_name | VARCHAR(191) | YES | NULL | Denormalized author name |
| author_email | VARCHAR(191) | YES | NULL | Denormalized author email |
| body | LONGTEXT | NO | | Comment content (HTML) |
| is_internal | TINYINT(1) | NO | 0 | 1 = internal note, 0 = public reply |
| is_system | TINYINT(1) | NO | 0 | 1 = auto-generated by system |
| channel | VARCHAR(50) | YES | NULL | Channel this message came from |
| created_at | TIMESTAMP | NO | NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NO | NOW() | Last update timestamp |
| deleted_at | TIMESTAMP | YES | NULL | Soft delete timestamp |

---

## Table: `sla_policies`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INT UNSIGNED PK | NO | AUTO | SLA policy identifier |
| name | VARCHAR(100) | NO | | Policy name |
| description | TEXT | YES | NULL | Policy description |
| priority | ENUM | NO | all | critical, high, medium, low, all |
| customer_tier | ENUM | NO | all | standard, premium, enterprise, all |
| department_id | INT UNSIGNED FK | YES | NULL | Department scope (NULL = all) |
| frt_hours | DECIMAL(5,2) | NO | | First Response Time in hours |
| rt_hours | DECIMAL(5,2) | NO | | Resolution Time in hours |
| use_business_hours | TINYINT(1) | NO | 1 | 1 = use business hours, 0 = calendar |
| is_active | TINYINT(1) | NO | 1 | Active flag |

---

## Table: `sla_timers`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INT UNSIGNED PK | NO | AUTO | Timer identifier |
| ticket_id | BIGINT UNSIGNED FK | NO | | One per ticket (UNIQUE) |
| sla_policy_id | INT UNSIGNED FK | NO | | Applied policy |
| frt_deadline | TIMESTAMP | YES | NULL | First response deadline |
| rt_deadline | TIMESTAMP | YES | NULL | Resolution deadline |
| frt_breached | TINYINT(1) | NO | 0 | FRT breach flag |
| rt_breached | TINYINT(1) | NO | 0 | Resolution time breach flag |
| frt_achieved_at | TIMESTAMP | YES | NULL | Actual first response time |
| rt_achieved_at | TIMESTAMP | YES | NULL | Actual resolution time |
| paused_at | TIMESTAMP | YES | NULL | When timer was paused |
| paused_duration_secs | INT UNSIGNED | NO | 0 | Total accumulated pause time |
| is_paused | TINYINT(1) | NO | 0 | Current pause state |

---

## Table: `audit_logs`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | BIGINT UNSIGNED PK | NO | AUTO | Log entry identifier |
| user_id | INT UNSIGNED | YES | NULL | Actor user ID |
| user_email | VARCHAR(191) | YES | NULL | Snapshot of actor's email |
| user_role | VARCHAR(50) | YES | NULL | Snapshot of actor's role |
| action | VARCHAR(80) | NO | | Action performed (e.g., TICKET_UPDATED) |
| module | VARCHAR(50) | NO | | Module name (tickets, auth, etc.) |
| entity_type | VARCHAR(80) | YES | NULL | Entity type (ticket, user, etc.) |
| entity_id | VARCHAR(80) | YES | NULL | Entity identifier |
| old_values | JSON | YES | NULL | Values before change |
| new_values | JSON | YES | NULL | Values after change |
| ip_address | VARCHAR(45) | YES | NULL | Request IP address |
| user_agent | VARCHAR(500) | YES | NULL | Browser/client identifier |
| request_id | VARCHAR(64) | YES | NULL | Correlation ID for log tracing |
| created_at | TIMESTAMP | NO | NOW() | When the action occurred |

---

## Table: `settings`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INT UNSIGNED PK | NO | AUTO | Setting identifier |
| category | VARCHAR(80) | NO | | Setting category (general, security, email) |
| key_name | VARCHAR(100) | NO | | Setting key (UNIQUE per category) |
| value | TEXT | YES | NULL | Setting value as string |
| data_type | ENUM | NO | string | string, integer, boolean, json |
| is_encrypted | TINYINT(1) | NO | 0 | Encrypted storage flag |
| description | VARCHAR(300) | YES | NULL | Setting description |
| updated_at | TIMESTAMP | NO | NOW() | Last update timestamp |
| updated_by | INT UNSIGNED | YES | NULL | Who changed this setting |

---

## Index Summary

| Table | Index Name | Columns | Type |
|-------|-----------|---------|------|
| users | uq_users_email | email | UNIQUE |
| users | idx_users_role | role_id | INDEX |
| users | idx_users_active | is_active, deleted_at | INDEX |
| customers | uq_customers_email | email | UNIQUE |
| tickets | uq_tickets_number | ticket_number | UNIQUE |
| tickets | idx_tickets_status | status | INDEX |
| tickets | idx_tickets_assigned | assigned_to | INDEX |
| tickets | idx_tickets_composite | status, assigned_to | INDEX |
| tickets | ft_tickets_search | subject, description | FULLTEXT |
| ticket_comments | idx_tc_ticket | ticket_id | INDEX |
| sla_timers | idx_st_rt_deadline | rt_deadline | INDEX |
| sla_timers | idx_st_frt_deadline | frt_deadline | INDEX |
| audit_logs | idx_al_created | created_at | INDEX |
| kb_articles | ft_kb_search | title, body | FULLTEXT |

---

*Table Documentation v1.0 — Database Architecture Team*
