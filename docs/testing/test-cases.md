# Test Cases
## Customer Support & Ticket Management Platform

**Document Version:** 1.0  
**Date:** 2026-05-26

---

## MODULE 1: Authentication

### TC-AUTH-001: Successful Login
- **Type:** Integration  
- **Precondition:** User `admin@support.com` exists with correct password
- **Input:** `{ email: "admin@support.com", password: "Admin@1234" }`
- **Expected:** HTTP 200, `data.accessToken` present, `data.user.role = "SUPER_ADMIN"`

### TC-AUTH-002: Invalid Credentials
- **Input:** `{ email: "admin@support.com", password: "wrong" }`
- **Expected:** HTTP 401, `success: false`, `message: "Invalid email or password"`

### TC-AUTH-003: Account Lockout After 5 Failures
- **Steps:** Send 5 failed logins → attempt 6th login
- **Expected:** HTTP 401, message includes "Account locked"

### TC-AUTH-004: Login with Locked Account
- **Precondition:** Account `is_locked = 1`, `locked_until` in future
- **Expected:** HTTP 401, message includes "locked", remaining time in minutes

### TC-AUTH-005: Token Refresh
- **Precondition:** Valid refresh token in HttpOnly cookie
- **Expected:** HTTP 200, new `accessToken` returned, cookie refreshed

### TC-AUTH-006: Refresh with Invalid Token
- **Input:** Invalid/expired refresh token
- **Expected:** HTTP 401, redirect to login

### TC-AUTH-007: Protected Route Without Token
- **Input:** GET /tickets with no Authorization header
- **Expected:** HTTP 401, `code: "NO_TOKEN"`

### TC-AUTH-008: Protected Route With Expired Token
- **Input:** Valid but expired access token
- **Expected:** HTTP 401, `code: "TOKEN_EXPIRED"`

### TC-AUTH-009: Password Reset Flow
- **Steps:** POST /auth/forgot-password → get token → POST /auth/reset-password
- **Expected:** 200 at each step, password changed, old password no longer works

### TC-AUTH-010: Password Reuse Prevention
- **Input:** Reset to same password as current
- **Expected:** HTTP 400, `message: "Cannot reuse one of your last 5 passwords"`

### TC-AUTH-011: Rate Limit on Login
- **Steps:** Send 21 login requests in 15 minutes
- **Expected:** 21st request returns HTTP 429

### TC-AUTH-012: Logout Clears Cookie
- **Steps:** POST /auth/logout
- **Expected:** HTTP 200, `refreshToken` cookie cleared

---

## MODULE 2: Tickets

### TC-TICK-001: Create Ticket (Agent)
- **Auth:** Agent JWT
- **Input:** `{ subject: "Test issue", description: "Details...", priority: "high", customerEmail: "c@ex.com", customerName: "Test" }`
- **Expected:** HTTP 201, `data.ticketNumber` matches pattern `TKT-YYYYMMDD-XXXXX`

### TC-TICK-002: Create Ticket — Missing Required Field
- **Input:** `{ description: "No subject provided" }`
- **Expected:** HTTP 400, `errors[0].field = "subject"`

### TC-TICK-003: List Tickets — Agent Sees Only Own Tickets
- **Auth:** Agent JWT (assigned_to = 3)
- **Expected:** All returned tickets have `assigned_to = 3`

### TC-TICK-004: List Tickets — Manager Sees All
- **Auth:** Manager JWT
- **Expected:** Returns tickets across all agents

### TC-TICK-005: Get Ticket By ID — Agent Access
- **Precondition:** Ticket assigned to agent 3
- **Auth:** Agent 3 JWT
- **Expected:** HTTP 200, full ticket detail returned

### TC-TICK-006: Get Ticket By ID — Agent Access Denied
- **Precondition:** Ticket assigned to agent 4, request from agent 3
- **Expected:** HTTP 403, `code: "FORBIDDEN"`

### TC-TICK-007: Update Ticket Status — Valid Transition
- **Input:** Status change from `new` → `open`
- **Expected:** HTTP 200, `data.status = "open"`, history record created

### TC-TICK-008: Update Ticket Status — Invalid Transition
- **Input:** Status change from `closed` → `in_progress`
- **Expected:** HTTP 400, message includes "Cannot transition"

### TC-TICK-009: Add Public Comment
- **Input:** `{ body: "<p>Reply here</p>", isInternal: false }`
- **Expected:** HTTP 201, comment appears in GET /tickets/:id response with `is_internal = 0`

### TC-TICK-010: Add Internal Note — Customer Forbidden
- **Auth:** Customer JWT
- **Input:** `{ body: "Note", isInternal: true }`
- **Expected:** HTTP 403

### TC-TICK-011: Assign Ticket
- **Auth:** Manager JWT
- **Input:** `{ assignedTo: 3, teamId: 1 }`
- **Expected:** HTTP 200, ticket `assigned_to = 3`, history shows assignment

### TC-TICK-012: Escalate Ticket
- **Input:** `{ reason: "Customer escalating", escalateTo: 2 }`
- **Expected:** HTTP 200, `status = "escalated"`, `is_escalated = 1`

### TC-TICK-013: Delete Ticket — Agent Forbidden
- **Auth:** Agent JWT
- **Expected:** HTTP 403

### TC-TICK-014: Delete Ticket — Manager/Admin Allowed
- **Auth:** Manager JWT  
- **Expected:** HTTP 204, subsequent GET returns 404

### TC-TICK-015: Search Tickets
- **Query:** `?search=login`
- **Expected:** Only tickets with "login" in subject/description/ticket_number

### TC-TICK-016: Filter Tickets by Status
- **Query:** `?status=open`
- **Expected:** All returned tickets have `status = "open"`

### TC-TICK-017: Ticket Number Uniqueness
- **Steps:** Create 3 tickets in rapid succession
- **Expected:** Each ticket has unique `ticket_number`

### TC-TICK-018: Pagination
- **Query:** `?page=1&limit=5`
- **Expected:** `meta.limit = 5`, `meta.page = 1`, `data.length <= 5`

### TC-TICK-019: CSAT Submission
- **Precondition:** Ticket in `resolved` status
- **Auth:** Customer JWT
- **Input:** `{ score: 5, comment: "Great!" }`
- **Expected:** HTTP 200, ticket `csat_score = 5`

### TC-TICK-020: CSAT on Non-Resolved Ticket
- **Precondition:** Ticket in `open` status
- **Expected:** HTTP 400, message includes "resolved or closed"

---

## MODULE 3: Customer Management

### TC-CUST-001: Create Customer — Success
- **Input:** `{ firstName: "Jane", lastName: "Doe", email: "jane@co.com" }`
- **Expected:** HTTP 201, `data.id` present

### TC-CUST-002: Create Customer — Duplicate Email
- **Input:** Same email as existing customer
- **Expected:** HTTP 409, `code: "CONFLICT"`

### TC-CUST-003: Customer Listing with Search
- **Query:** `?search=alice`
- **Expected:** Only customers with "alice" in name/email

---

## MODULE 4: SLA

### TC-SLA-001: Create SLA Policy
- **Auth:** Super Admin JWT
- **Input:** `{ name: "Test SLA", frtHours: 2, rtHours: 8, priority: "high" }`
- **Expected:** HTTP 201

### TC-SLA-002: Create SLA — Agent Forbidden
- **Auth:** Agent JWT
- **Expected:** HTTP 403

### TC-SLA-003: SLA Timer Created with Ticket
- **Precondition:** SLA policy exists for `high` priority
- **Steps:** Create `high` priority ticket
- **Expected:** `sla_timers` record exists for new ticket with correct deadlines

---

## MODULE 5: Edge Cases & Security

### TC-SEC-001: SQL Injection Attempt
- **Input:** `email: "admin@support.com'; DROP TABLE users; --"`
- **Expected:** HTTP 401 (query safely parameterized, no DB error)

### TC-SEC-002: XSS in Ticket Subject
- **Input:** `subject: "<script>alert('xss')</script>"`
- **Expected:** Input sanitized, script not executed, stored safely

### TC-SEC-003: IDOR — Customer Accessing Another Customer's Ticket
- **Auth:** Customer A JWT
- **Request:** GET /portal/tickets/:id where ticket belongs to Customer B
- **Expected:** HTTP 403 or 404

### TC-SEC-004: Large Payload Attack
- **Input:** JSON body > 10MB
- **Expected:** HTTP 413 (Payload Too Large)

### TC-SEC-005: Path Traversal in File Name
- **Input:** File upload with name `../../etc/passwd`
- **Expected:** File stored with sanitized UUID name, original ignored

### TC-SEC-006: Invalid JSON Body
- **Input:** Malformed JSON in request body
- **Expected:** HTTP 400 with parse error message

---

## Test Coverage Targets

| Layer | Target |
|-------|--------|
| Service layer (unit) | ≥ 85% |
| Repository layer (unit) | ≥ 75% |
| API endpoints (integration) | 100% happy path, ≥ 80% error paths |
| Frontend components (UI) | ≥ 70% |
| Auth flows | 100% (critical security paths) |

---

*Test Cases v1.0 — QA Lead*
