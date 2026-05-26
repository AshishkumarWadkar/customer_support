# System Architecture
## Customer Support & Ticket Management Platform

**Document Version:** 1.0  
**Date:** 2026-05-26

---

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                   │
│                                                                        │
│  ┌──────────────────────┐        ┌──────────────────────────────┐    │
│  │   Agent / Admin       │        │      Customer Portal          │    │
│  │   React SPA           │        │      React SPA (subset)       │    │
│  │   (Tailwind CSS)      │        │      (/portal route)          │    │
│  └──────────┬───────────┘        └─────────────┬────────────────┘    │
└─────────────┼──────────────────────────────────┼────────────────────┘
              │ HTTPS / WSS                        │ HTTPS
              ▼                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY / NGINX                           │
│              (Reverse proxy, SSL termination, static files)           │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
┌─────────────────────┐    ┌─────────────────────────┐
│   REST API Server   │    │   WebSocket Server       │
│   Node.js/Express   │    │   Socket.IO              │
│   Port 5000         │    │   (Attached to Express)  │
│                     │    │   Real-time events       │
│   MVC + Service     │    └─────────────────────────┘
│   Repository Layer  │
└─────────┬───────────┘
          │
    ┌─────┴──────────────────────────────────┐
    │                                          │
    ▼                                          ▼
┌──────────────┐                     ┌───────────────┐
│   MySQL 8.0  │                     │   Redis        │
│   Primary DB │                     │   Cache +      │
│   (Port 3306)│                     │   Sessions +   │
└──────────────┘                     │   Rate Limit + │
                                     │   WS Adapter   │
                                     └───────────────┘
          │
    ┌─────┴─────────────────────────────────┐
    │              External Services          │
    ├──────────────────────────────────────  │
    │  SMTP (Email)     │  Twilio (SMS)       │
    │  WhatsApp API     │  Firebase (Push)    │
    │  CRM Webhooks     │  File Storage       │
    └─────────────────────────────────────── ┘
```

---

## 2. Architecture Pattern

**Pattern: Modular Monolith (Monorepo)**

**Rationale:**
- Single deployable unit for v1 simplicity
- Clear module boundaries enabling future microservice extraction
- Shared database (MySQL) with logical separation by module
- Fits within the team size and budget for v1

**Future Migration Path:**
- Ticket Service → independent microservice (high load)
- Notification Service → independent microservice (async queues)
- Analytics Service → read replica + dedicated service

---

## 3. Component Architecture

### 3.1 Backend Components

```
Express Application
│
├── Middlewares (executed in order for each request)
│   ├── cors()               — CORS headers
│   ├── helmet()             — Security headers
│   ├── rateLimit()          — Request rate limiting
│   ├── express.json()       — JSON body parsing
│   ├── sanitize()           — Input sanitization (xss-clean)
│   ├── requestLogger()      — Winston request logging
│   ├── authenticate()       — JWT verification
│   ├── authorize(roles)     — RBAC role check
│   └── validateSchema()     — Joi/Yup payload validation
│
├── Routes (/api/v1/...)
│   ├── AuthRouter           → AuthController
│   ├── TicketRouter         → TicketController
│   ├── CustomerRouter       → CustomerController
│   ├── SLARouter            → SLAController
│   ├── WorkflowRouter       → WorkflowController
│   ├── KnowledgeBaseRouter  → KBController
│   ├── ReportRouter         → ReportController
│   ├── NotificationRouter   → NotificationController
│   ├── TeamRouter           → TeamController
│   ├── AuditRouter          → AuditController
│   └── SettingsRouter       → SettingsController
│
├── Controllers (HTTP layer — no business logic)
│   └── Delegates to Services
│
├── Services (Business logic layer)
│   └── Delegates to Repositories
│
├── Repositories (Data access layer)
│   └── MySQL queries via mysql2 connection pool
│
└── Utils / Helpers
    ├── JWT utility
    ├── Email utility (Nodemailer)
    ├── SLA calculator
    ├── Audit logger
    ├── Response formatter
    └── Pagination helper
```

### 3.2 Frontend Components

```
React Application
│
├── App.jsx              — Root, Router provider
├── routes/              — Route definitions + guards
│   ├── PrivateRoute.jsx — JWT check
│   └── RoleRoute.jsx    — Role check
│
├── layouts/
│   ├── AppLayout.jsx    — Sidebar + Header for agents/admin
│   ├── AuthLayout.jsx   — Centered layout for login/register
│   └── PortalLayout.jsx — Customer portal layout
│
├── context/
│   ├── AuthContext.jsx  — User state, login/logout
│   └── NotifContext.jsx — Notification state + WS
│
├── pages/               — One folder per module
│   ├── auth/
│   ├── dashboard/
│   ├── tickets/
│   ├── customers/
│   ├── sla/
│   ├── workflows/
│   ├── knowledge-base/
│   ├── reports/
│   ├── notifications/
│   ├── teams/
│   ├── audit-logs/
│   ├── settings/
│   └── portal/
│
├── components/          — Reusable UI atoms/molecules
└── api/                 — Axios service functions per module
```

---

## 4. Data Flow Architecture

### 4.1 Ticket Creation Flow
```
Customer/Agent → POST /api/v1/tickets
  → AuthMiddleware (verify JWT)
  → ValidateSchema (Yup)
  → TicketController.create()
    → TicketService.createTicket()
      → SLAService.assignPolicy()       [find matching SLA]
      → WorkflowService.evaluate()      [run matching rules]
      → TicketRepository.insert()       [save to MySQL]
      → NotificationService.dispatch()  [email + in-app]
      → AuditService.log()              [audit trail]
      → WebSocketService.broadcast()    [real-time update]
  ← 201 Created { ticket }
```

### 4.2 Authentication Flow
```
POST /api/v1/auth/login { email, password }
  → AuthController.login()
    → AuthService.validateCredentials()   [bcrypt compare]
    → AuthService.checkAccountLock()      [failed attempts check]
    → AuthService.checkMFA()              [TOTP if enabled]
    → JWTUtil.generateTokenPair()         [access + refresh tokens]
    → RedisService.storeRefreshToken()    [store in Redis]
    → AuditService.log(LOGIN_SUCCESS)
  ← 200 { accessToken, refreshToken, user }
```

---

## 5. Communication Protocols

| Protocol | Use Case | Technology |
|----------|---------|-----------|
| HTTPS REST | All CRUD operations | Express.js + Axios |
| WebSocket (WSS) | Real-time notifications, live updates | Socket.IO |
| SMTP | Outbound email | Nodemailer |
| IMAP | Inbound email (email-to-ticket) | imap-simple |
| Webhook | External integrations | Express webhook handlers |

---

## 6. Deployment Architecture

```
Production Environment

  ┌─────────────────────────────────────────┐
  │            Load Balancer (Nginx)         │
  │            + SSL Termination             │
  └──────────────┬──────────────────────────┘
                 │
    ┌────────────┴──────────────┐
    │                           │
    ▼                           ▼
┌──────────┐              ┌──────────┐
│ Backend  │              │ Backend  │
│ Node.js  │              │ Node.js  │
│ Instance1│              │ Instance2│
│ PM2      │              │ PM2      │
└────┬─────┘              └────┬─────┘
     │                         │
     └──────────┬──────────────┘
                │
     ┌──────────┴─────────────┐
     │                         │
     ▼                         ▼
┌──────────┐           ┌───────────┐
│  MySQL   │           │   Redis   │
│ Primary  │           │  Cluster  │
│ + Replica│           │           │
└──────────┘           └───────────┘

  Frontend served as static files via Nginx
```

---

## 7. Naming Conventions

### Backend
| Item | Convention | Example |
|------|-----------|---------|
| Files | camelCase | `ticketService.js` |
| Classes | PascalCase | `TicketService` |
| Variables | camelCase | `ticketId` |
| Constants | UPPER_SNAKE | `MAX_ATTACHMENT_SIZE` |
| Routes | kebab-case | `/api/v1/ticket-comments` |
| DB columns | snake_case | `created_at` |
| Env vars | UPPER_SNAKE | `JWT_SECRET` |

### Frontend
| Item | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `TicketList.jsx` |
| Hooks | camelCase with use prefix | `useTickets.js` |
| Context | PascalCase + Context | `AuthContext.jsx` |
| API files | camelCase | `ticketApi.js` |
| CSS classes | Tailwind utilities | `flex items-center` |
| Constants | UPPER_SNAKE | `TICKET_STATUS` |

---

## 8. Error Handling Strategy

```
Error Hierarchy:
  AppError (base)
  ├── ValidationError   (400)
  ├── AuthError         (401)
  ├── ForbiddenError    (403)
  ├── NotFoundError     (404)
  ├── ConflictError     (409)
  ├── RateLimitError    (429)
  └── InternalError     (500)

Centralized error handler in Express catches all thrown errors.
Validation errors include field-level details.
Production mode: no stack traces to client.
All errors logged with request ID for traceability.
```

---

## 9. Logging Strategy

| Level | Usage |
|-------|-------|
| ERROR | Unhandled exceptions, DB failures, critical failures |
| WARN | Deprecated usage, failed validations, retry attempts |
| INFO | Request/response, auth events, significant state changes |
| DEBUG | Detailed execution flow (dev only) |

- Winston logger with daily rotating file transport
- Separate log files: `error.log`, `combined.log`, `audit.log`
- JSON format for machine parsing
- Request correlation ID on every log entry

---

*System Architecture v1.0 — Solution Architecture Team*
