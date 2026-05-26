# UI/UX Guidelines
## Customer Support & Ticket Management Platform

**Document Version:** 1.0  
**Date:** 2026-05-26

---

## 1. Design Philosophy

- **Clarity First:** Every UI element must communicate its purpose instantly
- **Density Balance:** Information-rich without being overwhelming (enterprise density)
- **Action-Oriented:** Primary actions always visible; no hunting for buttons
- **Consistent Feedback:** Every interaction provides visual confirmation
- **Accessibility by Default:** WCAG 2.1 AA compliance throughout

---

## 2. Color System (Tailwind-based)

### Primary Palette
| Token | Hex | Usage |
|-------|-----|-------|
| `primary-50` | `#eff6ff` | Hover backgrounds |
| `primary-100` | `#dbeafe` | Selected item backgrounds |
| `primary-500` | `#3b82f6` | Primary buttons, links, accents |
| `primary-600` | `#2563eb` | Button hover state |
| `primary-700` | `#1d4ed8` | Active state |
| `primary-900` | `#1e3a8a` | Dark sidebar |

### Semantic Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `success-500` | `#22c55e` | Resolved status, success toasts |
| `warning-500` | `#f59e0b` | At-risk SLA, pending status |
| `danger-500` | `#ef4444` | Breached SLA, critical priority, errors |
| `info-500` | `#06b6d4` | Info toasts, informational badges |
| `neutral-50` | `#f8fafc` | Page backgrounds |
| `neutral-100` | `#f1f5f9` | Card backgrounds |
| `neutral-800` | `#1e293b` | Primary text |

### Priority Colors
| Priority | Color | Badge Class |
|----------|-------|-------------|
| Critical | `#dc2626` | `bg-red-100 text-red-700` |
| High | `#ea580c` | `bg-orange-100 text-orange-700` |
| Medium | `#ca8a04` | `bg-yellow-100 text-yellow-700` |
| Low | `#16a34a` | `bg-green-100 text-green-700` |

### Status Colors
| Status | Color | Badge Class |
|--------|-------|-------------|
| New | `#7c3aed` | `bg-violet-100 text-violet-700` |
| Open | `#2563eb` | `bg-blue-100 text-blue-700` |
| In Progress | `#0891b2` | `bg-cyan-100 text-cyan-700` |
| Pending Customer | `#d97706` | `bg-amber-100 text-amber-700` |
| Escalated | `#dc2626` | `bg-red-100 text-red-700` |
| Resolved | `#16a34a` | `bg-green-100 text-green-700` |
| Closed | `#64748b` | `bg-slate-100 text-slate-600` |

---

## 3. Typography

| Element | Font | Size | Weight | Class |
|---------|------|------|--------|-------|
| Page Title | Inter | 24px | 700 | `text-2xl font-bold` |
| Section Header | Inter | 18px | 600 | `text-lg font-semibold` |
| Card Title | Inter | 16px | 600 | `text-base font-semibold` |
| Body Text | Inter | 14px | 400 | `text-sm` |
| Label | Inter | 12px | 500 | `text-xs font-medium` |
| Caption | Inter | 12px | 400 | `text-xs text-slate-500` |
| Code/Mono | JetBrains Mono | 13px | 400 | `font-mono text-sm` |

```html
<!-- Font imports (index.html) -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

---

## 4. Spacing System

Uses Tailwind's default 4px base unit:
- `xs`: 4px (`p-1`)
- `sm`: 8px (`p-2`)
- `md`: 12px (`p-3`)
- `lg`: 16px (`p-4`)
- `xl`: 24px (`p-6`)
- `2xl`: 32px (`p-8`)

**Card padding:** `p-6` (24px)  
**Page padding:** `px-6 py-4`  
**Section spacing:** `space-y-6`  
**Form field spacing:** `space-y-4`

---

## 5. Component Specifications

### Buttons
```
Primary:   bg-blue-600 text-white hover:bg-blue-700 h-9 px-4 rounded-md font-medium
Secondary: bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 h-9 px-4
Danger:    bg-red-600 text-white hover:bg-red-700 h-9 px-4
Icon-only: h-9 w-9 flex items-center justify-center rounded-md
Loading:   Spinner replaces icon, button disabled
```

### Inputs
```
Base:     border border-slate-300 rounded-md h-9 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500
Error:    border-red-500 focus:ring-red-500
Disabled: bg-slate-50 text-slate-400 cursor-not-allowed
Label:    block text-sm font-medium text-slate-700 mb-1
Error msg: text-xs text-red-600 mt-1
```

### Cards
```
Base:    bg-white rounded-lg border border-slate-200 shadow-sm
Hover:   hover:shadow-md transition-shadow
Padding: p-6
Header:  border-b border-slate-200 pb-4 mb-4
```

### Tables
```
Container: overflow-hidden rounded-lg border border-slate-200
Header:    bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider
Row:       hover:bg-slate-50 border-b border-slate-100
Cell:      px-4 py-3 text-sm
Striped:   even:bg-slate-50/50
```

### Modals
```
Overlay:  fixed inset-0 bg-black/50 flex items-center justify-center z-50
Container: bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto
Header:   flex items-center justify-between p-6 border-b
Body:     p-6
Footer:   flex items-center justify-end gap-3 p-6 border-t
```

### Badges
```
Base:    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
Dot:     w-2 h-2 rounded-full inline-block mr-1
```

---

## 6. Layout Structure

### Agent/Admin Application Layout
```
┌────────────────────────────────────────────────────────┐
│  HEADER (h-16 fixed)                                    │
│  [Logo] [Search]    [Notifications] [User Avatar]       │
├──────────────┬─────────────────────────────────────────┤
│              │                                          │
│  SIDEBAR     │       MAIN CONTENT AREA                  │
│  (w-64)      │       (flex-1, overflow-y-auto)          │
│  fixed       │                                          │
│              │  ┌────────────────────────────────────┐  │
│  Navigation  │  │ Page Header (Breadcrumb + Actions) │  │
│  Menu Items  │  ├────────────────────────────────────┤  │
│              │  │                                    │  │
│              │  │     Page Content                   │  │
│              │  │                                    │  │
│              │  └────────────────────────────────────┘  │
└──────────────┴─────────────────────────────────────────┘
```

### Mobile Layout (< 768px)
- Sidebar hidden by default, accessible via hamburger menu
- Sidebar slides in as overlay
- Table columns reduced to essential info
- Cards stack vertically
- Sticky header with key actions

---

## 7. Navigation Structure (Sidebar)

```
🏠  Dashboard
📋  Tickets
    ├── All Tickets
    ├── My Tickets
    └── Create Ticket
👥  Customers
📊  Reports
📖  Knowledge Base
⚙️  Settings
    ├── SLA Policies    (Manager+)
    ├── Workflows       (Admin)
    ├── Teams           (Manager+)
    ├── Audit Logs      (Admin)
    └── System Settings (Admin)
```

### Role-based menu visibility:
- **Agent:** Dashboard, Tickets (own/team), Customers, KB
- **Manager:** All of Agent + Reports, Teams, SLA
- **Super Admin:** All items

---

## 8. Responsive Breakpoints

| Breakpoint | Width | Target |
|-----------|-------|--------|
| `xs` | < 640px | Mobile portrait |
| `sm` | 640px+ | Mobile landscape |
| `md` | 768px+ | Tablet |
| `lg` | 1024px+ | Laptop |
| `xl` | 1280px+ | Desktop |
| `2xl` | 1536px+ | Wide desktop |

---

## 9. Loading States

- **Skeleton loaders** for data tables and dashboards (not spinners)
- **Inline spinners** for button actions
- **Page-level spinner** only during authentication
- **Progress bar** at top of page for navigation (NProgress style)
- Debounce search inputs 300ms before fetching

---

## 10. Toast Notifications (react-hot-toast)

```
Success: bg-green-50, border-green-500, duration: 3000ms
Error:   bg-red-50, border-red-500, duration: 5000ms (dismissible)
Warning: bg-amber-50, border-amber-500, duration: 4000ms
Info:    bg-blue-50, border-blue-500, duration: 3000ms
Position: top-right
Max visible: 3 stacked
```

---

## 11. Accessibility Requirements

- All interactive elements have `aria-label` or visible label
- Keyboard navigation fully supported (Tab, Enter, Escape, Arrow keys)
- Focus styles visible (`focus:ring-2 focus:ring-blue-500`)
- Color is never the only indicator of meaning (always paired with icon or text)
- Minimum touch target: 44×44px
- Screen reader tested with NVDA and VoiceOver
- Contrast ratio: ≥ 4.5:1 for normal text, ≥ 3:1 for large text

---

*UI Guidelines v1.0 — UI/UX Architecture Team*
