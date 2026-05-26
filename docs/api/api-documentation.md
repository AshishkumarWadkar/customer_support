# API Documentation
## Customer Support & Ticket Management Platform

**Version:** v1.0  
**Base URL:** `https://api.yourdomain.com/api/v1`  
**Authentication:** Bearer JWT Token  
**Content-Type:** `application/json`

---

## Standard Response Format

```json
// Success
{ "success": true, "message": "...", "data": {}, "meta": { "page": 1, "limit": 20, "total": 100 } }

// Error
{ "success": false, "message": "...", "errors": [{ "field": "email", "message": "..." }], "code": "ERROR_CODE" }
```

## HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## MODULE 1: Authentication

### POST /auth/login
**Description:** Authenticate user and receive JWT tokens  
**Auth:** None  
**Rate Limit:** 20 req/15min

**Request:**
```json
{ "email": "admin@support.com", "password": "Admin@1234", "mfaCode": "123456" }
```
**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "user": { "id": 1, "email": "admin@support.com", "role": "SUPER_ADMIN", "firstName": "System", "lastName": "Admin" }
  }
}
```
**Errors:** 401 (invalid credentials), 423 (account locked), 400 (MFA required)

---

### POST /auth/refresh
**Description:** Refresh access token using refresh token cookie  
**Auth:** Refresh token (HttpOnly cookie)

**Response 200:**
```json
{ "success": true, "data": { "accessToken": "eyJ..." } }
```

---

### POST /auth/logout
**Description:** Invalidate current session  
**Auth:** Bearer Token

---

### POST /auth/forgot-password
**Description:** Send password reset email  
**Auth:** None  
**Rate Limit:** 5 req/hour

**Request:** `{ "email": "user@example.com" }`  
**Response 200:** `{ "success": true, "message": "Reset link sent if email exists" }`

---

### POST /auth/reset-password
**Description:** Reset password with token  
**Auth:** None

**Request:** `{ "token": "abc123", "newPassword": "NewPass@1234", "confirmPassword": "NewPass@1234" }`

---

### PUT /auth/change-password
**Auth:** Bearer Token

**Request:** `{ "currentPassword": "Old@1234", "newPassword": "New@1234" }`

---

### POST /auth/mfa/setup
**Auth:** Bearer Token

**Response 200:**
```json
{ "success": true, "data": { "secret": "JBSWY3DP...", "qrCodeUrl": "data:image/png;base64,..." } }
```

---

### POST /auth/mfa/verify
**Auth:** Bearer Token

**Request:** `{ "code": "123456" }`

---

## MODULE 2: Users

### GET /users
**Auth:** Bearer (SUPER_ADMIN, MANAGER)  
**Query:** `?page=1&limit=20&role=AGENT&department=1&search=john`

**Response 200:**
```json
{
  "success": true,
  "data": [{ "id": 3, "firstName": "John", "lastName": "Agent", "email": "agent1@support.com", "role": "AGENT" }],
  "meta": { "page": 1, "limit": 20, "total": 45 }
}
```

---

### POST /users
**Auth:** Bearer (SUPER_ADMIN)

**Request:**
```json
{
  "firstName": "Jane", "lastName": "Doe", "email": "jane@support.com",
  "password": "Temp@1234", "roleId": 3, "departmentId": 1
}
```

---

### GET /users/:id
**Auth:** Bearer (own profile or SUPER_ADMIN/MANAGER)

---

### PUT /users/:id
**Auth:** Bearer (own profile or SUPER_ADMIN)

**Request:** `{ "firstName": "Jane", "phone": "+1234567890", "timezone": "America/New_York" }`

---

### DELETE /users/:id
**Auth:** Bearer (SUPER_ADMIN)  
*Soft delete — sets deleted_at*

---

### PUT /users/:id/lock
**Auth:** Bearer (SUPER_ADMIN)

**Request:** `{ "locked": true }` or `{ "locked": false }`

---

## MODULE 3: Tickets

### GET /tickets
**Auth:** Bearer (all roles — scoped by role)  
**Query:** `?page=1&limit=20&status=open&priority=high&assignedTo=3&search=login&sortBy=created_at&sortDir=desc&dateFrom=2026-01-01&dateTo=2026-12-31`

**Response 200:**
```json
{
  "success": true,
  "data": [{
    "id": 1, "ticketNumber": "TKT-20260526-00001",
    "subject": "Cannot login", "status": "open", "priority": "high",
    "customerName": "Alice Customer", "assignedTo": { "id": 3, "name": "John Agent" },
    "slaStatus": "on_track", "createdAt": "2026-05-26T10:00:00Z"
  }],
  "meta": { "page": 1, "limit": 20, "total": 150 }
}
```

---

### POST /tickets
**Auth:** Bearer (all roles)

**Request:**
```json
{
  "subject": "Cannot login to account",
  "description": "I keep getting an error when trying to login...",
  "priority": "high",
  "category": "Technical Issue",
  "channelId": 4,
  "customerId": 1,
  "attachments": []
}
```
**Response 201:**
```json
{ "success": true, "data": { "id": 10, "ticketNumber": "TKT-20260526-00010", ... } }
```

---

### GET /tickets/:id
**Auth:** Bearer (scoped — agent sees own/team tickets)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 1, "ticketNumber": "TKT-20260526-00001",
    "subject": "Cannot login", "description": "...", "status": "open",
    "priority": "high", "customer": { "id": 1, "name": "Alice", "email": "customer@example.com" },
    "assignedTo": { "id": 3, "name": "John Agent" },
    "slaTimer": { "rtDeadline": "2026-05-27T10:00:00Z", "status": "on_track", "remainingPercent": 75 },
    "comments": [], "attachments": [], "tags": [], "history": []
  }
}
```

---

### PUT /tickets/:id
**Auth:** Bearer (AGENT+)

**Request:** `{ "status": "in_progress", "priority": "medium", "assignedTo": 4 }`

---

### DELETE /tickets/:id
**Auth:** Bearer (SUPER_ADMIN, MANAGER)  
*Soft delete*

---

### POST /tickets/:id/comments
**Auth:** Bearer (all roles)

**Request:**
```json
{
  "body": "<p>Thank you for reaching out...</p>",
  "isInternal": false,
  "attachments": []
}
```
**Response 201:** `{ "success": true, "data": { "id": 5, "body": "...", ... } }`

---

### PUT /tickets/:id/assign
**Auth:** Bearer (AGENT+)

**Request:** `{ "assignedTo": 3, "teamId": 1 }`

---

### PUT /tickets/:id/escalate
**Auth:** Bearer (AGENT+)

**Request:** `{ "reason": "Customer is unhappy and requesting manager", "escalateTo": 2 }`

---

### POST /tickets/:id/tags
**Auth:** Bearer (AGENT+)

**Request:** `{ "tagIds": [1, 3] }`

---

### POST /tickets/:id/links
**Auth:** Bearer (AGENT+)

**Request:** `{ "linkedTicketId": 5, "linkType": "related" }`

---

### POST /tickets/merge
**Auth:** Bearer (MANAGER+)

**Request:** `{ "sourceTicketId": 3, "targetTicketId": 1, "reason": "Duplicate issue" }`

---

### GET /tickets/:id/history
**Auth:** Bearer (AGENT+)

---

### POST /tickets/:id/csat
**Auth:** Bearer (CUSTOMER)

**Request:** `{ "score": 5, "comment": "Great service!" }`

---

## MODULE 4: Customers

### GET /customers
**Auth:** Bearer (AGENT+)  
**Query:** `?page=1&limit=20&search=alice&organizationId=1`

---

### POST /customers
**Auth:** Bearer (AGENT+)

**Request:**
```json
{
  "firstName": "Alice", "lastName": "Johnson", "email": "alice@company.com",
  "phone": "+1234567890", "organizationId": 1, "timezone": "UTC"
}
```

---

### GET /customers/:id
**Auth:** Bearer (AGENT+)

**Response includes:** customer profile + all tickets + interaction history

---

### PUT /customers/:id
**Auth:** Bearer (AGENT+)

---

### DELETE /customers/:id
**Auth:** Bearer (MANAGER+)

---

### POST /customers/import
**Auth:** Bearer (SUPER_ADMIN)  
**Content-Type:** `multipart/form-data`

**Body:** `file` (CSV file)  
**Response 202:** `{ "success": true, "data": { "jobId": "import-123", "status": "processing" } }`

---

## MODULE 5: SLA Policies

### GET /sla/policies
**Auth:** Bearer (MANAGER+)

---

### POST /sla/policies
**Auth:** Bearer (SUPER_ADMIN)

**Request:**
```json
{
  "name": "Premium SLA", "priority": "all", "customerTier": "enterprise",
  "frtHours": 1, "rtHours": 4, "useBusinessHours": false,
  "businessHours": [
    { "dayOfWeek": 1, "startTime": "09:00", "endTime": "18:00" }
  ]
}
```

---

### GET /sla/policies/:id
**Auth:** Bearer (MANAGER+)

---

### PUT /sla/policies/:id
**Auth:** Bearer (SUPER_ADMIN)

---

### DELETE /sla/policies/:id
**Auth:** Bearer (SUPER_ADMIN)

---

### GET /sla/tickets/:ticketId/timer
**Auth:** Bearer (AGENT+)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "frtDeadline": "2026-05-26T12:00:00Z", "rtDeadline": "2026-05-27T10:00:00Z",
    "frtBreached": false, "rtBreached": false, "isPaused": false,
    "remainingFrtSeconds": 3600, "remainingRtSeconds": 86400
  }
}
```

---

## MODULE 6: Teams & Departments

### GET /teams
**Auth:** Bearer (MANAGER+)

---

### POST /teams
**Auth:** Bearer (MANAGER+)

**Request:** `{ "name": "Tier 1 Support", "departmentId": 1, "description": "..." }`

---

### POST /teams/:id/agents
**Auth:** Bearer (MANAGER+)

**Request:** `{ "agentIds": [3, 4], "isLead": false }`

---

### DELETE /teams/:id/agents/:agentId
**Auth:** Bearer (MANAGER+)

---

### GET /departments
**Auth:** Bearer (AGENT+)

---

### POST /departments
**Auth:** Bearer (SUPER_ADMIN)

---

### GET /agents/availability
**Auth:** Bearer (MANAGER+)

**Response 200:**
```json
{
  "success": true,
  "data": [{ "agentId": 3, "name": "John Agent", "status": "online", "openTickets": 5 }]
}
```

---

## MODULE 7: Knowledge Base

### GET /kb/articles
**Auth:** Bearer / Public  
**Query:** `?page=1&limit=20&categoryId=1&search=login&status=published&isPublic=true`

---

### POST /kb/articles
**Auth:** Bearer (AGENT+)

**Request:**
```json
{
  "categoryId": 1, "title": "How to Reset Password",
  "body": "<h2>Reset Password</h2><p>...</p>", "isPublic": true
}
```

---

### GET /kb/articles/:id
**Auth:** Bearer / Public (for published public articles)

---

### PUT /kb/articles/:id
**Auth:** Bearer (AGENT+ / owns article or MANAGER+)

---

### PUT /kb/articles/:id/publish
**Auth:** Bearer (MANAGER+)

---

### GET /kb/articles/:id/versions
**Auth:** Bearer (MANAGER+)

---

### GET /kb/categories
**Auth:** Bearer / Public

---

### POST /kb/categories
**Auth:** Bearer (SUPER_ADMIN, MANAGER)

---

## MODULE 8: Workflows

### GET /workflows
**Auth:** Bearer (SUPER_ADMIN)

---

### POST /workflows
**Auth:** Bearer (SUPER_ADMIN)

**Request:**
```json
{
  "name": "Auto-assign Critical Tickets",
  "triggerEvent": "ticket_created",
  "conditions": [
    { "field": "priority", "operator": "equals", "value": "critical", "logicGroup": 1 }
  ],
  "actions": [
    { "actionType": "assign_team", "actionValue": { "teamId": 2 }, "runOrder": 1 },
    { "actionType": "send_notification", "actionValue": { "type": "manager_alert" }, "runOrder": 2 }
  ]
}
```

---

### PUT /workflows/:id
**Auth:** Bearer (SUPER_ADMIN)

---

### DELETE /workflows/:id
**Auth:** Bearer (SUPER_ADMIN)

---

### GET /workflows/:id/logs
**Auth:** Bearer (SUPER_ADMIN)

---

### GET /canned-responses
**Auth:** Bearer (AGENT+)  
**Query:** `?search=reset&category=General`

---

### POST /canned-responses
**Auth:** Bearer (AGENT+)

---

## MODULE 9: Reports

### GET /reports/tickets
**Auth:** Bearer (MANAGER+)  
**Query:** `?dateFrom=2026-01-01&dateTo=2026-12-31&groupBy=status&agentId=3&teamId=1`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "summary": { "total": 500, "resolved": 420, "open": 80 },
    "byStatus": [{ "status": "resolved", "count": 420 }],
    "byPriority": [{ "priority": "high", "count": 120 }],
    "trend": [{ "date": "2026-05-01", "count": 25 }]
  }
}
```

---

### GET /reports/sla
**Auth:** Bearer (MANAGER+)  
**Query:** `?dateFrom=...&dateTo=...&policyId=1`

---

### GET /reports/agents
**Auth:** Bearer (MANAGER+)  
**Query:** `?dateFrom=...&dateTo=...&agentId=3`

---

### GET /reports/export
**Auth:** Bearer (MANAGER+)  
**Query:** `?reportType=tickets&format=csv&dateFrom=...&dateTo=...`

**Response:** File download (CSV or PDF)

---

## MODULE 10: Notifications

### GET /notifications
**Auth:** Bearer  
**Query:** `?page=1&limit=20&isRead=false`

---

### PUT /notifications/:id/read
**Auth:** Bearer

---

### PUT /notifications/read-all
**Auth:** Bearer

---

### GET /notifications/preferences
**Auth:** Bearer

---

### PUT /notifications/preferences
**Auth:** Bearer

**Request:**
```json
{
  "preferences": [
    { "eventType": "ticket_assigned", "inApp": true, "email": true, "sms": false }
  ]
}
```

---

## MODULE 11: Dashboard

### GET /dashboard/admin
**Auth:** Bearer (SUPER_ADMIN)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "totalTickets": 1500, "openTickets": 320, "resolvedToday": 45,
    "slaComplianceRate": 94.5, "avgResponseTime": 1.8,
    "ticketsByStatus": [...], "ticketsByPriority": [...],
    "channelDistribution": [...], "topAgents": [...]
  }
}
```

---

### GET /dashboard/manager
**Auth:** Bearer (MANAGER+)

---

### GET /dashboard/agent
**Auth:** Bearer (AGENT+)

---

## MODULE 12: Audit Logs

### GET /audit-logs
**Auth:** Bearer (SUPER_ADMIN)  
**Query:** `?page=1&limit=50&module=tickets&action=TICKET_UPDATED&userId=3&dateFrom=...&dateTo=...`

---

### GET /audit-logs/export
**Auth:** Bearer (SUPER_ADMIN)  
**Query:** `?format=csv&dateFrom=...&dateTo=...`

---

## MODULE 13: Settings

### GET /settings
**Auth:** Bearer (SUPER_ADMIN)  
**Query:** `?category=security`

---

### PUT /settings
**Auth:** Bearer (SUPER_ADMIN)

**Request:**
```json
{
  "settings": [
    { "category": "security", "keyName": "max_login_attempts", "value": "5" },
    { "category": "general", "keyName": "company_name", "value": "My Support Co" }
  ]
}
```

---

## MODULE 14: Customer Portal

### POST /portal/auth/login
**Auth:** None

### POST /portal/auth/register
**Auth:** None

**Request:** `{ "firstName": "Alice", "lastName": "Smith", "email": "alice@company.com", "password": "Secure@1234" }`

### GET /portal/tickets
**Auth:** Bearer (CUSTOMER only — own tickets)

### POST /portal/tickets
**Auth:** Bearer (CUSTOMER)

### GET /portal/tickets/:id
**Auth:** Bearer (CUSTOMER — own ticket only)

### POST /portal/tickets/:id/reply
**Auth:** Bearer (CUSTOMER)

### GET /portal/kb/articles
**Auth:** None (public articles only)

---

## File Upload Endpoints

### POST /tickets/:id/attachments
**Auth:** Bearer  
**Content-Type:** `multipart/form-data`  
**Body:** `files[]` (max 5 files, max 10MB each)

### GET /attachments/:id
**Auth:** Bearer  
**Response:** File download stream

---

*API Documentation v1.0 — Backend Architecture Team*
