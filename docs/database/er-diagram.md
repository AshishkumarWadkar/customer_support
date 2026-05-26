# Entity Relationship Diagram
## Customer Support & Ticket Management Platform

**Document Version:** 1.0  
**Date:** 2026-05-26

---

## Core Entity Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AUTH CLUSTER                                   │
│                                                                       │
│  ┌──────────┐      ┌──────────┐      ┌─────────────────┐            │
│  │  roles   │─────<│  users   │>─────│ role_permissions │            │
│  └──────────┘      └────┬─────┘      └────────┬────────┘            │
│                          │ 1:1              ┌──┘                      │
│                     ┌────┴────────┐  ┌──────┴──────┐                │
│                     │mfa_settings │  │ permissions  │                │
│                     └─────────────┘  └─────────────┘                │
│                     ┌─────────────────────────────────┐              │
│                     │ password_history │ user_sessions │              │
│                     └─────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      ORGANIZATIONAL CLUSTER                           │
│                                                                       │
│  ┌───────────────┐        ┌─────────────┐                           │
│  │ organizations │──────<─│  customers  │                           │
│  └───────────────┘        └──────┬──────┘                           │
│                                  │ 1:N                               │
│  ┌────────────────┐   ┌──────────┴──────────────┐                  │
│  │  departments   │──<│         tickets          │>──┐              │
│  └────────────────┘   └──────────┬──────────────┘    │              │
│                                  │                    │              │
│  ┌──────────┐                    │            ┌───────┴──────┐      │
│  │  teams   │────────────────────┘            │    users     │      │
│  └──────────┘ (team_id FK)     (assigned_to)  └──────────────┘      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        TICKET CLUSTER                                 │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │                        tickets                            │       │
│  │  id, ticket_number, status, priority, subject, ...        │       │
│  └──┬───────────┬──────────────┬────────────┬───────────────┘       │
│     │1:N        │1:N           │1:N         │1:1                     │
│     ▼           ▼              ▼            ▼                        │
│  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌───────────┐            │
│  │ ticket   │ │  ticket    │ │ ticket   │ │ sla_timers│            │
│  │ comments │ │ attachments│ │ history  │ │           │            │
│  └──────────┘ └────────────┘ └──────────┘ └───────────┘            │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │  tickets >──< ticket_tags >──< tags                      │        │
│  │  tickets >──< ticket_links >──< tickets (self-ref)       │        │
│  └─────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          SLA CLUSTER                                  │
│                                                                       │
│  ┌─────────────────────────────┐                                    │
│  │        sla_policies         │                                    │
│  └──────┬──────────────┬───────┘                                    │
│         │1:N           │1:N                                          │
│  ┌──────┴──────┐  ┌────┴──────────┐                                │
│  │ sla_business│  │ sla_holidays  │                                │
│  │ _hours      │  └───────────────┘                                │
│  └─────────────┘                                                    │
│         │ 1:N (via tickets.sla_policy_id)                           │
│  ┌──────┴──────┐                                                    │
│  │ sla_timers  │ (one per ticket)                                   │
│  └─────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      WORKFLOW CLUSTER                                 │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │                      workflows                           │        │
│  └──────┬────────────────┬────────────────┬────────────────┘        │
│         │1:N             │1:N             │1:N                       │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌─────┴────────────────┐        │
│  │  workflow   │  │  workflow   │  │workflow_execution_logs│        │
│  │ _conditions │  │  _actions   │  └──────────────────────┘        │
│  └─────────────┘  └─────────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE BASE CLUSTER                             │
│                                                                       │
│  ┌────────────────────────────────┐                                 │
│  │         kb_categories          │                                 │
│  │  (parent_id self-referential)  │                                 │
│  └────────────────┬───────────────┘                                 │
│                   │1:N                                               │
│  ┌────────────────┴───────────────┐                                 │
│  │           kb_articles          │                                 │
│  └────────────────┬───────────────┘                                 │
│                   │1:N                                               │
│  ┌────────────────┴───────────────┐                                 │
│  │      kb_article_versions       │                                 │
│  └────────────────────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Cardinality Summary

| Relationship | Type | Notes |
|-------------|------|-------|
| roles → users | 1:N | One role, many users |
| users → departments | N:1 | User belongs to one department |
| users ↔ teams | M:N | via agent_teams junction |
| organizations → customers | 1:N | Customer belongs to one org |
| customers → tickets | 1:N | Customer has many tickets |
| tickets → ticket_comments | 1:N | Ticket has many comments |
| tickets → ticket_attachments | 1:N | Ticket has many attachments |
| tickets → ticket_history | 1:N | Immutable audit trail |
| tickets ↔ tags | M:N | via ticket_tags junction |
| tickets → sla_timers | 1:1 | One SLA timer per ticket |
| sla_policies → sla_timers | 1:N | Policy used in many timers |
| workflows → workflow_conditions | 1:N | Rule conditions |
| workflows → workflow_actions | 1:N | Rule actions |
| kb_categories → kb_categories | 1:N | Self-referential hierarchy |
| kb_categories → kb_articles | 1:N | Articles in category |
| kb_articles → kb_article_versions | 1:N | Version history |
| users → notifications | 1:N | User's notification inbox |

---

*ER Diagram v1.0 — Database Architecture Team*
