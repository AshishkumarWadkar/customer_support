# Setup Guide
## Customer Support & Ticket Management Platform

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20 LTS | Required for local development |
| npm | 10+ | Bundled with Node.js |
| MySQL | 8.0+ | Or use Docker |
| Redis | 7+ | Or use Docker |
| Git | 2.x | |
| Docker | 24+ | Optional, for containerized setup |

---

## Option A: Docker Setup (Recommended)

```bash
# 1. Configure environment
cp deployment/env-sample.md .env
# Fill in required values (JWT secrets, DB passwords)

# 2. Start all services (DB + Redis + Backend + Frontend)
docker compose -f deployment/docker-compose.yml up -d

# 3. Wait for DB to initialize (~30 seconds)
docker compose -f deployment/docker-compose.yml logs mysql

# 4. Verify
curl http://localhost:5000/health
# Should return: {"status":"ok",...}

# 5. Open browser
# App:  http://localhost:3000
# API:  http://localhost:5000/api/v1
```

---

## Option B: Manual Local Setup

### Step 1: Database Setup
```bash
# Create database and user
mysql -u root -p

CREATE DATABASE support_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'support_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON support_db.* TO 'support_user'@'localhost';
FLUSH PRIVILEGES;

# Run schema and seeds
USE support_db;
SOURCE ./database/schema.sql;
SOURCE ./database/seeds.sql;
```

### Step 2: Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DB credentials, JWT secrets, SMTP settings

# Start development server
npm run dev

# Verify
curl http://localhost:5000/health
```

### Step 3: Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure
echo "VITE_API_URL=http://localhost:5000/api/v1" > .env

# Start development server
npm run dev

# Browser: http://localhost:5173
```

---

## Verify Installation

### 1. API Health Check
```bash
curl http://localhost:5000/health
# Expected: {"status":"ok","timestamp":"...","env":"development"}
```

### 2. Login Test
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@support.com","password":"Admin@1234"}'
# Expected: {"success":true,"data":{"accessToken":"eyJ..."}}
```

### 3. Frontend
- Open http://localhost:3000 (Docker) or http://localhost:5173 (Vite dev)
- Login with `admin@support.com` / `Admin@1234`
- Dashboard should load

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| DB connection failed | Check DB_HOST, DB_USER, DB_PASSWORD in .env |
| JWT errors | Ensure JWT_ACCESS_SECRET is set (min 32 chars) |
| CORS errors | Ensure FRONTEND_URL matches your frontend URL exactly |
| Port in use | Change PORT in .env or stop conflicting process |
| Redis connection failed | Start Redis: `redis-server` or `docker run -d -p 6379:6379 redis` |

---

*Setup Guide v1.0 — DevOps Team*
