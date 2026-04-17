# Claude Island (CCIsland) — 产品功能文档

> **版本**: 0.2.5 (main branch)
> **仓库**: [github.com/colna/CCIsland](https://github.com/colna/CCIsland)
> **定位**: Claude Code CLI 的桌面灵动岛 (Dynamic Island) 伴侣应用

---

## 一、产品概述

Claude Island 是一款受 Apple Dynamic Island 启发的桌面浮窗应用，为 Claude Code CLI 提供实时进度展示和审批交互。用户无需离开编辑器或终端，灵动岛会以非侵入方式悬浮在屏幕顶部，显示 Claude Code 的执行状态，并在需要审批时弹出交互面板。

**技术栈**: Electron 33 + TypeScript 5.5 + Less (无 React/Vue，纯 DOM)

---

## 二、核心架构

### 数据流

```
Claude Code CLI → HTTP POST → Hook Server (localhost:51515)
    → HookRouter 事件分发 → SessionManager 状态更新
    → IPC → Renderer UI 刷新
    → 审批事件: HTTP 连接阻塞，等待用户点击后返回
```

### 进程模型

| 进程 | 职责 |
|------|------|
| **Main Process** | HTTP 服务器、会话管理、审批队列、窗口控制、系统托盘、Hook 安装器 |
| **Renderer Process** | UI 渲染、用户交互、动画 |

---

## 三、功能清单

### 3.1 Hook 服务器

| 功能 | 说明 |
|------|------|
| HTTP 监听 | `127.0.0.1:51515`，仅本地访问 |
| 端口自动降级 | 51515 被占用时自动尝试 51516~51520 |
| 健康检查 | `GET /health` 返回 `{ status: "ok", port: N }` |
| 请求体限制 | 最大 1MB，超出返回 413 |
| 连接中断处理 | Claude Code 断连时，通过 AbortController 自动放行 (allow) 挂起的审批 |

### 3.2 支持的 Hook 事件

| 事件 | 类型 | 超时 | 行为 |
|------|------|------|------|
| `SessionStart` | 通知型 | 5s | 激活会话，显示紧凑态 |
| `UserPromptSubmit` | 通知型 | 5s | 重置工具状态，开始新一轮对话 |
| `PreToolUse` | 阻塞型 | 120s | 更新当前工具显示，工具计数 +1 |
| `PostToolUse` | 通知型 | 5s | 记录工具完成时间、时长 |
| `PermissionRequest` | 阻塞型 | 120s | **阻塞 HTTP 连接**，展开面板显示审批卡片 |
| `TaskCreated` / `TaskCompleted` | 通知型 | 5s | 更新任务列表 (TodoWrite) |
| `Notification` | 通知型 | 5s | 展开面板 3 秒显示通知 |
| `Stop` | 通知型 | 5s | 标记会话完成，显示最后一条回复摘要 |
| `SessionEnd` | 通知型 | 5s | 停用会话 |

### 3.3 审批/权限系统 (核心功能)

**工作原理**:
1. `PermissionRequest` 到达 → 创建 Promise 并挂起 HTTP 连接
2. Renderer 显示审批卡片，三个按钮
3. 用户点击 → IPC 回调 → Promise resolve → HTTP 返回决策

**三种决策**:

| 按钮 | 行为 | 说明 |
|------|------|------|
| **Deny** | `behavior: "deny"` | 拒绝本次工具调用 |
| **Allow** | `behavior: "allow"` | 允许本次工具调用 |
| **Always** | `behavior: "allow"` + 写入 settings | 永久允许该工具（写入 `~/.claude/settings.json` 的 `permissions.allow`）|

### 3.4 AskUserQuestion 交互

当审批事件的 `tool_name` 为 `AskUserQuestion` 时，显示问答卡片:

- 解析 `tool_input.questions` 数组
- 每个问题显示: 可选标题标签 + 问题文本 + 可点击选项 chips
- 支持**单选**和**多选**模式
- 每个问题有 "Or type your answer..." 自由文本输入框
- 提交后通过 `updatedInput` 返回答案

### 3.5 多会话管理

| 功能 | 说明 |
|------|------|
| 并发追踪 | 通过 `Map<sessionId, SessionInstance>` 管理多个 Claude Code 会话 |
| 优先级排序 | `tool(5) > thinking(4) > responding(3) > done(2) > idle(1)`，同优先级按最近事件时间排序 |
| 焦点切换 | 点击会话列表切换焦点会话 |
| 超时检测 | 每 15 秒检查，90 秒无事件标记为 "Session timed out" |
| 自动清理 | 每 60 秒清理已完成超过 5 分钟的非活跃会话 |
| 工具追踪 | 每个会话最多保留 200 条最近工具记录 |
| 任务追踪 | 解析 TodoWrite 数据，显示 pending/in_progress/completed 状态 |

### 3.6 窗口管理

**三态模型**:

| 状态 | 尺寸 | 说明 |
|------|------|------|
| **Hidden** | 不可见 | 用户主动关闭或超时 |
| **Compact** | 440 x 36 px | 胶囊药丸形状，显示状态点 + 状态文本 |
| **Expanded** | 440 x 360 px | 完整面板，毛玻璃效果，显示审批/日志/会话列表 |

**自动行为**:

| 触发 | 动作 |
|------|------|
| `UserPromptSubmit` / `SessionStart` | 显示紧凑态 (除非用户已关闭) |
| `PermissionRequest` | **强制**展开 (无视用户关闭状态) |
| `PreToolUse` | 若隐藏则显示紧凑态；5 秒后收起，120 秒后隐藏 |
| `Notification` | 展开 3 秒后收起 |
| 点击紧凑态 | 展开 |
| 点击 x | 关闭并标记 `userDismissed` |

### 3.7 系统托盘

**动态图标** (16x16 程序化生成彩色圆点):

| 状态 | 颜色 |
|------|------|
| Idle | 灰色 `rgb(150, 150, 150)` |
| Thinking | 蓝紫色 `rgb(110, 92, 230)` |
| Tool / Done | 绿色 `rgb(52, 199, 89)` |

**右键菜单**:
1. 状态文本 (只读)
2. "Setup Hooks" / "Hooks Installed ✓" — 安装/显示 Hook 状态
3. "Remove Hooks" — 移除 Hook
4. "Show Island" — 显示灵动岛
5. "Quit" — 退出

### 3.8 终端跳转

**仅 macOS 支持**，通过 AppleScript 检测并激活终端应用。

**支持的终端** (按优先级):
1. iTerm2
2. Terminal.app
3. VS Code
4. Cursor
5. Windsurf
6. Ghostty
7. Warp

通过面板标题栏的 `⌘T` 按钮触发。

### 3.9 对话历史

- 解析 Claude Code 的 JSONL transcript 文件
- 提取 `user` 和 `assistant` 消息
- 每条消息截断至 500 字符
- 返回最近 30 条消息

### 3.10 Hook 安装器

| 功能 | 说明 |
|------|------|
| 自动安装 | 应用启动时自动安装 Hook 到 `~/.claude/settings.json` |
| 合并策略 | 保留其他工具的 Hook，仅添加/替换 CCIsland 的条目 |
| 自动修复 | 每 30 秒检查 Hook 是否被外部覆盖，自动重新安装 |
| 退出清理 | 应用退出时自动移除 Hook |
| CLI 支持 | 可通过 `pnpm install-hooks` / `pnpm remove-hooks` 命令行操作 |

### 3.11 工具描述生成

紧凑态和活动日志中显示人类可读的工具描述:

| 工具 | 显示格式 |
|------|---------|
| Bash | 命令前 100 字符 |
| Read / Write / Edit | 文件路径 (缩短) |
| Glob | 搜索模式 |
| Grep | `"pattern" in path` |
| WebFetch | URL 前 80 字符 |
| WebSearch | 搜索查询 |
| Task | 描述文本 |
| TodoWrite | "update task list" |

---

## 四、UI 设计

### 设计语言

Apple 风格深色设计系统:

| 元素 | 值 |
|------|-----|
| 字体 | SF Pro Display (标题), SF Pro Text (正文), SF Mono (代码) |
| 背景 | 纯黑 `#000` (紧凑态), `rgba(0,0,0,0.85)` + 毛玻璃 (展开态) |
| 主色 | Apple Blue `#0071e3` |
| 成功色 | Green `#34c759` |
| 警告色 | Orange `#ff9f0a` |
| 错误色 | Red `#ff3b30` |
| 圆角 | 980px (药丸), 16px (面板) |
| 毛玻璃 | `backdrop-filter: saturate(180%) blur(20px)` |

### 状态点动画

| 状态 | 动画 |
|------|------|
| Active | 脉冲缩放 + 发光 (1.8s 循环) |
| Thinking | 呼吸发光 (1.4s 循环) |
| Pending | 透明度脉冲 (1.5s 循环) |
| Done | 弹跳缩放 + 绿色光晕 (0.4s 一次) |

### 面板动画

| 动画 | 效果 |
|------|------|
| expandIn | 0.35s 缩放+位移淡入 |
| slideIn | 0.25s 卡片滑入 |
| done-fade | 15s 完成文本渐隐至 40% |

---

## 五、macOS vs Windows 差异

| 特性 | macOS | Windows |
|------|-------|---------|
| Dock 图标 | 隐藏 (`LSUIElement: true`) | 无 Dock 概念 |
| 窗口层级 | `screen-saver` 级别 (覆盖菜单栏) | 标准 always-on-top |
| 窗口类型 | `panel` (不激活父应用) | 标准窗口 |
| 多桌面 | 所有 Space 可见 (包括全屏模式) | 不支持 |
| 刘海检测 | `workArea.y > 25` 检测刘海屏并调整位置 | 不适用 |
| 终端跳转 | 支持 7 款终端 (AppleScript) | 不支持 (返回 unsupported) |
| 窗口位置 | 刘海: 菜单栏下 6px; 无刘海: 4px | `workArea.y + 8px` |
| 构建产物 | DMG + ZIP (arm64 + x64) | NSIS 安装包 + ZIP (x64) |
| 一键安装 | `curl ... \| bash` 脚本 | 无 |

---

## 六、安全模型

| 措施 | 说明 |
|------|------|
| Context Isolation | `contextIsolation: true`, `nodeIntegration: false` |
| Preload 沙箱 | 仅通过 `contextBridge` 暴露限定 IPC 方法 |
| CSP | `default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'` |
| 本地监听 | 仅绑定 `127.0.0.1`，不对外暴露 |
| 请求限制 | 1MB 请求体上限 |
| 无远程内容 | 所有资源均为本地文件 |

---

## 七、后台定时任务

| 任务 | 间隔 | 功能 |
|------|------|------|
| 超时检测 | 15 秒 | 90 秒无事件的活跃会话标记为 done |
| 会话清理 | 60 秒 | 移除已完成超过 5 分钟的非活跃会话 |
| Hook 健康检查 | 30 秒 | Hook 被外部覆盖时自动重新安装 |

---

## 八、构建与发布

### 构建命令

```bash
pnpm dev          # 开发模式 (编译 + 启动 Electron)
pnpm build        # 全量构建 (当前平台)
pnpm build:mac    # macOS: DMG + ZIP (arm64 + x64)
pnpm build:win    # Windows: NSIS + ZIP (x64)
```

### CI/CD

- 触发: Git tag `v*` 推送
- macOS job: `macos-latest` → `pnpm build:mac` → 上传 DMG + ZIP
- Windows job: `windows-latest` → `pnpm build:win` → 上传 EXE + ZIP
- Release job: 合并产物 → 创建 GitHub Release

### macOS 一键安装

```bash
curl -fsSL https://raw.githubusercontent.com/colna/CCIsland/main/install.sh | bash
```
- 自动检测 CPU 架构 (arm64/x64)
- 下载最新 Release ZIP
- 解压到 `/Applications/`
- 清除 Gatekeeper 隔离属性

---

## 九、版本历史

| 版本 | 日期 | 主要变更 |
|------|------|---------|
| 0.1.0 | 2026-04-07 | MVP: HTTP 服务器、审批阻塞、药丸/面板 UI、Hook 安装器、托盘 |
| 0.2.0 | 2026-04-09 | UserPromptSubmit、动态托盘、关闭功能、三选审批、任务结果显示 |
| 0.3.0 | 2026-04-10 | AskUserQuestion、多会话、终端跳转 (7 款)、对话历史、面板头部 |
| 0.3.1 | 2026-04-10 | 90s 超时检测、审批幽灵卡片修复、滚动修复、Hook 合并策略 |
| 0.4.0 | 2026-04-13 | Apple 设计系统全面升级、发布脚本 |
| 0.2.5 | 当前 | Windows 修复、一键安装脚本 |

---

## 十、交互方式

| 操作 | 触发方式 | 所在视图 |
|------|---------|---------|
| 展开面板 | 点击紧凑态药丸 | 紧凑态 |
| 收起面板 | 点击展开态空白区域 | 展开态 |
| 关闭灵动岛 | 点击 x 按钮 | 紧凑态 |
| 跳转终端 | 点击 ⌘T 按钮 | 展开态 |
| 切换会话 | 点击会话列表行 | 展开态 |
| 允许工具 | 点击 "Allow" | 审批卡片 |
| 拒绝工具 | 点击 "Deny" | 审批卡片 |
| 永久允许 | 点击 "Always" | 审批卡片 |
| 选择选项 | 点击选项 chip | 问答卡片 |
| 提交答案 | 点击 "Submit" | 问答卡片 |
