#!/usr/bin/env python3
import sys
import json
import urllib.request

WEBHOOK_URL = "https://open.feishu.cn/open-apis/bot/v2/hook/d5183170-1de2-4df9-83cd-6e29cccdafae"
DEBUG_LOG = "/tmp/claude-hook-debug.json"

data = json.load(sys.stdin)

with open(DEBUG_LOG, "w") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

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

text = f"Claude Code 任务完成✅\n{message[:800]}"

payload = json.dumps({
    "msg_type": "text",
    "content": {"text": text}
}, ensure_ascii=False).encode("utf-8")

req = urllib.request.Request(
    WEBHOOK_URL,
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST",
)

try:
    urllib.request.urlopen(req, timeout=5)
except Exception:
    pass
