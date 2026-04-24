---
name: setup-im-hook
description: >
  配置 Claude Code 完成任务后自动推送通知到 IM 群（飞书/钉钉/企业微信/Slack/Discord/自定义 webhook）。
  将 webhook URL 安全地写入用户 shell rc 文件（~/.zshrc 或 ~/.bashrc），通过环境变量被仓库内已预置的 hook 脚本读取，不在仓库中留明文。
  当用户提到"通知""webhook""接入飞书/钉钉/Slack""任务完成提醒""IM 推送""群消息""setup-im-hook"时触发。
  即使用户只是模糊地说"做完了能不能告诉我一声"也应该触发此 skill。
allowed-tools: Bash AskUserQuestion Read Edit
---

# Setup IM Webhook

帮用户把 IM 群的 incoming webhook 接入 Claude Code，实现任务完成后自动发群消息。

核心原理：仓库里的 `.claude/hooks/im-webhook-notify.py` 脚本在 Claude Code 每次任务完成时自动执行，它从环境变量 `$IM_WEBHOOK_URL` 读取地址并 POST 通知。这个 skill 要做的就是把用户的 webhook URL 写进 shell rc 文件，让环境变量生效。

## 第一步：收集信息

用 `AskUserQuestion` 询问两个问题：

1. **IM 平台**（单选）：飞书/Lark、钉钉、企业微信、Slack/Discord、自定义
2. **Webhook URL**：让用户在"其他"里填入（URL 是敏感信息，不要预设选项）

拿到 URL 后做基本校验：必须以 `http://` 或 `https://` 开头。不做域名限制——用户可能用自建服务。

## 第二步：写入环境变量

根据平台选择对应的 payload 模板，写入用户的 shell rc 文件。

### 检测 rc 文件

```bash
echo "$SHELL"
```

- zsh → `~/.zshrc`
- bash → `~/.bashrc`（macOS 上先 `ls ~/.bash_profile ~/.bashrc 2>/dev/null` 确认哪个存在，优先 `~/.bashrc`）
- 其他 shell → 告知用户需要手动在对应 rc 文件中添加 export，并给出要添加的内容

### 写入规则

先 `Read` 目标 rc 文件，检查是否已有 `export IM_WEBHOOK_URL=`：

- **已存在** → 用 `Edit` 替换整行为新值；同时替换 `IM_WEBHOOK_PAYLOAD_TEMPLATE` 行（如有）
- **不存在** → 用 `Edit` 在文件末尾追加：

```sh

# Claude Code IM webhook (added by /setup-im-hook)
export IM_WEBHOOK_URL="<URL>"
export IM_WEBHOOK_PAYLOAD_TEMPLATE='<模板>'
```

### 各平台 Payload 模板

模板是 JSON 字符串，`{message}` 是运行时占位符。export 时用**单引号**包裹以避免 shell 转义。

| 平台 | 模板 |
|------|------|
| 飞书/Lark | `{"msg_type":"text","content":{"text":"Claude Code 任务完成✅\n{message}"}}` |
| 钉钉 | `{"msgtype":"text","text":{"content":"Claude Code 任务完成✅\n{message}"}}` |
| 企业微信 | `{"msgtype":"text","text":{"content":"Claude Code 任务完成✅\n{message}"}}` |
| Slack/Discord | `{"text":"Claude Code 任务完成✅\n{message}"}` |
| 自定义 | 让用户提供，要求包含 `{message}` 占位符 |

飞书是默认模板（脚本内置），选飞书时可以省略 `IM_WEBHOOK_PAYLOAD_TEMPLATE` 的 export。其他平台必须 export 模板。

## 第三步：激活与验证

环境变量写入 rc 文件后不会立即生效——需要让当前 shell 重新加载。告知用户：

> 请执行 `source ~/.zshrc`（或对应的 rc 文件），或者关闭终端重新打开。
> 如果 Claude Code 已经在运行，需要**退出并重启**才能读到新的环境变量。

给用户一条测试命令，在 source 后执行：

```bash
curl -s -X POST "$IM_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d '{"msg_type":"text","content":{"text":"webhook 测试 🎉"}}'
```

如果不是飞书，替换 `-d` 的内容为该平台对应的一条简单测试消息。IM 群收到消息即配置成功。

## 第四步：收尾

告诉用户：

- 仓库 `.claude/settings.json` 里的 Notification 和 Stop hook 已经配好，无需改动
- 要停用通知：从 rc 文件删掉相关 export 行，source 后重启 Claude Code 即可
- 要换平台：重新运行 `/setup-im-hook`，会自动替换旧配置

## 安全边界

- **绝对不要**把 webhook URL 写进 `.claude/settings.json` 或仓库里的任何文件。URL 只能存在于用户 home 目录下的 rc 文件中
- **不要**执行任何 git 命令。这个 skill 只操作用户 rc 文件
- 如果用户把 URL 发在对话里，操作完成后提醒他们：URL 会留在对话历史中，建议在 IM 平台侧做好安全设置（如 IP 白名单）
