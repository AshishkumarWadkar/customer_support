# Deployment Guide
## Customer Support & Ticket Management Platform

**Document Version:** 1.0  
**Date:** 2026-05-26

---

## Prerequisites

- Docker Engine 24+ and Docker Compose v2+
- Node.js 20 LTS (for local development)
- MySQL 8.0+ (local dev without Docker)
- Redis 7+ (local dev without Docker)
- Git

---

## Quick Start (Docker Compose)

```bash
# 1. Clone repository
git clone https://github.com/your-org/support-platform.git
cd support-platform

# 2. Configure environment
cp deployment/env-sample.md .env
# Edit .env with your values (see env-sample.md)

# 3. Start all services
docker compose -f deployment/docker-compose.yml up -d

# 4. Verify all services are running
docker compose -f deployment/docker-compose.yml ps

# 5. Access the application
# Frontend:  http://localhost:3000
# API:       http://localhost:5000/api/v1
# API Health: http://localhost:5000/health
```

---

## Environment Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_ACCESS_SECRET` | YES | Min 32 chars, random |
| `JWT_REFRESH_SECRET` | YES | Min 32 chars, different from access |
| `DB_PASSWORD` | YES | MySQL password |
| `REDIS_PASSWORD` | YES | Redis authentication |
| `SMTP_HOST` | YES (email features) | SMTP server |
| `SMTP_USER` | YES (email features) | SMTP username |
| `SMTP_PASSWORD` | YES (email features) | SMTP password |
| `FRONTEND_URL` | YES | Full URL of frontend (for CORS) |

---

## Local Development Setup

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env
npm install
npm run dev    # starts on http://localhost:5000

# Frontend (separate terminal)
cd frontend
cp .env.example .env  # set VITE_API_URL=http://localhost:5000/api/v1
npm install
npm run dev    # starts on http://localhost:3000

# Database
mysql -u root -p < database/schema.sql
mysql -u root -p support_db < database/seeds.sql
```

---

## Backend Dockerfile

```dockerfile
# /backend/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
RUN mkdir -p uploads logs
EXPOSE 5000
CMD ["node", "src/server.js"]
```

## Frontend Dockerfile

```dockerfile
# /frontend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## Production Deployment Checklist

- [ ] All environment variables set with production values
- [ ] `NODE_ENV=production` in backend
- [ ] JWT secrets are cryptographically random (min 32 bytes)
- [ ] SSL/TLS certificate configured in Nginx
- [ ] Database backup configured (daily minimum)
- [ ] Redis persistence enabled (`--appendonly yes`)
- [ ] Log rotation configured
- [ ] Monitoring/alerting configured (Datadog, New Relic, or Grafana)
- [ ] Health check endpoints verified
- [ ] CORS origin set to production frontend URL only
- [ ] Rate limiting configured appropriately for production traffic
- [ ] `npm audit` passes with no critical vulnerabilities
- [ ] Seeds NOT run in production (use migration scripts only)

---

## PM2 Configuration (non-Docker deployment)

```javascript
// /backend/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'support-backend',
    script: 'src/server.js',
    instances: 'max',          // One per CPU core
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    max_memory_restart: '512M',
    watch: false,
  }],
};
```

```bash
# Install PM2
npm install -g pm2

# Start
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit

# Auto-restart on server reboot
pm2 startup
pm2 save
```

---

## Database Backup

```bash
# Daily backup cron job
0 2 * * * mysqldump -u support_user -p$DB_PASSWORD support_db | gzip > /backups/support_$(date +\%Y\%m\%d).sql.gz

# Restore from backup
gunzip -c /backups/support_20260526.sql.gz | mysql -u support_user -p$DB_PASSWORD support_db
```

---

## Monitoring Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Basic health check (always returns 200 if running) |
| `GET /api/v1/health` | API health with DB/Redis connectivity status |

---

*Deployment Guide v1.0 — DevOps Team*
