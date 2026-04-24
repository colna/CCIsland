#!/usr/bin/env python3
"""
通用 IM webhook 通知 hook。

环境变量:
  IM_WEBHOOK_URL              必需。未设置则静默跳过,不发送通知。
  IM_WEBHOOK_PAYLOAD_TEMPLATE 可选。JSON 字符串,{message} 作为消息占位符。
                              未设置时使用飞书/Lark 兼容的默认模板。

需要通过 /setup-im-hook skill 配置,或手动在 ~/.zshrc / ~/.bashrc 里 export。
"""
import json
import os
import sys
import urllib.request

WEBHOOK_URL = os.environ.get("IM_WEBHOOK_URL", "").strip()
if not WEBHOOK_URL:
    sys.exit(0)

DEFAULT_TEMPLATE = '{"msg_type":"text","content":{"text":"Claude Code 任务完成✅\\n{message}"}}'
PAYLOAD_TEMPLATE = os.environ.get("IM_WEBHOOK_PAYLOAD_TEMPLATE", "").strip() or DEFAULT_TEMPLATE

data = json.load(sys.stdin)

hook_event = data.get("hook_event_name", "")
stop_reason = data.get("stop_reason", "")
notification_type = data.get("notification_type", "")

if hook_event == "Notification" and notification_type == "permission_prompt":
    sys.exit(0)

if hook_event == "Stop" and stop_reason != "end_turn":
    sys.exit(0)

message = ""
transcript_path = data.get("transcript_path", "")
if transcript_path:
    try:
        with open(transcript_path, "r") as f:
            last_assistant = ""
            for line in f:
                entry = json.loads(line)
                if entry.get("type") == "assistant":
                    parts = entry.get("message", {}).get("content", [])
                    texts = [p.get("text", "") for p in parts if p.get("type") == "text"]
                    if texts:
                        last_assistant = "\n".join(texts)
            message = last_assistant.strip()
    except Exception:
        pass

if not message:
    message = data.get("message", "") or "任务已完成"

message = message[:800]

escaped = json.dumps(message, ensure_ascii=False)[1:-1]
body = PAYLOAD_TEMPLATE.replace("{message}", escaped).encode("utf-8")

req = urllib.request.Request(
    WEBHOOK_URL,
    data=body,
    headers={"Content-Type": "application/json"},
    method="POST",
)

try:
    urllib.request.urlopen(req, timeout=5)
except Exception:
    pass
