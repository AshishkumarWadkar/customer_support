-- ============================================================
-- Customer Support & Ticket Management Platform
-- Seed Data v1.0
-- ============================================================

USE support_db;

-- ============================================================
-- 1. ROLES
-- ============================================================

INSERT INTO roles (id, name, display_name, description) VALUES
(1, 'SUPER_ADMIN', 'Super Administrator', 'Full system access with all permissions'),
(2, 'MANAGER',     'Support Manager',     'Manages teams, agents, and department operations'),
(3, 'AGENT',       'Support Agent',       'Handles customer tickets and support operations'),
(4, 'CUSTOMER',    'Customer',            'Customer portal access only')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

-- ============================================================
-- 2. PERMISSIONS
-- ============================================================

INSERT INTO permissions (name, display_name, module) VALUES
-- Auth
('auth.login',               'Login',                       'auth'),
('auth.manage_users',        'Manage Users',                'auth'),
('auth.unlock_accounts',     'Unlock Accounts',             'auth'),
-- Tickets
('tickets.create',           'Create Tickets',              'tickets'),
('tickets.view_all',         'View All Tickets',            'tickets'),
('tickets.view_team',        'View Team Tickets',           'tickets'),
('tickets.view_own',         'View Own Tickets',            'tickets'),
('tickets.update',           'Update Tickets',              'tickets'),
('tickets.delete',           'Delete Tickets',              'tickets'),
('tickets.assign',           'Assign Tickets',              'tickets'),
('tickets.escalate',         'Escalate Tickets',            'tickets'),
('tickets.merge',            'Merge Tickets',               'tickets'),
('tickets.export',           'Export Tickets',              'tickets'),
-- Customers
('customers.create',         'Create Customers',            'customers'),
('customers.view',           'View Customers',              'customers'),
('customers.update',         'Update Customers',            'customers'),
('customers.delete',         'Delete Customers',            'customers'),
('customers.import',         'Import Customers',            'customers'),
-- SLA
('sla.manage',               'Manage SLA Policies',         'sla'),
('sla.view',                 'View SLA Information',        'sla'),
-- Workflows
('workflows.manage',         'Manage Workflows',            'workflows'),
-- KB
('kb.create',                'Create KB Articles',          'knowledge_base'),
('kb.publish',               'Publish KB Articles',         'knowledge_base'),
('kb.view_internal',         'View Internal Articles',      'knowledge_base'),
-- Reports
('reports.view',             'View Reports',                'reports'),
('reports.export',           'Export Reports',              'reports'),
-- Teams
('teams.manage',             'Manage Teams & Departments',  'teams'),
('teams.view',               'View Teams',                  'teams'),
-- Audit
('audit.view',               'View Audit Logs',             'audit'),
('audit.export',             'Export Audit Logs',           'audit'),
-- Settings
('settings.manage',          'Manage System Settings',      'settings')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

-- ============================================================
-- 3. ROLE PERMISSIONS
-- ============================================================

-- Super Admin: all permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Manager permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE name IN (
  'auth.login',
  'tickets.create','tickets.view_all','tickets.update','tickets.assign','tickets.escalate','tickets.export',
  'customers.create','customers.view','customers.update',
  'sla.view',
  'kb.create','kb.publish','kb.view_internal',
  'reports.view','reports.export',
  'teams.view',
  'audit.view'
);

-- Agent permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE name IN (
  'auth.login',
  'tickets.create','tickets.view_team','tickets.update','tickets.escalate',
  'customers.create','customers.view',
  'sla.view',
  'kb.create','kb.view_internal'
);

-- Customer permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE name IN (
  'auth.login',
  'tickets.create','tickets.view_own'
);

-- ============================================================
-- 4. DEPARTMENTS
-- ============================================================

INSERT INTO departments (id, name, description, is_active) VALUES
(1, 'Technical Support',  'Handles technical issues and bug reports',       1),
(2, 'Billing & Payments', 'Handles billing, invoicing, and payment queries', 1),
(3, 'General Inquiries',  'Handles general questions and information',       1),
(4, 'Account Management', 'Handles account-related requests',                1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================================
-- 5. TEAMS
-- ============================================================

INSERT INTO teams (id, department_id, name, description, is_active) VALUES
(1, 1, 'Tier 1 Support',   'First-line technical support',        1),
(2, 1, 'Tier 2 Engineering','Advanced technical escalations',      1),
(3, 2, 'Billing Team',      'Billing and payment specialists',     1),
(4, 3, 'General Support',   'General inquiry handlers',            1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================================
-- 6. USERS (admin + sample agents)
-- Note: Passwords are bcrypt hashes. Default password: Admin@1234
-- ============================================================

INSERT INTO users (id, role_id, department_id, first_name, last_name, email, password_hash, is_active, email_verified, email_verified_at) VALUES
(1, 1, NULL, 'System',   'Admin',    'admin@support.com',      '$2a$12$r3APNLaP8z6A7G61.QL8C.4awN1.D1WVqmxC.HQU8untad/uFAfHW', 1, 1, NOW()),
(2, 2, 1,    'Sarah',    'Manager',  'manager@support.com',    '$2a$12$r3APNLaP8z6A7G61.QL8C.4awN1.D1WVqmxC.HQU8untad/uFAfHW', 1, 1, NOW()),
(3, 3, 1,    'John',     'Agent',    'agent1@support.com',     '$2a$12$r3APNLaP8z6A7G61.QL8C.4awN1.D1WVqmxC.HQU8untad/uFAfHW', 1, 1, NOW()),
(4, 3, 1,    'Emily',    'Wilson',   'agent2@support.com',     '$2a$12$r3APNLaP8z6A7G61.QL8C.4awN1.D1WVqmxC.HQU8untad/uFAfHW', 1, 1, NOW()),
(5, 3, 2,    'Mike',     'Thomas',   'agent3@support.com',     '$2a$12$r3APNLaP8z6A7G61.QL8C.4awN1.D1WVqmxC.HQU8untad/uFAfHW', 1, 1, NOW()),
(6, 4, NULL, 'Alice',    'Customer', 'customer@example.com',   '$2a$12$r3APNLaP8z6A7G61.QL8C.4awN1.D1WVqmxC.HQU8untad/uFAfHW', 1, 1, NOW())
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- ============================================================
-- 7. AGENT TEAMS
-- ============================================================

INSERT IGNORE INTO agent_teams (user_id, team_id, is_lead) VALUES
(2, 1, 1), -- Manager leads Tier 1
(3, 1, 0), -- Agent1 in Tier 1
(4, 1, 0), -- Agent2 in Tier 1
(5, 3, 0); -- Agent3 in Billing

-- ============================================================
-- 8. CHANNELS
-- ============================================================

INSERT INTO channels (id, name, type, is_active) VALUES
(1, 'Email',          'email',    1),
(2, 'Live Chat',      'chat',     1),
(3, 'WhatsApp',       'whatsapp', 1),
(4, 'Customer Portal','portal',   1),
(5, 'Phone',          'phone',    1),
(6, 'API',            'api',      1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================================
-- 9. SLA POLICIES
-- ============================================================

INSERT INTO sla_policies (id, name, priority, customer_tier, frt_hours, rt_hours, use_business_hours, is_active) VALUES
(1, 'Critical - 24x7',  'critical', 'all',        1,   4,  0, 1),
(2, 'High - Business',  'high',     'all',        2,   8,  1, 1),
(3, 'Medium - Business','medium',   'all',        8,  24,  1, 1),
(4, 'Low - Business',   'low',      'all',       24,  72,  1, 1),
(5, 'Premium SLA',      'all',      'enterprise', 1,   4,  0, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Business hours (Mon-Fri 9am-6pm) for policies 2,3,4
INSERT IGNORE INTO sla_business_hours (sla_id, day_of_week, start_time, end_time, is_active)
SELECT sla.id, days.day, '09:00:00', '18:00:00', 1
FROM sla_policies sla
CROSS JOIN (SELECT 1 AS day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) days
WHERE sla.id IN (2, 3, 4);

-- ============================================================
-- 10. TAGS
-- ============================================================

INSERT INTO tags (name, color) VALUES
('urgent',       '#EF4444'),
('billing',      '#F59E0B'),
('technical',    '#3B82F6'),
('bug',          '#8B5CF6'),
('feature-req',  '#10B981'),
('password',     '#6B7280'),
('account',      '#EC4899'),
('performance',  '#14B8A6')
ON DUPLICATE KEY UPDATE color = VALUES(color);

-- ============================================================
-- 11. ORGANIZATIONS
-- ============================================================

INSERT INTO organizations (id, name, domain, industry, tier) VALUES
(1, 'Acme Corp',       'acme.com',     'Technology',  'enterprise'),
(2, 'Beta Inc',        'beta.com',     'Finance',     'premium'),
(3, 'Sample Customer', 'example.com',  'Retail',      'standard')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================================
-- 12. CUSTOMERS
-- ============================================================

INSERT INTO customers (id, organization_id, first_name, last_name, email, portal_user_id) VALUES
(1, 3, 'Alice', 'Customer', 'customer@example.com', 6),
(2, 1, 'Bob',   'Smith',    'bob@acme.com',          NULL),
(3, 2, 'Carol', 'Jones',    'carol@beta.com',        NULL)
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- ============================================================
-- 13. KB CATEGORIES
-- ============================================================

INSERT INTO kb_categories (id, parent_id, name, slug, is_public, is_active, sort_order) VALUES
(1, NULL, 'Getting Started',     'getting-started',   1, 1, 1),
(2, NULL, 'Billing & Payments',  'billing-payments',  1, 1, 2),
(3, NULL, 'Technical Issues',    'technical-issues',  1, 1, 3),
(4, NULL, 'Account Management',  'account-management',1, 1, 4),
(5, 3,    'Error Codes',         'error-codes',       1, 1, 1),
(6, NULL, 'Internal Guides',     'internal-guides',   0, 1, 99)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================================
-- 14. SAMPLE KB ARTICLE
-- ============================================================

INSERT INTO kb_articles (id, category_id, title, slug, body, status, is_public, published_at, created_by) VALUES
(1, 1, 'How to Create a Support Ticket',
 'how-to-create-a-support-ticket',
 '<h2>Creating a Support Ticket</h2><p>To create a support ticket, navigate to the Customer Portal and click "New Ticket".</p><ol><li>Fill in the subject and description</li><li>Select the priority</li><li>Attach any relevant files</li><li>Submit the form</li></ol>',
 'published', 1, NOW(), 1)
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- ============================================================
-- 15. TICKET CATEGORIES
-- ============================================================

INSERT INTO ticket_categories (id, parent_id, name, is_active, sort_order) VALUES
(1,  NULL, 'Technical Issue',         1, 1),
(2,  NULL, 'Billing',                 1, 2),
(3,  NULL, 'Account',                 1, 3),
(4,  NULL, 'Feature Request',         1, 4),
(5,  NULL, 'General Inquiry',         1, 5),
(6,  1,    'Bug Report',              1, 1),
(7,  1,    'Performance Issue',       1, 2),
(8,  1,    'Integration Problem',     1, 3),
(9,  2,    'Invoice Dispute',         1, 1),
(10, 2,    'Refund Request',          1, 2)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================================
-- 16. SAMPLE CANNED RESPONSES
-- ============================================================

INSERT INTO canned_responses (title, body, category, is_shared, created_by) VALUES
('Acknowledge Receipt',
 'Dear {{customer_name}},\n\nThank you for contacting our support team. We have received your request (Ticket #{{ticket_number}}) and a member of our team will review it shortly.\n\nBest regards,\nSupport Team',
 'General', 1, 1),

('Request More Information',
 'Hi {{customer_name}},\n\nThank you for reaching out. To help resolve your issue as quickly as possible, could you please provide the following information?\n\n1. \n2. \n3. \n\nWe look forward to your response.\n\nBest regards,\n{{agent_name}}',
 'General', 1, 1),

('Resolution Confirmation',
 'Hi {{customer_name}},\n\nWe are pleased to inform you that your issue (Ticket #{{ticket_number}}) has been resolved. Here is a summary of what was done:\n\n{{resolution_details}}\n\nPlease let us know if you have any further questions.\n\nBest regards,\n{{agent_name}}',
 'Resolution', 1, 1)
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- ============================================================
-- 17. DEFAULT SETTINGS
-- ============================================================

INSERT INTO settings (category, key_name, value, data_type, description) VALUES
('general',   'company_name',          'Support Platform',  'string', 'Company/product name'),
('general',   'support_email',         'support@example.com','string', 'Default support email address'),
('general',   'timezone',              'UTC',               'string', 'System-wide default timezone'),
('general',   'date_format',           'YYYY-MM-DD',        'string', 'Default date display format'),
('tickets',   'auto_close_days',       '7',                 'integer','Days of inactivity before auto-close'),
('tickets',   'max_attachment_size_mb','10',                 'integer','Max file attachment size in MB'),
('tickets',   'max_attachments',       '5',                 'integer','Max number of attachments per message'),
('security',  'password_min_length',   '8',                 'integer','Minimum password length'),
('security',  'password_expiry_days',  '90',                'integer','Password expiry in days'),
('security',  'max_login_attempts',    '5',                 'integer','Max failed login attempts before lockout'),
('security',  'lockout_duration_mins', '30',                'integer','Account lockout duration in minutes'),
('security',  'session_timeout_mins',  '30',                'integer','Idle session timeout in minutes'),
('security',  'mfa_required',          'false',             'boolean','Force MFA for all users'),
('email',     'from_name',             'Support Team',      'string', 'Email sender display name'),
('email',     'smtp_host',             '',                  'string', 'SMTP server hostname'),
('email',     'smtp_port',             '587',               'integer','SMTP server port')
ON DUPLICATE KEY UPDATE value = VALUES(value);

-- ============================================================
-- 18. SAMPLE TICKETS (for development)
-- ============================================================

INSERT INTO tickets (id, ticket_number, customer_id, customer_email, customer_name, channel_id, department_id, team_id, assigned_to, sla_policy_id, subject, description, status, priority, created_by) VALUES
(1, 'TKT-20260526-00001', 1, 'customer@example.com', 'Alice Customer', 4, 1, 1, 3, 2,
 'Cannot login to my account',
 'I have been trying to login to my account for the past 2 hours but keep getting an error message saying "Invalid credentials". I am sure my password is correct.',
 'open', 'high', 6),

(2, 'TKT-20260526-00002', 2, 'bob@acme.com', 'Bob Smith', 1, 2, 3, 5, 3,
 'Invoice #INV-2026-045 seems incorrect',
 'The invoice I received last week shows a charge for 50 licenses but we only have 30 users. Please review and send a corrected invoice.',
 'in_progress', 'medium', 2),

(3, 'TKT-20260526-00003', 3, 'carol@beta.com', 'Carol Jones', 1, 1, 1, NULL, 1,
 'Application crashes on startup',
 'After the latest update (v2.3.1), the application crashes immediately on startup. Error code: 0x8007000E.',
 'new', 'critical', NULL)
ON DUPLICATE KEY UPDATE ticket_number = VALUES(ticket_number);

-- ============================================================
-- END OF SEEDS
-- ============================================================
