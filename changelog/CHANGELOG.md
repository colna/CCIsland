# Claude Island 变更记录

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
