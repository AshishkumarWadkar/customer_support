# Developer Guide
## Customer Support & Ticket Management Platform

**Version:** 1.0 | **Date:** 2026-05-26

---

## Architecture Overview

The application follows a **Modular Monolith** pattern:
- **Backend:** Express.js using MVC + Service + Repository pattern
- **Frontend:** React 18 SPA with Context API + Redux Toolkit
- **Database:** MySQL 8.0 with normalized relational schema
- **Cache:** Redis for sessions, rate limiting, real-time

---

## Backend Development Guide

### Adding a New Module

```
1. Create repository:  src/repositories/myModuleRepository.js
2. Create service:     src/services/myModuleService.js
3. Create controller:  src/controllers/myModuleController.js
4. Create routes:      src/routes/myModuleRoutes.js
5. Register routes:    src/app.js  →  app.use('/api/v1/my-module', myModuleRoutes)
6. Add validation:     src/validations/myModuleValidations.js
```

### Repository Pattern

```javascript
// Always use parameterized queries
const findById = async (id) => {
  const [rows] = await getPool().execute(
    'SELECT * FROM my_table WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  return rows[0] || null;
};
```

### Service Pattern

```javascript
// All business logic goes in services
const getItem = async (id, user) => {
  const item = await myRepo.findById(id);
  if (!item) throw new NotFoundError('Item');

  // Object-level authorization
  if (user.role === 'AGENT' && item.owner_id !== user.id) {
    throw new ForbiddenError('Access denied');
  }

  return item;
};
```

### Controller Pattern

```javascript
// Controllers are thin — only HTTP concerns
const getById = async (req, res, next) => {
  try {
    const item = await myService.getItem(req.params.id, req.user);
    return sendSuccess(res, item);
  } catch (err) {
    next(err);  // Pass to centralized error handler
  }
};
```

### Error Throwing Convention

```javascript
// Import from errorMiddleware
const { NotFoundError, ValidationError, ForbiddenError, ConflictError } = require('../middlewares/errorMiddleware');

throw new NotFoundError('Ticket');       // → 404
throw new ValidationError('Bad input'); // → 400
throw new ForbiddenError('No access');  // → 403
throw new ConflictError('Duplicate');   // → 409
```

---

## Frontend Development Guide

### Adding a New Page

```jsx
// 1. Create page: src/pages/myModule/MyPage.jsx
const MyPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900">My Page</h1>
    </div>
  );
};
export default MyPage;

// 2. Register route in App.jsx
const MyPage = lazy(() => import('./pages/myModule/MyPage'));
// Inside <Routes>:
<Route path="/app/my-module" element={<MyPage />} />

// 3. Add to navigation in AppLayout.jsx if needed
```

### API Call Convention

```jsx
// Always use axiosInstance (not raw axios)
import axiosInstance from '../../api/axiosInstance';

const fetchData = async () => {
  try {
    const { data } = await axiosInstance.get('/my-module');
    setItems(data.data);
    setMeta(data.meta);
  } catch (err) {
    toast.error(err?.response?.data?.message || 'Failed to load');
  }
};
```

### Form Convention (React Hook Form + Yup)

```jsx
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const schema = yup.object({
  name: yup.string().required('Name is required'),
  email: yup.string().email().required(),
});

const MyForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async (data) => { /* ... */ };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <p>{errors.name.message}</p>}
    </form>
  );
};
```

---

## Coding Standards

### Backend
- Functions: `camelCase`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- DB columns: `snake_case`
- Files: `camelCase.js`
- Use `async/await` (no callbacks or raw Promises)
- No console.log — use `logger.info/error/warn`

### Frontend
- Components: `PascalCase.jsx`
- Hooks: `camelCase` with `use` prefix
- Constants: `UPPER_SNAKE_CASE`
- Tailwind classes over inline styles
- No inline CSS except for dynamic values (e.g., `style={{ backgroundColor: tag.color }}`)

### Git Convention

```
feat: add ticket escalation feature
fix: resolve SLA timer pause bug
refactor: extract ticket number generator to helper
docs: update API documentation for /tickets endpoint
test: add unit tests for authService.login
chore: update dependencies
```

---

## API Response Standards

All APIs must use the `sendSuccess`, `sendCreated`, `sendPaginated`, or `sendError` helpers:

```javascript
return sendSuccess(res, data, 'Message');                    // 200
return sendCreated(res, data, 'Created successfully');       // 201
return sendPaginated(res, rows, page, limit, total);         // 200 + meta
return sendNoContent(res);                                   // 204
```

Never use raw `res.json()` in controllers.

---

## Database Query Rules

1. **Always** use `pool.execute()` (parameterized) — never string interpolation
2. **Always** include `deleted_at IS NULL` in queries for soft-deletable entities
3. **Never** fetch more than 100 rows without pagination
4. **Index** all foreign keys and frequently filtered columns
5. **Transactions** required for multi-table writes (e.g., ticket merge)

---

## Environment Management

- `.env` — local development (gitignored)
- `.env.example` — template (committed)
- Production secrets → environment variables via deployment platform
- **Never** hardcode credentials, even test credentials

---

*Developer Guide v1.0 — Lead Developer*
