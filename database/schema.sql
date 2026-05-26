-- ============================================================
-- Customer Support & Ticket Management Platform
-- MySQL Schema v1.0
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS support_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE support_db;

-- ============================================================
-- 1. ROLES & PERMISSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  id            TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(50)      NOT NULL,
  display_name  VARCHAR(100)     NOT NULL,
  description   TEXT             NULL,
  created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
  id            SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)     NOT NULL,
  display_name  VARCHAR(150)     NOT NULL,
  module        VARCHAR(50)      NOT NULL,
  created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_name (name),
  KEY idx_permissions_module (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       TINYINT UNSIGNED  NOT NULL,
  permission_id SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. DEPARTMENTS & TEAMS
-- ============================================================

CREATE TABLE IF NOT EXISTS departments (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)  NOT NULL,
  description   TEXT          NULL,
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP     NULL,
  created_by    INT UNSIGNED  NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_departments_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teams (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  department_id   INT UNSIGNED  NULL,
  name            VARCHAR(100)  NOT NULL,
  description     TEXT          NULL,
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP     NULL,
  created_by      INT UNSIGNED  NULL,
  PRIMARY KEY (id),
  KEY idx_teams_department (department_id),
  CONSTRAINT fk_teams_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id                    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  role_id               TINYINT UNSIGNED NOT NULL,
  department_id         INT UNSIGNED  NULL,
  first_name            VARCHAR(80)   NOT NULL,
  last_name             VARCHAR(80)   NOT NULL,
  email                 VARCHAR(191)  NOT NULL,
  password_hash         VARCHAR(255)  NOT NULL,
  phone                 VARCHAR(20)   NULL,
  avatar_url            VARCHAR(500)  NULL,
  timezone              VARCHAR(60)   NOT NULL DEFAULT 'UTC',
  locale                VARCHAR(10)   NOT NULL DEFAULT 'en',
  is_active             TINYINT(1)    NOT NULL DEFAULT 1,
  is_locked             TINYINT(1)    NOT NULL DEFAULT 0,
  failed_login_attempts TINYINT       NOT NULL DEFAULT 0,
  locked_until          TIMESTAMP     NULL,
  last_login_at         TIMESTAMP     NULL,
  last_login_ip         VARCHAR(45)   NULL,
  password_changed_at   TIMESTAMP     NULL,
  must_change_password  TINYINT(1)    NOT NULL DEFAULT 0,
  email_verified        TINYINT(1)    NOT NULL DEFAULT 0,
  email_verified_at     TIMESTAMP     NULL,
  created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at            TIMESTAMP     NULL,
  created_by            INT UNSIGNED  NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role_id),
  KEY idx_users_department (department_id),
  KEY idx_users_active (is_active, deleted_at),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_users_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agent_teams (
  user_id     INT UNSIGNED NOT NULL,
  team_id     INT UNSIGNED NOT NULL,
  is_lead     TINYINT(1)   NOT NULL DEFAULT 0,
  joined_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, team_id),
  CONSTRAINT fk_at_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_at_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agent_availability (
  user_id       INT UNSIGNED NOT NULL,
  status        ENUM('online','away','busy','offline') NOT NULL DEFAULT 'offline',
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_aa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_history (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ph_user (user_id),
  CONSTRAINT fk_ph_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mfa_settings (
  user_id       INT UNSIGNED  NOT NULL,
  is_enabled    TINYINT(1)    NOT NULL DEFAULT 0,
  method        ENUM('totp','sms') NOT NULL DEFAULT 'totp',
  totp_secret   VARCHAR(255)  NULL,
  backup_codes  TEXT          NULL COMMENT 'JSON array of hashed backup codes',
  enabled_at    TIMESTAMP     NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_mfa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  id            VARCHAR(128)  NOT NULL,
  user_id       INT UNSIGNED  NOT NULL,
  ip_address    VARCHAR(45)   NULL,
  user_agent    VARCHAR(500)  NULL,
  expires_at    TIMESTAMP     NOT NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_expires (expires_at),
  CONSTRAINT fk_sess_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED  NOT NULL,
  token_hash  VARCHAR(255)  NOT NULL,
  expires_at  TIMESTAMP     NOT NULL,
  used_at     TIMESTAMP     NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_prt_user (user_id),
  CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. ORGANIZATIONS & CUSTOMERS
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name        VARCHAR(191)  NOT NULL,
  domain      VARCHAR(191)  NULL,
  industry    VARCHAR(100)  NULL,
  tier        ENUM('standard','premium','enterprise') NOT NULL DEFAULT 'standard',
  website     VARCHAR(300)  NULL,
  notes       TEXT          NULL,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP     NULL,
  created_by  INT UNSIGNED  NULL,
  PRIMARY KEY (id),
  KEY idx_orgs_tier (tier),
  KEY idx_orgs_active (is_active, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  organization_id INT UNSIGNED  NULL,
  first_name      VARCHAR(80)   NOT NULL,
  last_name       VARCHAR(80)   NOT NULL,
  email           VARCHAR(191)  NOT NULL,
  phone           VARCHAR(20)   NULL,
  avatar_url      VARCHAR(500)  NULL,
  timezone        VARCHAR(60)   NOT NULL DEFAULT 'UTC',
  locale          VARCHAR(10)   NOT NULL DEFAULT 'en',
  notes           TEXT          NULL,
  tags            JSON          NULL COMMENT 'Array of tag strings',
  portal_user_id  INT UNSIGNED  NULL COMMENT 'Links to users table for portal access',
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP     NULL,
  created_by      INT UNSIGNED  NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customers_email (email),
  KEY idx_customers_org (organization_id),
  KEY idx_customers_portal_user (portal_user_id),
  CONSTRAINT fk_cust_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
  CONSTRAINT fk_cust_portal FOREIGN KEY (portal_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. CHANNELS
-- ============================================================

CREATE TABLE IF NOT EXISTS channels (
  id          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(50)  NOT NULL,
  type        ENUM('email','chat','whatsapp','twitter','facebook','phone','portal','api') NOT NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  config      JSON         NULL COMMENT 'Channel-specific configuration',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_channels_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. TAGS
-- ============================================================

CREATE TABLE IF NOT EXISTS tags (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name        VARCHAR(80)   NOT NULL,
  color       VARCHAR(7)    NULL DEFAULT '#6B7280' COMMENT 'Hex color code',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED  NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. SLA POLICIES
-- ============================================================

CREATE TABLE IF NOT EXISTS sla_policies (
  id                    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name                  VARCHAR(100)  NOT NULL,
  description           TEXT          NULL,
  priority              ENUM('critical','high','medium','low','all') NOT NULL DEFAULT 'all',
  customer_tier         ENUM('standard','premium','enterprise','all') NOT NULL DEFAULT 'all',
  department_id         INT UNSIGNED  NULL,
  frt_hours             DECIMAL(5,2)  NOT NULL COMMENT 'First Response Time in hours',
  rt_hours              DECIMAL(5,2)  NOT NULL COMMENT 'Resolution Time in hours',
  use_business_hours    TINYINT(1)    NOT NULL DEFAULT 1,
  is_active             TINYINT(1)    NOT NULL DEFAULT 1,
  created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at            TIMESTAMP     NULL,
  created_by            INT UNSIGNED  NULL,
  PRIMARY KEY (id),
  KEY idx_sla_priority (priority),
  KEY idx_sla_dept (department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sla_business_hours (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  sla_id      INT UNSIGNED  NOT NULL,
  day_of_week TINYINT       NOT NULL COMMENT '0=Sunday, 6=Saturday',
  start_time  TIME          NOT NULL,
  end_time    TIME          NOT NULL,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_sbh_sla (sla_id),
  CONSTRAINT fk_sbh_sla FOREIGN KEY (sla_id) REFERENCES sla_policies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sla_holidays (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  sla_id      INT UNSIGNED  NOT NULL,
  date        DATE          NOT NULL,
  name        VARCHAR(100)  NULL,
  PRIMARY KEY (id),
  KEY idx_sh_sla (sla_id),
  CONSTRAINT fk_sh_sla FOREIGN KEY (sla_id) REFERENCES sla_policies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. TICKETS (Core entity)
-- ============================================================

CREATE TABLE IF NOT EXISTS tickets (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_number       VARCHAR(30)     NOT NULL,
  customer_id         INT UNSIGNED    NULL,
  customer_email      VARCHAR(191)    NOT NULL,
  customer_name       VARCHAR(191)    NOT NULL,
  organization_id     INT UNSIGNED    NULL,
  channel_id          TINYINT UNSIGNED NULL,
  department_id       INT UNSIGNED    NULL,
  team_id             INT UNSIGNED    NULL,
  assigned_to         INT UNSIGNED    NULL,
  sla_policy_id       INT UNSIGNED    NULL,
  subject             VARCHAR(500)    NOT NULL,
  description         LONGTEXT        NULL,
  status              ENUM('new','open','in_progress','pending_customer','escalated','resolved','closed') NOT NULL DEFAULT 'new',
  priority            ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium',
  category            VARCHAR(100)    NULL,
  sub_category        VARCHAR(100)    NULL,
  source              VARCHAR(50)     NULL,
  is_escalated        TINYINT(1)      NOT NULL DEFAULT 0,
  escalated_at        TIMESTAMP       NULL,
  escalated_to        INT UNSIGNED    NULL,
  first_response_at   TIMESTAMP       NULL,
  resolved_at         TIMESTAMP       NULL,
  closed_at           TIMESTAMP       NULL,
  reopened_at         TIMESTAMP       NULL,
  due_at              TIMESTAMP       NULL COMMENT 'SLA resolution deadline',
  frt_due_at          TIMESTAMP       NULL COMMENT 'SLA first response deadline',
  sla_status          ENUM('on_track','at_risk','breached','paused','none') NOT NULL DEFAULT 'none',
  csat_score          TINYINT UNSIGNED NULL COMMENT '1-5 rating',
  csat_comment        TEXT            NULL,
  csat_submitted_at   TIMESTAMP       NULL,
  merge_into_id       BIGINT UNSIGNED NULL,
  parent_ticket_id    BIGINT UNSIGNED NULL,
  custom_fields       JSON            NULL,
  created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at          TIMESTAMP       NULL,
  created_by          INT UNSIGNED    NULL,
  updated_by          INT UNSIGNED    NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tickets_number (ticket_number),
  KEY idx_tickets_status (status),
  KEY idx_tickets_priority (priority),
  KEY idx_tickets_assigned (assigned_to),
  KEY idx_tickets_customer (customer_id),
  KEY idx_tickets_team (team_id),
  KEY idx_tickets_dept (department_id),
  KEY idx_tickets_sla (sla_policy_id),
  KEY idx_tickets_created (created_at),
  KEY idx_tickets_due (due_at),
  KEY idx_tickets_composite_status_assigned (status, assigned_to),
  FULLTEXT KEY ft_tickets_search (subject, description),
  CONSTRAINT fk_tickets_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_tickets_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
  CONSTRAINT fk_tickets_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL,
  CONSTRAINT fk_tickets_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_tickets_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
  CONSTRAINT fk_tickets_assigned FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_tickets_sla FOREIGN KEY (sla_policy_id) REFERENCES sla_policies(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_comments (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id       BIGINT UNSIGNED NOT NULL,
  author_id       INT UNSIGNED    NULL COMMENT 'NULL for customer portal replies without user account',
  author_type     ENUM('agent','customer','system') NOT NULL DEFAULT 'agent',
  author_name     VARCHAR(191)    NULL,
  author_email    VARCHAR(191)    NULL,
  body            LONGTEXT        NOT NULL,
  is_internal     TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'Internal note vs public reply',
  is_system       TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'Auto-generated system comment',
  channel         VARCHAR(50)     NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY idx_tc_ticket (ticket_id),
  KEY idx_tc_author (author_id),
  KEY idx_tc_created (created_at),
  CONSTRAINT fk_tc_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_tc_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_attachments (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id       BIGINT UNSIGNED NULL,
  comment_id      BIGINT UNSIGNED NULL,
  uploader_id     INT UNSIGNED    NULL,
  file_name       VARCHAR(255)    NOT NULL,
  file_path       VARCHAR(500)    NOT NULL,
  file_size       INT UNSIGNED    NOT NULL COMMENT 'Size in bytes',
  mime_type       VARCHAR(100)    NOT NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP       NULL,
  PRIMARY KEY (id),
  KEY idx_ta_ticket (ticket_id),
  KEY idx_ta_comment (comment_id),
  CONSTRAINT fk_ta_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_ta_comment FOREIGN KEY (comment_id) REFERENCES ticket_comments(id) ON DELETE SET NULL,
  CONSTRAINT fk_ta_uploader FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_tags (
  ticket_id   BIGINT UNSIGNED NOT NULL,
  tag_id      INT UNSIGNED    NOT NULL,
  added_by    INT UNSIGNED    NULL,
  added_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ticket_id, tag_id),
  CONSTRAINT fk_ttag_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_ttag_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_links (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  ticket_id       BIGINT UNSIGNED NOT NULL,
  linked_ticket_id BIGINT UNSIGNED NOT NULL,
  link_type       ENUM('related','duplicate','parent','child','blocked_by','blocks') NOT NULL DEFAULT 'related',
  created_by      INT UNSIGNED    NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tl_ticket (ticket_id),
  KEY idx_tl_linked (linked_ticket_id),
  CONSTRAINT fk_tl_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_tl_linked FOREIGN KEY (linked_ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_history (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id       BIGINT UNSIGNED NOT NULL,
  changed_by      INT UNSIGNED    NULL,
  changed_by_name VARCHAR(191)    NULL,
  field_name      VARCHAR(80)     NOT NULL,
  old_value       TEXT            NULL,
  new_value       TEXT            NULL,
  change_type     ENUM('create','update','status','assign','escalate','merge','tag','comment','attachment') NOT NULL DEFAULT 'update',
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_th_ticket (ticket_id),
  KEY idx_th_created (created_at),
  CONSTRAINT fk_th_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sla_timers (
  id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  ticket_id           BIGINT UNSIGNED NOT NULL,
  sla_policy_id       INT UNSIGNED    NOT NULL,
  frt_deadline        TIMESTAMP       NULL,
  rt_deadline         TIMESTAMP       NULL,
  frt_breached        TINYINT(1)      NOT NULL DEFAULT 0,
  rt_breached         TINYINT(1)      NOT NULL DEFAULT 0,
  frt_achieved_at     TIMESTAMP       NULL,
  rt_achieved_at      TIMESTAMP       NULL,
  paused_at           TIMESTAMP       NULL,
  paused_duration_secs INT UNSIGNED   NOT NULL DEFAULT 0 COMMENT 'Accumulated pause time',
  is_paused           TINYINT(1)      NOT NULL DEFAULT 0,
  created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_st_ticket (ticket_id),
  KEY idx_st_rt_deadline (rt_deadline),
  KEY idx_st_frt_deadline (frt_deadline),
  CONSTRAINT fk_st_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_st_sla FOREIGN KEY (sla_policy_id) REFERENCES sla_policies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. WORKFLOWS & AUTOMATION
-- ============================================================

CREATE TABLE IF NOT EXISTS workflows (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name          VARCHAR(150)  NOT NULL,
  description   TEXT          NULL,
  trigger_event ENUM('ticket_created','ticket_updated','ticket_assigned','ticket_status_changed','sla_breach','comment_added','ticket_escalated') NOT NULL,
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  run_order     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP     NULL,
  created_by    INT UNSIGNED  NULL,
  PRIMARY KEY (id),
  KEY idx_wf_trigger (trigger_event, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_conditions (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  workflow_id     INT UNSIGNED  NOT NULL,
  field           VARCHAR(80)   NOT NULL,
  operator        VARCHAR(30)   NOT NULL COMMENT 'equals, not_equals, contains, greater_than, etc.',
  value           TEXT          NOT NULL,
  logic_group     TINYINT       NOT NULL DEFAULT 1 COMMENT 'Conditions with same group are AND; different groups are OR',
  PRIMARY KEY (id),
  KEY idx_wc_workflow (workflow_id),
  CONSTRAINT fk_wc_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_actions (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  workflow_id     INT UNSIGNED  NOT NULL,
  action_type     ENUM('assign_agent','assign_team','set_priority','set_status','add_tag','send_email','send_notification','add_comment','escalate','set_sla') NOT NULL,
  action_value    JSON          NOT NULL COMMENT 'Action-specific parameters',
  run_order       TINYINT       NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_wa_workflow (workflow_id),
  CONSTRAINT fk_wa_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_execution_logs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  workflow_id     INT UNSIGNED    NOT NULL,
  ticket_id       BIGINT UNSIGNED NULL,
  trigger_event   VARCHAR(80)     NOT NULL,
  conditions_met  TINYINT(1)      NOT NULL,
  actions_run     JSON            NULL,
  error_message   TEXT            NULL,
  executed_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wel_workflow (workflow_id),
  KEY idx_wel_ticket (ticket_id),
  KEY idx_wel_executed (executed_at),
  CONSTRAINT fk_wel_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS canned_responses (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  title       VARCHAR(200)  NOT NULL,
  body        LONGTEXT      NOT NULL,
  category    VARCHAR(100)  NULL,
  is_shared   TINYINT(1)    NOT NULL DEFAULT 1,
  created_by  INT UNSIGNED  NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP     NULL,
  FULLTEXT KEY ft_canned_search (title, body),
  PRIMARY KEY (id),
  KEY idx_cr_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. KNOWLEDGE BASE
-- ============================================================

CREATE TABLE IF NOT EXISTS kb_categories (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  parent_id   INT UNSIGNED  NULL,
  name        VARCHAR(150)  NOT NULL,
  slug        VARCHAR(150)  NOT NULL,
  description TEXT          NULL,
  sort_order  SMALLINT      NOT NULL DEFAULT 0,
  is_public   TINYINT(1)    NOT NULL DEFAULT 1,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by  INT UNSIGNED  NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_kbc_slug (slug),
  KEY idx_kbc_parent (parent_id),
  CONSTRAINT fk_kbc_parent FOREIGN KEY (parent_id) REFERENCES kb_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kb_articles (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  category_id     INT UNSIGNED  NULL,
  title           VARCHAR(500)  NOT NULL,
  slug            VARCHAR(500)  NOT NULL,
  body            LONGTEXT      NOT NULL,
  excerpt         TEXT          NULL,
  status          ENUM('draft','pending_review','published','archived') NOT NULL DEFAULT 'draft',
  is_public       TINYINT(1)    NOT NULL DEFAULT 1,
  view_count      INT UNSIGNED  NOT NULL DEFAULT 0,
  helpful_count   INT UNSIGNED  NOT NULL DEFAULT 0,
  not_helpful_count INT UNSIGNED NOT NULL DEFAULT 0,
  version         SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  published_at    TIMESTAMP     NULL,
  reviewed_by     INT UNSIGNED  NULL,
  reviewed_at     TIMESTAMP     NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP     NULL,
  created_by      INT UNSIGNED  NULL,
  updated_by      INT UNSIGNED  NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_kba_slug (slug),
  KEY idx_kba_category (category_id),
  KEY idx_kba_status (status),
  FULLTEXT KEY ft_kb_search (title, body),
  CONSTRAINT fk_kba_category FOREIGN KEY (category_id) REFERENCES kb_categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_kba_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kb_article_versions (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  article_id  INT UNSIGNED  NOT NULL,
  version     SMALLINT UNSIGNED NOT NULL,
  title       VARCHAR(500)  NOT NULL,
  body        LONGTEXT      NOT NULL,
  changed_by  INT UNSIGNED  NULL,
  change_note VARCHAR(300)  NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_kbav_article (article_id, version),
  CONSTRAINT fk_kbav_article FOREIGN KEY (article_id) REFERENCES kb_articles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11. NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED    NOT NULL,
  type            VARCHAR(80)     NOT NULL,
  title           VARCHAR(300)    NOT NULL,
  body            TEXT            NULL,
  data            JSON            NULL COMMENT 'Contextual payload (ticket_id, etc.)',
  is_read         TINYINT(1)      NOT NULL DEFAULT 0,
  read_at         TIMESTAMP       NULL,
  channel         ENUM('in_app','email','sms','push') NOT NULL DEFAULT 'in_app',
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user (user_id, is_read),
  KEY idx_notif_created (created_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id     INT UNSIGNED  NOT NULL,
  event_type  VARCHAR(80)   NOT NULL,
  in_app      TINYINT(1)    NOT NULL DEFAULT 1,
  email       TINYINT(1)    NOT NULL DEFAULT 1,
  sms         TINYINT(1)    NOT NULL DEFAULT 0,
  push        TINYINT(1)    NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, event_type),
  CONSTRAINT fk_np_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 12. AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED    NULL,
  user_email      VARCHAR(191)    NULL COMMENT 'Snapshot at time of action',
  user_role       VARCHAR(50)     NULL,
  action          VARCHAR(80)     NOT NULL,
  module          VARCHAR(50)     NOT NULL,
  entity_type     VARCHAR(80)     NULL,
  entity_id       VARCHAR(80)     NULL,
  old_values      JSON            NULL,
  new_values      JSON            NULL,
  ip_address      VARCHAR(45)     NULL,
  user_agent      VARCHAR(500)    NULL,
  request_id      VARCHAR(64)     NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_al_user (user_id),
  KEY idx_al_module (module),
  KEY idx_al_action (action),
  KEY idx_al_entity (entity_type, entity_id),
  KEY idx_al_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 13. SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  category    VARCHAR(80)   NOT NULL,
  key_name    VARCHAR(100)  NOT NULL,
  value       TEXT          NULL,
  data_type   ENUM('string','integer','boolean','json') NOT NULL DEFAULT 'string',
  is_encrypted TINYINT(1)   NOT NULL DEFAULT 0,
  description VARCHAR(300)  NULL,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by  INT UNSIGNED  NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_settings_key (category, key_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 14. TICKET CATEGORIES (Configurable)
-- ============================================================

CREATE TABLE IF NOT EXISTS ticket_categories (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  parent_id   INT UNSIGNED  NULL,
  name        VARCHAR(100)  NOT NULL,
  description VARCHAR(300)  NULL,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  sort_order  SMALLINT      NOT NULL DEFAULT 0,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tc_parent (parent_id),
  CONSTRAINT fk_tcat_parent FOREIGN KEY (parent_id) REFERENCES ticket_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
