# Security Guidelines
## Customer Support & Ticket Management Platform

**Document Version:** 1.0  
**Date:** 2026-05-26

---

## 1. Authentication Security

### 1.1 JWT Implementation
- Access tokens expire in **1 hour**
- Refresh tokens expire in **7 days**, stored in Redis with rotation
- Tokens signed with HS256; secret minimum 32 chars from env
- Never store access tokens in cookies (XSS risk); use memory / localStorage with XSS mitigations
- Refresh tokens stored in HttpOnly, Secure, SameSite=Strict cookies

### 1.2 Password Security
- All passwords hashed with `bcryptjs`, cost factor 12
- Minimum complexity: 8+ chars, upper, lower, number, special
- Password history: last 5 hashes checked on change
- Password expiry: 90 days (configurable)

### 1.3 Account Lockout
- 5 consecutive failures → account locked for 30 minutes
- Failed attempts tracked in Redis with TTL
- Admin can manually unlock accounts

---

## 2. API Security

### 2.1 Rate Limiting
```javascript
// Global limit
rateLimit({ windowMs: 15 * 60 * 1000, max: 500 })

// Auth endpoints
rateLimit({ windowMs: 15 * 60 * 1000, max: 20 })

// Password reset
rateLimit({ windowMs: 60 * 60 * 1000, max: 5 })
```

### 2.2 Request Sanitization
- `xss-clean` middleware strips XSS from all request bodies
- `express-mongo-sanitize` removes `$` and `.` from keys
- Helmet sets: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Strict-Transport-Security`, `Content-Security-Policy`

### 2.3 CORS Configuration
```javascript
cors({
  origin: [process.env.FRONTEND_URL],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
})
```

---

## 3. Database Security

- All queries use parameterized statements (mysql2 `execute()`)
- DB user has minimal required privileges (no SUPER, no FILE)
- Database password minimum 20 chars, rotated quarterly
- Separate read-only DB user for reporting queries
- `deleted_at` soft deletes prevent accidental data exposure

---

## 4. File Upload Security

- Allowed types: `.jpg`, `.jpeg`, `.png`, `.gif`, `.pdf`, `.doc`, `.docx`, `.xlsx`, `.txt`, `.zip`
- File type validated by MIME type (not just extension)
- Max file size: 10MB per file
- Files stored outside web root (no direct URL access)
- Uploaded filenames sanitized and randomized (UUID-based)
- ClamAV virus scan integration (Phase 2)

---

## 5. OWASP Top 10 Compliance

| OWASP Risk | Mitigation |
|-----------|-----------|
| A01 Broken Access Control | RBAC on every endpoint, object-level auth checks |
| A02 Cryptographic Failures | bcrypt for passwords, HTTPS only, secure JWT secret |
| A03 Injection | Parameterized queries, input validation via Joi |
| A04 Insecure Design | Threat modeling, principle of least privilege |
| A05 Security Misconfiguration | Helmet, CSP headers, no default credentials |
| A06 Vulnerable Components | npm audit in CI, Dependabot alerts |
| A07 Auth Failures | Account lockout, JWT short expiry, MFA support |
| A08 Software Integrity | Lockfile committed, no `--no-verify` deploys |
| A09 Logging Failures | Winston audit logs, request correlation IDs |
| A10 SSRF | Whitelist for outbound webhook URLs |

---

## 6. Sensitive Data Handling

- No PII logged in access logs (email masked to `u***@domain.com`)
- API responses never include password hashes
- Environment variables for all secrets (no hardcoding)
- `.env` files in `.gitignore`
- Secrets scanning via git hooks (detect-secrets)

---

## 7. Security Headers

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

*Security Guidelines v1.0 — Solution Architecture Team*
