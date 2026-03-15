# Searchable Select + Project Membership Implementation Plan (v3)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 1) Replace plain employee dropdowns with searchable combobox; 2) Implement project membership: employees belong to multiple projects, department managers (MANAGER) manage their department's project assignments, EMPLOYEE only sees assigned projects.

**Architecture:**
- **Part A**: Reusable `SearchableSelect` (single) and `MultiSearchSelect` (multi) components replace native `<select>` for employees. Existing `Select` component stays for short lists (projects, functions, status).
- **Part B**: `ProjectMember` join table (many-to-many). Backend `GET /api/projects` filters by membership for EMPLOYEE role. MANAGER gets management UI scoped to their department. Auto-upsert membership on task assignment. PM/PRODUCER/ADMIN always see all projects.

**Tech Stack:** Vue 3 + TypeScript, Prisma + PostgreSQL, Express

**Key Design Decisions:**
1. **MANAGER scope**: Can add/remove project memberships only for employees whose `department` matches their own. If MANAGER's department is null, they cannot manage anyone.
2. **PM scope**: PM sees all projects (same as current behavior). PM can manage members of projects in their `managedProjects` array.
3. **Visibility**: EMPLOYEE sees only projects where they are a member. MANAGER sees all projects (they need the full view to manage assignments). PM/PRODUCER/ADMIN see all.
4. **UI entry point**: Project member management lives in the existing ProjectsPage as a "成員" action button per project, opening a modal. NOT a separate page.
5. **Auto-membership**: When a task is created/updated with an assignee or collaborators, their ProjectMember records are auto-upserted. This keeps membership in sync without manual effort.

---

## Part A: Searchable Select Components

### Task 1: Create SearchableSelect component

**Files:**
- Create: `packages/frontend/src/components/common/SearchableSelect.vue`

**Step 1: Create the component**

Props interface matching existing `Select.vue` conventions:
```typescript
export interface SearchableOption {
  value: string
  label: string
  sublabel?: string    // e.g. "美術部 · 一般同仁"
  disabled?: boolean
}

interface Props {
  modelValue?: string
  options: SearchableOption[]
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
}
```

Behavior:
- Click trigger → open dropdown with search input (auto-focused)
- Type to filter by label + sublabel
- Click option → select, close
- Clear button (X) when selected and not required
- Click outside → close
- Escape key → close
- Uses `.input` class for consistency with design system
- dropdown max-height 240px with overflow scroll

**Step 2: Run type check**

```bash
pnpm --filter frontend exec vue-tsc --noEmit
```

**Step 3: Commit**

```bash
git add packages/frontend/src/components/common/SearchableSelect.vue
git commit -m "feat: add SearchableSelect component with search filtering"
```

### Task 2: Create MultiSearchSelect for multi-value selection

**Files:**
- Create: `packages/frontend/src/components/common/MultiSearchSelect.vue`

**Step 1: Create the component**

Props:
```typescript
interface Props {
  modelValue: string[]
  options: SearchableOption[]
  label?: string
  placeholder?: string
  disabled?: boolean
}
```

Behavior:
- Selected items shown as removable tags in trigger area
- Click trigger → open dropdown with search input
- Clicking an option toggles it (add if not selected, remove if selected)
- Selected options show a checkmark icon
- Individual tag × button removes that item
- Dropdown stays open after selection (multi-select UX)
- Click outside or Escape → close

**Step 2: Run type check**

**Step 3: Commit**

```bash
git add packages/frontend/src/components/common/MultiSearchSelect.vue
git commit -m "feat: add MultiSearchSelect component for multi-value selection"
```

### Task 3: Add searchable options to employee store

**Files:**
- Modify: `packages/frontend/src/stores/employees.ts`
- Reference: `packages/frontend/src/constants/filterOptions.ts` for label mappings

**Step 1: Add searchableEmployeeOptions computed**

```typescript
// Add to stores/employees.ts
import { DEPARTMENT_MAP, ROLE_MAP } from '@/constants/filterOptions'

const searchableEmployeeOptions = computed<SearchableOption[]>(() =>
  employees.value.map(e => ({
    value: e.id,
    label: e.name,
    sublabel: [DEPARTMENT_MAP[e.department], ROLE_MAP[e.userRole]].filter(Boolean).join(' · '),
  })),
)
```

Note: Need to check if `DEPARTMENT_MAP` / `ROLE_MAP` exist in constants, or create simple lookup objects.

**Step 2: Export from store**

**Step 3: Run type check**

**Step 4: Commit**

### Task 4: Replace employee selects in TaskForm

**Files:**
- Modify: `packages/frontend/src/components/task/TaskForm.vue`

**Step 1: Replace assignee `<select>` with `<SearchableSelect>`**

Replace lines 171-176 (the `<select v-model="form.assigneeId">`) with:
```vue
<SearchableSelect
  :model-value="form.assigneeId"
  :options="filteredEmployeeOptions"
  :label="assigneeLabel"
  :required="assigneeRequired"
  placeholder="搜尋負責人..."
  @update:model-value="form.assigneeId = $event"
/>
```

Where `filteredEmployeeOptions` is a computed that maps `filteredEmployees` to `SearchableOption[]`.

**Step 2: Replace collaborator buttons with `<MultiSearchSelect>`**

Replace lines 183-215 (the button-based collaborator picker) with:
```vue
<MultiSearchSelect
  :model-value="form.collaboratorIds"
  :options="filteredEmployeeOptions"
  label="協作者"
  placeholder="搜尋協作者..."
  @update:model-value="emit('update:collaboratorIds', $event)"
/>
```

**Step 3: Update TaskForm props** — change `employees: MockEmployee[]` to `employees: SearchableOption[]` or keep existing and map internally.

Better approach: Map internally so parent components don't need to change:
```typescript
const filteredEmployeeOptions = computed<SearchableOption[]>(() =>
  filteredEmployees.value.map(e => ({
    value: e.id,
    label: e.name,
    sublabel: e.department,
  })),
)
```

**Step 4: Run type check + tests**

**Step 5: Commit**

### Task 5: Replace employee select in GanttFilters

**Files:**
- Modify: `packages/frontend/src/components/gantt/GanttFilters.vue`
- Modify: `packages/frontend/src/pages/GanttPage.vue`

**Step 1: Update GanttFilters**

Change the employee `<Select>` to `<SearchableSelect>`:
- Update the `employeeOptions` prop type from `Array<{ value: string; label: string }>` to `SearchableOption[]`
- Replace `<Select v-model="selectedEmployee" label="員工" :options="employeeOptions" />` with `<SearchableSelect>`

**Step 2: Update GanttPage employeeOptions**

In GanttPage.vue, update `employeeOptions` computed to include sublabels:
```typescript
const employeeOptions = computed<SearchableOption[]>(() => [
  { value: '', label: '全部員工' },
  ...employeeStore.searchableEmployeeOptions,
])
```

**Step 3: Run type check + tests**

**Step 4: Commit**

```bash
git commit -m "feat: replace employee dropdowns with SearchableSelect in TaskForm and Gantt"
```

---

## Part B: Project Membership System

### Task 6: Add ProjectMember model to Prisma schema

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Step 1: Add model, enum, and relations**

```prisma
model ProjectMember {
  id         String            @id @default(uuid())
  projectId  String            @map("project_id")
  employeeId String            @map("employee_id")
  role       ProjectMemberRole @default(MEMBER)
  addedById  String?           @map("added_by_id")
  createdAt  DateTime          @default(now()) @map("created_at")

  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  employee   Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  @@unique([projectId, employeeId])
  @@index([employeeId])
  @@index([projectId])
  @@map("project_members")
}

enum ProjectMemberRole {
  MEMBER
  LEAD
}
```

Add to Employee model: `projectMemberships ProjectMember[]`
Add to Project model: `members ProjectMember[]`

**Step 2: Generate migration**

```bash
cd backend && npx prisma migrate dev --name add_project_members
```

**Step 3: Commit**

### Task 7: Seed existing data into ProjectMember

**Files:**
- Create: `backend/prisma/seed-project-members.ts`

**Step 1: Write idempotent seed script**

```typescript
// Query all tasks with assignedToId or non-empty collaborators
// Collect unique (projectId, employeeId) pairs
// Upsert each pair into ProjectMember (skipDuplicates)
const tasks = await prisma.task.findMany({
  where: { OR: [{ assignedToId: { not: null } }, { collaborators: { isEmpty: false } }] },
  select: { projectId: true, assignedToId: true, collaborators: true },
})

const pairs = new Set<string>()
for (const t of tasks) {
  if (t.assignedToId) pairs.add(`${t.projectId}|${t.assignedToId}`)
  for (const c of t.collaborators) pairs.add(`${t.projectId}|${c}`)
}

// Also add managedProjects relationships
const managers = await prisma.employee.findMany({
  where: { managedProjects: { isEmpty: false } },
  select: { id: true, managedProjects: true },
})
for (const m of managers) {
  for (const pid of m.managedProjects) pairs.add(`${pid}|${m.id}`)
}

await prisma.projectMember.createMany({
  data: [...pairs].map(p => {
    const [projectId, employeeId] = p.split('|')
    return { projectId, employeeId }
  }),
  skipDuplicates: true,
})
```

**Step 2: Run seed**

```bash
cd backend && npx ts-node prisma/seed-project-members.ts
```

**Step 3: Commit**

### Task 8: Backend — Project membership API routes

**Files:**
- Create: `backend/src/routes/projectMembers.ts`
- Modify: `backend/src/routes/projects.ts` — mount sub-router

**Step 1: Create projectMembers router**

```
GET    /api/projects/:projectId/members           — List members (authenticated)
POST   /api/projects/:projectId/members           — Add members (MANAGER for own dept, PM for managed projects, ADMIN)
DELETE /api/projects/:projectId/members/:employeeId — Remove member (same auth)
```

**Step 2: Implement authorization logic**

```typescript
const canManageMembers = async (user: AuthUser, projectId: string, targetEmployeeIds?: string[]) => {
  if (user.role === 'ADMIN') return true

  if (user.role === 'PM' || user.role === 'PRODUCER') {
    // PM can manage members of projects they manage
    const pm = await prisma.employee.findUnique({ where: { id: user.id }, select: { managedProjects: true } })
    return pm?.managedProjects.includes(projectId) ?? false
  }

  if (user.role === 'MANAGER') {
    // MANAGER can only add/remove employees from their own department
    const manager = await prisma.employee.findUnique({ where: { id: user.id }, select: { department: true } })
    if (!manager?.department) return false

    if (targetEmployeeIds) {
      const targets = await prisma.employee.findMany({
        where: { id: { in: targetEmployeeIds } },
        select: { department: true },
      })
      return targets.every(t => t.department === manager.department)
    }
    return true
  }

  return false
}
```

**Step 3: GET handler — list members with employee details**

```typescript
const members = await prisma.projectMember.findMany({
  where: { projectId },
  include: {
    employee: { select: { id: true, name: true, email: true, department: true, permissionLevel: true } },
  },
  orderBy: { createdAt: 'asc' },
})
```

**Step 4: POST handler — add members (batch)**

Body: `{ employeeIds: string[] }`
Use `createMany` with `skipDuplicates: true`.

**Step 5: DELETE handler — remove member**

```typescript
await prisma.projectMember.delete({
  where: { projectId_employeeId: { projectId, employeeId } },
})
```

**Step 6: Mount in projects router**

```typescript
// In backend/src/routes/projects.ts
import projectMembersRouter from './projectMembers'
router.use('/:projectId/members', projectMembersRouter)
```

**Step 7: Run backend tests**

**Step 8: Commit**

### Task 9: Backend — Filter projects by membership

**Files:**
- Modify: `backend/src/services/projectService.ts` — add userId/userRole params
- Modify: `backend/src/routes/projects.ts` — pass user context

**Step 1: Update ProjectListParams**

```typescript
export interface ProjectListParams {
  page?: number
  limit?: number
  status?: ProjectStatus
  search?: string
  userId?: string       // NEW
  userRole?: string     // NEW
}
```

**Step 2: Add membership filter in getProjects**

```typescript
// Only EMPLOYEE sees filtered list
// MANAGER/PM/PRODUCER/ADMIN see all projects
if (params.userId && params.userRole === 'EMPLOYEE') {
  where.members = { some: { employeeId: params.userId } }
}
```

**Step 3: Update GET /api/projects route**

```typescript
router.get('/', authenticate, async (req, res, next) => {
  // ... existing param parsing ...
  const result = await projectService.getProjects({
    ...params,
    userId: req.user!.id,
    userRole: req.user!.role,
  })
  // ...
})
```

**Step 4: Run tests**

**Step 5: Commit**

### Task 10: Backend — Auto-upsert membership on task create/update

**Files:**
- Modify: `backend/src/services/taskService.ts`

**Step 1: Extract helper function**

```typescript
private async ensureProjectMembership(
  projectId: string,
  employeeIds: string[],
  tx?: TransactionClient,
): Promise<void> {
  const db = tx || prisma
  const validIds = employeeIds.filter(Boolean)
  if (validIds.length === 0) return

  await db.projectMember.createMany({
    data: validIds.map(employeeId => ({ projectId, employeeId })),
    skipDuplicates: true,
  })
}
```

**Step 2: Call in createTask**

After successful task creation, call:
```typescript
const memberIds = [data.assignedToId, ...(data.collaborators || [])].filter(Boolean) as string[]
await this.ensureProjectMembership(data.projectId, memberIds)
```

**Step 3: Call in updateTask**

If `assignedToId` or `collaborators` changed:
```typescript
// After prisma.task.update
const task = await prisma.task.findUnique({ where: { id }, select: { projectId: true } })
if (task) {
  const memberIds = [data.assignedToId, ...(data.collaborators || [])].filter(Boolean) as string[]
  if (memberIds.length) await this.ensureProjectMembership(task.projectId, memberIds)
}
```

**Step 4: Run tests**

**Step 5: Commit**

### Task 11: Frontend — Project member management service + store

**Files:**
- Modify: `packages/frontend/src/services/projectService.ts` — add member API methods
- Modify: `packages/frontend/src/stores/projects.ts` — add member actions

**Step 1: Add to ProjectServiceInterface**

```typescript
export interface ProjectMember {
  id: string
  employeeId: string
  role: string
  employee: { id: string; name: string; email: string; department: string }
  createdAt: string
}

// Add to interface:
getProjectMembers(projectId: string): Promise<ProjectMember[]>
addProjectMembers(projectId: string, employeeIds: string[]): Promise<void>
removeProjectMember(projectId: string, employeeId: string): Promise<void>
```

**Step 2: Implement in ApiProjectService**

```typescript
async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  return apiGetUnwrap<ProjectMember[]>(`/projects/${projectId}/members`)
}
async addProjectMembers(projectId: string, employeeIds: string[]): Promise<void> {
  await apiPostUnwrap(`/projects/${projectId}/members`, { employeeIds })
}
async removeProjectMember(projectId: string, employeeId: string): Promise<void> {
  await apiDeleteUnwrap(`/projects/${projectId}/members/${employeeId}`)
}
```

**Step 3: Add stub in MockProjectService**

```typescript
async getProjectMembers(): Promise<ProjectMember[]> { return [] }
async addProjectMembers(): Promise<void> {}
async removeProjectMember(): Promise<void> {}
```

**Step 4: Commit**

### Task 12: Frontend — Project members management modal

**Files:**
- Create: `packages/frontend/src/components/project/ProjectMembersModal.vue`
- Modify: `packages/frontend/src/pages/ProjectsPage.vue` — add trigger button

**Step 1: Create ProjectMembersModal**

Props: `projectId: string`, `projectName: string`
Emits: `close`

Content:
- Header: "管理成員 — {projectName}"
- Current members list (name, department, remove button)
- "新增成員" section: MultiSearchSelect with employee options
  - MANAGER: options filtered to same department
  - PM/ADMIN: all employees
- Add button to submit selected employees

Uses `useAuthStore` to check current user role for filtering logic.

**Step 2: Add "成員" button to ProjectsPage**

In the project list/card, add a "成員" button that opens ProjectMembersModal.
Only visible for PM/MANAGER/ADMIN roles.

**Step 3: Run type check**

**Step 4: Commit**

### Task 13: Full test suite + deployment

**Step 1: Run all tests**

```bash
pnpm --filter frontend exec vue-tsc --noEmit
pnpm --filter frontend exec vitest run
cd backend && npx jest --no-coverage
```

**Step 2: Final commit and push**

**Step 3: Run seed on production**

After Zeabur deployment, run the seed script to populate ProjectMember from existing task assignments.

**Step 4: Verify with agent-browser**

Test scenarios:
1. Login as EMPLOYEE — should only see projects they're assigned to
2. Login as MANAGER — should see all projects, can manage members in their department
3. Login as PM — should see all projects
4. SearchableSelect works in TaskForm (search by name)
5. MultiSearchSelect works for collaborators
6. GanttFilters employee search works
