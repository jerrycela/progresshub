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
- **Composables**: Reusable logic in `composables/` — use `ls` to discover available hooks (e.g., `useToast`, `useGantt`, `useFormValidation`)
- **Components**: Organized by domain — `common/`, `task/`, `gantt/`, `project/`, `layout/` (use `ls` per directory)
- **Layouts**: `layouts/MainLayout.vue` (app shell), `pages/settings/SettingsLayout.vue` (settings sub-routes)
- **Router**: `src/router/index.ts` — uses `meta.requiresAuth` for route guards, lazy-loads all pages
- **Path aliases**: `@` → `src/`, `shared` → `../shared` (configured in `vite.config.ts`). Dev server proxies `/api` to `localhost:3000` automatically.

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

### API Response Contract

Backend wraps all responses in `{ success: boolean, data?: T, error?: { code, message } }`. Frontend uses `apiGetUnwrap`/`apiPostUnwrap`/etc. helpers that auto-unwrap this structure. Error codes are centralized in `backend/src/types/shared-api.ts` (`ErrorCodes` object).

**Caution with DELETE endpoints:** If backend returns `204 No Content` (empty body), do NOT use `apiDeleteUnwrap` on the frontend — it will fail parsing. Use `apiDelete` instead, or have the backend return `sendSuccess(res, null)` with 200.

### Frontend Route Permissions

Routes use `meta.requiresRole` for role-gating. Pages without `requiresRole` are accessible to all authenticated users.

| Route | Required Roles |
|-------|---------------|
| `/projects` | PM, PRODUCER, ADMIN |
| `/pm/chase`, `/pm/workload` | PM, PRODUCER, MANAGER, ADMIN |
| `/admin/users` | MANAGER, ADMIN |
| `/dashboard`, `/my-tasks`, `/task-pool`, `/gantt`, `/report`, `/settings` | All authenticated |

### API Client Helpers

`services/api.ts` provides two sets of HTTP helpers:

- `apiGet`/`apiPost`/`apiPut`/`apiPatch`/`apiDelete` — return raw Axios response data
- `apiGetUnwrap`/`apiPostUnwrap`/etc. — auto-unwrap `{ success, data }` envelope, throw `ApiError` on failure

**Use `*Unwrap` by default.** Use raw helpers only when the backend doesn't return the standard envelope (e.g., `204 No Content`).

The client also handles **automatic token refresh**: on 401, it queues concurrent requests, refreshes via `/api/auth/refresh`, then retries all queued requests with the new token.

**Escape hatches**: Pass `skipAuth: true` in request config to omit the Authorization header; `skipErrorHandler: true` to bypass global error toast. Use `createCancelToken()` for AbortController-based request cancellation on component unmount.

### Auth & Permissions

- Backend: `authenticate` middleware attaches `req.user` (JwtPayload: userId, name, email, permissionLevel)
- `authorize(PermissionLevel.PM, PermissionLevel.ADMIN)` middleware for role-gating routes
- Roles hierarchy: `EMPLOYEE < MANAGER < PM/PRODUCER < ADMIN`
- `req.user.permissionLevel` maps to Prisma `PermissionLevel` enum

### Authorization Middleware (projectAuth.ts)

Centralized authorization in `backend/src/middleware/projectAuth.ts` provides three middleware functions:

- `requireProjectMember(paramName)` — verifies user is a member of the project specified by route param. ADMIN bypasses membership check.
- `requireResourceOwner(resource, idParam)` — verifies user has access to a specific resource (`"task" | "timeEntry" | "progressLog" | "milestone"`). On success, attaches the DB record to `(req as any).authorizedResource` so handlers can reuse it without re-querying.
- `requireProjectScope` — populates `req.authorizedProjectIds` with user's accessible project IDs. Use with `buildProjectScopeFilter()` for list queries.

**Security pattern**: All authorization failures return `404 NOT_FOUND` (never 403) to prevent resource enumeration. Built-in sliding window counter logs warnings when a user/IP triggers >10 authz 404s in 5 minutes.

### Route Organization

Backend routes are mounted in `backend/src/routes/index.ts`. Sub-routers (e.g., `projectMembers`) use `mergeParams: true` to access parent route params. `GET /api/` shows full route list only in development; production returns only name and version.

API route groups: `/auth`, `/employees`, `/projects`, `/tasks`, `/progress`, `/milestones`, `/time-entries`, `/time-categories`, `/time-stats`, `/gitlab`, `/dashboard`, `/user`. Slack routes (`/slack`) mount conditionally when `SLACK_BOT_TOKEN` is set.

Health check routes (`/health`, `/health/ready`, `/health/live`) are mounted outside `/api` — no auth required. The `/health/ready` endpoint checks database connectivity and is used by Docker HEALTHCHECK and Zeabur.

### Domain Models

Core domain: Employee, Project, Task, Milestone, ProgressLog, TaskNote, ProjectMember, UserSettings.

Time tracking: TimeEntry, TimeCategory, TimeEstimate — supports approval workflow (PENDING → APPROVED/REJECTED).

GitLab integration: GitLabInstance, GitLabConnection, GitLabActivity, GitLabIssueMapping — OAuth-based, supports commit/MR/issue sync with bidirectional mapping.

Auth: RefreshToken (persistent), OAuthState (CSRF-protected, multi-provider).

### Backend Scheduler

`backend/src/scheduler/` — uses `node-cron` for recurring tasks (e.g., `reminder.ts`). Runs in-process with the Express server.

## Commands

```bash
# Frontend
pnpm --filter frontend dev          # Dev server (localhost:5173)
pnpm --filter frontend typecheck    # Type check (vue-tsc --noEmit)
pnpm --filter frontend test         # All unit tests (vitest)
pnpm --filter frontend test -- src/composables/__tests__/useFormatDate.test.ts  # Single test file
pnpm --filter frontend build        # Production build
pnpm --filter frontend lint         # ESLint --fix
pnpm --filter frontend format       # Prettier

# Frontend E2E (Playwright) — 89 tests across 14 spec files
cd packages/frontend && npx playwright test                              # All E2E tests (use --workers=1 to avoid rate limiting)
cd packages/frontend && npx playwright test --ui                         # Interactive UI mode
cd packages/frontend && npx playwright test e2e/auth.spec.ts             # Single spec
cd packages/frontend && npx playwright test --grep "sidebar"             # Run by test name pattern

# Backend
pnpm --filter backend dev           # Dev server (localhost:3000)
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

# Docker (full-stack local)
docker compose up -d postgres        # PostgreSQL only
docker compose up -d                 # All services
```

**Pre-commit hooks**: Husky + lint-staged auto-runs ESLint and Prettier on staged files. Do not bypass with `--no-verify`.

**Testing caveat**: Local `backend/.env` is loaded by `dotenv.config()` and can cause tests to behave differently from CI. To simulate CI: `mv backend/.env backend/.env.bak` before running tests.

### E2E Auth Helper

`e2e/helpers/auth.ts` provides `loginAs(page, role)` and `logout(page)`. `loginAs` calls dev-login API, injects token into localStorage, then reloads. All spec files use this — never re-implement auth logic in individual tests.

```
import { loginAs, ROLES } from './helpers/auth'
await loginAs(page, ROLES.PM)
```

**E2E config notes**: Tests target Zeabur production (`E2E_API_BASE`). Use `--workers=1` to avoid backend rate limiter (10 req/15min on auth endpoints).

## Auth Modes

`createAuthService()` runs once at module top-level, selecting Mock or API mode via `VITE_USE_MOCK`.

| Mode | Condition | Behavior |
|------|-----------|----------|
| Mock | `VITE_USE_MOCK=true` | Uses mock data, no backend needed |
| API  | `VITE_USE_MOCK=false` | Calls `POST /api/auth/dev-login`, needs `ENABLE_DEV_LOGIN=true` |
| Slack | Via service layer | Env vars select mock or real API |
| Demo Token | `'demo-token'` | `initAuth()` restores from mock without API call |

## Deployment

- **Frontend**: Zeabur static (Vue + Caddy) → `progresshub-cb.zeabur.app`
- **Backend**: Zeabur container (Express + Prisma) → `progress-hub.zeabur.app`
- Note: Frontend and backend have different domains; CORS `ALLOWED_ORIGINS` must include the frontend domain
- **Database**: Zeabur PostgreSQL Marketplace
- `ENABLE_DEV_LOGIN=true` required on backend until Slack OAuth is production-ready
- Port config must be consistent: Dockerfile EXPOSE, zeabur.json healthcheck.port, env PORT (all 8080; Zeabur sets WEB_PORT=8080)
- Zeabur CLI: use `variable create` to set env vars (never `variable update` — it wipes all existing vars)
- Container startup: `prisma migrate deploy` → `seed` → `node dist/index.js`.

### Zeabur 部署流程 (CRITICAL — 每次部署前必讀)

**部署前必須先讀取踩坑文件：**
1. 讀取 Obsidian: `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/SG-Arts Group/SG-Arts Group/Zeabur 部署踩坑紀錄.md`
2. 讀取 memory: `~/.claude/projects/-Users-admin-progresshub-claude/memory/zeabur-deployment.md`

**部署腳本 (永遠使用腳本，不要手動 CLI):**
- 後端: `./scripts/deploy-backend.sh` (type check → zeabur deploy → health verify)
- 前端: `./scripts/deploy-frontend.sh` (type check → vite build → zeabur deploy → verify)

**致命陷阱速查:**
- `zeabur variable delete` 會清空所有變數 → 永遠不用
- `${VAR}` 在 CLI 會被 shell 展開 → Dashboard 設定
- Dockerfile build stage 用 `NODE_ENV=development npm install` → 防 devDeps 被跳過
- Git push 會觸發 nodejs 自動部署覆蓋 Docker → 後端已斷開 GitHub 自動部署
- 所有服務必須監聽 8080 (Zeabur 注入 WEB_PORT=8080)

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
- Use `ErrorCodes.XXX` constants for error responses, never raw strings
- Response helpers in `backend/src/utils/response.ts`: `sendSuccess`, `sendPaginatedSuccess` (auto-calculates `hasMore`), `sendError`, `getSafeErrorMessage` (hides details in production)
- Prisma schema uses `@@map("snake_case")` for table/column names, camelCase in code
- Middleware in `backend/src/middleware/` — `auth.ts` (authenticate/authorize), `errorHandler.ts`, `sanitize.ts`, `auditLog.ts`
- Tests use Jest + Supertest, config in `backend/jest.config.js`, setup in `backend/__tests__/setup.ts`. Coverage threshold: 80% per tested module.
- Task routes are split across `taskCrudRoutes.ts`, `taskActionRoutes.ts`, `taskNoteRoutes.ts` (all mounted under `/tasks`)
- `backend/src/config/env.ts` validates required vars at startup; production crashes on missing `DATABASE_URL`/`JWT_SECRET`. JWT secrets use dev-only defaults in development with console warnings. Slack features auto-disable when `SLACK_BOT_TOKEN` is absent.

## Key Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_USE_MOCK` | Frontend `.env` | `true` = mock data, `false` = real API |
| `VITE_API_BASE_URL` | Frontend `.env` | Backend API URL (default: `/api`) |
| `DATABASE_URL` | Backend `.env` | PostgreSQL connection string |
| `ENABLE_DEV_LOGIN` | Backend `.env` | `true` enables demo/dev login endpoint |
| `JWT_SECRET` | Backend `.env` | JWT signing secret |
| `SLACK_BOT_TOKEN` | Backend `.env` | Enables Slack routes when present |
| `JWT_REFRESH_SECRET` | Backend `.env` | JWT refresh token signing secret |
| `PORT` | Backend `.env` | Server port (default: `3000`). Code reads `PORT`, not `BACKEND_PORT` |
| `DIRECT_URL` | Backend `.env` | Prisma direct DB connection (bypasses connection pooler, used for migrations) |
| `ALLOWED_ORIGINS` | Backend `.env` | Comma-separated CORS origins (e.g., `https://progresshub.zeabur.app`) |
| `FRONTEND_URL` | Backend `.env` | Frontend URL, falls back to first `ALLOWED_ORIGINS` entry |
| `SLACK_CLIENT_ID` | Backend `.env` | Slack OAuth app client ID |
| `SLACK_CLIENT_SECRET` | Backend `.env` | Slack OAuth app client secret |
| `SLACK_SIGNING_SECRET` | Backend `.env` | Slack request signature verification |

Vite env vars are **compile-time constants** — restart dev server after `.env` changes.

## Quality Gate: Wave 完成後聯合 Review (標準流程)

每個 Wave/Batch 完成後，必須執行以下流程才能進入下一輪：

1. **Claude Opus 自審**: 審查所有變更的程式碼品質、安全性、與計畫一致性
2. **Codex GPT-5.3 Review**: `codex exec --full-auto -c 'model="gpt-5.3-codex"'` 對變更做獨立審查
3. **辯證整合**: 若兩方有分歧，以更嚴格的意見為準，修正後重新驗證
4. **通過條件**: 兩方都無 P0/P1 finding → 進入下一輪

不可跳過此流程。每輪結果記錄在 commit message 或 PR description 中。

## References

- `docs/lessons-learned.md` — env vars, Demo feature, Service Factory lessons
- `docs/plans/` — implementation plans for features in progress
