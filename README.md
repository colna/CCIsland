# Claude Island

macOS Dynamic Island for Claude Code — 将终端中的 Claude Code 执行进度与审批操作，实时展示在屏幕顶部的灵动岛中。

![Electron](https://img.shields.io/badge/Electron-33+-47848F?logo=electron&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)
![macOS](https://img.shields.io/badge/macOS-Sonoma+-000000?logo=apple&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## 它做什么？

当你在终端使用 Claude Code 时，Claude Island 会以浮动药丸 / 面板的形式，悬浮在屏幕顶部（类似 iPhone 灵动岛），实时展示：

- **工具执行进度** — 当前正在读写哪个文件、执行什么命令
- **任务列表** — TodoWrite 产生的任务清单及完成状态
- **审批请求** — 需要你 Allow / Deny 的权限操作（Bash、Write 等），点击即可决策
- **通知消息** — Claude 发送的通知 toast

整个过程**不会抢占焦点**，不影响你在终端的操作。

## 工作原理

```
Claude Code (HTTP Hook) ──POST──▶ HookServer (:51515)
                                       │
                                  HookRouter
                                 ╱     │     ╲
                      SessionState  Approval  WindowManager
                                   Manager        │
                                     │        状态切换
                                     │     hidden/compact/expanded
                                     ▼
                              Renderer UI (Electron)
                                     │
                              用户点击 Allow/Deny
                                     │
                              HTTP Response ──▶ Claude Code
```

**核心机制：** Claude Code 的 [HTTP Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) 将事件 POST 到本地 `localhost:51515`。对于 `PermissionRequest` 类型的事件，HTTP 连接保持阻塞，直到用户在灵动岛 UI 上做出 Allow/Deny 决策后才返回响应 —— 实现了**同步审批阻塞**。

## 快速开始

### 前置要求

- macOS 14 (Sonoma) 或更高版本
- Claude Code CLI 已安装

### 安装

**方式一：一键安装（推荐）**

```bash
curl -fsSL https://raw.githubusercontent.com/presence-io/cc-island/main/install.sh | bash
```

自动检测 CPU 架构（Apple Silicon / Intel），下载对应版本并安装到 `/Applications`。

**方式二：手动下载**

前往 [Releases](https://github.com/presence-io/cc-island/releases) 页面，下载对应架构的 DMG 或 ZIP：

- `Claude Island-*-arm64.dmg` — Apple Silicon (M1/M2/M3/M4)
- `Claude Island-*.dmg` — Intel

**方式三：从源码构建**

```bash
git clone https://github.com/presence-io/cc-island.git
cd cc-island
pnpm install --dev
pnpm dev
```

### 注册 Hooks

首次运行后，需要将 Claude Island 注册到 Claude Code 的 hooks 配置中。有两种方式：

**方式一：托盘菜单（推荐）**

启动后点击系统托盘图标 → `Setup Hooks`，自动写入 `~/.claude/settings.json`。

**方式二：手动配置**

编辑 `~/.claude/settings.json`，添加：

```json
{
  "hooks": {
    "PreToolUse": [
      { "type": "http", "url": "http://localhost:51515/hook" }
    ],
    "PostToolUse": [
      { "type": "http", "url": "http://localhost:51515/hook" }
    ],
    "Notification": [
      { "type": "http", "url": "http://localhost:51515/hook" }
    ]
  }
}
```

### 卸载 Hooks

托盘图标 → `Remove Hooks`，或手动删除 `settings.json` 中的对应条目。

## 面板状态

| 状态 | 尺寸 | 触发条件 |
|------|------|----------|
| **Hidden** | 不可见 | 无活跃会话 |
| **Compact** | 220×36 药丸 | 工具执行中（5s 后自动收起） |
| **Expanded** | 380×420 面板 | PermissionRequest / 点击药丸展开 |

## 项目结构

```
src/
├── main/                    # Electron 主进程
│   ├── index.ts             # 应用入口
│   ├── hook-server.ts       # HTTP 服务 (端口 51515, 自动回退)
│   ├── hook-router.ts       # 事件分发路由
│   ├── window-manager.ts    # 三态窗口管理 + 刘海检测
│   ├── session-state.ts     # 会话状态跟踪
│   ├── approval-manager.ts  # Promise 阻塞式审批
│   ├── ipc-handlers.ts      # IPC 消息处理
│   ├── hook-installer.ts    # Hooks 注册/卸载
│   └── tray.ts              # 系统托盘
├── renderer/                # Electron 渲染进程
│   ├── index.html           # 药丸 + 面板布局
│   ├── styles.less          # 深色毛玻璃主题 (Less)
│   ├── app.ts               # UI 逻辑
│   └── preload.ts           # contextBridge IPC 桥接
└── shared/                  # 共享模块
    ├── types.ts             # 类型定义 + IPC 常量
    └── tool-description.ts  # 工具描述生成
```

## 构建与发布

```bash
# 开发模式
pnpm dev

# 编译 TypeScript + Less + 打包 DMG/ZIP
pnpm build
```

### 自动发布

推送 `v*` 标签时，GitHub Actions 自动构建 arm64 + x64 的 DMG 和 ZIP 并创建 Release：

```bash
git tag v0.1.0
git push origin v0.1.0
```

## 技术栈

| 技术 | 用途 |
|------|------|
| Electron 33+ | 窗口管理、系统托盘、IPC |
| TypeScript 5.5 | 类型安全 |
| Less | 样式预处理 |
| Node.js HTTP | Hook 服务（零外部依赖） |
| electron-builder | 打包分发 |

## License

MIT
