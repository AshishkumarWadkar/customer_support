# Backend Architecture
## Customer Support & Ticket Management Platform

**Document Version:** 1.0  
**Date:** 2026-05-26

---

## 1. Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 20 LTS |
| Framework | Express.js | 4.x |
| Database | MySQL | 8.0+ |
| ORM/Driver | mysql2 | 3.x |
| Cache | Redis (ioredis) | 7.x |
| Authentication | jsonwebtoken | 9.x |
| Password Hashing | bcryptjs | 2.x |
| Validation | Joi | 17.x |
| Email | Nodemailer | 6.x |
| Real-time | Socket.IO | 4.x |
| Logging | Winston | 3.x |
| Documentation | Swagger (swagger-jsdoc + swagger-ui-express) | 6.x |
| Security | Helmet, cors, express-rate-limit, xss-clean | latest |
| Testing | Jest + Supertest | latest |
| Process Manager | PM2 | latest |

---

## 2. Folder Structure

```
backend/
├── src/
│   ├── app.js                  # Express app initialization
│   ├── server.js               # HTTP server + Socket.IO bootstrap
│   │
│   ├── config/
│   │   ├── database.js         # MySQL connection pool
│   │   ├── redis.js            # Redis client
│   │   ├── jwt.js              # JWT config constants
│   │   ├── email.js            # Nodemailer transporter
│   │   ├── socket.js           # Socket.IO server setup
│   │   └── swagger.js          # Swagger configuration
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── ticketController.js
│   │   ├── customerController.js
│   │   ├── slaController.js
│   │   ├── workflowController.js
│   │   ├── knowledgeBaseController.js
│   │   ├── reportController.js
│   │   ├── notificationController.js
│   │   ├── teamController.js
│   │   ├── auditController.js
│   │   ├── dashboardController.js
│   │   └── settingsController.js
│   │
│   ├── services/
│   │   ├── authService.js
│   │   ├── ticketService.js
│   │   ├── customerService.js
│   │   ├── slaService.js
│   │   ├── workflowService.js
│   │   ├── knowledgeBaseService.js
│   │   ├── reportService.js
│   │   ├── notificationService.js
│   │   ├── emailService.js
│   │   ├── teamService.js
│   │   ├── auditService.js
│   │   ├── dashboardService.js
│   │   └── settingsService.js
│   │
│   ├── repositories/
│   │   ├── userRepository.js
│   │   ├── ticketRepository.js
│   │   ├── customerRepository.js
│   │   ├── slaRepository.js
│   │   ├── workflowRepository.js
│   │   ├── knowledgeBaseRepository.js
│   │   ├── notificationRepository.js
│   │   ├── teamRepository.js
│   │   ├── auditRepository.js
│   │   └── settingsRepository.js
│   │
│   ├── routes/
│   │   ├── index.js            # Route aggregator
│   │   ├── authRoutes.js
│   │   ├── ticketRoutes.js
│   │   ├── customerRoutes.js
│   │   ├── slaRoutes.js
│   │   ├── workflowRoutes.js
│   │   ├── knowledgeBaseRoutes.js
│   │   ├── reportRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── teamRoutes.js
│   │   ├── auditRoutes.js
│   │   ├── dashboardRoutes.js
│   │   └── settingsRoutes.js
│   │
│   ├── middlewares/
│   │   ├── authMiddleware.js   # JWT verification
│   │   ├── rbacMiddleware.js   # Role-based access control
│   │   ├── validationMiddleware.js  # Joi schema validation
│   │   ├── errorMiddleware.js  # Centralized error handler
│   │   ├── loggerMiddleware.js # Request/response logging
│   │   ├── rateLimitMiddleware.js   # Per-route rate limiting
│   │   ├── uploadMiddleware.js      # Multer file upload
│   │   └── auditMiddleware.js       # Auto-audit trail
│   │
│   ├── validations/
│   │   ├── authValidations.js
│   │   ├── ticketValidations.js
│   │   ├── customerValidations.js
│   │   ├── slaValidations.js
│   │   ├── workflowValidations.js
│   │   ├── knowledgeBaseValidations.js
│   │   └── teamValidations.js
│   │
│   ├── utils/
│   │   ├── jwtUtils.js         # Token generation/verification
│   │   ├── responseUtils.js    # Standardized API response
│   │   ├── paginationUtils.js  # Offset/limit helpers
│   │   ├── hashUtils.js        # bcrypt wrappers
│   │   ├── dateUtils.js        # Business hour calculations
│   │   └── fileUtils.js        # File handling utilities
│   │
│   ├── helpers/
│   │   ├── slaCalculator.js    # SLA timer business logic
│   │   ├── auditLogger.js      # Structured audit log writer
│   │   ├── notificationDispatcher.js  # Multi-channel notification
│   │   ├── workflowEngine.js   # Rule evaluation engine
│   │   └── ticketNumberGenerator.js  # Auto ticket ID generation
│   │
│   ├── constants/
│   │   ├── roles.js            # SUPER_ADMIN, MANAGER, AGENT, CUSTOMER
│   │   ├── ticketStatus.js     # NEW, OPEN, IN_PROGRESS, etc.
│   │   ├── ticketPriority.js   # CRITICAL, HIGH, MEDIUM, LOW
│   │   ├── notificationTypes.js
│   │   ├── auditEvents.js
│   │   └── httpStatus.js       # HTTP status code constants
│   │
│   └── database/
│       ├── connection.js       # mysql2 createPool
│       └── migrations/         # SQL migration files
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── logs/                       # Winston log files (gitignored)
├── uploads/                    # File attachments (gitignored)
├── .env
├── .env.example
├── package.json
└── ecosystem.config.js         # PM2 config
```

---

## 3. Request Lifecycle

```
HTTP Request
    │
    ▼
[CORS Middleware]          — Allow/deny origin
    │
    ▼
[Helmet Middleware]        — Set security headers
    │
    ▼
[Rate Limiter]             — Redis-backed token bucket
    │
    ▼
[Body Parser]              — JSON + multipart (Multer)
    │
    ▼
[XSS Sanitizer]            — Strip malicious payloads
    │
    ▼
[Request Logger]           — Log method, path, IP, timestamp
    │
    ▼
[Route Matching]           — Express router
    │
    ▼
[Auth Middleware]          — Verify JWT, attach req.user
    │
    ▼
[RBAC Middleware]          — Check role permissions
    │
    ▼
[Validation Middleware]    — Validate body/params/query
    │
    ▼
[Controller]               — Extract params, call service
    │
    ▼
[Service Layer]            — Business logic, orchestration
    │
    ▼
[Repository Layer]         — Database queries (mysql2)
    │
    ▼
[Response Formatter]       — Standardized JSON response
    │
    ▼
HTTP Response
    │
    ▼ (on error anywhere above)
[Error Middleware]         — Catch, format, log error
```

---

## 4. Standardized API Response Format

```json
// Success
{
  "success": true,
  "message": "Ticket created successfully",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}

// Error
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Must be a valid email" }
  ],
  "code": "VALIDATION_ERROR"
}
```

---

## 5. RBAC Implementation

```javascript
// Middleware usage
router.get('/tickets', authenticate, authorize(['SUPER_ADMIN', 'MANAGER', 'AGENT']), ticketController.list);

// authorize middleware
const authorize = (allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }
  next();
};

// Object-level authorization in services
// e.g., Agent can only see their own tickets
if (req.user.role === 'AGENT' && ticket.assignedTo !== req.user.id) {
  throw new ForbiddenError('Access denied');
}
```

---

## 6. Database Connection Strategy

```javascript
// mysql2 connection pool (not single connection)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z'  // Always UTC
});

// All queries use parameterized statements
const [rows] = await pool.execute(
  'SELECT * FROM tickets WHERE id = ? AND deleted_at IS NULL',
  [ticketId]
);
```

---

## 7. Environment Configuration

```env
# Server
NODE_ENV=production
PORT=5000
API_BASE_URL=https://api.yourdomain.com

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=support_db
DB_USER=support_user
DB_PASSWORD=

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=support@yourdomain.com

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Frontend URL
FRONTEND_URL=https://app.yourdomain.com
```

---

*Backend Architecture v1.0 — Solution Architecture Team*
