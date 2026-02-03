# ProgressHub - Claude 開發指引

## 🎯 Claude 行為規則

### 「注意」關鍵字觸發規則

**當使用者訊息中包含「注意」兩個字時，Claude 必須：**

1. 仔細閱讀使用者的建議或警告
2. 將該建議整理成結構化的規則
3. **自動寫入 CLAUDE.md** 的對應章節
4. 確認已記錄，並繼續執行任務

**格式範例：**
```markdown
### [類別] 問題描述

| 項目 | 內容 |
|------|------|
| **嚴重度** | 🔴 Critical / 🟠 High / 🟡 Medium |
| **原因** | 為什麼這很重要 |
| **解決方案** | 應該怎麼做 |
```

> 這是一種「復利工程」機制：每次提醒，永久降低未來錯誤率。

---

## 語言規範

**所有生成內容請使用繁體中文回覆**，包括：
- 程式碼註解
- Commit 訊息
- 文件說明
- 與使用者的對話

---

## 專案概述

**ProgressHub** 是一套專案進度管理系統，讓團隊成員能夠透過 Slack 或網頁回報工作進度，PM 可即時掌握所有專案執行狀況。

### 技術架構
- **前端**: Vue 3 + Vite + Tailwind CSS + Frappe Gantt
- **後端**: Node.js + Express + TypeScript
- **資料庫**: PostgreSQL 15 + Prisma ORM
- **認證**: Slack OAuth + JWT
- **部署**: Zeabur (預覽) → 公司內網 (正式)

### 專案結構
```
progresshub/
├── packages/
│   ├── frontend/           # Vue 3 + Vite + Tailwind
│   ├── backend/            # Express + TypeScript + Prisma
│   └── shared/             # 共用類型定義
├── docker-compose.yml
├── package.json            # workspace root
└── pnpm-workspace.yaml
```

---

## ⚠️ Zeabur 部署經驗教訓（必讀）

> **重要性**: 🔴 Critical - 所有開發必須遵守以下規範

### 過去踩過的坑

| # | 問題 | 嚴重度 | 根本原因 | 影響 |
|---|------|--------|----------|------|
| 1 | OpenSSL 缺失 | 🔴 Critical | Alpine Linux 未預裝 OpenSSL | Prisma 無法運行，502 錯誤 |
| 2 | 根目錄 Python Dockerfile | 🔴 Critical | 舊 Slack Bot 遺留檔案 | Zeabur 載入錯誤的 Dockerfile |
| 3 | vue-tsc 建構錯誤 | 🟠 High | 前端/後端目錄混淆 | Build 失敗 |
| 4 | 非 Production Build | 🟡 Medium | Dockerfile 使用 npm run dev | 效能差、不穩定 |
| 5 | Monorepo shared 模組找不到 | 🔴 Critical | Dockerfile 只在 frontend 目錄運行，無法存取 shared | Build 失敗 |
| 6 | Vue Router 嵌套路由使用 slot | 🔴 Critical | MainLayout 使用 `<slot />` 而非 `<router-view />` | 頁面內容區域空白 |

### 必須遵守的 Dockerfile 規範

**Frontend Dockerfile 標準模板（Monorepo）:**
```dockerfile
# ⚠️ 關鍵：必須放在專案根目錄，從根目錄構建才能存取 shared 包
FROM node:22-alpine
LABEL "language"="nodejs"
LABEL "framework"="vue"

WORKDIR /src

# 安裝 pnpm
RUN npm install -g pnpm@8

# 複製整個專案（包含 pnpm-workspace.yaml 和所有 packages）
COPY . .

# 安裝所有 workspace 依賴（包含 shared）
RUN pnpm install

# 使用 filter 構建 frontend（可以存取 shared 包的類型）
RUN pnpm --filter frontend build

# 使用 Zeabur 的 Caddy 靜態文件服務
FROM zeabur/caddy-static

# 複製構建產物
COPY --from=0 /src/packages/frontend/dist /usr/share/caddy

EXPOSE 8080
```

> ⚠️ **重要**：Monorepo 前端部署必須從根目錄構建，不能只在 `packages/frontend` 目錄內構建，否則無法存取 `shared` 包。

**Backend Dockerfile 標準模板:**
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

# ⚠️ 關鍵：必須安裝 OpenSSL，否則 Prisma 無法運行
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

### 必須創建的配置檔

**1. `/packages/backend/.zeaburignore`**
```
../frontend
../shared
node_modules
*.test.ts
```

**2. `/packages/backend/zeabur.json`**
```json
{
  "$schema": "https://schema.zeabur.app/zeabur.json",
  "build": {
    "type": "dockerfile",
    "dockerfile": "Dockerfile"
  },
  "start": {
    "command": "npx prisma migrate deploy && node dist/index.js"
  },
  "healthcheck": {
    "path": "/health",
    "port": 3000
  }
}
```

### Zeabur Dashboard 設定檢查清單

- [ ] **Root Directory**: 設定為 `/packages/backend`（不是根目錄！）
- [ ] **不要在根目錄放 Dockerfile**（避免 Zeabur 混淆）
- [ ] **環境變數必須設定**:
  ```
  DATABASE_URL=${POSTGRES_URI}
  JWT_SECRET=<your-secret>
  NODE_ENV=production
  SLACK_CLIENT_ID=...
  SLACK_CLIENT_SECRET=...
  SLACK_SIGNING_SECRET=...
  SLACK_BOT_TOKEN=...
  ```

### 部署驗證步驟

1. 檢查 Build Logs: 確認無 OpenSSL 或 vue-tsc 錯誤
2. 健康檢查: 訪問 `https://<backend-url>/health`
3. API 文檔: 訪問 `https://<backend-url>/api-docs`

---

## 🎨 UI/UX 設計規範（必讀）

> **重要性**: 🔴 Critical - 所有前端介面開發必須遵守

### 必須使用 UI/UX Pro Max Skill

**所有前端介面開發一律必須使用 UI/UX Pro Max Skill 生成設計系統。**

**Skill 位置**: `/home/user/ui-ux-pro-max-skill`

### 搜尋指令（來自 UI/UX Pro Max Skill）

```bash
cd /home/user/ui-ux-pro-max-skill
python3 src/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain> [-n <max_results>]
```

**Domain 搜尋:**
| Domain | 用途 | 範例關鍵字 |
|--------|------|-----------|
| `product` | 產品類型建議 | SaaS, e-commerce, portfolio |
| `style` | UI 風格 + AI prompts + CSS | glassmorphism, minimalism, brutalism |
| `typography` | 字體配對 + Google Fonts | elegant, playful, professional |
| `color` | 依產品類型的調色盤 | saas, ecommerce, healthcare, beauty |
| `landing` | 頁面結構與 CTA 策略 | hero, testimonial, pricing, social-proof |
| `chart` | 圖表類型與套件推薦 | trend, comparison, timeline, funnel |
| `ux` | 最佳實踐與反模式 | animation, accessibility, z-index |

**Stack 搜尋:**
```bash
python3 src/ui-ux-pro-max/scripts/search.py "<query>" --stack <stack>
```
可用 stacks: `html-tailwind` (預設), `react`, `nextjs`, `vue`, `svelte`, `swiftui`, `react-native`, `flutter`, `shadcn`

### 使用步驟

1. **生成設計系統** (每個新專案/新頁面必做):
```bash
cd /home/user/ui-ux-pro-max-skill
python3 src/ui-ux-pro-max/scripts/search.py "<產品類型> <產業> <關鍵字>" --design-system -p "專案名稱"
```

2. **取得 Stack 指南** (Vue/Tailwind):
```bash
python3 src/ui-ux-pro-max/scripts/search.py "<關鍵字>" --stack vue
```

3. **取得特定領域指南**:
```bash
python3 src/ui-ux-pro-max/scripts/search.py "<關鍵字>" --domain <domain>
```

### UI/UX Pro Max Skill 架構

```
/home/user/ui-ux-pro-max-skill/
├── src/ui-ux-pro-max/
│   ├── data/                 # CSV 資料庫
│   │   ├── products.csv, styles.csv, colors.csv, typography.csv
│   │   └── stacks/           # Stack 特定指南
│   ├── scripts/
│   │   ├── search.py         # CLI 入口
│   │   ├── core.py           # BM25 + regex 搜尋引擎
│   │   └── design_system.py  # 設計系統生成
│   └── templates/            # 模板檔案
└── CLAUDE.md                 # Skill 說明文件
```

### ProgressHub 設計系統 (SG-Arts 品牌規範)

> **品牌來源**: 侍達遊戲集團 (SG-Arts) 2026 戰略簡報色彩規範
> **設計風格**: 精品金屬質感
> **核心主題**: 以黑、白、金屬灰為主體，赤紅為點綴

#### 色彩系統

**核心強調色:**
| 名稱 | Hex | 用途 |
|------|-----|------|
| 侍魂赤紅 | `#C41E3A` | 核心標題線、關鍵數據、重點圖表、CTA 按鈕 |

**基底背景色:**
| 名稱 | Hex | 用途 |
|------|-----|------|
| 明亮白 | `#FFFFFF` | 主體背景 |
| 金屬銀灰 | `#E5E7EB` | 次要邊框線、分隔線 |
| 淺金屬灰 | `#F3F4F6` | 裝飾性漸層、圖表軌道背景、卡片背景 |
| 曜石黑 | `#1A1A1A` | 底部識別線、主體條形圖填充、Dark mode 背景 |

**UI 元素色:**
| 名稱 | Hex | 用途 |
|------|-----|------|
| 珍珠灰 | `#F9FAFB` | 功能卡片背景、側邊欄背景 |
| 霧銀灰 | `#D1D5DB` | 圖片邊框、細微裝飾線條 |

**文字色彩:**
| 名稱 | Hex | 用途 |
|------|-----|------|
| 深黑 | `#000000` | 主標題、封面標題、巨型數據 |
| 碳黑 | `#1A1A1A` | 次級標題、表格標題 |
| 冷灰 | `#4B5563` | 內文、清單描述、表格內容 |
| 中灰 | `#6B7280` | 副標題、補充說明文字 |
| 淺灰 | `#9CA3AF` | 頁碼提示、英文標籤、背景小字 |

#### Dark Mode 配色

| 元素 | Light Mode | Dark Mode |
|------|------------|-----------|
| 背景主色 | `#FFFFFF` | `#1A1A1A` |
| 背景次色 | `#F9FAFB` | `#262626` |
| 背景卡片 | `#F3F4F6` | `#303030` |
| 文字主色 | `#1A1A1A` | `#F9FAFB` |
| 文字次色 | `#4B5563` | `#9CA3AF` |
| 邊框色 | `#E5E7EB` | `#404040` |
| 強調色 | `#C41E3A` | `#E85A6B` (稍亮) |

#### 設計原則

1. **赤紅色面積佔比低於 5%** - 維持精品高級感
2. **根據資訊重要程度進行色調分層** - 重要資訊用深色，次要用淺色
3. **利用微弱漸層模擬金屬表面折射感** - `#F3F4F6` → `#FFFFFF`
4. **字體**: Inter (Google Fonts)
5. **過渡動畫**: 150-200ms ease

### Pre-Delivery Checklist (交付前檢查)

- [ ] **無 emoji 圖示** - 使用 SVG (Heroicons/Lucide)
- [ ] **cursor-pointer** - 所有可點擊元素
- [ ] **Hover 過渡** - 150-300ms smooth transitions
- [ ] **文字對比** - 4.5:1 minimum
- [ ] **Focus 狀態** - 鍵盤導航可見
- [ ] **prefers-reduced-motion** - 尊重使用者偏好
- [ ] **響應式** - 375px, 768px, 1024px, 1440px

---

## 🔴 TypeScript 嚴格規範（Critical）

> **重要性**: 🔴 Critical - 部署時最常因為 TypeScript 問題出現 bug，必須嚴格遵守

### 必須遵守的規則

1. **所有變數都要明確型別**
   ```typescript
   // ❌ 錯誤
   const items = []
   data.filter(t => t.id === id)

   // ✅ 正確
   const items: Task[] = []
   data.filter((t: Task) => t.id === id)
   ```

2. **禁止未使用的 import/變數**
   ```typescript
   // ❌ 錯誤 - 會導致 vue-tsc 編譯失敗
   import { ref, computed, onMounted } from 'vue'  // onMounted 未使用

   // ✅ 正確
   import { ref, computed } from 'vue'
   ```

3. **回調函數參數必須標註型別**
   ```typescript
   // ❌ 錯誤
   tasks.filter(t => t.status === 'DONE')

   // ✅ 正確
   tasks.filter((t: Task) => t.status === 'DONE')
   ```

4. **建構前必須執行 vue-tsc 檢查**
   ```bash
   # 開發時定期檢查
   pnpm --filter frontend vue-tsc --noEmit

   # 或直接 build（會自動執行 vue-tsc）
   pnpm --filter frontend build
   ```

5. **tsconfig.json 嚴格模式設定**
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noImplicitAny": true
     }
   }
   ```

### 常見 TypeScript 踩雷

| # | 問題 | 嚴重度 | 解決方案 |
|---|------|--------|----------|
| 1 | 未使用的 import | 🔴 High | 刪除或使用 `_` 前綴 |
| 2 | filter/map 回調缺少型別 | 🔴 High | 加上 `(item: Type) =>` |
| 3 | 模組路徑找不到 | 🔴 High | 檢查 tsconfig paths 和 vite alias |
| 4 | 隱式 any 型別 | 🟠 Medium | 明確標註型別 |
| 5 | 未使用的變數 | 🟠 Medium | 刪除或加 `_` 前綴 |

---

## 🔄 復利工程（錯誤記錄機制）

> **核心原則**: Claude 每犯一次錯，就寫一條規則進 CLAUDE.md

### 為什麼這很重要

CLAUDE.md 是 Claude Code 的專屬背景記憶文件：
- 放在專案根目錄，每次啟動自動讀取
- 視為「專案說明書 + 禁忌清單」
- **每次修正，永久降低未來錯誤率**

### 新增規則的時機

1. **Build/Deploy 失敗** → 記錄根本原因與解決方案
2. **Code Review 發現問題** → 要求 Claude 把規則加進 CLAUDE.md
3. **重複性錯誤** → 立即建立防護規則
4. **環境配置問題** → 記錄正確的配置方式

### 規則格式建議

```markdown
### [問題類型] 問題描述

| 項目 | 內容 |
|------|------|
| **嚴重度** | 🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low |
| **根本原因** | 為什麼會發生 |
| **解決方案** | 如何修復 |
| **預防措施** | 未來如何避免 |
```

### 目前已記錄的踩雷經驗

1. ✅ OpenSSL 缺失（Zeabur + Prisma）
2. ✅ 根目錄 Dockerfile 混淆
3. ✅ vue-tsc 建構錯誤
4. ✅ 非 Production Build 問題
5. ✅ Monorepo shared 模組找不到
6. ✅ Vue Router 嵌套路由使用 slot

### [Monorepo] Shared 模組找不到

| 項目 | 內容 |
|------|------|
| **嚴重度** | 🔴 Critical |
| **錯誤訊息** | `Cannot find module 'shared/types' or its corresponding type declarations` |
| **根本原因** | pnpm monorepo 專案中，frontend 使用 `import from 'shared/types'`，但 Dockerfile 只在 `packages/frontend` 目錄運行，無法存取上層的 `packages/shared` |
| **解決方案** | Dockerfile 必須放在專案根目錄，從根目錄執行 `pnpm install` 和 `pnpm --filter frontend build` |
| **預防措施** | Monorepo 前端部署一律使用根目錄構建模式 |

**Zeabur 部署配置（JSON）：**
```json
{
  "source": {
    "type": "BUILD_FROM_SOURCE",
    "build_from_source": {
      "dockerfile": {
        "content": "FROM node:22-alpine\nLABEL \"language\"=\"nodejs\"\nLABEL \"framework\"=\"vue\"\n\nWORKDIR /src\n\nRUN npm install -g pnpm@8\n\nCOPY . .\n\nRUN pnpm install\n\nRUN pnpm --filter frontend build\n\nFROM zeabur/caddy-static\n\nCOPY --from=0 /src/packages/frontend/dist /usr/share/caddy\n\nEXPOSE 8080"
      }
    }
  }
}
```

### [Vue Router] 嵌套路由使用錯誤元素

| 項目 | 內容 |
|------|------|
| **嚴重度** | 🔴 Critical |
| **錯誤症狀** | 部署成功但頁面主內容區域空白，只有導航欄和側邊欄顯示 |
| **根本原因** | 在佈局元件（如 MainLayout.vue）中使用 `<slot />` 而非 `<router-view />` |
| **解決方案** | 將 `<slot />` 改為 `<router-view />` |
| **預防措施** | Vue Router 嵌套路由的父元件必須使用 `<router-view />` 來渲染子路由組件 |

**Vue Router vs Vue Component 渲染方式：**
| 元素 | 用途 | 使用場景 |
|------|------|---------|
| `<slot />` | Vue 元件插槽 | 父元件傳遞內容給子元件 |
| `<router-view />` | Vue Router 出口 | 渲染當前路由匹配的子組件 |

---

## 開發規範

### 程式碼風格
- 使用 TypeScript 嚴格模式
- ESLint + Prettier 統一格式
- 使用 pnpm 作為套件管理器

### Git 規範
- 分支命名: `feature/xxx`, `fix/xxx`, `refactor/xxx`
- Commit 訊息格式: `type(scope): description`
  - feat: 新功能
  - fix: 修復
  - refactor: 重構
  - docs: 文件
  - test: 測試

### API 規範
- RESTful 設計
- 統一錯誤回應格式
- JWT 認證 + 權限中介層

---

## 環境變數

### 開發環境 (.env.development)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/progresshub
JWT_SECRET=dev-secret-key
NODE_ENV=development
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_BOT_TOKEN=xoxb-your-bot-token
```

### 生產環境 (.env.production)
```env
DATABASE_URL=${POSTGRES_URI}
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
SLACK_CLIENT_ID=${SLACK_CLIENT_ID}
SLACK_CLIENT_SECRET=${SLACK_CLIENT_SECRET}
SLACK_SIGNING_SECRET=${SLACK_SIGNING_SECRET}
SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}
```

---

## 常用指令

```bash
# 安裝依賴
pnpm install

# 啟動開發環境
docker-compose up -d          # 啟動 PostgreSQL
pnpm --filter backend dev     # 啟動後端
pnpm --filter frontend dev    # 啟動前端

# 資料庫操作
pnpm --filter backend prisma:generate  # 生成 Prisma Client
pnpm --filter backend prisma:migrate   # 執行 migration
pnpm --filter backend prisma:studio    # 開啟 Prisma Studio

# 測試
pnpm test                     # 執行所有測試
pnpm --filter backend test    # 後端測試
pnpm --filter frontend test   # 前端測試

# 建構
pnpm build                    # 建構所有套件
```
