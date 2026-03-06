# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

ProgressHub is an internal project progress management system. Monorepo with pnpm workspaces.

- **Frontend**: `packages/frontend/` — Vue 3 + TypeScript + Pinia + Tailwind CSS + Vite
- **Backend**: `backend/` — Express + TypeScript + Prisma + PostgreSQL
- **Shared Types**: `packages/shared/types/` — enums, interfaces shared between frontend and backend
- **Mock Data**: `packages/frontend/src/mocks/`

Note: `backend/` is a top-level workspace member (not under `packages/`). pnpm filter name is `backend`.

### Frontend Layers

Pages (`pages/`) → Components (`components/`) → Composables (`composables/`) → Services (`services/`) → Stores (`stores/`)

- **Pages**: Route-level views (e.g., `GanttPage.vue`, `TaskPoolPage.vue`, `DashboardPage.vue`)
- **Composables**: Reusable logic — `useToast`, `useFormatDate`, `useGantt`, `useTaskModal`, `useFormValidation`
- **Components**: Organized by domain — `common/` (Modal, SearchableSelect, Toast), `task/`, `gantt/`, `project/`, `layout/`
- **Router**: `src/router/index.ts` — uses `meta.requiresAuth` for route guards, lazy-loads all pages

### Service Layer Pattern (Critical)

Frontend services use a **Factory + Interface** pattern for Mock/API dual-mode:

```
services/xxxService.ts:
  interface XxxServiceInterface { ... }
  class MockXxxService implements XxxServiceInterface { ... }
  class ApiXxxService implements XxxServiceInterface { ... }
  export const createXxxService = () => VITE_USE_MOCK ? new MockXxxService() : new ApiXxxService()
```

Each Pinia store calls `createXxxService()` once at module top-level. When adding a new service method: update interface, implement in both Mock and Api classes.

### Store Pattern

Pinia stores use **setup syntax** (`defineStore('name', () => {})`). Composables in `packages/frontend/src/composables/` extract reusable logic (e.g., `useGantt`, `useTaskModal`, `useFormValidation`).

### API Response Contract

Backend wraps all responses in `{ success: boolean, data?: T, error?: { code, message } }`. Frontend uses `apiGetUnwrap`/`apiPostUnwrap`/etc. helpers that auto-unwrap this structure. Error codes are centralized in `backend/src/types/shared-api.ts` (`ErrorCodes` object).

**Caution with DELETE endpoints:** If backend returns `204 No Content` (empty body), do NOT use `apiDeleteUnwrap` on the frontend — it will fail parsing. Use `apiDelete` instead, or have the backend return `sendSuccess(res, null)` with 200.

### Auth & Permissions

- Backend: `authenticate` middleware attaches `req.user` (JwtPayload: userId, name, email, permissionLevel)
- `authorize(PermissionLevel.PM, PermissionLevel.ADMIN)` middleware for role-gating routes
- Roles hierarchy: `EMPLOYEE < MANAGER < PM/PRODUCER < ADMIN`
- `req.user.permissionLevel` maps to Prisma `PermissionLevel` enum
- Frontend router guards use `meta.requiresAuth` and `meta.requiresRole: UserRole[]` for route protection
- Resource-level auth: `authorizeTaskAccess` middleware checks creator/assignee/collaborator/PM access
- Self-edit auth: `authorizeSelfOrAdmin` for employee profile edits

### Route Organization

Backend routes are mounted in `backend/src/routes/index.ts`. All routes are under `/api/` prefix. Sub-routers (e.g., `projectMembers`) use `mergeParams: true` to access parent route params.

Task routes split into sub-routers: `taskCrudRoutes`, `taskActionRoutes`, `taskNoteRoutes` — all mounted under `/api/tasks`.

### Import Aliases

- Frontend: `@/` → `packages/frontend/src/`, `shared/types` → `packages/shared/types/`
- Backend imports shared types from `backend/src/types/shared-api.ts` (internalized copy — shared package unavailable in Docker container)

## Commands

```bash
# Both services simultaneously
pnpm dev

# Frontend
pnpm --filter frontend dev          # Dev server
pnpm --filter frontend exec vue-tsc --noEmit  # Type check
pnpm --filter frontend exec vitest run         # All unit tests
pnpm --filter frontend exec vitest run src/composables/__tests__/useFormatDate.test.ts  # Single test file
pnpm --filter frontend build        # Production build
pnpm --filter frontend lint         # ESLint --fix
pnpm --filter frontend format       # Prettier

# Backend
pnpm --filter backend dev           # Dev server
cd backend && npx jest --no-coverage              # All unit tests
cd backend && npx jest --no-coverage -- taskService  # Single test (name match)
cd backend && npx jest --no-coverage -- __tests__/services/taskService.test.ts  # Single test (path)

# Database
cd backend && npx prisma migrate dev --name <name>  # Create migration
cd backend && npx prisma generate    # Regenerate client after schema change
cd backend && npx prisma db seed     # Run seed

# Monorepo
pnpm dev          # Run frontend + backend in parallel
pnpm build        # Build all packages
pnpm lint         # Lint all packages
```

**Pre-commit hooks**: Husky + lint-staged auto-runs ESLint and Prettier on staged files. Do not bypass with `--no-verify`.

## Auth Modes

`createAuthService()` runs once at module top-level, selecting Mock or API mode via `VITE_USE_MOCK`.

| Mode | Condition | Behavior |
|------|-----------|----------|
| Mock | `VITE_USE_MOCK=true` | Uses mock data, no backend needed |
| API  | `VITE_USE_MOCK=false` | Calls `POST /api/auth/dev-login`, needs `ENABLE_DEV_LOGIN=true` |
| Slack | Via service layer | Env vars select mock or real API |
| Demo Token | `'demo-token'` | `initAuth()` restores from mock without API call |

## Deployment

- **Frontend**: Zeabur static (Vue + Caddy) → `progresshub.zeabur.app`
- **Backend**: Zeabur container (Express + Prisma) → `progresshubfortest.zeabur.app`
- **Database**: Zeabur PostgreSQL Marketplace
- `ENABLE_DEV_LOGIN=true` required on backend until Slack OAuth is production-ready
- Port config must be consistent: Dockerfile EXPOSE, zeabur.json healthcheck.port, env PORT (all 8080; Zeabur sets WEB_PORT=8080)
- Zeabur CLI: use `variable create` to set env vars (never `variable update` — it wipes all existing vars)

## Frontend Design System

- **Form elements**: Must use `.input` class (defined in `main.css`). Never use `.input-field`.
- **Cards**: Use `.card` class with automatic dark mode support.
- **Colors**: Use CSS variables `var(--text-primary)`, `var(--bg-secondary)`, etc. Never hardcode `text-gray-*`, `bg-white`.
- **Accessibility**: Icon-only buttons must have `aria-label`.
- **Shared constants**: `DepartmentLabels`, `UserRoleLabels` in `shared/types` — always use these for display, never raw enum values.

## Mock Service Rules

Mock services (`MockXxxService`) are data stubs only — no business logic:

- Each method ≤5 lines (create fake data → return)
- No `if`/`switch`/ternary (those belong in backend)
- No state coupling (e.g., "progress 100% → auto-set DONE")
- Violation signal: conditional logic in Mock = backend logic leak

> History: Mocks once became a "shadow backend", causing Mock-mode-works-but-API-mode-breaks bugs.

## Backend Conventions

- Services in `backend/src/services/` contain business logic; routes handle HTTP concerns only
- Mappers in `backend/src/mappers/` transform Prisma models to API DTOs (task, employee, project, milestone, progressLog)
- Response helpers: `sendSuccess(res, data)`, `sendPaginatedSuccess(res, data, meta)`, `sendError(res, code, message, status)`
- Use `ErrorCodes.XXX` constants for error responses, never raw strings
- Prisma schema uses `@@map("snake_case")` for table/column names, camelCase in code
- The `Employee` model is the user table (not a separate `User` model)
- Middleware in `backend/src/middleware/` — `auth.ts` (authenticate/authorize), `errorHandler.ts`, `sanitize.ts`, `auditLog.ts`
- Tests use Jest + Supertest, config in `backend/jest.config.js`, setup in `backend/__tests__/setup.ts`. Coverage threshold: 80% per tested module.
- Task routes are split across `taskCrudRoutes.ts`, `taskActionRoutes.ts`, `taskNoteRoutes.ts` (all mounted under `/tasks`)

## Key Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_USE_MOCK` | Frontend `.env` | `true` = mock data, `false` = real API |
| `VITE_API_BASE_URL` | Frontend `.env` | Backend API URL (default: `/api`) |
| `DATABASE_URL` | Backend `.env` | PostgreSQL connection string |
| `ENABLE_DEV_LOGIN` | Backend `.env` | `true` enables demo/dev login endpoint |
| `JWT_SECRET` | Backend `.env` | JWT signing secret |
| `SLACK_BOT_TOKEN` | Backend `.env` | Enables Slack routes when present |

Vite env vars are **compile-time constants** — restart dev server after `.env` changes.

## Gotchas

- **Local `.env` interferes with backend tests.** `dotenv.config()` loads it automatically. Move to `.env.bak` when debugging CI-like failures.
- **Service Factory is immutable after init.** `createXxxService()` result never changes during app lifecycle. Switching mock/API requires env change + restart.
- **Demo features must not depend on `VITE_USE_MOCK`.** Anything that works "without backend" needs its own independent code path.

## References

- `docs/lessons-learned.md` — env vars, Demo feature, Service Factory lessons
- `docs/plans/` — implementation plans for features in progress
