# Claude Island 变更记录

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
