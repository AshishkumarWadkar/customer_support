# Assumptions & Clarifications
## Customer Support & Ticket Management Platform

**Document Version:** 1.0  
**Date:** 2026-05-26

---

## 1. Technical Assumptions

### 1.1 Infrastructure
- A1: The application will be deployed on cloud infrastructure (AWS/Azure/GCP) using containerized services (Docker).
- A2: MySQL 8.0+ is the chosen relational database. No NoSQL layer is included in v1.
- A3: Redis will be used for session management, caching (dashboard metrics, rate limiting).
- A4: Email service will use SMTP (configurable). Nodemailer with SMTP transport is the default implementation.
- A5: File uploads will be stored on local server storage (v1). Cloud storage (S3/Azure Blob) integration is a Phase 2 enhancement.
- A6: WebSocket (via Socket.IO) will handle real-time dashboard updates and in-app notifications.

### 1.2 Authentication
- A7: SSO is documented and designed but the SAML/OAuth provider integration is a configuration-based setup (not hardcoded to any specific provider).
- A8: MFA (TOTP) will use the `speakeasy` library. QR code generation for Google Authenticator is supported.
- A9: JWT access tokens expire in 1 hour; refresh tokens expire in 7 days and are rotated on use.
- A10: SMS notifications (OTP, alerts) will use Twilio. If Twilio credentials are not configured, SMS features are gracefully disabled.

### 1.3 Omnichannel
- A11: Email-to-ticket conversion is handled by polling an IMAP mailbox. Real-time email hooks (webhooks from email providers like SendGrid Inbound) are Phase 2.
- A12: WhatsApp and social media integrations are designed with webhook receivers in the API layer; actual provider credentials are environment-based.
- A13: Live chat in v1 uses Socket.IO. Third-party chat SDK integration (Intercom, Zendesk Chat) is Phase 2.
- A14: Phone call logging is manual entry only in v1. Telephony integration (Twilio Voice, etc.) is Phase 2.

### 1.4 Data
- A15: All timestamps are stored in UTC. Display is localized to user's configured timezone.
- A16: Soft delete pattern is used for all major entities (tickets, customers, users, articles).
- A17: Audit log retention policy is 1 year minimum; old logs are not deleted in v1 but an archival job is designed.
- A18: File attachment max size is 10MB per file, max 5 files per message. These are configurable via settings.

---

## 2. Business Assumptions

### 2.1 Roles & Permissions
- A19: There is exactly one Super Admin account per system (initial seed). Additional Super Admins can be promoted.
- A20: A Support Manager manages one or more teams but is limited to their assigned departments.
- A21: Support Agents can only see tickets assigned to them or their team(s) (not system-wide, unless granted explicit access).
- A22: Customers access only the Customer Portal — they do not have access to the internal agent application.

### 2.2 Tickets
- A23: Ticket priority mapping to SLA: Critical = 1hr FRT / 4hr RT, High = 2hr FRT / 8hr RT, Medium = 8hr FRT / 24hr RT, Low = 24hr FRT / 72hr RT. These are defaults, overridable via SLA policy.
- A24: A ticket can only be assigned to one agent at a time (primary assignee). Co-assignees are a Phase 2 feature.
- A25: Ticket categories are predefined by the admin and configurable from settings.
- A26: Ticket auto-numbering format: TKT-YYYYMMDD-00001 (5-digit zero-padded daily sequence).

### 2.3 SLA
- A27: Business hours are defined per department. If no department-specific hours exist, system-wide business hours apply.
- A28: SLA timer pauses automatically when ticket status changes to "Pending Customer".
- A29: If a ticket has no SLA policy applied, it is flagged as "No SLA" and appears in a separate queue.

### 2.4 Knowledge Base
- A30: All knowledge base articles require manager/admin approval before being visible to customers.
- A31: Internal articles (not public) are visible to agents and managers only.
- A32: Article versioning stores a complete snapshot of the article body on each save (not diff-based in v1).

### 2.5 Reporting
- A33: Reports are generated on-demand (not pre-aggregated) for v1. Scheduled reports are queued jobs.
- A34: Export functionality generates CSV for tabular data and PDF for chart-based reports (using server-side PDF generation).
- A35: Dashboard widgets refresh every 60 seconds via polling + immediate WebSocket updates on changes.

---

## 3. Clarifications Needed from Business

| # | Question | Impact | Assumption Made |
|---|----------|--------|----------------|
| C1 | What are the exact SLA breach thresholds for each priority? | SLA config | Using industry defaults (see A23) |
| C2 | Should agents be able to create customers, or only admin/manager? | RBAC | Agents can create customers (A20) |
| C3 | Is ticket auto-assignment round-robin only, or skill-based too? | Workflow Engine | Both supported (configurable rule) |
| C4 | What is the maximum file attachment size per ticket (total)? | Storage | 50MB per ticket total (10MB × 5 files) |
| C5 | Are there specific CRM systems (Salesforce, HubSpot) required at launch? | Integrations | Generic webhook; specific CRM as Phase 2 |
| C6 | Should the customer portal be a subdomain or same-domain path? | Routing | Same domain at /portal path in v1 |
| C7 | Is GDPR compliance required at launch? | Data handling | GDPR-ready design; full compliance guide as Phase 2 |
| C8 | Are there multi-language requirements? | i18n | English only v1; i18n framework scaffolded |
| C9 | How long should inactive sessions remain valid? | Security | 30 minute idle timeout (configurable) |
| C10 | Should customers be able to re-open tickets? | Portal | Yes, within 7 days of closure |

---

## 4. Out of Scope for v1.0

| Feature | Reason | Planned For |
|---------|--------|------------|
| AI chatbot | Complex ML dependency | v2.0 |
| AI ticket summarization | GPT/ML integration | v2.0 |
| Predictive ticket routing | ML model training required | v2.0 |
| Sentiment analysis | NLP processing | v2.0 |
| Multilingual UI | i18n scaffolded, not populated | v1.5 |
| Native mobile apps | iOS/Android apps | v2.0 |
| Telephony (Twilio Voice) | Complex integration | v1.5 |
| Advanced CRM sync | Salesforce/HubSpot APIs | v1.5 |
| S3/Cloud file storage | Local storage v1 | v1.5 |
| SAML SSO (full config UI) | Auth framework ready | v1.5 |

---

*Assumptions Document v1.0 — Solution Architecture Team*
