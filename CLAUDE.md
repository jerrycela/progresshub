# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

ProgressHub is an internal project progress management system. Monorepo with pnpm workspaces.

- **Frontend**: `packages/frontend/` — Vue 3 + TypeScript + Pinia + Tailwind CSS + Vite
- **Backend**: `backend/` — Express + TypeScript + Prisma + PostgreSQL
- **Shared Types**: `packages/shared/types/` — enums, interfaces shared between frontend and backend
- **Mock Data**: `packages/frontend/src/mocks/`

Frontend path alias: `@/` maps to `packages/frontend/src/`.

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

### Frontend Composables

Reusable logic lives in `packages/frontend/src/composables/`. Key composables:
- `useTaskModal` — task detail modal open/close state
- `useGantt` / `useGanttData` — Gantt chart rendering and data processing
- `useFormValidation` — form validation helpers
- `useToast` — toast notification (lazy-loaded to avoid circular deps with API layer)
- `useConfirm` — confirmation dialog state

Use existing composables before creating new ones. Check `composables/index.ts` for the full list.

### API Response Contract

Backend wraps all responses in `{ success: boolean, data?: T, error?: { code, message } }`. Frontend uses `apiGetUnwrap`/`apiPostUnwrap`/etc. helpers that auto-unwrap this structure. Error codes are centralized in `backend/src/types/shared-api.ts` (`ErrorCodes` object).

**Caution with DELETE endpoints:** If backend returns `204 No Content` (empty body), do NOT use `apiDeleteUnwrap` on the frontend — it will fail parsing. Use `apiDelete` instead, or have the backend return `sendSuccess(res, null)` with 200.

### Auth & Permissions

- Backend: `authenticate` middleware attaches `req.user` (JwtPayload: userId, name, email, permissionLevel)
- `authorize(PermissionLevel.PM, PermissionLevel.ADMIN)` middleware for role-gating routes
- Roles hierarchy: `EMPLOYEE < MANAGER < PM/PRODUCER < ADMIN`
- `req.user.permissionLevel` maps to Prisma `PermissionLevel` enum
- Resource-level auth: `authorizeTaskAccess` checks task creator/assignee/collaborator + PM/ADMIN
- Self-edit auth: `authorizeSelfOrAdmin` for employee profile edits

### Route Organization

Backend routes are mounted in `backend/src/routes/index.ts`. All routes are under `/api/` prefix. Sub-routers (e.g., `projectMembers`) use `mergeParams: true` to access parent route params.

Task routes split into sub-routers: `taskCrudRoutes`, `taskActionRoutes`, `taskNoteRoutes` — all mounted under `/api/tasks`.

## Commands

```bash
# Both services simultaneously
pnpm dev

# Frontend
pnpm --filter frontend dev          # Dev server
pnpm --filter frontend exec vue-tsc --noEmit  # Type check
pnpm --filter frontend exec vitest run         # Unit tests
pnpm --filter frontend exec vitest run src/composables/__tests__/useGantt.test.ts  # Single test
pnpm --filter frontend build        # Production build

# Backend
pnpm --filter backend dev           # Dev server
cd backend && npx jest --no-coverage              # All unit tests
cd backend && npx jest --no-coverage src/services/__tests__/taskService.test.ts  # Single test

# Database
cd backend && npx prisma migrate dev --name <name>  # Create migration
cd backend && npx prisma generate    # Regenerate client after schema change
cd backend && npx prisma db seed     # Run seed
```

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
- **Backend**: Zeabur container (Express + Prisma) → `progresshub-api.zeabur.app`
- **Database**: Zeabur PostgreSQL Marketplace
- `ENABLE_DEV_LOGIN=true` required on backend until Slack OAuth is production-ready

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
- Mappers in `backend/src/mappers/` transform Prisma models to API DTOs
- Response helpers: `sendSuccess`, `sendPaginatedSuccess`, `sendError` in `backend/src/utils/response.ts`
- Use `ErrorCodes.XXX` constants for error responses, never raw strings
- Prisma schema uses `@@map("snake_case")` for table/column names, camelCase in code
- Backend errors use `AppError` class (from `middleware/errorHandler.ts`) for business logic errors

## Gotchas

- **Vite env vars are compile-time constants.** Changing `.env` requires dev server restart.
- **Local `.env` interferes with backend tests.** `dotenv.config()` loads it automatically. Move to `.env.bak` when debugging CI-like failures.
- **Service Factory is immutable after init.** `createXxxService()` result never changes during app lifecycle. Switching mock/API requires env change + restart.
- **Demo features must not depend on `VITE_USE_MOCK`.** Anything that works "without backend" needs its own independent code path.

## References

- `docs/lessons-learned.md` — env vars, Demo feature, Service Factory lessons
- `docs/plans/` — implementation plans for features in progress
