# Project Membership 功能修改綱要（QA 測試用）

## 一、新增功能

### 1. 專案成員管理 Modal
- **入口**：專案管理頁面 → 每張專案卡片底部的「成員」按鈕
- **可見條件**：ADMIN / PM / PRODUCER / MANAGER 角色才看得到按鈕
- **功能**：
  - 查看目前成員列表（顯示姓名 + 部門中文標籤）
  - 搜尋並新增員工為成員（MultiSearchSelect 多選）
  - 移除既有成員（X 按鈕）

### 2. EMPLOYEE 專案過濾
- EMPLOYEE 角色登入後，專案列表只顯示自己是成員的專案
- 其他角色（ADMIN / PM / PRODUCER / MANAGER）看到全部專案

### 3. 任務指派自動加入成員
- 建立任務時，指派人 + 協作者自動加入該專案成員
- 編輯任務時，新指派人 + 新協作者自動加入
- 認領任務時，認領者自動加入該專案成員

## 二、涉及的頁面與操作路徑

| 測試場景 | 操作路徑 |
|---------|---------|
| 查看成員 | 專案管理 → 點「成員」按鈕 → Modal 顯示成員列表 |
| 新增成員 | 成員 Modal → 搜尋框輸入員工名 → 選取 → 點「新增 N 位成員」 |
| 移除成員 | 成員 Modal → 成員列表右側 X 按鈕 |
| EMPLOYEE 過濾 | 以 EMPLOYEE 帳號登入 → 專案管理頁 → 只看到自己所屬專案 |
| 建立任務自動加入 | 建立任務並指派某人 → 該人自動出現在專案成員列表 |
| 認領任務自動加入 | 任務池 → 認領任務 → 認領者自動出現在專案成員列表 |

## 三、角色權限矩陣

| 操作 | ADMIN | PM / PRODUCER | MANAGER | EMPLOYEE |
|------|-------|--------------|---------|----------|
| 看到「成員」按鈕 | 是 | 是 | 是 | 否 |
| 新增成員 | 任意員工 | 限管理的專案 | 限同部門員工 | 不可 |
| 移除成員 | 任意 | 限管理的專案 | 限同部門員工 | 不可 |
| 查看成員列表 | 是 | 是 | 是 | 是（Modal 可開但無操作按鈕） |
| 專案列表過濾 | 看全部 | 看全部 | 看全部 | 只看所屬專案 |

## 四、API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/projects/:projectId/members` | 取得專案成員列表 |
| POST | `/api/projects/:projectId/members` | 批次新增成員，body: `{ employeeIds: string[] }` |
| DELETE | `/api/projects/:projectId/members/:employeeId` | 移除單一成員 |
| GET | `/api/projects` | 已修改：EMPLOYEE 只回傳所屬專案 |

## 五、資料庫變更

- 新增 `project_members` 資料表（project_id + employee_id 複合唯一）
- 新增 `ProjectMemberRole` enum（MEMBER / LEAD）
- 需執行 migration：`20260306000000_add_project_members`
- 需執行 seed：`prisma/seed-project-members.ts`（從既有任務指派資料回填成員）

## 六、已修改檔案清單

### 後端（7 檔案）
- `prisma/schema.prisma` — 新增 ProjectMember model
- `prisma/migrations/20260306000000_add_project_members/migration.sql` — 新增 migration
- `prisma/seed-project-members.ts` — 新增 seed 腳本
- `src/routes/projectMembers.ts` — 新增成員 CRUD 路由
- `src/routes/projects.ts` — 掛載成員子路由、傳遞 userId/userRole
- `src/services/projectService.ts` — EMPLOYEE 過濾邏輯
- `src/services/taskService.ts` — createTask / updateTask / claimTask auto-upsert

### 前端（4 檔案）
- `src/services/projectService.ts` — 新增 ProjectMember interface 和 API 方法
- `src/stores/projects.ts` — 新增成員 state 和 actions
- `src/components/project/ProjectMembersModal.vue` — 新增成員管理 Modal
- `src/pages/ProjectsPage.vue` — 整合成員按鈕和 Modal

### 測試（1 檔案）
- `backend/__tests__/unit/services/taskService.test.ts` — 補充 projectMember mock

## 七、已知限制（P1，不阻塞但需追蹤）

- removeMember 缺防重複提交保護
- 前端權限判斷較後端寬鬆（後端會正確攔截，但前端可能顯示無權限操作的 UI）
- 切換專案 Modal 時短暫顯示前一專案成員（loading 期間）
- store 層吞掉錯誤細節，toast 只顯示通用失敗訊息
- getProjectById 端點未檢查 EMPLOYEE 成員資格
- employeeId 缺 UUID 格式驗證
