# Phase 4: 甘特圖 API 實作計畫

**日期**: 2026-02-06
**狀態**: ✅ 完成

---

## 目標

實作甘特圖所需的 API 端點：
- `GET /api/gantt` - 聚合專案、里程碑、任務資料
- `GET /api/gantt/stats` - 統計數據

---

## 前端期望資料結構

根據 `GanttPage.vue` 分析：

### 任務資料
```typescript
interface GanttTask {
  id: string
  title: string
  status: TaskStatus
  progress: number
  startDate: string    // ISO date
  dueDate: string      // ISO date
  projectId: string
  milestoneId?: string
  assigneeId?: string
  assigneeName?: string
}
```

### 里程碑資料
```typescript
interface GanttMilestone {
  id: string
  name: string
  date: string         // ISO date
  projectId: string
  color?: string
}
```

### 統計資料
```typescript
interface GanttStats {
  total: number
  overdue: number
  inProgress: number
  completed: number
  paused: number
  blocked: number
}
```

---

## 任務列表

### Task 1: 建立甘特圖類型定義 ⬜

**檔案**: `src/types/gantt.ts`

定義 GanttTask, GanttMilestone, GanttStats, GanttQueryParams

---

### Task 2: 實作甘特圖 Service ⬜

**檔案**: `src/services/ganttService.ts`

功能：
- `getGanttData(params)` - 聚合專案、里程碑、任務
- `getGanttStats(params)` - 計算統計數據

---

### Task 3: 實作甘特圖路由 ⬜

**端點**:
| 方法 | 路徑 | 功能 |
|-----|------|------|
| GET | /api/gantt | 取得甘特圖資料 |
| GET | /api/gantt/stats | 取得統計數據 |

**查詢參數**:
- `projectId` - 篩選專案
- `milestoneId` - 篩選里程碑
- `assigneeId` - 篩選負責人
- `status` - 篩選狀態
- `startDate` - 開始日期範圍
- `endDate` - 結束日期範圍

---

## TDD 工作流程

1. **RED** - 先寫測試
2. **GREEN** - 實作通過測試
3. **REFACTOR** - 重構

---

## 檔案結構

```
packages/backend/
├── src/
│   ├── types/
│   │   └── gantt.ts         ← Task 1
│   ├── services/
│   │   └── ganttService.ts  ← Task 2
│   └── routes/
│       └── gantt.ts         ← Task 3
├── tests/
│   ├── types/
│   │   └── gantt.test.ts
│   ├── services/
│   │   └── ganttService.test.ts
│   └── routes/
│       └── gantt.test.ts
```

---

## 進度追蹤

| Task | 狀態 | 測試 | 備註 |
|------|-----|------|------|
| 1. 類型定義 | ✅ | 12/12 | isTaskOverdue, getProgressBucket |
| 2. Service | ✅ | 10/10 | getGanttData, getGanttStats |
| 3. 路由 | ✅ | 8/8 | GET /gantt, GET /gantt/stats |

**總測試數**: 123/123 通過（含所有模組）

---

*建立日期: 2026-02-06*
