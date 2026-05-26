# Security Implementation Guide
## Customer Support & Ticket Management Platform

**Document Version:** 1.0  
**Date:** 2026-05-26

---

## 1. Authentication Security

### 1.1 JWT Implementation
```javascript
// Access token — 1 hour expiry, signed with HS256
const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

// Refresh token — 7 day expiry, stored in HttpOnly cookie only
const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

// Cookie settings for refresh token
res.cookie('refreshToken', token, {
  httpOnly: true,          // Not accessible via JavaScript
  secure: true,            // HTTPS only
  sameSite: 'strict',      // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000
});
```

### 1.2 Password Hashing
```javascript
// bcryptjs with cost factor 12 (recommended minimum for 2026)
const passwordHash = await bcrypt.hash(password, 12);
```

### 1.3 Account Lockout Implementation
```javascript
// Track failed attempts per user in DB
// Lock after 5 failures for 30 minutes
if (user.failed_login_attempts >= 5) {
  const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
  await userRepo.lockAccount(user.id, lockUntil);
}
```

---

## 2. Input Validation & Sanitization

### 2.1 Request Sanitization Middleware Chain
```javascript
app.use(xssClean());            // Strip <script> and XSS payloads from all inputs
app.use(mongoSanitize());       // Remove $ and . from keys (NoSQL injection prevention)
app.use(express.json({ limit: '10mb' }));  // Body size limit
```

### 2.2 Joi Validation (all endpoints)
- Every route uses a Joi schema matching the expected payload
- Validation runs in middleware BEFORE the controller
- On failure: returns 400 with field-level error messages
- Unknown fields are stripped (`.unknown(false)`)

### 2.3 SQL Injection Prevention
```javascript
// ALWAYS use parameterized queries — NEVER string interpolation
const [rows] = await pool.execute(
  'SELECT * FROM tickets WHERE id = ? AND assigned_to = ? AND deleted_at IS NULL',
  [ticketId, userId]   // Parameters are properly escaped by mysql2
);
```

---

## 3. API Security Headers (Helmet)

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // Tailwind requires unsafe-inline
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  noSniff: true,       // X-Content-Type-Options: nosniff
  frameguard: { action: 'deny' },  // X-Frame-Options: DENY
  xssFilter: true,
}));
```

**Headers set by Helmet:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy: ...`
- `Referrer-Policy: no-referrer`
- `X-DNS-Prefetch-Control: off`

---

## 4. CORS Configuration

```javascript
app.use(cors({
  origin: [process.env.FRONTEND_URL],  // Only allow configured frontend URL
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,   // Required for cookie-based refresh tokens
  maxAge: 86400,        // OPTIONS preflight cache: 24 hours
}));
```

---

## 5. Rate Limiting Implementation

```javascript
// Global limit (all endpoints)
rateLimit({ windowMs: 15 * 60 * 1000, max: 500 })

// Auth endpoints — tight limit
rateLimit({ windowMs: 15 * 60 * 1000, max: 20 })
// Applied to: POST /auth/login

// Password reset — very tight
rateLimit({ windowMs: 60 * 60 * 1000, max: 5 })
// Applied to: POST /auth/forgot-password

// Uses Redis store for distributed rate limiting across instances
```

---

## 6. RBAC Implementation

### Role Hierarchy
```
SUPER_ADMIN (4) > MANAGER (3) > AGENT (2) > CUSTOMER (1)
```

### Middleware
```javascript
// Route-level: check role
router.get('/tickets', authenticate, authorize(['SUPER_ADMIN', 'MANAGER', 'AGENT']), ...)

// Service-level: check object ownership
if (user.role === 'AGENT' && ticket.assigned_to !== user.id) {
  throw new ForbiddenError('Access denied to this ticket');
}
```

### Principles
- Server-side role enforcement only (never trust client-sent roles)
- Least privilege: default to most restrictive access
- Object-level authorization on every sensitive data access
- Role cannot be set by user registration API

---

## 7. Sensitive Data Protection

### In Transit
- HTTPS enforced via HSTS header (min 1 year)
- TLS 1.2+ only (Nginx configuration)
- Certificate auto-renewal via Let's Encrypt

### At Rest
- Passwords: bcrypt hash (irreversible)
- TOTP secrets: AES-256 encrypted in `mfa_settings.totp_secret`
- API keys: Stored encrypted in `settings` table
- DB credentials: Environment variables only, never in code

### In Logs
- Log sanitization middleware strips passwords and tokens
- Emails logged as `u***@domain.com` pattern in access logs
- Request bodies not logged (only metadata: method, path, status)

---

## 8. File Upload Security

```javascript
// Multer configuration
const upload = multer({
  storage: multer.diskStorage({
    destination: process.env.UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },  // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|pdf|doc|docx|xlsx|txt|zip)$/i;
    if (!allowed.test(path.extname(file.originalname))) {
      return cb(new ValidationError('File type not allowed'));
    }
    // Verify MIME type (not just extension)
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', ...];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new ValidationError('Invalid file type'));
    }
    cb(null, true);
  },
});
```

**Security measures:**
- Files stored outside web root (not directly accessible via URL)
- Randomized filenames (UUID-based, no original filename in storage)
- MIME type validation (not just extension)
- File serving only via authenticated `/attachments/:id` endpoint
- Max size: 10MB per file, max 5 files per request

---

## 9. Security Audit Checklist

| Control | Status | Implementation |
|---------|--------|---------------|
| Parameterized queries | ✅ | mysql2 `execute()` everywhere |
| Password hashing | ✅ | bcrypt cost 12 |
| JWT short expiry | ✅ | 1h access, 7d refresh |
| HttpOnly refresh token | ✅ | Cookie configuration |
| Account lockout | ✅ | 5 failures → 30min lock |
| Rate limiting | ✅ | express-rate-limit + Redis |
| XSS prevention | ✅ | xss-clean + CSP header |
| CSRF protection | ✅ | SameSite=strict cookie |
| Security headers | ✅ | Helmet |
| CORS whitelist | ✅ | Specific origin only |
| Input validation | ✅ | Joi schemas on all routes |
| RBAC enforcement | ✅ | Server-side always |
| Object-level auth | ✅ | In service layer |
| Sensitive data masking | ✅ | Logger sanitization |
| File type validation | ✅ | Extension + MIME check |
| Dependency scanning | 🔄 | npm audit in CI |
| Secret scanning | 🔄 | Git pre-commit hook |

---

## 10. Environment Security Requirements

```bash
# Minimum entropy requirements
JWT_ACCESS_SECRET    → min 32 random bytes (256-bit)
JWT_REFRESH_SECRET   → min 32 random bytes (256-bit, different from access)
DB_PASSWORD          → min 20 characters, alphanumeric + special
SMTP_PASSWORD        → app-specific password (not account password)

# Never commit to version control
.env files → always in .gitignore
# Never log
All environment variable values → excluded from all logs
```

---

*Security Implementation v1.0 — Security Lead*
