#!/usr/bin/env python3
"""
Slack Bot - 積極回應小龍蝦的訊息
Actively responds to all messages from Xiaolongxia (小龍蝦)
"""

import os
import logging
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

# 設置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 初始化 Slack App
app = App(token=os.environ.get("SLACK_BOT_TOKEN"))

# 目標用戶 ID - 小龍蝦
TARGET_USER_ID = "U08CF634LSH"


@app.event("app_mention")
def handle_app_mentions(body, say, logger):
    """
    處理 @mention 事件
    Handle app mention events
    """
    event = body["event"]
    user_id = event.get("user")
    text = event.get("text", "")

    logger.info(f"Received mention from user {user_id}: {text}")

    # 回應所有 mention，但對小龍蝦特別友好
    if user_id == TARGET_USER_ID:
        say(
            text=f"嗨 <@{user_id}>！我看到你的訊息了！有什麼我可以幫助你的嗎？ 😊",
            thread_ts=event.get("ts")
        )
    else:
        say(
            text=f"你好 <@{user_id}>！",
            thread_ts=event.get("ts")
        )


@app.message()
def handle_message_events(message, say, logger):
    """
    處理所有訊息事件
    Handle all message events - actively respond to Xiaolongxia
    """
    user_id = message.get("user")
    text = message.get("text", "")
    channel = message.get("channel")
    thread_ts = message.get("thread_ts") or message.get("ts")

    # 忽略機器人自己的訊息
    if message.get("subtype") == "bot_message":
        return

    # 如果是小龍蝦發的訊息，積極回應！
    if user_id == TARGET_USER_ID:
        logger.info(f"Message from Xiaolongxia in channel {channel}: {text}")

        # 根據訊息內容給出不同的回應
        response = generate_response(text)

        say(
            text=f"<@{user_id}> {response}",
            thread_ts=thread_ts
        )
        logger.info(f"Responded to Xiaolongxia with: {response}")


def generate_response(text):
    """
    根據訊息內容生成回應
    Generate response based on message content
    """
    text_lower = text.lower()

    # 簡單的關鍵詞匹配回應
    if "你好" in text or "hello" in text_lower or "hi" in text_lower:
        return "你好！很高興見到你！有什麼我可以幫忙的嗎？"
    elif "謝謝" in text or "thank" in text_lower:
        return "不客氣！隨時樂意幫忙！"
    elif "幫助" in text or "help" in text_lower:
        return "當然！請告訴我你需要什麼幫助，我會盡力協助你。"
    elif "?" in text or "？" in text or "how" in text_lower or "什麼" in text or "怎麼" in text:
        return "這是個好問題！讓我想想... 我會盡力回答你的問題。"
    else:
        return "我收到你的訊息了！我在這裡隨時準備協助你。"


@app.event("message")
def handle_message(event, say):
    """
    處理訊息事件的備用處理器
    Fallback message event handler
    """
    pass


if __name__ == "__main__":
    # 啟動應用程序
    logger.info("Starting Slack bot...")
    logger.info(f"Target user (Xiaolongxia): {TARGET_USER_ID}")

    # 使用 Socket Mode
    handler = SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"])
    handler.start()
