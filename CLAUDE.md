# Claude Code 專案指引

## 變更提交規範

所有變更完成後，必須提供以下資訊供團隊成員檢視：

### 必要資訊
- **分支名稱**: 完整的分支名稱
- **最新 Commit**: commit hash 和訊息
- **變更摘要**: 本次變更的重點內容

### 範例格式
```
## 變更完成

- 分支: `claude/dev-assistance-Otowz`
- Commit: `901c9e0 feat(frontend): 新增 Vue 3 前端並實作安全性修復`
- 檢視連結: https://github.com/jerrycela/openclawfortest/tree/claude/dev-assistance-Otowz

### 變更內容
1. 功能 A
2. 功能 B
3. 修復 C
```

## 專案結構

```
├── backend/          # Express.js + TypeScript 後端 API
├── frontend/         # Vue 3 + TypeScript 前端
├── scheduler/        # 排程任務服務
├── .github/          # GitHub Actions CI/CD
└── docker-compose.yml
```

## 技術棧

- **後端**: Express.js, TypeScript, Prisma, PostgreSQL
- **前端**: Vue 3, TypeScript, Pinia, Tailwind CSS
- **認證**: Slack OAuth + JWT
- **部署**: Docker, Zeabur

## 專案慣例

### PRD 文件
- 位置：`backend/docs/`
- 命名：`PRD_<功能名稱>.md`
- 版本記錄：每次更新需更新版本號和變更記錄

### Git 提交訊息
- 使用繁體中文
- 格式：`<type>: <描述>`
- 類型：`feat`, `fix`, `docs`, `chore`, `refactor`
