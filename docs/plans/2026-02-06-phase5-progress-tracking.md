# Phase 5: 進度追蹤 API 實作計畫

**日期**: 2026-02-06
**狀態**: 進行中

---

## 目標

實作進度追蹤 API：
- `POST /api/progress` - 提交進度回報
- `GET /api/progress/my` - 查詢我的進度記錄
- `GET /api/progress/task/:taskId` - 查詢任務的進度記錄

---

## 資料模型 (Prisma Schema)

```prisma
model ProgressLog {
  id          String   @id @default(cuid())
  content     String
  progress    Int
  hoursSpent  Float?
  taskId      String
  employeeId  String
  createdAt   DateTime @default(now())

  task        Task     @relation(...)
  employee    Employee @relation(...)
}
```

---

## 任務列表

### Task 1: 建立進度追蹤類型定義 ⬜

**檔案**: `src/types/progress.ts`

```typescript
interface CreateProgressLogDto {
  taskId: string
  content: string
  progress: number      // 0-100
  hoursSpent?: number
}

interface ProgressLogResponse {
  id: string
  content: string
  progress: number
  hoursSpent: number | null
  taskId: string
  taskTitle: string
  employeeId: string
  employeeName: string
  createdAt: string
}
```

---

### Task 2: 實作進度追蹤 Service ⬜

**檔案**: `src/services/progressService.ts`

功能：
- `createProgressLog(data, userId)` - 建立進度記錄，同時更新任務進度
- `getProgressLogsByEmployee(userId, params)` - 取得員工的進度記錄
- `getProgressLogsByTask(taskId)` - 取得任務的進度記錄

---

### Task 3: 實作進度追蹤路由 ⬜

**端點**:
| 方法 | 路徑 | 功能 |
|-----|------|------|
| POST | /api/progress | 提交進度回報 |
| GET | /api/progress/my | 我的進度記錄 |
| GET | /api/progress/task/:taskId | 任務進度記錄 |

---

## 進度追蹤

| Task | 狀態 | 測試 | 備註 |
|------|-----|------|------|
| 1. 類型定義 | ⬜ | - | |
| 2. Service | ⬜ | - | |
| 3. 路由 | ⬜ | - | |

---

*建立日期: 2026-02-06*
