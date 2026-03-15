# CRUD 完整性審查報告

**審查日期**: 2026-03-07
**審查範圍**: 10 個核心模組的 Create/Read/Update/Delete 操作完整性

---

## 1. Tasks (任務)

| 操作 | 後端路由 | 後端 Service | 前端 Service | 前端 Store | 前端 UI | 狀態 |
|------|---------|-------------|-------------|-----------|--------|------|
| Create | POST /api/tasks | createTask | createTask | createTask | TaskCreatePage | OK |
| Read (list) | GET /api/tasks | getTasks | fetchTasks | fetchTasks | MyTasksPage | OK |
| Read (single) | GET /api/tasks/:id | getTaskById | getTaskById | getTaskById | TaskDetailPage | OK |
| Read (pool) | GET /api/tasks/pool | getPoolTasks | fetchPoolTasks | fetchPoolTasks | TaskPoolPage | OK |
| Update | PUT /api/tasks/:id | updateTask | updateTask | updateTask | TaskEditPage | OK |
| Update Status | PATCH /api/tasks/:id/status | updateStatus | updateTaskStatus | updateTaskStatus | TaskDetailPage | OK |
| Update Progress | PATCH /api/tasks/:id/progress | updateTaskProgress | updateTaskProgress | updateTaskProgress | TaskDetailPage | OK |
| Delete | DELETE /api/tasks/:id | deleteTask | deleteTask | deleteTask | TaskDetailPage | OK |
| Claim | POST /api/tasks/:id/claim | claimTask | claimTask | claimTask | TaskPoolPage | OK |
| Unclaim | POST /api/tasks/:id/unclaim | unclaimTask | unclaimTask | unclaimTask | TaskDetailPage | OK |

**結論**: 完整，無缺失。

---

## 2. Projects (專案)

| 操作 | 後端路由 | 後端 Service | 前端 Service | 前端 Store | 前端 UI | 狀態 |
|------|---------|-------------|-------------|-----------|--------|------|
| Create | POST /api/projects | createProject | createProject | createProject | ProjectsPage (Modal) | OK |
| Read (list) | GET /api/projects | getProjects | fetchProjects | fetchProjects | ProjectsPage | OK |
| Read (single) | GET /api/projects/:id | getProjectById | getProjectById | getProjectById | (store getter) | OK |
| Update | PUT /api/projects/:id | updateProject | updateProject | updateProject | ProjectsPage (Modal) | OK |
| Delete | DELETE /api/projects/:id | deleteProject | deleteProject | deleteProject | **無刪除按鈕** | **缺少 UI** |

**發現**: ProjectsPage 有編輯 Modal，但**沒有刪除按鈕**。後端、前端 service、前端 store 都有 delete 實作，唯獨 UI 層缺少觸發點。

---

## 3. Milestones (里程碑)

| 操作 | 後端路由 | 後端 Service | 前端 Service | 前端 Store | 前端 UI | 狀態 |
|------|---------|-------------|-------------|-----------|--------|------|
| Create | POST /api/milestones | createMilestone | addMilestone | addMilestone | GanttPage (MilestoneModal) | OK |
| Read | GET /api/milestones | getMilestones | fetchMilestones | fetchMilestones | GanttPage | OK |
| Update | PUT /api/milestones/:id | updateMilestone | **缺少** | **缺少** | **UI emit 無人處理** | **缺少** |
| Delete | DELETE /api/milestones/:id | deleteMilestone | removeMilestone | removeMilestone | GanttPage (MilestoneModal) | OK |

**發現 (P1)**:
1. **後端有 PUT /api/milestones/:id 路由和 updateMilestone service 方法**，但前端 MilestoneServiceInterface **缺少 updateMilestone 方法**
2. 前端 Store 也**缺少 updateMilestone action**
3. MilestoneModal.vue 有編輯 UI（startEdit 函式、emit('update', ...)），但 **GanttPage 未綁定 @update handler**，導致點擊編輯按鈕後提交無效果
4. MilestoneModal 的提交按鈕文字固定為「新增里程碑」，未區分新增/編輯模式（應為「儲存變更」），UI 也未正確顯示 cancelEdit 按鈕

---

## 4. Employees/Users (員工)

| 操作 | 後端路由 | 後端 Service | 前端 Service | 前端 Store | 前端 UI | 狀態 |
|------|---------|-------------|-------------|-----------|--------|------|
| Create | POST /api/employees | createEmployee | createEmployee | createEmployee | UserManagementPage (Modal) | OK |
| Read (list) | GET /api/employees | getEmployees | fetchEmployees | fetchEmployees | UserManagementPage | OK |
| Read (single) | GET /api/employees/:id | getEmployeeById | getEmployeeById | getEmployeeById | (store getter) | OK |
| Update | PUT /api/employees/:id | updateEmployee | updateEmployee | updateEmployee | UserManagementPage (Modal) | OK |
| Delete | DELETE /api/employees/:id | softDeleteEmployee | deleteEmployee | deleteEmployee | **無刪除按鈕** | **缺少 UI** |

**發現**: UserManagementPage 有編輯 Modal，但**沒有刪除按鈕**。後端使用 soft delete，前端 service/store 都有 delete 實作，唯獨 UI 缺少觸發點。

---

## 5. Time Entries (工時記錄)

| 操作 | 後端路由 | 後端 Service | 前端 Service | 前端 Store | 前端 UI | 狀態 |
|------|---------|-------------|-------------|-----------|--------|------|
| Create | POST /api/time-entries | createTimeEntry | **缺少** | **缺少** | **缺少** | **全層缺少** |
| Create (batch) | POST /api/time-entries/batch | createBatchTimeEntries | **缺少** | **缺少** | **缺少** | **全層缺少** |
| Read (list) | GET /api/time-entries | getTimeEntries | **缺少** | **缺少** | **缺少** | **全層缺少** |
| Read (single) | GET /api/time-entries/:id | getTimeEntryById | **缺少** | **缺少** | **缺少** | **全層缺少** |
| Read (today) | GET /api/time-entries/my/today | getTodaySummary | **缺少** | **缺少** | **缺少** | **全層缺少** |
| Read (week) | GET /api/time-entries/my/week | getWeeklyTimesheet | **缺少** | **缺少** | **缺少** | **全層缺少** |
| Update | PUT /api/time-entries/:id | updateTimeEntry | **缺少** | **缺少** | **缺少** | **全層缺少** |
| Delete | DELETE /api/time-entries/:id | deleteTimeEntry | **缺少** | **缺少** | **缺少** | **全層缺少** |

**發現 (P2)**: 後端已完整實作 Time Entries 的 CRUD（含 batch create、today summary、weekly timesheet），但**前端完全沒有對應的 Service、Store、或 Page**。整個工時記錄模組在前端不可見。

---

## 6. Time Categories (工時類別)

| 操作 | 後端路由 | 後端 Service | 前端 Service | 前端 Store | 前端 UI | 狀態 |
|------|---------|-------------|-------------|-----------|--------|------|
| Create | POST /api/time-categories | createCategory | **缺少** | **缺少** | **缺少** | **全層缺少** |
| Read | GET /api/time-categories | getCategories | **缺少** | **缺少** | **缺少** | **全層缺少** |
| Update | PUT /api/time-categories/:id | updateCategory | **缺少** | **缺少** | **缺少** | **全層缺少** |
| Delete | DELETE /api/time-categories/:id | deleteCategory | **缺少** | **缺少** | **缺少** | **全層缺少** |
| Activate | POST /api/time-categories/:id/activate | activateCategory | **缺少** | **缺少** | **缺少** | **全層缺少** |
| Deactivate | POST /api/time-categories/:id/deactivate | deactivateCategory | **缺少** | **缺少** | **缺少** | **全層缺少** |

**發現 (P3)**: 與 Time Entries 相同，後端完整但前端完全缺失。此模組為 Time Entries 的依賴（工時記錄需要分類），兩者需一起實作。

---

## 7. Time Stats (工時統計)

| 操作 | 後端路由 | 後端 Service | 前端 Service | 前端 Store | 前端 UI | 狀態 |
|------|---------|-------------|-------------|-----------|--------|------|
| Project Stats | GET /api/time-stats/project/:id | getProjectStats | **缺少** | **缺少** | **缺少** | **全層缺少** |
| Employee Stats | GET /api/time-stats/employee/:id | getEmployeeStats | **缺少** | **缺少** | **缺少** | **全層缺少** |
| My Stats | GET /api/time-stats/my | getEmployeeStats | **缺少** | **缺少** | **缺少** | **全層缺少** |
| Monthly Summary | GET /api/time-stats/my/monthly | getMonthlySummary | **缺少** | **缺少** | **缺少** | **全層缺少** |
| Team Dashboard | GET /api/time-stats/dashboard | getTeamDashboard | **缺少** | **缺少** | **缺少** | **全層缺少** |

**發現 (P3)**: 純讀取模組，隨 Time Entries 前端實作一起補齊即可。

---

## 8. Progress Logs (進度記錄)

| 操作 | 後端路由 | 後端 Service | 前端 Service | 前端 Store | 前端 UI | 狀態 |
|------|---------|-------------|-------------|-----------|--------|------|
| Create | POST /api/progress | createProgressLog | addLog (via task) | addLog | TaskDetailPage | OK |
| Read (list) | GET /api/progress | getProgressLogs | fetchByTaskId | fetchByTaskId | TaskDetailPage | OK |
| Read (today) | GET /api/progress/today | getTodayProgressStatus | **缺少** | **缺少** | **缺少** | **缺少** |
| Read (project stats) | GET /api/progress/project/:id/stats | getProjectProgressStats | **缺少** | **缺少** | **缺少** | **缺少** |
| Update | **無路由** | **無方法** | **缺少** | **缺少** | **缺少** | N/A (設計上不需要) |
| Delete | **無路由** | **無方法** | **缺少** | **缺少** | **缺少** | N/A (設計上不需要) |

**發現 (P3)**: 基本 CRUD OK。後端有 today status 和 project stats 端點，前端未串接（可能尚未排入需求）。Update/Delete 不需要（進度記錄為 append-only）。

---

## 9. Task Notes (任務註記)

| 操作 | 後端路由 | 後端 Service | 前端 Service | 前端 Store | 前端 UI | 狀態 |
|------|---------|-------------|-------------|-----------|--------|------|
| Create | POST /api/tasks/:taskId/notes | createNote | addNote | addNote | TaskDetailPage | OK |
| Read | GET /api/tasks/:taskId/notes | getNotesByTaskId | fetchByTaskId | fetchByTaskId | TaskDetailPage | OK |
| Update | **無路由** | **無方法** | **缺少** | **缺少** | **缺少** | **缺少** |
| Delete | **無路由** | **無方法** | **缺少** | **缺少** | **缺少** | **缺少** |

**發現 (P2)**: 任務註記只能新增和讀取，**無法修改或刪除**。後端 TaskNoteService 沒有 update/delete 方法，路由也沒有對應的 PUT/DELETE。使用者寫錯註記無法修正。

---

## 10. Project Members (專案成員)

| 操作 | 後端路由 | 後端 Service | 前端 Service | 前端 Store | 前端 UI | 狀態 |
|------|---------|-------------|-------------|-----------|--------|------|
| Add | POST /api/projects/:id/members | (inline Prisma) | addProjectMembers | addProjectMembers | ProjectMembersModal | OK |
| Read | GET /api/projects/:id/members | (inline Prisma) | getProjectMembers | fetchProjectMembers | ProjectMembersModal | OK |
| Remove | DELETE /api/projects/:id/members/:empId | (inline Prisma) | removeProjectMember | removeProjectMember | ProjectMembersModal | OK |
| Update Role | **無路由** | **無方法** | **缺少** | **缺少** | **缺少** | N/A |

**發現**: 基本 CRUD OK。注意後端 projectMembers 路由沒有獨立 service，直接在路由中用 Prisma 操作（小問題，不影響功能）。

---

## 11. Departments (部門)

| 操作 | 後端路由 | 後端 Service | 前端 Service | 前端 Store | 前端 UI | 狀態 |
|------|---------|-------------|-------------|-----------|--------|------|
| Read | **無路由** | **無 service** | fetchDepartments (靜態) | fetchDepartments | (filter 用) | OK (設計如此) |
| Create/Update/Delete | **無** | **無** | **無** | **無** | **無** | N/A (靜態資料) |

**發現**: 部門是靜態資料，前端直接使用 mock data。設計上不需要 CRUD。

---

## 12. Dashboard (儀表板)

| 操作 | 後端路由 | 後端 Service | 前端 Service | 前端 Store | 前端 UI | 狀態 |
|------|---------|-------------|-------------|-----------|--------|------|
| Stats | GET /api/dashboard/stats | getStats | fetchStats | fetchStats | DashboardPage | OK |
| Workloads | GET /api/dashboard/workloads | getWorkloads | fetchWorkloads | fetchWorkloads | DashboardPage | OK |

**發現**: 純讀取模組，完整。

---

## 13. User Settings (使用者設定)

| 操作 | 後端路由 | 後端 Service | 前端 Service | 前端 Store | 前端 UI | 狀態 |
|------|---------|-------------|-------------|-----------|--------|------|
| Read | GET /api/user/settings | getSettings | (userSettingsService) | (userSettings store) | ProfileSettingsPage | OK |
| Update | PATCH /api/user/settings | updateSettings | (userSettingsService) | (userSettings store) | ProfileSettingsPage | OK |
| Link GitLab | POST /api/user/integrations/gitlab | linkGitLab | (userSettingsService) | (userSettings store) | IntegrationsPage | OK |
| Unlink GitLab | DELETE /api/user/integrations/gitlab | unlinkGitLab | (userSettingsService) | (userSettings store) | IntegrationsPage | OK |
| Link Slack | POST /api/user/integrations/slack | linkSlack | (userSettingsService) | (userSettings store) | IntegrationsPage | OK |
| Unlink Slack | DELETE /api/user/integrations/slack | unlinkSlack | (userSettingsService) | (userSettings store) | IntegrationsPage | OK |

**發現**: 完整。

---

## 14. Notifications (通知)

**發現**: 系統中**不存在** Notifications 模組。無後端路由、無 service、無前端實作。如需通知功能需從零建立。

---

## 15. Reports (報表)

**發現**: 後端無獨立 reports 路由。前端有 ReportPage.vue，但其資料來源為 dashboard/progress 相關 API，非獨立 CRUD 模組。

---

## 缺失總結

| # | 模組 | 缺失描述 | 嚴重度 | 說明 |
|---|------|---------|--------|------|
| 1 | **Milestones** | 前端缺少 updateMilestone：service 無方法、store 無 action、GanttPage 未綁定 @update | **P1** | UI 有編輯按鈕但點了沒效果，使用者會困惑 |
| 2 | **Task Notes** | 全棧缺少 Update/Delete | **P2** | 使用者寫錯註記無法修正或刪除 |
| 3 | **Time Entries** | 前端全部缺失（Service/Store/Page） | **P2** | 後端 API 完整但前端無法使用，整個工時功能不可操作 |
| 4 | **Projects** | UI 缺少刪除按鈕 | **P2** | 後端到 store 都有實作，僅 UI 缺少觸發點 |
| 5 | **Employees** | UI 缺少刪除按鈕 | **P2** | 後端到 store 都有實作，僅 UI 缺少觸發點 |
| 6 | **Time Categories** | 前端全部缺失 | **P3** | 為 Time Entries 的依賴，需一起實作 |
| 7 | **Time Stats** | 前端全部缺失 | **P3** | 純讀取，隨 Time Entries 一起補 |
| 8 | **Progress Logs** | 前端缺少 today/project stats API 串接 | **P3** | 基本功能可用，進階統計未串接 |
| 9 | **MilestoneModal** | 編輯模式下按鈕文字仍為「新增里程碑」、缺少取消編輯按鈕 | **P3** | UI 細節問題 |

### 按優先級分類

**P1 - 功能斷裂（使用者操作無回應）**:
- Milestones update：前端有編輯 UI 但 emit 無人處理，操作看似成功實則無效

**P2 - 功能缺失（使用者無法完成預期操作）**:
- Task Notes：無法修改/刪除已建立的註記
- Time Entries：整個工時記錄前端不可用
- Projects/Employees：無法透過 UI 刪除

**P3 - 次要缺失（功能可用但不完整）**:
- Time Categories/Stats：隨 Time Entries 實作
- Progress Logs：進階統計未串接
- MilestoneModal：UI 文字細節
