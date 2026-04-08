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
