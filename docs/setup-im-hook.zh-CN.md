# 通过 `/setup-im-hook` 接入 IM 平台通知

本教程教你用项目内置的 `setup-im-hook` skill，把 Claude Code 和 CCIsland 的"任务完成"通知推送到任意 IM 群（飞书 / 钉钉 / 企业微信 / Slack / Discord / 自建 webhook）。

> 仓库里**永远不会**存放你的 webhook URL，所有凭证通过环境变量读取。

---

## 谁能用

- 已 clone `CCIsland` 仓库
- 能在该目录下启动 Claude Code 会话
- macOS 或 Windows（CCIsland Tauri app 通知仅限本机 env 生效；Claude Code hook 两个平台都行）

---

## 整体工作方式

```
IM 群  ←─ webhook URL ──  ┌──────────────────────────┐
                         │ Claude Code Stop/Notif   │── .claude/hooks/im-webhook-notify.py
                         │ CCIsland (Tauri) Stop    │── hook_router.rs::send_im_webhook_notification
                         └──────────────────────────┘
                              ▲ 都通过环境变量读取
                              │
                         IM_WEBHOOK_URL
                         IM_WEBHOOK_PAYLOAD_TEMPLATE (可选)
```

两套通知共用同一对环境变量。配一次，两处都生效。

---

## 第 1 步：准备 webhook URL

在你的 IM 平台创建一个 **incoming webhook** / **自定义机器人**，拿到推送 URL。

| 平台 | 入口 |
|---|---|
| 飞书 / Lark | 群设置 → 群机器人 → 添加 → 自定义机器人 |
| 钉钉 | 群设置 → 智能群助手 → 添加 → 自定义 |
| 企业微信 | 群设置 → 群机器人 → 添加机器人 |
| Slack | `https://api.slack.com/apps` → Incoming Webhooks |
| Discord | 频道设置 → 整合 → Webhook |

URL 形如：
- 飞书：`https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxx`
- Slack：`https://hooks.slack.com/services/T.../B.../...`
- 企业微信：`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...`

> 部分平台支持"关键词校验 / IP 白名单 / 签名"；为简单起见先用"关键词"或无校验，运行正常后再收紧。默认消息里含"Claude Code 任务完成"，可以作为关键词。

---

## 第 2 步：在 Claude Code 里运行 `/setup-im-hook`

在 CCIsland 仓库根目录启动 Claude Code，然后在对话里输入：

```
/setup-im-hook
```

skill 会引导你完成：

1. 选择 IM 平台（决定 payload 模板预设）
2. 粘贴 webhook URL
3. 检测 shell（`zsh` / `bash`）
4. 追加 `export IM_WEBHOOK_URL=...`（以及需要的 `IM_WEBHOOK_PAYLOAD_TEMPLATE`）到 `~/.zshrc` 或 `~/.bashrc`
5. 给出 `source` + 验证命令

skill 执行结束后，你会看到类似这样的 rc 文件新增内容：

```sh
# Claude Code IM webhook (added by /setup-im-hook)
export IM_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxx"
# 非飞书平台才会生成这行:
export IM_WEBHOOK_PAYLOAD_TEMPLATE='{"text":"Claude Code 任务完成✅\n{message}"}'
```

---

## 第 3 步：让环境变量生效

**新开一个终端窗口**（或 `source ~/.zshrc`），然后重新启动：

- **Claude Code**：退出当前会话（Ctrl+C / `/exit`），在新 shell 里重新 `claude`
- **CCIsland (Tauri app)**：见下一节

验证终端能看到变量：

```bash
echo "$IM_WEBHOOK_URL"       # 必须打出 URL
```

测试 webhook 能通：

```bash
curl -s -X POST "$IM_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d '{"msg_type":"text","content":{"text":"test from CCIsland"}}'
```

> 非飞书平台把 `-d` 里的 JSON 换成你所选平台的模板。Slack 用 `{"text":"..."}`，钉钉 / 企业微信用 `{"msgtype":"text","text":{"content":"..."}}`。

飞书群收到 `test from CCIsland` 即验证通过。

---

## 第 4 步（仅 macOS）：让 CCIsland Tauri app 也读到环境变量

macOS 下从 Finder / Launchpad / Dock 启动的 GUI 应用**不会**继承 shell 的环境变量。想让 CCIsland 自身的"任务完成"通知也生效，有两种选择：

### 选 A：每次从终端启动 CCIsland（简单）

```bash
source ~/.zshrc
open -a CCIsland
```

缺点：每次开机要手动 `open -a`。

### 选 B：写入 launchctl user session（持久，推荐）

创建 `~/Library/LaunchAgents/com.ccisland.im-webhook-env.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.ccisland.im-webhook-env</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/launchctl</string>
    <string>setenv</string>
    <string>IM_WEBHOOK_URL</string>
    <string>https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxx</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
```

（非飞书平台再复制一份类似结构把 `IM_WEBHOOK_PAYLOAD_TEMPLATE` 也 setenv。）

加载（立即生效 + 每次登录自动跑）：

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.ccisland.im-webhook-env.plist
launchctl print gui/$(id -u) | grep IM_WEBHOOK     # 应能看到变量
```

然后**完全退出 CCIsland**（右键 Dock → Quit 或 Cmd+Q）再重新打开，新进程就会继承这个变量。

卸载：

```bash
launchctl bootout gui/$(id -u)/com.ccisland.im-webhook-env
rm ~/Library/LaunchAgents/com.ccisland.im-webhook-env.plist
```

换 URL：改 plist 里那个 `<string>`，然后 `bootout` + `bootstrap` 再来一遍。

---

## 第 5 步：实战验证

1. 重启后 Claude Code 里跑一条**简单任务**（例如"把 README 第一行改成 xx"），让它正常完成
2. 飞书 / 你的 IM 群应立即收到 `Claude Code 任务完成✅\n<最后一条 assistant 文本>`
3. 点 CCIsland 托盘 → Setup Hooks（若还没装），再让 Claude 跑一次，CCIsland 侧也会推一条

---

## 消息格式

默认模板是飞书格式：

```json
{"msg_type":"text","content":{"text":"Claude Code 任务完成✅\n{message}"}}
```

`{message}` 会被替换成最后一条 assistant 文本（截断到 800 字，已做 JSON 转义）。

其它平台的默认模板（skill 会自动选对应的）：

| 平台 | 模板 |
|---|---|
| 飞书 / Lark | `{"msg_type":"text","content":{"text":"Claude Code 任务完成✅\n{message}"}}` |
| 钉钉 | `{"msgtype":"text","text":{"content":"Claude Code 任务完成✅\n{message}"}}` |
| 企业微信 | `{"msgtype":"text","text":{"content":"Claude Code 任务完成✅\n{message}"}}` |
| Slack / Discord | `{"text":"Claude Code 任务完成✅\n{message}"}` |

想自定义文案或换富文本（飞书 post / Slack blocks）：改 `IM_WEBHOOK_PAYLOAD_TEMPLATE` 即可，注意里面的双引号要转义好，占位符 `{message}` 原样保留。

---

## 常见问题

### Q. 配置完了没收到消息？

按顺序排查：

1. **shell 里能看到变量？** `echo "$IM_WEBHOOK_URL"`
   - 看不到 → `source ~/.zshrc`，仍看不到 → 检查 rc 文件内容是否正确保存
2. **curl 手动发消息能通？** 见第 3 步的 `curl` 命令
   - 发不出去 → webhook URL 有问题（过期、IP 白名单、签名没配）
3. **Claude Code 是在 export 之后启动的？** 当前会话若先启动再 export，进程 env 里没有变量
   - 解决：退出 claude，新 shell 重启
4. **CCIsland (GUI) 收不到？** 看第 4 步的方案 A / B
5. **Stop 触发了但没发？** 检查：如果 Claude 因为 `compact` / `stop` 之类**非 end_turn** 原因停止，hook 脚本会静默跳过（这是 feature，避免非完成态打扰）

### Q. 我想关闭通知

从 rc 文件删掉 `export IM_WEBHOOK_URL` 那行，source 并重启 Claude Code。
macOS launchctl 方案的话，`launchctl bootout gui/$(id -u)/com.ccisland.im-webhook-env`。

hook 脚本在没 URL 时会静默 exit 0，不报错。

### Q. 换新 webhook 怎么办

- rc 文件：编辑那一行 URL
- launchctl plist：编辑 `<string>` 那行，然后 `bootout` + `bootstrap` 重来

### Q. 我想给多个群发

目前一次只支持一个 URL。可以写个 shell 包装脚本再 fan-out，或在 `IM_WEBHOOK_PAYLOAD_TEMPLATE` 外层再套一层多播逻辑（超出本 skill 范围）。

### Q. webhook URL 会不会泄露进 git

不会。`im-webhook-notify.py` 和 `hook_router.rs` 都只从环境变量读，仓库里不存 URL；`.claude/settings.json` 里只存 hook 脚本路径。**但不要把 rc 文件或 plist 文件提交到公共仓库**。

---

## 相关文件

| 文件 | 作用 |
|---|---|
| `.claude/skills/setup-im-hook/SKILL.md` | skill 指令，Claude 按这个走交互流程 |
| `.claude/hooks/im-webhook-notify.py` | Claude Code hook 脚本（读 env + 发送） |
| `.claude/settings.json` | 把上面脚本注册成 `Notification` / `Stop` hook |
| `apps/cc-island/src-tauri/src/hook_router.rs` | CCIsland 自身的 Stop 事件通知 |
| `~/.zshrc` / `~/.bashrc` | 实际存放 `IM_WEBHOOK_URL` 的地方 |
| `~/Library/LaunchAgents/com.ccisland.im-webhook-env.plist`（仅 macOS 方案 B） | 让 GUI 启动的 CCIsland 也能读到 env |
