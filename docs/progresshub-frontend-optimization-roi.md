# ProgressHub 前端優化建議 - 高 ROI 改進清單

## 📊 分析背景

**分析日期**：2026-02-05
**專案**：ProgressHub 前端（Vue 3 + TypeScript + Pinia + Tailwind CSS）
**分析方法**：20 次迭代深度分析，綜合考量努力程度、影響範圍、風險與依賴關係

---

## 🏆 高 ROI 改進前十名

| 排名 | 改進項目 | 努力 | 影響 | ROI | 說明 |
|:---:|---|:---:|:---:|:---:|---|
| **1** | 🔔 替換 alert/confirm 為 Toast | 低 | 高 | ⭐⭐⭐⭐⭐ | 30+ 處需修改，useToast 已存在 |
| **2** | 🔧 提取重複函數 | 低 | 高 | ⭐⭐⭐⭐⭐ | getStatusLabel() 重複 3 處 |
| **3** | 📦 常數集中管理 | 低 | 中 | ⭐⭐⭐⭐ | 50+ 硬編碼值應移至 /constants |
| **4** | 🧹 移除 console.log | 極低 | 低 | ⭐⭐⭐⭐ | 4 處，5 分鐘完成 |
| **5** | ⚠️ 錯誤處理標準化 | 中 | 高 | ⭐⭐⭐⭐ | 建立統一錯誤處理機制 |
| **6** | 🧪 Store 單元測試 | 中 | 高 | ⭐⭐⭐ | 0% → 先針對核心 store |
| **7** | 🔌 API Client 準備 | 中 | 高 | ⭐⭐⭐ | 建立 axios 實例與攔截器 |
| **8** | 🔐 Router 認證守衛 | 中 | 高 | ⭐⭐⭐ | 目前是存根，需實作驗證 |
| **9** | ♿ 無障礙快速修復 | 低 | 中 | ⭐⭐⭐ | 圖示按鈕加 aria-label |
| **10** | 📐 拆分 GanttPage.vue | 高 | 中 | ⭐⭐ | 1,138 行需拆分 |

---

## 📋 詳細說明

### 1. 🔔 替換 alert/confirm 為 Toast

**現況問題**：
- 30+ 處使用瀏覽器原生 alert/confirm
- 阻斷式 UI，使用者體驗差
- 無法客製化樣式
- 不支援國際化

**影響檔案**：
- `TaskDetailPage.vue`（12 處）
- `GanttPage.vue`（6 處）
- `IntegrationsPage.vue`（8 處）
- `ProfileSettingsPage.vue`（2 處）
- 其他頁面（4+ 處）

**解決方案**：
```typescript
// ❌ 目前寫法
alert('認領任務成功！')
if (confirm('確定要刪除嗎？')) { ... }

// ✅ 改用 useToast
const { showSuccess, showError, showConfirm } = useToast()
showSuccess('認領任務成功！')
```

**預估時間**：1-2 小時

---

### 2. 🔧 提取重複函數

**現況問題**：
- `getStatusLabel()` 在 3 個檔案中重複定義
- `getStatusClass()` 在 2 個檔案中重複
- `getRoleBadgeClass()` 多處重複

**重複位置**：
- `TaskPoolPage.vue:86-102`
- `TaskDetailPage.vue:105-120`
- `GanttPage.vue:445-455`

**解決方案**：
建立 `/composables/useStatusUtils.ts`
```typescript
export const useStatusUtils = () => ({
  getStatusLabel,
  getStatusClass,
  getStatusColor,
  getRoleBadgeClass,
  getRoleLabel,
})
```

**預估時間**：30 分鐘

---

### 3. 📦 常數集中管理

**現況問題**：
- 硬編碼顏色值（`#F59E0B`, `#3B82F6` 等）
- 硬編碼狀態選項
- 魔法字串散落各處

**解決方案**：
```typescript
// /constants/colors.ts
export const MILESTONE_COLORS = [
  { value: '#F59E0B', label: '橙色' },
  { value: '#3B82F6', label: '藍色' },
  // ...
]

// /constants/statusOptions.ts
export const STATUS_OPTIONS = [
  { value: 'ALL', label: '所有狀態' },
  { value: 'UNCLAIMED', label: '待認領' },
  // ...
]
```

**預估時間**：30 分鐘

---

### 4. 🧹 移除 console.log

**位置清單**：
| 檔案 | 行數 |
|---|---|
| `stores/tasks.ts` | 232 |
| `TaskCreatePage.vue` | 126 |
| `ProjectsPage.vue` | 138 |
| `TaskEditPage.vue` | 116 |

**預估時間**：5 分鐘

---

### 5. ⚠️ 錯誤處理標準化

**現況問題**：
- 使用 alert() 顯示錯誤
- 部分操作靜默失敗
- 無全域錯誤邊界

**解決方案**：
```typescript
// /composables/useErrorHandler.ts
export const useErrorHandler = () => {
  const handleError = (error: unknown, context?: string) => {
    const message = error instanceof Error ? error.message : '操作失敗'
    showError(message)
    console.error(`[${context}]`, error)
  }
  return { handleError }
}
```

**預估時間**：1-2 小時

---

### 6. 🧪 Store 單元測試

**現況**：0% 測試覆蓋率

**優先順序**：
1. `stores/tasks.ts` - 核心業務邏輯
2. `stores/auth.ts` - 認證邏輯
3. `composables/useFormValidation.ts` - 表單驗證

**測試框架**：Vitest（已配置但未使用）

**預估時間**：4-6 小時

---

### 7. 🔌 API Client 準備

**現況**：100% Mock，無真實 API 連接

**需要建立**：
```typescript
// /services/api.ts
import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
})

// 認證攔截器
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 錯誤攔截器
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // 處理 token 過期
    }
    return Promise.reject(error)
  }
)
```

**預估時間**：2-3 小時

---

### 8. 🔐 Router 認證守衛

**現況**：
```typescript
// router/index.ts:131
// TODO: Implement actual auth check when backend is ready
```

**解決方案**：
```typescript
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'Login', query: { redirect: to.fullPath } })
  }

  if (to.meta.roles && !to.meta.roles.includes(authStore.userRole)) {
    return next({ name: 'Dashboard' })
  }

  next()
})
```

**預估時間**：1-2 小時

---

### 9. ♿ 無障礙快速修復

**問題清單**：
- 圖示按鈕缺少 `aria-label`
- 表單輸入缺少 `<label>`
- 僅靠顏色傳達狀態

**快速修復範例**：
```vue
<!-- ❌ 目前 -->
<button @click="deleteTask">
  <svg>...</svg>
</button>

<!-- ✅ 改善 -->
<button @click="deleteTask" aria-label="刪除任務">
  <svg aria-hidden="true">...</svg>
</button>
```

**預估時間**：1 小時

---

### 10. 📐 拆分 GanttPage.vue

**現況**：1,138 行，職責過多

**建議拆分**：
- `GanttFilters.vue` - 篩選器區塊
- `GanttTimeline.vue` - 時間軸顯示
- `GanttTaskRow.vue` - 單一任務列
- `GanttMilestones.vue` - 里程碑管理
- `useGanttCalculations.ts` - 計算邏輯

**預估時間**：4-6 小時

---

## 🗓️ 建議執行順序

### 第一階段：快速清理（1-2 小時）
- [ ] 項目 4：移除 console.log
- [ ] 項目 3：常數集中管理
- [ ] 項目 2：提取重複函數
- [ ] 項目 1：替換 alert/confirm

### 第二階段：核心改進（1-2 天）
- [ ] 項目 5：錯誤處理標準化
- [ ] 項目 7：API Client 準備
- [ ] 項目 8：Router 認證守衛

### 第三階段：品質提升（持續）
- [ ] 項目 6：Store 單元測試
- [ ] 項目 9：無障礙修復
- [ ] 項目 10：GanttPage 拆分

---

## 📊 當前程式碼品質指標

| 指標 | 數值 | 目標 |
|---|---|---|
| 測試覆蓋率 | 0% | 80%+ |
| 檔案 >300 行 | 12 個 | 0 個 |
| console.log | 4 處 | 0 處 |
| alert/confirm | 30+ 處 | 0 處 |
| 重複函數 | 6+ 組 | 0 組 |
| 硬編碼值 | 50+ 處 | 0 處 |

---

## 🔗 相關資源

- **專案分支**：`claude/enable-plan-mode-1HAyD`
- **GitHub**：https://github.com/jerrycela/progresshub
- **部署環境**：https://progresshub.zeabur.app
