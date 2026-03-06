# Part B: Project Membership System — Implementation Plan (v1)

> **Background:** Part A (SearchableSelect components) completed in 5 commits. Part B code was previously drafted in the main repo working directory but never committed and contains several issues identified through 3-iteration review.

## Review Summary

3 輪迭代 review 發現 10 個問題，按嚴重度分類：

### 必須修復（部署會失敗或功能壞掉）

| # | 嚴重度 | 問題 | 修復方式 |
|---|--------|------|----------|
| 1 | 致命 | 缺少 Prisma migration — schema 有 ProjectMember 但 migrations/ 無對應檔案 | 生成 migration |
| 2 | 高 | `updateTask` 缺少 `ensureProjectMembership` — 改指派人時新負責人不會自動成為專案成員 | 在 updateTask 中 assignedToId/collaborators 變更時呼叫 |
| 3 | 高 | DELETE 回傳 204 空 body，前端 `apiDeleteUnwrap` 嘗試解包 JSON → 解析錯誤 | 後端改回傳 `sendSuccess(res, null)` 200，或前端用 `apiDelete` 不解包 |
| 4 | 中 | `ProjectMembersModal` 開啟時不會載入員工列表 — API 模式下 MultiSearchSelect 可能無選項 | watch 中加 `employeeStore.fetchEmployees()` |

### 建議修復（品質提升）

| # | 嚴重度 | 問題 | 修復方式 |
|---|--------|------|----------|
| 5 | 中 | 「新增成員」按鈕無 loading，快速連點會重複提交 | 加 adding ref + :disabled |
| 6 | 中 | `canManageMembers` 在 Modal 和 Page 各寫一份 | 可抽 composable，但影響小，延後亦可 |

### 可延後

| # | 嚴重度 | 問題 |
|---|--------|------|
| 7 | 低 | sublabel 只顯示部門，不顯示角色 |
| 8 | 低 | `addedById` 無 relation，無法 include 查詢 |
| 9 | 低 | seed-project-members.ts 未整合到主 seed 流程 |

---

## Implementation Tasks

### Task 1: Prisma Schema + Migration

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Changes:**
1. Add `ProjectMember` model with fields: id, projectId, employeeId, role (ProjectMemberRole enum), addedById, createdAt
2. Add `@@unique([projectId, employeeId])` compound unique
3. Add `@@index([employeeId])`, `@@index([projectId])`
4. Add `projectMemberships ProjectMember[]` relation to Employee model
5. Add `members ProjectMember[]` relation to Project model
6. Add `ProjectMemberRole` enum (MEMBER, LEAD)

**Then:**
```bash
cd backend && npx prisma migrate dev --name add_project_members
```

**Commit:** `feat: add ProjectMember model and migration`

---

### Task 2: Backend — Project Members API Routes

**Files:**
- Create: `backend/src/routes/projectMembers.ts`
- Modify: `backend/src/routes/projects.ts` (mount sub-router)

**Key implementation details:**
- `canManageMembers(user, projectId, targetEmployeeIds?)` authorization function
  - ADMIN: always true
  - PM/PRODUCER: check managedProjects includes projectId
  - MANAGER: check manager.department !== null, then verify all target employees share same department
  - Others: false
- GET `/` — list members with employee include
- POST `/` — batch add with `createMany` + `skipDuplicates`, validation via express-validator
- DELETE `/:employeeId` — **use `sendSuccess(res, null)` instead of `res.status(204).send()`** (fixes issue #3)

**Mount in projects.ts:**
```typescript
router.use("/:projectId/members", projectMembersRouter);
```
Place BEFORE the catch-all `/:id` routes to avoid route shadowing. Actually — Express param routes like `GET /:id` only match single path segments, so `GET /abc/members` (two segments) won't match `/:id`. Safe to place after.

**Commit:** `feat: add project member management API routes`

---

### Task 3: Backend — Filter Projects by Membership + Auto-upsert

**Files:**
- Modify: `backend/src/services/projectService.ts`
- Modify: `backend/src/routes/projects.ts` (pass user context)
- Modify: `backend/src/services/taskService.ts`

**projectService.ts changes:**
- Add `userId?: string` and `userRole?: string` to `ProjectListParams`
- In `getProjects`: if `userRole === 'EMPLOYEE'`, add `where.members = { some: { employeeId: userId } }`

**projects.ts route changes:**
- Pass `userId: req.user!.userId` and `userRole: req.user!.permissionLevel` to `getProjects()`

**taskService.ts changes (fixes issue #2):**
- `ensureProjectMembership` private method already exists for `createTask`
- Add call in `updateTask` when `assignedToId` or `collaborators` are modified:
```typescript
if (data.assignedToId !== undefined || data.collaborators !== undefined) {
  const task = await prisma.task.findUnique({ where: { id }, select: { projectId: true } });
  if (task) {
    const memberIds = [
      data.assignedToId,
      ...(data.collaborators || [])
    ].filter(Boolean) as string[];
    if (memberIds.length) await this.ensureProjectMembership(task.projectId, memberIds);
  }
}
```

**Commit:** `feat: filter projects by membership and auto-upsert on task update`

---

### Task 4: Seed Script for Existing Data

**Files:**
- Create: `backend/prisma/seed-project-members.ts`

**Logic:**
1. Query all tasks with assignedToId or non-empty collaborators
2. Query all employees with non-empty managedProjects
3. Collect unique (projectId, employeeId) pairs via Map
4. `createMany` with `skipDuplicates`

**Commit:** `feat: add project member seed script for existing data`

---

### Task 5: Frontend — Service + Store Integration

**Files:**
- Modify: `packages/frontend/src/services/projectService.ts`
- Modify: `packages/frontend/src/stores/projects.ts`

**projectService.ts changes:**
- Add `ProjectMember` interface
- Add to `ProjectServiceInterface`: `getProjectMembers`, `addProjectMembers`, `removeProjectMember`
- Implement in `ApiProjectService` using `apiGetUnwrap`, `apiPostUnwrap`, `apiDelete` (NOT `apiDeleteUnwrap` — backend returns 200 with null data)
- Stub in `MockProjectService`

**projects.ts store changes:**
- Add `projectMembers` ref, `loadingMembers` ref
- Add `fetchProjectMembers`, `addProjectMembers`, `removeProjectMember` actions
- `removeProjectMember`: optimistic update (filter from local array)

**Commit:** `feat: add project member service and store actions`

---

### Task 6: Frontend — ProjectMembersModal + Page Integration

**Files:**
- Create: `packages/frontend/src/components/project/ProjectMembersModal.vue`
- Modify: `packages/frontend/src/pages/ProjectsPage.vue`

**Modal implementation:**
- Props: `modelValue`, `projectId`, `projectName`
- On open (watch modelValue): fetch project members AND ensure employees are loaded (fixes issue #4)
- Current members list with remove button (X)
- Add members section: MultiSearchSelect filtered to exclude existing members
- MANAGER: further filter to same department employees
- Add button with loading state to prevent double-submit (fixes issue #5)

**ProjectsPage changes:**
- Import and mount ProjectMembersModal
- Add "成員" button per project card (visible for PM/MANAGER/ADMIN)
- State: `showMembersModal`, `selectedProjectForMembers`

**Commit:** `feat: add project members management modal`

---

### Task 7: Tests + Type Check + Build Verification

**Steps:**
```bash
# Type check
pnpm --filter frontend exec vue-tsc --noEmit

# Frontend tests
pnpm --filter frontend exec vitest run

# Backend tests
cd backend && npx jest --no-coverage

# Frontend build
pnpm --filter frontend build
```

**Commit:** fix any issues found

---

### Task 8: Deployment

1. Push to trigger Zeabur build
2. Run migration on production database
3. Run `seed-project-members.ts` on production
4. Verify with browser:
   - Login as EMPLOYEE → only sees assigned projects
   - Login as PM → sees all projects, can manage members
   - Login as MANAGER → sees all projects, can only add/remove own department employees
   - Create task with assignee → check ProjectMember auto-created

---

## Execution Strategy

- Tasks 1-4 (backend): sequential, each depends on previous
- Task 5 (frontend service/store): can start after Task 2 (needs to know API contract)
- Task 6 (frontend modal): depends on Task 5
- Task 7 (tests): after all code changes
- Task 8 (deployment): after tests pass

Estimated: 7 implementation tasks + 1 deployment task

**Parallel opportunity:** Tasks 5+6 (frontend) can run in parallel with Tasks 3+4 (backend) since API contract is defined in Task 2.
