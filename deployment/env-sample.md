# Environment Variables Reference
## Customer Support & Ticket Management Platform

Copy this to `.env` at the project root (or `/backend/.env` for backend-only deployment).

```env
# ── Server ───────────────────────────────────────────────────────────
NODE_ENV=production
PORT=5000
API_BASE_URL=https://api.yourdomain.com

# ── Database ─────────────────────────────────────────────────────────
DB_HOST=localhost
DB_PORT=3306
DB_NAME=support_db
DB_USER=support_user
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE

# ── Redis ────────────────────────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD

# ── Docker MySQL (for docker-compose) ────────────────────────────────
MYSQL_ROOT_PASSWORD=CHANGE_ME_ROOT_PASSWORD

# ── JWT ──────────────────────────────────────────────────────────────
# IMPORTANT: Generate with: openssl rand -base64 48
JWT_ACCESS_SECRET=GENERATE_32_PLUS_CHAR_RANDOM_STRING_HERE
JWT_REFRESH_SECRET=GENERATE_DIFFERENT_32_PLUS_CHAR_RANDOM_STRING_HERE
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# ── Email (SMTP) ─────────────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password_here
EMAIL_FROM_NAME=Support Team
EMAIL_FROM_ADDRESS=support@yourdomain.com

# ── Frontend ─────────────────────────────────────────────────────────
FRONTEND_URL=https://app.yourdomain.com
VITE_API_URL=https://api.yourdomain.com/api/v1

# ── Rate Limiting ────────────────────────────────────────────────────
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=500

# ── File Upload ──────────────────────────────────────────────────────
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10
MAX_FILES_PER_REQUEST=5

# ── Logging ──────────────────────────────────────────────────────────
LOG_LEVEL=info
LOG_DIR=./logs
```

## Secret Generation Commands

```bash
# Generate JWT secrets (Linux/Mac)
openssl rand -base64 48

# Generate JWT secrets (Windows PowerShell)
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))

# Generate strong passwords
openssl rand -alphanumeric 24
```

## Security Notes

1. **NEVER commit `.env` files to version control**
2. JWT secrets must be different from each other
3. JWT secrets must be at least 32 characters (256-bit entropy)
4. Use app-specific passwords for Gmail SMTP (not your account password)
5. Rotate all secrets every 90 days in production
6. Store production secrets in a vault (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)
