# Cross-Model Iterative Review — 2026-03-15

## Overview
- **Scope**: ProgressHub full codebase (focus: recent Wave 1-4 commits + all backend routes)
- **Rounds**: 6 (Claude self-review + Codex GPT-5.4 x3 + Gemini 2.5 Pro x3)
- **READINESS**: ~65%
- **Models**: Claude Opus 4.6 (adjudicator), Codex GPT-5.4, Gemini 2.5 Pro

## P0 — Must Fix Before Deploy (3)

### P0-1: Auth cache not invalidated on permission downgrade
- **File**: `backend/src/routes/employees.ts:316`
- **Issue**: `PUT /employees/:id` only calls `invalidateAuthCache` when `isActive === false`, but not when `permissionLevel` changes
- **Impact**: Demoted accounts retain old privileges for up to 5 minutes (cache TTL)
- **Fix**: Call `invalidateAuthCache(id)` whenever `permissionLevel` is changed

### P0-2: Auth cache not invalidated on employee deletion
- **File**: `backend/src/routes/employees.ts:371`
- **Issue**: `DELETE /employees/:id` calls `softDeleteEmployee()` but never `invalidateAuthCache`
- **Impact**: Soft-deleted accounts can continue accessing API for 5 minutes
- **Fix**: Add `invalidateAuthCache(req.params.id)` after successful soft delete

### P0-3: dev-login accepts arbitrary permissionLevel in production
- **File**: `backend/src/routes/auth.ts:155`
- **Issue**: `POST /api/auth/dev-login` accepts `permissionLevel` body param (validated by express-validator). When `ENABLE_DEV_LOGIN=true` in production, anyone can POST with `permissionLevel: "ADMIN"` to get full admin access
- **Impact**: Complete privilege escalation — no credentials needed
- **Fix**: Either (a) strip `permissionLevel` from body and always use a safe default, or (b) add `NODE_ENV !== 'production'` guard, or (c) remove `permissionLevel` acceptance entirely

## P1 — High Priority (21)

### P1-4: assigneeId not validated as project member
- **File**: `backend/src/routes/taskActionRoutes.ts:168-180`
- **Issue**: `claimTask` with `assigneeId` only validates UUID format, not project membership
- **Fix**: Add `prisma.projectMember.findUnique()` check before assignment

### P1-5: sanitizeUrl bypassed by protocol-relative URLs
- **File**: `backend/src/middleware/sanitize.ts:665-676`
- **Issue**: Input `//evil.com/attack` has no colon, treated as relative URL and passed through
- **Fix**: Check for `//` prefix and reject or prepend `https:`

### P1-6: GitLab enabled check incomplete (missing SALT)
- **File**: `backend/src/config/env.ts:125`
- **Issue**: `gitlabEnabled` only checks `GITLAB_ENCRYPTION_KEY`, but production also requires `GITLAB_ENCRYPTION_SALT`
- **Fix**: Include `GITLAB_ENCRYPTION_SALT` in the `gitlabEnabled` check

### P1-7: Task delete permission mismatch frontend/backend
- **File**: `packages/frontend/src/pages/TaskDetailPage.vue:56` vs `backend/src/routes/taskCrudRoutes.ts:454`
- **Issue**: Frontend allows PRODUCER to see delete button, backend only allows PM/ADMIN → stable 403 UX regression
- **Fix**: Revert to using `task.canDelete` from API response, or sync backend to include PRODUCER

### P1-8: Task update permissions too broad
- **File**: `backend/src/routes/taskCrudRoutes.ts:368`
- **Issue**: `PUT /tasks/:id` uses `authorizeTaskAccess()` which allows creator/assignee/collaborator/producer to update all fields including `assignedToId`, `status`, `milestoneId`
- **Fix**: Filter updatable fields by role, or split into role-specific update endpoints

### P1-9: Nested progress API can overwrite others' progress
- **File**: `backend/src/routes/taskNoteRoutes.ts:150`
- **Issue**: `POST /tasks/:taskId/progress` only has `requireResourceOwner("task")`, no assignee/collaborator check
- **Fix**: Share authorization logic with `/api/progress` or add assignee/collaborator validation

### P1-10: Progress reporting bypasses state machine
- **File**: `backend/src/services/taskService.ts:583`, `backend/src/services/progressService.ts:122`
- **Issue**: `updateTaskProgress` sets status to DONE when progress=100%, bypassing `updateStatus` state machine which doesn't allow PAUSED/BLOCKED → DONE
- **Fix**: Consolidate state transitions to single helper, validate current status before allowing DONE

### P1-11: unclaimTask reset incomplete
- **File**: `backend/src/services/taskService.ts:435`
- **Issue**: Only clears `status/assignedToId/progressPercentage`, leaves `actualStartDate/actualEndDate/closedAt/pauseReason/pauseNote/pausedAt/blockerReason`
- **Fix**: Clear all execution-related fields on unclaim

### P1-12: Cross-project milestone assignment
- **File**: `backend/src/services/taskService.ts:348`
- **Issue**: `updateTask` doesn't verify `milestoneId` belongs to same project as the task
- **Fix**: Add `milestone.projectId === task.projectId` check

### P1-13: progressLog IDOR
- **File**: `backend/src/middleware/projectAuth.ts:265`
- **Issue**: `requireResourceOwner` for `progressLog` only checks project membership, not ownership
- **Fix**: Add `record.employeeId === user.userId` check (except ADMIN/PM)

### P1-14: TimeEntry can be modified after approval
- **File**: `backend/src/routes/timeEntries.ts:390,465`
- **Issue**: PUT/DELETE don't check `existing.status` — approved entries can be modified/deleted by owner
- **Fix**: Block modifications when status !== PENDING (except admin/approver via dedicated endpoint)

### P1-15: TimeEntry taskId not validated against projectId
- **File**: `backend/src/services/timeEntryService.ts:133`
- **Issue**: `createTimeEntry` validates project membership but not that taskId belongs to that project
- **Fix**: Add task-project association check in `validateTimeEntry`

### P1-16: Employee time stats cross-project data leak
- **File**: `backend/src/routes/timeStats.ts:111`, `backend/src/services/timeStatsService.ts:180`
- **Issue**: Route checks "at least one shared project", but service returns ALL projects' stats
- **Fix**: Pass `scopedProjectIds` to `getEmployeeStats()` and filter all queries

### P1-17: Logout doesn't revoke refresh token + race condition
- **File**: `packages/frontend/src/services/authService.ts:62`, `backend/src/routes/auth.ts:304`
- **Issue**: Frontend logout doesn't send refreshToken; in-flight refresh can write new token back to localStorage after logout
- **Fix**: Send refreshToken on logout, add logout generation/abort mechanism

### P1-18: Dashboard global stats leak
- **File**: `backend/src/services/dashboardService.ts:44,126`
- **Issue**: `getStats` treats PM/PRODUCER as `isGlobalRole`, showing all-system task counts; `getWorkloads` exposes company-wide member counts
- **Fix**: Filter by `projectIds` for non-ADMIN roles

### P1-19: GitLab Issue mapping lacks task/project auth
- **File**: `backend/src/routes/gitlab/issues.ts:91`
- **Issue**: Only validates connectionId ownership, not taskId project membership
- **Fix**: Add project membership check for the task being mapped

### P1-20: GitLab activities cross-project time entry injection
- **File**: `backend/src/routes/gitlab/activities.ts:249`
- **Issue**: Accepts client-provided taskId without project membership verification
- **Fix**: Add task/project membership and assignee/collaborator check

### P1-21: Slack bypasses isActive check
- **File**: `backend/src/routes/slack.ts:59`
- **Issue**: `getEmployeeBySlackId` doesn't check `isActive`, disabled accounts can still use slash commands
- **Fix**: Add `isActive: true` to the query or check after retrieval

### P1-22: MANAGER can manage higher-privilege accounts
- **File**: `backend/src/routes/projectMembers.ts:49`
- **Issue**: `canManageMembers` for MANAGER only checks department, not target's permissionLevel
- **Fix**: Add target role ceiling — MANAGER can only manage EMPLOYEE level

### P1-23: Progress route PRODUCER role omission
- **File**: `backend/src/routes/progress.ts:70-74`
- **Issue**: PRODUCER not in the role exemption list, treated as regular employee
- **Fix**: Add `PermissionLevel.PRODUCER` to the role list

### P1-24: GitLab OAuth state not bound to session
- **File**: `backend/src/routes/gitlab/connections.ts:184`
- **Issue**: OAuth state only contains employeeId + instanceId, not bound to browser session
- **Fix**: Bind state to HttpOnly cookie nonce or PKCE verifier; verify current user matches state

## P2 — Medium Priority (Notable)

- E2E CI job `continue-on-error: true` (ci.yml:128)
- Rate limiter threshold too high (1000/15min for auth)
- Rate limiter path mismatch (`/api/auth/login` doesn't exist)
- CORS ALLOWED_ORIGINS empty string handling
- `/tasks/pool` contract mismatch (returns all tasks, not just UNCLAIMED)
- `isDeleting` global flag instead of per-item tracking
- `fetchTasks` limit=500 without UI truncation notice
- Slack commands timeout risk (3s limit)
- GitLab webhook missing IP verification
- Project member self-delete lockout risk
- Token refresh non-atomicity
- Logout cleanup incomplete (localStorage residue)
- Dashboard workload DoS risk (in-memory aggregation of 10k+ records)

## Suggested Fix Order

### Wave 1 (P0 + Critical P1) — Deploy + QA first
1. P0-1: Auth cache on permission change
2. P0-2: Auth cache on employee delete
3. P0-3: dev-login permissionLevel
4. P1-5: sanitizeUrl bypass
5. P1-7: Task delete permission sync
6. P1-14: TimeEntry status check
7. P1-17: Logout refresh token
8. P1-21: Slack isActive check

### Wave 2 (Remaining P1) — Deploy + QA second
9-24. All remaining P1s

### Wave 3 (P2) — Optional improvements
All P2s as time permits

---

## Round 2: Frontend Pages Review (16:17)

### Scope
LoginPage.vue, UserManagementPage.vue, TaskCreatePage.vue, ProjectsPage.vue

### Reviewers
- Claude Opus 4.6 (self-review)
- Codex GPT-5.4 (READINESS: 38%, VERDICT: NO)
- Gemini 2.5 Pro (READINESS: 82%, VERDICT: NO)

### Adjudicated Findings

| # | Sev | Finding | Source | Verdict | Action |
|---|-----|---------|--------|---------|--------|
| F1 | ~~P0~~ | createdBy spoofing | Codex | REJECT — backend uses req.user.userId from JWT | None |
| F2 | ~~P0~~ | route.query.error XSS | Gemini | REJECT — Vue {{ }} auto-escapes, Toast uses text | None |
| F3 | P1 | functionType edit not saved | Codex | AGREE | Fixed (commit 3e6981f) |
| F4 | P1 | createUser/saveUser silent failure | Codex | AGREE | Fixed (commit 3e6981f) |
| F5 | P1 | Project create shows status selector | Codex | AGREE | Fixed (commit 3e6981f) |
| F6 | P1 | saveProject no isSaving guard | Codex | AGREE | Fixed (commit 3e6981f) |
| F7 | P2 | EMPLOYEE can forge ASSIGNED task | Codex | Backend has role check — frontend-only | Deferred |
| F8 | P2 | saveUser no submit-time auth check | Codex | Backend middleware handles — P2 | Deferred |
| F9 | P2 | Slack authUrl no scheme check | Codex | Backend generates trusted URL — low risk | Deferred |
| F10 | P2 | getProjectStats O(N*M) | Both | Small dataset (<20 projects) — P3 | Deferred |

### Verification
- Type check: frontend passed
- Unit tests: 311 passed
- Playwright E2E: 111 passed, 0 failed
- Deployed: frontend + backend

---

## Round 3: Frontend Stores + Services Review (17:17)

### Scope
stores/auth.ts, services/api.ts, stores/tasks.ts, stores/employees.ts

### Reviewers
- Claude Opus 4.6 (self-review)
- Codex GPT-5.4 (READINESS: 38%, VERDICT: NO)

### Adjudicated Findings

| # | Sev | Finding | Source | Verdict | Action |
|---|-----|---------|--------|---------|--------|
| S1 | ~~P0~~ | localStorage tokens XSS-vulnerable | Codex | PARTIAL → P2 — standard SPA pattern, no known XSS | Deferred |
| S2 | P1 | forceLogout doesn't clear Pinia state | Codex | AGREE | Fixed (commit e7e70b0) |
| S3 | P1 | Concurrent per-task optimistic mutations race | Codex | AGREE | Fixed (commit e7e70b0) |
| S4 | P1 | poolTasks not synced after mutations | Codex | AGREE | Fixed (commit e7e70b0) |
| S5 | P1 | Employee updateEmployee no rollback on failure | Codex | AGREE | Fixed (commit e7e70b0) |
| S6 | P2 | getByDepartment creates fresh computed per call | Codex | AGREE — low impact | Deferred |

### Verification
- Type check: frontend passed
- Unit tests: 311 passed
- Playwright E2E: 111 passed, 0 failed
- Deployed: frontend

---

## Round 4: Frontend Composables Review (18:17)

### Scope
useGantt.ts, useGanttData.ts, useFormValidation.ts, useTaskModal.ts, useStatusUtils.ts, useToast.ts, useFormatDate.ts, useTheme.ts

### Reviewers
- Claude Opus 4.6 (self-review)
- Codex GPT-5.4 (READINESS: 42%, VERDICT: NO) — 8 P1 + 1 P2
- Gemini 2.5 Pro (READINESS: 82%, VERDICT: NO) — 2 P1 + 4 P2 + 2 P3

### Adjudicated Findings

| # | Sev | Finding | Source | Verdict | Action |
|---|-----|---------|--------|---------|--------|
| Q1 | P1 | getAncestorChain infinite loop on cycles | Both | AGREE | Fixed (5cf7bcc) |
| Q2 | P1 | useTaskModal.execute no loading guard | Both | AGREE | Fixed (5cf7bcc) |
| Q3 | P1 | Invalid dates poison Gantt range (NaN) | Codex | AGREE | Fixed (5cf7bcc) |
| Q4 | P2 | Date UTC parsing in useFormatDate | Codex | PARTIAL — UTC+8 only | Deferred |
| Q5 | P2 | toISOString returns UTC date | Codex | PARTIAL — same | Deferred |
| Q6 | P2 | getRelativeDays off-by-one | Codex | AGREE — display only | Deferred |
| Q7 | P2 | dateRange stale closure | Codex | PARTIAL — inline call | Deferred |
| Q8 | P2 | canSubmit true before validation | Codex | PARTIAL — pages own logic | Deferred |
| Q9 | P2 | Theme SSR unsafe | Both | PARTIAL — SPA only | Deferred |
| Q10 | P2 | matchMedia listener never removed | Both | AGREE — P2 | Deferred |

### Round 4 Verification
- Type check: frontend passed
- Unit tests: 311 passed
- Playwright E2E: 111 passed, 0 failed
- Deployed: frontend

---

## Round 5: Frontend Components Review (19:17)

### Scope
task/TaskForm.vue, task/TaskDetailModals.vue, task/TaskRelationModal.vue, task/TaskCard.vue, project/ProjectMembersModal.vue

### Reviewers
- Claude Opus 4.6 (self-review)
- Codex GPT-5.4 (READINESS: 42%, VERDICT: NO) — 2 P0 + 5 P1
- Gemini 2.5 Pro (READINESS: 85%, VERDICT: YES) — 2 P1 + 3 P2 + 1 P3

### Adjudicated Findings

| # | Sev | Finding | Source | Verdict | Action |
|---|-----|---------|--------|---------|--------|
| R1 | P0→P2 | canManage client-only auth | Codex | Backend has middleware | Deferred |
| R2 | P0→P1 | GitLab URL accepts any scheme | Both | AGREE — stored XSS risk | Fixed (fcc3fae) |
| R3 | P1 | Department change leaves invalid assignee | Codex | AGREE | Fixed (fcc3fae) |
| R4 | P1 | Function-tag button type=submit | Codex | AGREE | Fixed (fcc3fae) |
| R5 | P1→P2 | Modal nav resets on task prop change | Codex | PARTIAL — normal use unaffected | Deferred |
| R6 | P1 | ProjectMembers stale on projectId change | Codex | AGREE | Fixed (fcc3fae) |
| R7 | P1→P2 | isOverdue timezone sensitivity | Both | Same as Round 4 — UTC+8 | Deferred |
| R8 | P2 | removeMember no confirmation | Both | AGREE | Fixed (fcc3fae) |
| R9 | P1→P3 | Bidirectional binding inconsistency | Gemini | Code has NOTE explaining intent | No action |

### Round 5 Verification
- Type check: frontend passed
- Unit tests: 311 passed
- Playwright E2E: 112 passed, 0 failed
- Deployed: frontend

---

## Round 6: Backend Deep Review — dashboard, scheduler, projects (20:17)

### Scope
routes/dashboard.ts, scheduler/reminder.ts, routes/projects.ts

### Reviewers
- Claude Opus 4.6 (self-review)
- Codex GPT-5.4 (READINESS: 74%, VERDICT: NO) — 2 P0 + 2 P1 + 2 P2
- Gemini 2.5 Pro (READINESS: 75%, VERDICT: NO) — 1 P0 + 4 P1 + 1 P2 + 1 P3

### Adjudicated Findings

| # | Sev | Finding | Source | Verdict | Action |
|---|-----|---------|--------|---------|--------|
| T1 | P0→P2 | /names unauthenticated endpoint | Both | PARTIAL — intentional for demo login, minimal data | Deferred |
| T2 | P0→P1 | Mass-assignment req.body to service | Both | AGREE — whitelist fields | Fixed (0de5a98) |
| T3 | P1 | Slack mrkdwn injection via employee name | Codex | AGREE | Fixed (0de5a98) |
| T4 | P1 | requireProjectMember blocks ADMIN | Codex | REJECT — ADMIN bypass exists in middleware | No action |
| T5 | P1→P2 | Advisory lock ID collision | Gemini | Theoretical — single scheduler | Deferred |
| T6 | P1→P2 | N+1 query in reminder | Both | Perf issue, <50 employees | Deferred |
| T7 | P1 | req.user?.userId optional chain | Gemini | REJECT — authenticate guarantees presence | No action |
| T8 | P2→P3 | PII in logs | Codex | Internal system | Deferred |

### Round 6 Verification
- Type check: backend passed
- Unit tests: 308 passed
- Playwright E2E: 112 passed, 0 failed
- Deployed: backend

---

## Round 7: Backend Mappers + Utils Review (21:30)

### Scope
utils/sanitize.ts, utils/gitlab/encryption.ts, utils/gitlab/apiClient.ts, utils/response.ts, mappers/taskMapper.ts, utils/gitlab/webhookVerifier.ts

### Reviewers
- Claude Opus 4.6 (self-review)
- Codex GPT-5.4 (READINESS: 90%, VERDICT: NO) — 2 P0 + 1 P1 + 1 P3
- Gemini 2.5 Pro (READINESS: 60%, VERDICT: NO) — 2 P0 + 3 P1 + 1 P2

### Fix Plan Review
- Gemini: **SAFE** — 計畫設計嚴謹，沒有迴歸風險

### Adjudicated Findings

| # | Sev | Finding | Source | Verdict | Action |
|---|-----|---------|--------|---------|--------|
| U1 | P0→P1 | SSRF via GitLab baseUrl | Both | AGREE — admin-only but needs validation | Fixed (3e98258) |
| U2 | P0→P1 | sendError details leaks in production | Both | AGREE | Fixed (3e98258) |
| U3 | P0→P1 | scryptSync DoS — key not cached | Gemini | AGREE | Fixed (3e98258) |
| U4 | P0→P2 | AES-GCM IV 16→12 | Gemini | PARTIAL — breaks existing data | Deferred |
| U5 | P1 | Axios error.message exposed | Codex | AGREE | Fixed (3e98258) |
| U6 | P1→P3 | Regex sanitizer bypass risk | Gemini | PARTIAL — entity escape makes it safe | Deferred |
| U7 | P1→P2 | Hardcoded default salt | Gemini | Production has guard | Deferred |
| U8 | P3 | sanitize naming | Codex | AGREE — low priority | Deferred |

### Round 7 Verification
- Type check: backend passed
- Unit tests: 308 passed
- CI: Backend Lint, Frontend Lint, Test, Build all success
- Playwright E2E: 110 passed, 0 failed
- Deployed: backend
