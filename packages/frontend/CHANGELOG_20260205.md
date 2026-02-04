# ProgressHub 前端更新日誌 - 2026-02-05

## 版本概述

本次更新解決三個用戶回報的問題，並新增兩項重要功能。

---

## 修復項目

### 1. 任務池編輯 404 修復

**問題**：在任務池點擊任務後按下「編輯」按鈕會出現 404 頁面。

**解決方案**：
- 新增 `TaskEditPage.vue` 頁面
- 新增路由 `/task-pool/:id/edit`
- 複用 `TaskCreatePage` 表單結構，預填現有任務資料

**相關檔案**：
- `src/pages/TaskEditPage.vue` (新增)
- `src/router/index.ts` (修改)

---

## 新增功能

### 2. 任務註記功能

**需求**：讓 PM、製作人或部門主管針對進行中的工項寫下註記。

**實作內容**：
- 在任務詳情頁新增「註記」區塊
- 顯示註記列表，含作者、角色、時間
- 新增註記 Modal，以當前登入者身份發表
- 權限控制：僅 PM、製作人、部門主管可新增註記

**權限矩陣**：
| 角色 | 查看註記 | 新增註記 |
|------|:--------:|:--------:|
| 一般同仁 | ✅ | ❌ |
| PM | ✅ | ✅ |
| 製作人 | ✅ | ✅ |
| 部門主管 | ✅ | ✅ |

**相關檔案**：
- `src/pages/TaskDetailPage.vue` (修改)
- `src/mocks/taskPool.ts` (修改 - 新增 TaskNote 類型和 mock 資料)

---

### 3. 甘特圖里程碑功能

**需求**：
- 新增里程碑功能，讓製作人或部門主管設定對應的里程碑
- 里程碑顯示在甘特圖日期上方
- 設定里程碑權限僅限於製作人或部門主管

**實作內容**：
- 在甘特圖日期軸上方顯示里程碑菱形標記 ◆
- Hover 顯示里程碑名稱和日期
- 「管理里程碑」按鈕（僅製作人/主管可見）
- 里程碑管理 Modal：查看現有里程碑、新增、刪除
- 支援選擇里程碑顏色（6 種顏色）
- 依專案篩選里程碑

**權限矩陣**：
| 角色 | 查看里程碑 | 新增/刪除里程碑 |
|------|:----------:|:---------------:|
| 一般同仁 | ✅ | ❌ |
| PM | ✅ | ❌ |
| 製作人 | ✅ | ✅ |
| 部門主管 | ✅ | ✅ |

**相關檔案**：
- `src/pages/GanttPage.vue` (修改)
- `src/mocks/taskPool.ts` (修改 - 新增 MilestoneData 類型和 mock 資料)

---

## Mock 資料新增

### TaskNote 類型
```typescript
interface TaskNote {
  id: string
  taskId: string
  content: string
  authorId: string
  authorName: string
  authorRole: 'EMPLOYEE' | 'PM' | 'PRODUCER' | 'MANAGER'
  createdAt: string
}
```

### MilestoneData 類型
```typescript
interface MilestoneData {
  id: string
  projectId: string
  name: string
  description?: string
  date: string
  color?: string
  createdById: string
  createdByName: string
  createdAt: string
}
```

---

## 測試建議

1. **任務編輯**：進入任務池 → 點擊任務 → 點擊「編輯」按鈕 → 應顯示編輯表單
2. **註記功能**：進入任務詳情 → 查看註記區塊 → 點擊「新增註記」→ 發表註記
3. **里程碑**：進入甘特圖 → 查看日期軸上方的菱形標記 → 點擊「管理里程碑」

---

## 備註

- 此為前端原型展示版本，所有資料為 Mock 資料
- 實際功能待後端 API 實作後整合
- 權限控制目前以 `currentUser` 模擬，正式版需接入認證系統
