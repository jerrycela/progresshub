# 前後端合約一致性審查報告

**日期**: 2026-03-07
**審查範圍**: backend/src/mappers, backend/src/routes, packages/shared/types, packages/frontend/src/services

---

## P1 — 會導致功能異常

### P1-01: Milestone 共享型別存在兩套定義，欄位互相矛盾

**位置**:
- `packages/shared/types/index.ts` L179-187 (`Milestone` interface)
- `packages/shared/types/index.ts` L300-310 (`MilestoneData` interface)
- `backend/src/mappers/milestoneMapper.ts` (`MilestoneDTO`)

**問題**: 共享型別有兩個里程碑介面，欄位名不同：

| 欄位 | `Milestone` (L179) | `MilestoneData` (L300) | 後端 `MilestoneDTO` |
|------|---------------------|------------------------|---------------------|
| 日期 | `targetDate` | `date` | `date` |
| 狀態 | `status: 'PENDING' \| 'ACHIEVED'` | (無) | (無) |
| 建立者ID | (無) | `createdById: string` (required) | `createdById?: string` (optional) |
| 建立者名稱 | (無) | `createdByName: string` (required) | `createdByName?: string` (optional) |
| 顏色 | (無) | `color?: string` | `color?: string` |
| 描述 | (無) | `description?: string` | `description?: string` |

**影響**: 前端 milestoneService 使用 `MilestoneData`，後端回傳 `MilestoneDTO`。`MilestoneData.createdById` 和 `createdByName` 是 required，但後端 DTO 回傳 optional（可能是 `undefined`）。TypeScript 編譯時不報錯（apiGetUnwrap 用泛型斷言），但執行時顯示建立者可能為空。

同時 `Milestone` interface 的 `status` 欄位後端完全不回傳，如果有程式碼引用 `Milestone.status` 會得到 `undefined`。

---

### P1-02: 專案建立/更新路由未經 DTO 映射，直接回傳 Prisma 原始物件

**位置**:
- `backend/src/routes/projects.ts` L246: `sendSuccess(res, project, 201)` (POST)
- `backend/src/routes/projects.ts` L312: `sendSuccess(res, project)` (PUT)

**問題**: `createProject` 和 `updateProject` service 回傳 Prisma `Project` 物件（含 `Date` 型別欄位如 `startDate`, `endDate`, `createdAt`）。路由直接 `sendSuccess(res, project)` 而非 `sendSuccess(res, toProjectDTO(project))`。

前端 `Project` interface 期望 `startDate: string`，但 Prisma 物件的 `startDate` 是 `Date`。JSON 序列化時 `Date` 會自動轉成 ISO 字串，所以「碰巧能用」，但：
- 缺少 `createdById` 欄位映射（Prisma 欄位名可能不同）
- 與 GET 路由的行為不一致（GET 有用 `toProjectDTO`）

對比 GET 路由 (L89)：`sendPaginatedSuccess(res, result.data.map(toProjectDTO), ...)`。

---

### P1-03: 前端 fetchTasks 期望 `Task[]`，後端回傳分頁結構 `{ data, meta }`

**位置**:
- `packages/frontend/src/services/taskService.ts` L198: `apiGetUnwrap<Task[]>('/tasks')`
- `backend/src/routes/taskCrudRoutes.ts` L157: `sendPaginatedSuccess(res, data.map(...))`

**問題**: 後端 `GET /tasks` 使用 `sendPaginatedSuccess`，回傳結構為 `{ success: true, data: [...], meta: { total, page, limit, hasMore } }`。前端 `apiGetUnwrap<Task[]>` 會正確解出 `data` 陣列，所以功能正常。**但前端完全忽略了 `meta` 分頁資訊**，等於每次只拿到前 20 筆（預設 limit），無法載入更多。

同樣問題存在於：
- `fetchProjects()` → `apiGetUnwrap<Project[]>('/projects')` (後端用 `sendPaginatedSuccess`)
- `fetchEmployees()` → `apiGetUnwrap<Record[]>('/employees')` (後端用 `sendPaginatedSuccess`)

---

### P1-04: 進度回報 POST /api/progress 欄位名不匹配

**位置**:
- `packages/frontend/src/services/progressService.ts` L36: 送出 `Omit<ProgressLog, 'id' | 'reportedAt'>`
- `backend/src/routes/progress.ts` L163: 驗證 `body("progressPercentage")`

**問題**: 前端 `ProgressLog` interface 的進度欄位是 `progress: number`，但後端 `POST /api/progress` 驗證的欄位名是 `progressPercentage`。前端 `addLog` 送出的物件包含 `{ progress, taskId, userId, reportType, ... }`，後端只認 `progressPercentage`，所以 **progress 值會被忽略，progressPercentage 驗證失敗回 400**。

注意：這是 `POST /api/progress` 獨立路由的問題。`POST /tasks/:id/progress`（taskNoteRoutes）用的是 `progress` 欄位，那個是正確的。

---

### P1-05: 進度回報 POST /api/progress 回傳原始 Prisma 物件，未經 DTO 映射

**位置**:
- `backend/src/routes/progress.ts` L217: `sendSuccess(res, progressLog, 201)`

**問題**: `progressService.createProgressLog` 回傳 Prisma `ProgressLog` 物件，路由直接回傳。但前端 `ProgressLog` interface 期望：
- `userId` (後端 Prisma 欄位是 `employeeId`)
- `progress` (後端 Prisma 欄位是 `progressPercentage`)
- `user?: User` (後端包含的是 `employee`)

應使用 `toProgressLogDTO` 映射後再回傳。

---

### P1-06: Task 共享型別 `project` 欄位型別不匹配後端 DTO

**位置**:
- `packages/shared/types/index.ts` L103: `project?: Project`
- `backend/src/mappers/taskMapper.ts` L13: `project?: ReturnType<typeof toProjectRef>`

**問題**: 共享型別的 `Task.project` 型別是完整的 `Project` interface（含 `status`, `startDate`, `endDate`, `createdById` 等欄位）。但後端 `toTaskDTO` 回傳的 `project` 是 `toProjectRef` 結果，只有 `{ id, name, status? }`。

前端如果存取 `task.project.startDate` 或 `task.project.createdById` 會得到 `undefined`，因為後端根本沒回傳這些欄位。

同理，`Task.assignee` 在共享型別是 `User`（完整物件），但後端回傳 `toUserRef` 只有 `{ id, name, email? }`。`Task.creator` 也是同樣的問題。

---

## P2 — 潛在風險

### P2-01: User 共享型別的 `functionType` 是 required，但後端 DTO 是 optional

**位置**:
- `packages/shared/types/index.ts` L68: `functionType: FunctionType` (required)
- `backend/src/mappers/employeeMapper.ts` L10: `functionType?: string` (optional)

**問題**: 前端 `User.functionType` 是必填的 `FunctionType` 聯合型別，但後端 `UserDTO.functionType` 是 optional string。如果員工沒有設定 functionType，後端回傳 `undefined`，前端型別系統會認為這個值一定存在，可能導致顯示異常。

---

### P2-02: User 共享型別有 `gitlabId`，後端 UserDTO 不回傳

**位置**:
- `packages/shared/types/index.ts` L66: `gitlabId?: string`
- `backend/src/mappers/employeeMapper.ts`: 無 `gitlabId` 映射

**問題**: 前端 `User` interface 定義了 `gitlabId?: string`，但後端 `toUserDTO` 完全不回傳這個欄位。雖然是 optional 所以不會崩潰，但前端若依賴此欄位判斷 GitLab 連結狀態會永遠得到 false。

---

### P2-03: Project `createdById` 在共享型別是 required，但後端 DTO 是 optional

**位置**:
- `packages/shared/types/index.ts` L86: `createdById: string` (required)
- `backend/src/mappers/projectMapper.ts` L10: `createdById?: string` (optional)

**問題**: 如果 Prisma schema 中 `createdById` 可為 null（建立專案時未指定），後端回傳 `undefined`，但前端型別系統認為一定有值。

另外，`createProject` service (projects.ts L99-107) 建立專案時完全沒設定 `createdById`，所以新建的專案一定是 null。

---

### P2-04: 前端 claimTask 送 `{ userId }` 但後端不讀取 body

**位置**:
- `packages/frontend/src/services/taskService.ts` L261: `apiPostUnwrap('/tasks/${taskId}/claim', { userId })`
- `backend/src/routes/taskActionRoutes.ts` L161: `taskService.claimTask(req.params.id, req.user.userId)`

**問題**: 前端送出 `{ userId }` 在 request body，但後端完全忽略它，改用 `req.user.userId`（JWT token 中的使用者）。這不算 bug（後端行為正確，應使用 JWT 身份而非客戶端傳的 userId），但前端傳送了多餘的 body，且 interface 定義的 `claimTask(taskId, userId)` 給人一種「可以幫別人認領」的錯覺。

---

### P2-05: 前端 noteService.addNote 送出多餘欄位

**位置**:
- `packages/frontend/src/services/noteService.ts` L36: 送出 `Omit<TaskNote, 'id' | 'createdAt'>`
- `backend/src/routes/taskNoteRoutes.ts` L58-62: 只驗證 `body("content")`

**問題**: 前端 `addNote` 會送出 `{ taskId, content, authorId, authorName, authorRole }`，但後端只從 body 讀 `content`，其餘 (`authorId`, `authorName`, `authorRole`) 從 `req.user` JWT token 取得。多餘欄位被忽略，但：
1. 如果前端傳的 `authorId` 與 JWT 不一致，可能造成 UI 預期與實際不符
2. `taskId` 在 body 和 URL param 都有，容易不一致

---

### P2-06: 前端 fetchTasks/fetchProjects/fetchEmployees 忽略分頁，數量超過 20 筆時資料不完整

**位置**:
- `packages/frontend/src/services/taskService.ts` L198
- `packages/frontend/src/services/projectService.ts` L89
- `packages/frontend/src/services/employeeService.ts` L91

**問題**: 這三個 service 的 `fetch*` 方法都使用 `apiGetUnwrap<T[]>` 呼叫分頁 API，但不傳送 `page`/`limit` 參數，也不處理回傳的 `meta`。後端預設 `limit=20`，所以 **只能取到前 20 筆資料**。

對於目前規模小的專案可能不明顯，但資料量成長後會出現資料遺失。

---

### P2-07: Project update 路由未用 DTO 映射，createdAt 格式可能不一致

**位置**:
- `backend/src/routes/projects.ts` L312: `sendSuccess(res, project)`

**問題**: `updateProject` 回傳原始 Prisma 物件，`createdAt` 等日期欄位透過 JSON.stringify 自動轉換。但 `toProjectDTO` 使用 `.toISOString()` 明確轉換。兩者通常結果相同，但 Prisma 可能回傳非標準 Date 物件（如在某些 driver 下），造成序列化結果差異。

---

## P3 — 不影響功能但不規範

### P3-01: 前端 `User.role` 是 `UserRole` 型別，後端回傳 `string`

**位置**:
- `packages/shared/types/index.ts` L67: `role: UserRole`
- `backend/src/mappers/employeeMapper.ts` L9: `role: string`

**問題**: 後端 DTO 宣告 `role: string`，實際值來自 Prisma enum `permissionLevel`（與 `UserRole` 值集合一致），功能上沒問題。但型別定義不夠精確，應使用 `UserRole` 或 `PermissionLevel` 型別。

---

### P3-02: TaskDTO 的 `status` 和 `priority` 宣告為 `string`，非 enum 型別

**位置**:
- `backend/src/mappers/taskMapper.ts` L9: `status: string`, L10: `priority?: string`

**問題**: 前端共享型別使用 `TaskStatus` 和 `TaskPriority` 聯合型別，但後端 DTO 宣告為 `string`。功能正常（值集合一致），但減弱了型別安全性。

---

### P3-03: ProgressLogDTO 的 `reportType` 宣告為 `string`，非 `ReportType`

**位置**:
- `backend/src/mappers/progressLogMapper.ts` L9: `reportType: string`
- `packages/shared/types/index.ts` L153: `reportType: ReportType`

---

### P3-04: MilestoneDTO 缺少 `updatedAt` 欄位

**位置**:
- `backend/src/mappers/milestoneMapper.ts`: 無 `updatedAt` 映射
- `packages/shared/types/index.ts` L300-310: `MilestoneData` 也沒有 `updatedAt`

**問題**: 其他所有實體（Task, Project, User）都有 `updatedAt`，唯獨 Milestone 缺少。不影響功能，但不一致。

---

### P3-05: 前端 employeeService 使用 `MockEmployee` 而非 `User` 型別

**位置**:
- `packages/frontend/src/services/employeeService.ts`: 全部使用 `MockEmployee` 型別
- `packages/shared/types/index.ts` L315-322: `MockEmployee` 是簡化版

**問題**: `MockEmployee` 只有 `{ id, name, email, department, userRole, avatar }`，缺少 `User` 的許多欄位（`isActive`, `lastActiveAt`, `createdAt`, `updatedAt`, `functionType` 等）。後端透過 `toUserDTO` 回傳完整 `UserDTO`，但前端 `mapBackendEmployee` 只取部分欄位。這意味著前端拿不到員工的啟用狀態、最後活躍時間等資訊。

---

### P3-06: 前端 `ApiErrorInfo.details` 型別與後端 `ApiErrorResponse.error.details` 不同

**位置**:
- `packages/frontend/src/services/types.ts` L25: `details?: Record<string, unknown>`
- `backend/src/utils/response.ts` L23: `details?: unknown`

**問題**: 後端 details 是 `unknown`（可以是陣列，如 express-validator errors），前端期望 `Record<string, unknown>`。如果後端傳回陣列型別的 details，前端存取方式會不正確。

---

### P3-07: Project `createdBy?: User` 後端從未回傳

**位置**:
- `packages/shared/types/index.ts` L87: `createdBy?: User`
- `backend/src/mappers/projectMapper.ts`: `toProjectDTO` 無 `createdBy` 映射

**問題**: 前端定義了 `Project.createdBy` optional 欄位，但後端 ProjectDTO 從不包含此欄位。前端存取 `project.createdBy` 永遠是 `undefined`。

---

### P3-08: `projectService.removeProjectMember` 使用 `apiDeleteUnwrap`，與 CLAUDE.md 的 DELETE 規範不一致

**位置**:
- `packages/frontend/src/services/projectService.ts` L128: `apiDeleteUnwrap`
- `backend/src/routes/projectMembers.ts` L202-204: `sendSuccess(res, null)`

**問題**: 後端特意改成 `sendSuccess(res, null)` 回傳 200（有 comment 說明原因），所以 `apiDeleteUnwrap` 可以正常解析。但 `unwrapApiResponse` 檢查 `response.data !== undefined`，而 `data: null` 時 `null !== undefined` 為 true，所以回傳 `null`。功能正常，但實作方式不夠直覺。

---

## 統計摘要

| 嚴重度 | 數量 | 說明 |
|--------|------|------|
| **P1** | 6 | 功能異常或資料遺失 |
| **P2** | 7 | 潛在風險，特定條件下觸發 |
| **P3** | 8 | 型別不精確或不規範 |
| **合計** | **21** | |

### 最常見的問題模式

1. **DTO 映射遺漏** (P1-02, P1-05): 部分路由跳過 mapper 直接回傳 Prisma 物件
2. **共享型別與後端 DTO 欄位名/型別不一致** (P1-01, P1-04, P1-06, P2-01, P2-03)
3. **分頁回應未處理** (P1-03, P2-06): 前端忽略 meta 資訊
4. **後端 DTO 型別過於寬鬆** (P3-01, P3-02, P3-03): 使用 string 而非 enum 型別
