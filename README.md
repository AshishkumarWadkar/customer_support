# Customer Support & Ticket Management Platform

A full-stack, enterprise-grade customer support and ticket management system built with React.js, Node.js, Express.js, and MySQL.

---

## Features

- **Multi-role access control** — Super Admin, Manager, Agent, Customer
- **Ticket lifecycle management** — Create, assign, escalate, resolve, close
- **SLA management** — Configurable policies with business hours and breach alerts
- **Customer portal** — Self-service ticket creation and tracking
- **Knowledge base** — Articles with approval workflow and versioning
- **Workflow automation** — Rule-based auto-assignment and actions
- **Real-time notifications** — In-app, email, and WebSocket updates
- **Reporting & analytics** — Ticket, SLA, agent, and CSAT reports
- **Omnichannel support** — Email, chat, WhatsApp, portal
- **Audit logging** — Full activity trail

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Tailwind CSS, Redux Toolkit |
| Backend | Node.js 20, Express.js 4, JWT Auth, Socket.IO |
| Database | MySQL 8.0 |
| Cache | Redis 7 |
| Deployment | Docker, Docker Compose, PM2 |

## Quick Start

```bash
# 1. Configure environment
cp deployment/env-sample.md .env
# Edit .env with your database, JWT secrets, and SMTP settings

# 2. Start with Docker
docker compose -f deployment/docker-compose.yml up -d

# 3. Access
# Frontend:  http://localhost:3000
# API:       http://localhost:5000/api/v1
```

## Default Login Credentials

> **Change these immediately in production!**

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@support.com | Admin@1234 |
| Manager | manager@support.com | Admin@1234 |
| Agent | agent1@support.com | Admin@1234 |
| Customer | customer@example.com | Admin@1234 |

## Project Structure

```
/
├── BRD/                    # Business Requirements Document
├── backend/                # Node.js API
│   └── src/
│       ├── config/         # DB, Redis, JWT, Swagger config
│       ├── controllers/    # HTTP controllers (14 modules)
│       ├── services/       # Business logic layer
│       ├── repositories/   # Data access layer
│       ├── routes/         # Express route definitions
│       ├── middlewares/    # Auth, RBAC, validation, error
│       ├── utils/          # JWT, hash, pagination, response
│       ├── constants/      # Roles, statuses, events
│       └── app.js          # Express app
├── frontend/               # React SPA
│   └── src/
│       ├── api/            # Axios instances
│       ├── components/     # Reusable UI components
│       ├── context/        # Auth, Notification contexts
│       ├── pages/          # Route-level page components
│       ├── layouts/        # App, Auth, Portal layouts
│       ├── routes/         # Protected route guards
│       └── App.jsx
├── database/               # MySQL schema and seeds
│   ├── schema.sql
│   └── seeds.sql
├── deployment/             # Docker, Nginx, deployment config
│   ├── docker-compose.yml
│   ├── deployment-guide.md
│   └── env-sample.md
└── docs/                   # Complete SDLC documentation
    ├── requirement-analysis.md
    ├── module-breakdown.md
    ├── assumptions.md
    ├── risk-analysis.md
    ├── architecture/
    ├── api/
    ├── database/
    ├── ui/
    ├── security/
    └── testing/
```

## Documentation

| Document | Path |
|----------|------|
| Functional Requirements (FRS) | [docs/requirement-analysis.md](docs/requirement-analysis.md) |
| Module Breakdown | [docs/module-breakdown.md](docs/module-breakdown.md) |
| System Architecture | [docs/architecture/system-architecture.md](docs/architecture/system-architecture.md) |
| Database Design | [docs/database/er-diagram.md](docs/database/er-diagram.md) |
| API Documentation | [docs/api/api-documentation.md](docs/api/api-documentation.md) |
| Postman Collection | [docs/api/postman-collection.json](docs/api/postman-collection.json) |
| UI Guidelines | [docs/ui/ui-guidelines.md](docs/ui/ui-guidelines.md) |
| Security Guide | [docs/security/security-implementation.md](docs/security/security-implementation.md) |
| Test Plan | [docs/testing/test-plan.md](docs/testing/test-plan.md) |
| Deployment Guide | [deployment/deployment-guide.md](deployment/deployment-guide.md) |
| Setup Guide | [docs/setup-guide.md](docs/setup-guide.md) |
| Developer Guide | [docs/developer-guide.md](docs/developer-guide.md) |

## License

MIT
