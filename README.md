# Slack Bot - 小龍蝦專屬回應機器人

這個 Slack 機器人會積極回應小龍蝦（<@U08CF634LSH>）在頻道中發起的所有討論訊息。

## 功能特點

- ✅ 自動檢測小龍蝦（用戶 ID: U08CF634LSH）發送的所有訊息
- ✅ 積極且友好地回應每一條訊息
- ✅ 支持在討論串（thread）中回應
- ✅ 根據訊息內容提供智能回應
- ✅ 24/7 持續運行

## 設置說明

### 1. 前置需求

- Python 3.8 或更高版本
- Slack 工作區的管理員權限（用於創建應用）

### 2. 創建 Slack App

1. 前往 [Slack API](https://api.slack.com/apps) 並點擊 "Create New App"
2. 選擇 "From scratch"
3. 輸入應用名稱（例如：小龍蝦助手）並選擇工作區

### 3. 配置 App 權限

在 "OAuth & Permissions" 部分，添加以下 Bot Token Scopes：

- `app_mentions:read` - 讀取 @mentions
- `channels:history` - 讀取公開頻道的訊息歷史
- `channels:read` - 查看公開頻道信息
- `chat:write` - 發送訊息
- `groups:history` - 讀取私有頻道的訊息歷史（如需要）
- `im:history` - 讀取直接訊息（如需要）
- `mpim:history` - 讀取群組訊息（如需要）

### 4. 啟用 Socket Mode

1. 前往 "Socket Mode" 並啟用它
2. 創建一個 App-Level Token，範圍選擇 `connections:write`
3. 保存這個 token（以 `xapp-` 開頭）

### 5. 訂閱事件

在 "Event Subscriptions" 部分：

1. 啟用 Events
2. 在 "Subscribe to bot events" 中添加：
   - `app_mention` - 當有人 @提及機器人
   - `message.channels` - 公開頻道的訊息
   - `message.groups` - 私有頻道的訊息（如需要）
   - `message.im` - 直接訊息（如需要）
   - `message.mpim` - 群組訊息（如需要）

### 6. 安裝 App 到工作區

1. 前往 "Install App"
2. 點擊 "Install to Workspace"
3. 授權應用
4. 複製 "Bot User OAuth Token"（以 `xoxb-` 開頭）

### 7. 本地設置

1. 克隆此倉庫：
```bash
git clone <repository-url>
cd openclawfortest
```

2. 創建虛擬環境並安裝依賴：
```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. 創建 `.env` 文件：
```bash
cp .env.example .env
```

4. 編輯 `.env` 文件，填入你的令牌：
```
SLACK_BOT_TOKEN=xoxb-your-actual-bot-token
SLACK_APP_TOKEN=xapp-your-actual-app-token
```

### 8. 運行機器人

```bash
python app.py
```

你應該會看到類似這樣的輸出：
```
INFO:__main__:Starting Slack bot...
INFO:__main__:Target user (Xiaolongxia): U08CF634LSH
⚡️ Bolt app is running!
```

### 9. 邀請機器人到頻道

在你想讓機器人工作的 Slack 頻道中：
```
/invite @你的機器人名稱
```

## 使用方法

機器人會自動執行以下操作：

1. **監聽所有訊息**：機器人會監聽它被邀請的頻道中的所有訊息
2. **識別小龍蝦**：當檢測到用戶 ID 為 `U08CF634LSH` 的訊息時
3. **積極回應**：自動生成友好的回應並發送

### 回應示例

當小龍蝦說：
- "你好" → 機器人回應："你好！很高興見到你！有什麼我可以幫忙的嗎？"
- "謝謝" → 機器人回應："不客氣！隨時樂意幫忙！"
- "幫助" → 機器人回應："當然！請告訴我你需要什麼幫助，我會盡力協助你。"
- 任何問題 → 機器人回應："這是個好問題！讓我想想... 我會盡力回答你的問題。"
- 其他訊息 → 機器人回應："我收到你的訊息了！我在這裡隨時準備協助你。"

## 自定義

### 修改目標用戶

編輯 `app.py` 中的 `TARGET_USER_ID`：
```python
TARGET_USER_ID = "U08CF634LSH"  # 改成其他用戶 ID
```

### 添加更多回應

在 `generate_response()` 函數中添加更多關鍵詞匹配：
```python
def generate_response(text):
    text_lower = text.lower()

    if "你的關鍵詞" in text:
        return "你的自定義回應"
    # ... 更多條件
```

### 整合 AI（可選）

你可以整合 OpenAI、Claude 或其他 AI API 來生成更智能的回應：

```python
def generate_response(text):
    # 調用 AI API
    response = your_ai_api.generate(text)
    return response
```

## 部署到生產環境

### 使用 Systemd（Linux）

創建服務文件 `/etc/systemd/system/slack-bot.service`：
```ini
[Unit]
Description=Slack Bot for Xiaolongxia
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/openclawfortest
Environment="PATH=/path/to/openclawfortest/venv/bin"
ExecStart=/path/to/openclawfortest/venv/bin/python app.py
Restart=always

[Install]
WantedBy=multi-user.target
```

啟動服務：
```bash
sudo systemctl enable slack-bot
sudo systemctl start slack-bot
sudo systemctl status slack-bot
```

### 使用 Docker

創建 `Dockerfile`：
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app.py .
CMD ["python", "app.py"]
```

構建並運行：
```bash
docker build -t slack-bot .
docker run -d --env-file .env --name slack-bot slack-bot
```

### 使用雲平台

- **Heroku**: 添加 `Procfile` 文件
- **AWS EC2**: 使用 systemd 或 supervisor
- **Google Cloud Run**: 容器化部署
- **Railway/Render**: 直接連接 GitHub 倉庫

## 故障排除

### 機器人沒有回應

1. 檢查機器人是否被邀請到頻道
2. 驗證 `.env` 文件中的令牌是否正確
3. 確認事件訂閱已正確配置
4. 查看日誌輸出是否有錯誤訊息

### 權限錯誤

確保在 Slack App 設置中授予了所有必需的權限，然後重新安裝 App 到工作區。

### Socket Mode 連接失敗

確保 `SLACK_APP_TOKEN` 正確且 Socket Mode 已啟用。

## 日誌

機器人會記錄以下信息：
- 接收到的訊息
- 發送的回應
- 錯誤和異常

查看日誌：
```bash
# 如果使用 systemd
sudo journalctl -u slack-bot -f

# 如果直接運行
# 日誌會輸出到終端
```

## 許可證

MIT License

## 支持

如有問題或建議，請提交 Issue 或 Pull Request。
