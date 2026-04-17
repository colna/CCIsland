# Claude Island 变更记录

## [0.2.6] - 2026-04-17

### feat: Electron → Tauri v2 重构
- 后端从 Electron 完全迁移至 Tauri v2 (Rust)
- 新增 Rust 模块: `main.rs`、`hook_server.rs`、`hook_router.rs`、`approval_manager.rs`、`hook_installer.rs`、`tray.rs`、`window_state.rs`、`shared_types.rs`
- 前端适配 Tauri IPC: 新增 `tauri-bridge.ts` 替代 Electron contextBridge
- 应用体积与内存占用大幅降低

### feat: Monorepo 架构
- 项目重构为 pnpm workspace + Turborepo monorepo
- `apps/cc-island/` — 桌面客户端 (Tauri)
- `apps/site/` — 官方网站 (Next.js)
- `packages/shared/` — 共享类型与工具模块
- 新增 `turbo.json`、`pnpm-workspace.yaml` 配置

### feat: 官方网站
- Next.js + Tailwind CSS 构建，部署 GitHub Pages
- Hero 动画、Feature Scenes、FAQ、下载页、隐私政策页
- 交互式灵动岛 Demo 组件 (`island-demo.tsx`、`island-mockups.tsx`)
- Reveal 滚动入场动画、平台支持说明
- 新增 `site.yml` GitHub Actions 自动部署工作流

### feat: 权限请求自动批准开关
- 新增 Auto-Approve 功能，启用后权限请求自动放行（AskUserQuestion 除外）
- 支持托盘菜单和展开面板两种切换方式，状态双向同步

### fix: 代码审查修复 (C1-C4, W1-W7, S1, S7)
- C1: `unique_id()` 改用 AtomicU64 计数器避免碰撞
- C2: `and_then(Some(...))` 替换为 `map()` (Clippy lint)
- C3: 新增过期审批清理，防止残留条目
- C4: 应用退出时通过 `RunEvent::Exit` 自动移除 hooks
- W1: 去重 `settings_path()`，复用 hook_installer 版本
- W2: `block_on` 替换为 `AtomicU16` 获取 server_port
- W3: `shorten_path` 将 `$HOME` 替换为 `~`
- W6: transcript 解析改用 `spawn_blocking` 异步执行
- W7: Windows CI 设置 `x86_64-pc-windows-msvc` target
- S1: `app.ts` 中 `var` 替换为 `let`

### chore: CI/CD
- `release.yml` 适配 Tauri v2 构建流程
- 新增 `site.yml` 官方网站自动部署

---

## [0.2.5] - 2026-04-16

### fix: Windows 打包
- 修复 Windows 平台构建与打包问题

### feat: 安装脚本
- 新增安装脚本，简化用户安装流程

---

## [0.2.4] - 2026-04-13

### feat: Apple 设计系统重构
- 整体 UI 采用 Apple 设计语言重新设计
- Apple Blue (#0071e3 / #2997ff) 作为唯一强调色，替换原有多色方案
- SF Pro Display/Text 字体层级，负 letter-spacing 排版
- 980px pill radius 按钮与胶囊圆角
- 展开面板使用 backdrop-filter blur 毛玻璃效果
- Apple 标准柔和阴影 (3px 5px 30px)
- 统一文本透明度层级与 ease 过渡曲线

### feat: Apple Design System Skill
- 新增 `.agents/skills/apple-design/SKILL.md`，为 Claude Code 提供 Apple 设计规范参考
- 注册为 Claude Code 可用 skill，在 UI 开发时自动应用 Apple 设计语言

### feat: 发布脚本
- 新增 `scripts/release.sh`，交互式版本发布工具
- 支持 patch/minor/major 版本选择，自动更新 `package.json` 版本号
- 自动创建 git tag 并推送触发 CI 构建

---

## [0.2.3] - 2026-04-10

### feat: AskUserQuestion 交互支持
- 检测 `PermissionRequest` 中 `tool_name === 'AskUserQuestion'`，显示紫色问题卡片
- 每个问题显示 header 标签 + 问题文本 + 可点选的选项 chips
- 支持单选（互斥）和多选（toggle）模式
- 每个问题底部有 "Or type your answer..." 自由输入框
- Submit 按钮提交答案，通过 `updatedInput` 回传给 Claude Code
- 复用现有 ApprovalManager 的 Promise 阻塞机制，无需新增通信方式
- `HookResponse` 新增 `updatedInput` 字段，`ApprovalDecision` 新增 `updatedInput` 可选字段
- 新增 IPC 通道: `QUESTION_REQUEST`、`QUESTION_ANSWER`
- 新增类型: `QuestionOption`、`QuestionItem`、`QuestionRequestData`

### feat: 多会话支持
- `SessionState` 重命名为 `SessionInstance`（单会话实例）
- 新增 `SessionManager` 类，使用 `Map<sessionId, SessionInstance>` 管理多个并发会话
- 优先级排序算法决定焦点会话：tool(5) > thinking(4) > responding(3) > done(2) > idle(1)
- 同优先级按 `lastEventTime` 排序，最新事件的会话优先显示
- 展开面板顶部显示会话列表（cwd + phase 圆点 + 工具计数），单会话时自动隐藏
- 每分钟清理超过 5 分钟的已结束会话
- `HookRouter` 所有事件路由到对应 sessionId 的 `SessionInstance`
- 每次事件同时发送焦点快照 (`STATE_UPDATE`) 和会话列表 (`SESSION_LIST`) 给 Renderer

### feat: 终端跳转
- 展开面板头部新增 ⌘T 按钮，点击激活运行 Claude Code 的终端窗口
- 使用 AppleScript 检测并激活终端，支持 7 种终端/IDE：
  iTerm2、Terminal.app、VS Code、Cursor、Windsurf、Ghostty、Warp
- 按优先级依次检测 bundleId 是否运行，激活第一个匹配的终端
- 新增 `src/main/terminal-jumper.ts` 模块

### feat: 聊天历史 (MVP)
- 新增 `src/main/chat-parser.ts`，解析 Claude Code 的 JSONL transcript 文件
- 从 hook 事件的 `transcript_path` 获取对话文件路径
- 提取 user/assistant 消息，返回最近 30 条
- 新增 IPC 通道 `GET_CHAT_HISTORY`，按需获取指定会话的聊天历史
- `SessionInstance` 新增 `transcriptPath` 字段

### feat: 展开面板头部
- 展开态新增 panel-header，包含 "Claude Code" 标题和终端跳转按钮
- 展开态点击选项 chips、输入框、按钮时不会触发面板收起

### feat: 会话超时自动恢复
- Claude Code 遇到 API 错误（如 nginx 400）时可能不发送 Stop/SessionEnd 事件，灵动岛卡在 "Thinking..."
- 新增 90 秒超时检测（每 15 秒运行），超时后自动将 thinking/tool 状态转为 done
- 显示 "Session timed out" 消息，紫色呼吸灯变绿色完成态
- `SessionInstance.checkStale()` + `SessionManager.checkStale()` 方法

### fix: 审批卡片幽灵残留
- Claude Code 自动允许权限（连接中断/AbortSignal）时，审批卡片不再残留在面板中
- 新增 `APPROVAL_DISMISSED` IPC 通道，后端 abort 时通知 Renderer 移除对应卡片

### fix: 展开面板滚动区域
- 固定 header 和会话列表在顶部，仅日志区域可滚动
- 解决展开态内容溢出时整个面板跟着滚动的问题

### fix: 多会话列表样式与交互
- 修复会话列表容器样式（间距、圆点颜色、hover 效果）
- 修复点击会话行切换焦点会话的交互

### fix: Hooks 被外部覆盖后自动恢复
- `hook-installer.ts` 改用合并策略写入 settings.json，保留其他工具的 hooks
- 定期检查（每 30 秒）发现 hooks 缺失时自动重新安装

---

## [0.2.0] - 2026-04-09

### feat: UserPromptSubmit 事件支持
- 注册 `UserPromptSubmit` hook 事件，用户发送消息时立即触发灵动岛
- 即使 Claude 不调用任何工具（纯文本回复），胶囊也会以 Thinking 状态出现
- `session-state.ts` 新增 `handleUserPromptSubmit()` 方法激活会话
- `hook-installer.ts` 移除无效事件（TaskCreated、TaskCompleted、SubagentStart、SubagentStop）

### feat: Thinking 蓝紫色样式
- Thinking 阶段（无工具历史时）圆点使用蓝紫色 `#6e5ce6` + glow 呼吸动画
- 与展开态日志中的 Thinking 状态条颜色一致

### feat: Done 状态展示任务结果
- 任务完成时胶囊显示 Claude 回复的第一行内容（80 字符截断）
- 去掉 ✅ emoji，改用绿色文字 + 渐淡动画（15 秒内从全亮淡至 40% 透明度）
- 圆点有 0.4 秒 pop 放大动画作为完成确认反馈
- Stop 后胶囊保持 15 秒（原 5 秒）再自动隐藏

### feat: 胶囊关闭按钮 + 用户手动隐藏
- 胶囊右侧新增 `×` 关闭按钮，hover 时才显示
- 用户手动关闭后设置 `userDismissed` 标记，后续事件不再自动弹出胶囊
- PermissionRequest（审批）不受限制，始终强制弹出
- 通过 tray 菜单 "Show Island" 恢复时重置标记

### feat: Tray 图标动态状态
- `tray.ts` 重构为 `TrayManager` 类
- 图标颜色随 session phase 动态切换：灰色(idle)、蓝紫色(thinking)、绿色(tool/done)
- tooltip 显示当前动作（如 "Claude Island — Read"、"Claude Island — Thinking..."）
- 右键菜单第一行显示实时状态文字
- "Show Island" 通过 `windowManager.show()` 恢复胶囊

### feat: 三选项审批卡片
- 审批按钮从 允许/拒绝 改为 Deny / Allow / Always 三选项
- Allow: 允许本次
- Always: 允许并永久授权，将工具名写入 `~/.claude/settings.json` 的 `permissions.allow`
- Deny: 拒绝本次
- 审批卡片标题改为显示工具名，描述单独一行

### feat: 任务完成后胶囊常驻显示
- Stop / SessionEnd 后胶囊不再自动隐藏，保持 compact 常驻显示完成状态
- SessionEnd 时 phase 设为 `done`（而非 `idle`），保留 lastMessage 以持续展示结果

### fix: Electron 安装 + pnpm 配置
- `package.json` 添加 `pnpm.onlyBuiltDependencies` 配置，批准 electron 构建脚本

---

## [0.1.0] - 2026-04-07

### Phase 1: MVP 核心闭环

#### Step 1: 项目初始化
- 创建项目目录结构 (`src/main`, `src/renderer`, `src/shared`, `assets`, `changelog`)
- 配置 `package.json` (Electron 33+, TypeScript 5.5+, electron-builder)
- 配置 `tsconfig.json` (ES2022, CommonJS, strict mode)
- 添加 `.gitignore`

#### Step 2: 共享类型定义
- `src/shared/types.ts`: HookEvent, HookResponse, ApprovalDecision, ApprovalRequestData
- ToolActivity, TaskItem, SessionSnapshot, PanelState 等接口
- IPC_CHANNELS 常量

#### Step 3: 核心 Main Process 模块
- `src/main/approval-manager.ts`: Promise 阻塞式审批管理器
- `src/main/session-state.ts`: 会话状态跟踪 (工具/任务/CWD)
- `src/main/hook-server.ts`: Node.js HTTP 服务, 端口自动重试

#### Step 4: 事件路由 + 窗口管理
- `src/main/hook-router.ts`: 事件分发 (SessionStart/PreToolUse/PostToolUse/PermissionRequest/Task/Notification/SessionEnd)
- `src/main/window-manager.ts`: 三态窗口 (hidden/compact/expanded), 刘海检测, 自动展开收起逻辑

#### Step 5: 辅助模块
- `src/main/hook-installer.ts`: 安装/卸载 `~/.claude/settings.json` hooks, CLI 支持
- `src/main/ipc-handlers.ts`: Electron IPC 消息处理 (审批决策/状态查询/面板切换)
- `src/main/tray.ts`: 系统托盘图标 + Setup/Remove Hooks 菜单

#### Step 6: 应用入口
- `src/main/index.ts`: Electron Main Process 启动流程, 集成所有模块

#### Step 7: Renderer UI
- `src/renderer/preload.ts`: contextBridge 安全暴露 IPC 到 `window.claude`
- `src/renderer/index.html`: 紧凑态药丸 + 展开态面板布局
- `src/renderer/styles.css`: 深色毛玻璃主题, SF Pro 字体, spring 动画
- `src/renderer/app.ts`: 面板状态切换, 审批请求渲染, 实时状态更新, 通知 toast

#### Step 8: 编译验证
- TypeScript 编译通过 (zero errors)
- 所有模块编译输出到 `dist/` 目录

#### Step 9: 代码规范审查 + 修复 (vercel-react-best-practices)

**HIGH 修复:**
- `preload.ts`: IPC 监听器注册前清除旧监听器, 防止热重载内存泄漏 (fix #7)
- `hook-server.ts`: 添加 1MB body 大小限制 + 413 响应 (fix #9); stringify 先于 writeHead 防止部分响应 (fix #11); headersSent 保护
- `index.ts`: 添加 `will-quit` 优雅关闭 HTTP 服务器释放端口 (fix #10)

**MEDIUM 修复:**
- 提取 `src/shared/tool-description.ts` 共享模块, 消除 session-state / hook-router 重复代码 (fix #5 DRY)
- `session-state.ts`: 抽取 `updateTasksFromEvent()` 减少 handleTaskCreated/Completed 重复 (fix #6)
- `hook-installer.ts`: 添加内存缓存避免每次读磁盘 (fix #3); 精确匹配 hook URL 替代 JSON.stringify (fix #13)
- `tray.ts`: install/remove 后调用 `invalidateCache()` 保持缓存一致
- `app.ts`: 审批按钮使用 `{ once: true }` 防止重复点击 (fix #8); DOM API 替代 innerHTML (fix #16)
- 全局: 所有模块统一使用 `IPC_CHANNELS` 常量替代硬编码字符串 (fix #14)
- `window-manager.ts`: 从 shared/types 导入 `PanelState` 消除重复定义 (fix #17)

#### Step 10: 重构 — 包管理器 + 样式系统
- npm → pnpm 切换, 添加 `pnpm-lock.yaml`
- 样式从 CSS 迁移至 Less (`styles.css` → `styles.less`)

#### Step 11: 文档
- 更新 README — 产品介绍、工作原理、使用方式

#### Step 12: 窗口定位 + Hook 自动化
- 灵动岛窗口使用 `screen-saver` level, 覆盖菜单栏/刘海区域
- 应用启动时自动注册 hooks (`app.whenReady`), 退出时自动清理 (`will-quit`)

#### Step 13: 运行时修复
- 修复 renderer `app.js` CommonJS exports 报错, 添加 `window.d.ts` 类型声明
- `preload.ts` 沙箱兼容 + CSP 合规 (去除 inline script, contextIsolation 适配)
- 药丸与刘海融合样式调整 + renderer 调试日志
- `PreToolUse` 事件自动激活会话 + 关闭 DevTools

#### Step 14: 会话阶段追踪
- 新增 `SessionPhase` 类型 (`idle` / `thinking` / `tool_use` / `done`)
- `HookRouter` 解析 Claude 事件映射至对应 phase
- `SessionState` 维护 phase 状态, 通过 IPC 通知 renderer
- Renderer 药丸 UI 同步显示当前阶段
- 药丸加宽显示完整文本, 改进 thinking 动画样式, done 阶段展示完成消息

#### Step 15: 药丸融合 + 展开态精简
- 药丸推入菜单栏区域, 与刘海视觉融合
- 精简展开态视��, 仅保留审批卡片
- 药丸改为胶囊造型 (capsule shape), 审批面板全圆角, 去除边框

#### Step 16: 会话活动日志
- 点击胶囊展开面板, 显示当前会话所有工具调用记录
- 日志条目包含: 工具名、描述、耗时、状态图标
- 运行中工具显示蓝色脉冲点, thinking 显示紫色光晕
- done 状态在底部显示完成消息
- 自动滚动至最新条目, 展开时实时更新
- 展开高度 360px, 每会话最多 200 条工具记录
