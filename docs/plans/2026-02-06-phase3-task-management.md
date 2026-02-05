# Phase 3: 任務管理 API 實作計畫

**日期**: 2026-02-06
**狀態**: ✅ 完成

---

## 目標

實作完整的任務管理 API，包含：
- 任務 CRUD（建立、讀取、更新、刪除）
- 任務狀態流轉（6 種狀態）
- 我的任務查詢

---

## 任務列表

### Task 1: 建立任務類型定義 ⬜

**檔案**: `src/types/task.ts`

```typescript
// 任務狀態
export enum TaskStatus {
  UNCLAIMED = 'UNCLAIMED',
  CLAIMED = 'CLAIMED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  BLOCKED = 'BLOCKED',
  DONE = 'DONE'
}

// 狀態流轉規則
export const StatusTransitions: Record<TaskStatus, TaskStatus[]> = {
  UNCLAIMED: [TaskStatus.CLAIMED],
  CLAIMED: [TaskStatus.UNCLAIMED, TaskStatus.IN_PROGRESS],
  IN_PROGRESS: [TaskStatus.PAUSED, TaskStatus.BLOCKED, TaskStatus.DONE],
  PAUSED: [TaskStatus.IN_PROGRESS],
  BLOCKED: [TaskStatus.IN_PROGRESS],
  DONE: []
}

// DTO 類型
export interface CreateTaskDto { ... }
export interface UpdateTaskDto { ... }
```

---

### Task 2: 實作任務 Service ⬜

**檔案**: `src/services/taskService.ts`

功能：
- `createTask(data, userId)`
- `getTaskById(id)`
- `updateTask(id, data)`
- `deleteTask(id)`
- `getTasksByAssignee(userId)`
- `changeTaskStatus(id, action, userId)`

---

### Task 3: 實作任務 CRUD 路由 ⬜

**端點**:
| 方法 | 路徑 | 功能 |
|-----|------|------|
| POST | /api/tasks | 建立任務 |
| GET | /api/tasks/:id | 取得單一任務 |
| PUT | /api/tasks/:id | 更新任務 |
| DELETE | /api/tasks/:id | 刪除任務 |
| GET | /api/tasks | 取得任務列表（支援分頁、篩選） |

---

### Task 4: 實作任務狀態流轉 ⬜

**端點**:
| 方法 | 路徑 | 動作 |
|-----|------|------|
| POST | /api/tasks/:id/claim | 認領任務 |
| POST | /api/tasks/:id/unclaim | 取消認領 |
| POST | /api/tasks/:id/start | 開始任務 |
| POST | /api/tasks/:id/pause | 暫停任務 |
| POST | /api/tasks/:id/resume | 恢復任務 |
| POST | /api/tasks/:id/block | 標記卡關 |
| POST | /api/tasks/:id/unblock | 解除卡關 |
| POST | /api/tasks/:id/complete | 完成任務 |

**狀態流轉規則**:
```
UNCLAIMED → claim → CLAIMED
CLAIMED → unclaim → UNCLAIMED
CLAIMED → start → IN_PROGRESS
IN_PROGRESS → pause → PAUSED
IN_PROGRESS → block → BLOCKED
IN_PROGRESS → complete → DONE
PAUSED → resume → IN_PROGRESS
BLOCKED → unblock → IN_PROGRESS
```

---

### Task 5: 實作我的任務查詢 ⬜

**端點**: `GET /api/tasks/my`

功能：
- 取得當前使用者被指派的任務
- 支援狀態篩選
- 支援分頁

---

## TDD 工作流程

每個 Task 遵循：

1. **RED** - 先寫測試，執行失敗
2. **GREEN** - 實作最少程式碼通過測試
3. **REFACTOR** - 重構，保持測試通過

---

## 檔案結構

```
packages/backend/
├── src/
│   ├── types/
│   │   └── task.ts          ← Task 1
│   ├── services/
│   │   └── taskService.ts   ← Task 2
│   └── routes/
│       └── tasks.ts         ← Task 3, 4, 5
├── tests/
│   ├── types/
│   │   └── task.test.ts     ← Task 1 測試
│   ├── services/
│   │   └── taskService.test.ts ← Task 2 測試
│   └── routes/
│       └── tasks.test.ts    ← Task 3, 4, 5 測試
```

---

## 進度追蹤

| Task | 狀態 | 測試 | 備註 |
|------|-----|------|------|
| 1. 類型定義 | ✅ | 22/22 | TaskStatus, StatusTransitions |
| 2. Service | ✅ | 25/25 | CRUD + 狀態流轉 |
| 3. CRUD 路由 | ✅ | 12/12 | GET/POST/PUT/DELETE |
| 4. 狀態流轉 | ✅ | 8/8 | claim~complete |
| 5. 我的任務 | ✅ | 2/2 | GET /tasks/my |

**總測試數**: 93/93 通過

---

*建立日期: 2026-02-06*
