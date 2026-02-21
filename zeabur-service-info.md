# Zeabur Service 資訊

## Service 數量：1 個

## Service 詳情

| 項目 | 內容 |
|------|------|
| **Service 名稱** | progresshub |
| **狀態** | RUNNING ✅ |
| **網址** | https://progresshub.zeabur.app |
| **框架** | Vue.js（前端） |
| **部署方式** | 前端靜態部署（使用 Caddy 靜態服務器） |

## 架構說明

根據 Dockerfile 可以看出，你的 progresshub 是一個前端專案，採用多階段構建：

1. **第一階段**：使用 Node.js 22 Alpine 構建 Vue 前端應用
2. **第二階段**：使用 Zeabur 的 Caddy 靜態服務器來提供構建後的靜態文件

這表示你目前只部署了前端部分。如果你有後端服務，它們應該是部署在其他專案或其他 service 中。
