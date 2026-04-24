---
name: setup-im-hook
description: >
  配置 Claude Code 完成任务后推送通知到 IM 群(飞书/钉钉/企业微信/Slack/自定义 webhook)。
  把 webhook URL 写到用户的 shell rc 文件(~/.zshrc 或 ~/.bashrc),通过环境变量 $IM_WEBHOOK_URL
  被 .claude/settings.json 中已预置的 hook 脚本读取,完全不在仓库里留明文。
  当用户说"接入 IM 通知"/"配置飞书/钉钉/Slack webhook"/"让 Claude 完成任务通知我"/
  "/setup-im-hook"时调用。
allowed-tools: Bash AskUserQuestion Read Edit
---

# Setup IM Webhook

这个 skill 帮用户把一个 IM 群的 incoming webhook 配置到本机的 Claude Code hooks 中。
脚本 `.claude/hooks/im-webhook-notify.py` 已经就绪,只需把 URL 写到 shell 环境变量里即可。

## 工作流程

### 1. 询问目标 IM 平台与 webhook URL

使用 `AskUserQuestion` 一次性问两个关键问题:

- **IM 平台**(单选):飞书/Lark、钉钉、企业微信、Slack/Discord、自定义 JSON POST
- **webhook URL**:让用户自己选"其他"填入,不要预设选项

不同平台对应不同的 payload 模板(见第 4 步)。

### 2. 检测用户的 shell 类型

```bash
echo "$SHELL"
```

- 以 `zsh` 结尾 → 目标文件 `~/.zshrc`
- 以 `bash` 结尾 → 目标文件 `~/.bashrc`(macOS 交互 shell 也可能是 `~/.bash_profile`,先 `ls -la ~/.bash_profile ~/.bashrc` 看哪个存在,优先 `~/.bashrc`)
- 其它 shell(fish 等)要让用户手动处理,告诉他们该在哪个 rc 里加 export 并退出

### 3. 写入环境变量到 rc 文件

先 `Read` 目标 rc 文件,检查是否已经有 `export IM_WEBHOOK_URL=`:

- **已存在**:用 `Edit` 替换成新值(用 `replace_all: false`,精确匹配整行),同时替换 `IM_WEBHOOK_PAYLOAD_TEMPLATE` 行(如果有)
- **不存在**:用 `Edit` 在文件末尾 append 一段:
  ```sh

  # Claude Code IM webhook (added by /setup-im-hook)
  export IM_WEBHOOK_URL="<用户提供的 URL>"
  export IM_WEBHOOK_PAYLOAD_TEMPLATE='<下方对应平台的模板>'
  ```

飞书使用默认模板时可以**省略** `IM_WEBHOOK_PAYLOAD_TEMPLATE`(脚本和 Rust 端都内置了飞书默认)。其他平台必须 export 模板。

### 4. Payload 模板预设

模板是 JSON 字符串,`{message}` 是消息占位符(会在运行时被替换,已做 JSON 转义)。export 时用单引号包起来避免 shell 转义:

**飞书/Lark(默认,可省略 export):**
```
{"msg_type":"text","content":{"text":"Claude Code 任务完成✅\n{message}"}}
```

**钉钉:**
```
{"msgtype":"text","text":{"content":"Claude Code 任务完成✅\n{message}"}}
```

**企业微信:**
```
{"msgtype":"text","text":{"content":"Claude Code 任务完成✅\n{message}"}}
```

**Slack / Discord:**
```
{"text":"Claude Code 任务完成✅\n{message}"}
```

**自定义:** 让用户自己提供模板字符串,要求包含 `{message}` 占位符。

### 5. 告知用户激活方式

配置完成后,用户必须执行以下之一才会生效:

```bash
source ~/.zshrc   # 或 ~/.bashrc
```

或**关闭当前终端重新打开**。提醒用户: Claude Code 是从启动它的 shell 继承环境变量的,如果 Claude Code 已经在跑,需要**退出重启**才会读到新的 `IM_WEBHOOK_URL`。

### 6. 验证

给用户一条测试命令(source 后执行):

```bash
curl -s -X POST "$IM_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d "$IM_WEBHOOK_PAYLOAD_TEMPLATE"
```

(如果没 export 模板,用飞书默认 `-d '{"msg_type":"text","content":{"text":"test"}}'`)

IM 群收到消息即配置成功。

### 7. 收尾说明

告诉用户:

- 本仓库 `.claude/settings.json` 里的 `Notification` 和 `Stop` hook 已经配好,无需改动
- 同一个 `IM_WEBHOOK_URL` 同时被 Rust 端(灵动岛自身的 Stop 通知)和 Python hook(Claude Code 的事件通知)共享
- 要停用:从 rc 文件里删掉那两行 export,source 后重启 Claude Code 即可

## 边界与注意

- **不要**把 webhook URL 写进 `.claude/settings.json` 或仓库里的任何文件——必须只留在用户 home 目录下的 rc 文件里
- **不要**用 `git` 相关命令;这个 skill 只碰用户 rc 文件和本次会话的说明输出
- URL 校验:至少确认以 `http://` 或 `https://` 开头;不做域名白名单(用户可能用自建服务)
- 如果用户之前配过但想换平台,除了替换 URL 也要替换模板(或删掉模板行改回飞书默认)
