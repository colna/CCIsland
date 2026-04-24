# CCIsland AI 功能测试用例

## 文档说明

本文档用于给 AI 直接投喂测试任务，让 AI 基于当前 CCIsland 已实现功能生成可执行的功能测试用例。

当前测试范围依据项目现有 renderer 功能整理，核心覆盖如下：

- 紧凑态 / 展开态 / 隐藏态切换
- Claude 运行状态展示：idle / tool / thinking / done
- Auto Approve 开关
- Terminal 跳转按钮
- 多会话列表展示与切换
- Approval 审批卡片
- AskUserQuestion 提问卡片
- Notification 通知展示
- Activity Log 日志区
- Chat History 聊天历史区

## 依据的当前代码功能

以下功能点已经可以从当前代码中确认：

- 面板状态切换：`apps/cc-island/src/renderer/app.ts:53`、`apps/cc-island/src/renderer/app.ts:58`、`apps/cc-island/src/renderer/app.ts:71`、`apps/cc-island/src/renderer/app.ts:101`
- 状态展示：`apps/cc-island/src/renderer/app.ts:129`
- Auto Approve：`apps/cc-island/src/renderer/app.ts:37`
- Terminal 跳转：`apps/cc-island/src/renderer/app.ts:82`
- 多会话列表：`apps/cc-island/src/renderer/app.ts:186`、`apps/cc-island/src/renderer/app.ts:224`、`apps/cc-island/src/renderer/app.ts:303`
- Approval 审批卡片：`apps/cc-island/src/renderer/app.ts:309`
- AskUserQuestion：`apps/cc-island/src/renderer/app.ts:367`
- Notification：`apps/cc-island/src/renderer/app.ts:534`
- Activity Log：`apps/cc-island/src/renderer/app.ts:541`
- Chat History：`apps/cc-island/src/renderer/app.ts:580`

## 可直接投喂 AI 的测试提示词

你是一名资深 QA 测试工程师，现在请你基于当前项目 **CCIsland** 执行一次功能测试设计，输出结果要能直接用于手工测试或进一步自动化。

### 项目背景

CCIsland 是一个桌面端 Claude Code 浮窗应用，当前 UI 主要包含以下能力：

1. 紧凑态胶囊视图（compact）
2. 展开态面板（expanded）
3. 隐藏态（hidden）
4. Claude 运行状态展示：idle / tool / thinking / done
5. Auto Approve 开关
6. Terminal 跳转按钮
7. 多会话列表展示与会话切换
8. Approval 审批卡片：Deny / Allow / Always
9. AskUserQuestion 提问卡片：单选、多选、Other 输入、自动提交 / 手动提交
10. Notification 通知展示
11. Activity Log 日志区
12. Chat History 聊天历史区

### 测试目标

请你输出一组 **高质量、可执行、贴合真实交互的功能测试用例**，重点覆盖：

- 核心主流程
- 关键边界场景
- 用户最容易感知的问题
- 状态切换的一致性
- 交互冲突和误触问题

### 输出要求

请严格按下面格式输出，每条测试用例都要完整：

#### 用例格式

- 用例编号
- 模块
- 用例名称
- 前置条件
- 测试步骤
- 预期结果
- 优先级（P0/P1/P2）

### 测试范围要求

请至少覆盖以下场景，并补充你认为必要的场景：

#### 1. 面板状态切换

需要覆盖：

- 默认紧凑态显示
- 点击 compact 区域展开面板
- 点击 expanded 空白区域收回到 compact
- 点击 close 按钮进入 hidden
- 不同状态切换时 UI 是否正确显示 / 隐藏
- 展开时是否主动刷新最新状态、日志、聊天历史

#### 2. 状态展示

需要覆盖：

- idle 时显示 "Claude Code"
- tool 时展示工具名和描述
- thinking 时优先保留最近工具信息；若没有 recentTools，则显示 "Thinking..."
- done 时显示完成文案
- phase 切换后状态点样式和文案是否同步变化

#### 3. Auto Approve

需要覆盖：

- 初始读取开关状态
- 用户手动切换开关
- 后端状态变化后 UI 自动同步
- 开关状态在展开面板中是否准确反映

#### 4. Terminal 跳转

需要覆盖：

- 点击 Terminal 按钮成功跳转后面板收回
- 不支持平台时提示 "Terminal jump unsupported"
- 找不到终端时提示 "No terminal found"
- 临时提示后是否恢复为 "Claude Code"

#### 5. 多会话列表

需要覆盖：

- 仅 1 个会话时不显示列表样式
- 多个会话时显示 session list
- 当前激活会话高亮
- 点击某个会话后切换成功
- 切换后日志、聊天历史、激活态是否同步更新
- 高频刷新时点击是否仍然稳定生效

#### 6. Approval 审批卡片

需要覆盖：

- 收到审批请求时自动展开面板
- 同一审批 id 不重复渲染
- Deny / Allow / Always 三个按钮行为正确
- 点击后卡片移除
- 审批被后端 dismiss 时卡片自动消失
- 多个审批卡片同时存在时显示是否正常

#### 7. AskUserQuestion 提问卡片

需要覆盖：

- 收到问题请求时自动展开面板
- 单选问题点击选项后选中态正确
- 单选问题全部选完后是否自动提交
- 多选问题是否支持多项选择
- Other 输入是否能覆盖单选答案
- 多选问题是否必须手动点 Submit
- 已回答问题 id 不应重复出现
- answerQuestion 失败时去重状态是否回滚

#### 8. Notification

需要覆盖：

- 收到通知后 compact 状态文案变更
- 5 秒后恢复默认文案
- 通知为空时显示默认 "Notification"

#### 9. Activity Log

需要覆盖：

- PreToolUse 仅显示 toolName
- PostToolUse 显示 toolName + description
- done 阶段显示 Complete
- tool / thinking 阶段显示 thinking bar
- 非 tool / thinking 阶段隐藏 thinking bar
- 日志滚动接近底部时自动吸底
- 用户上翻后再次刷新不应强制打断阅读

#### 10. Chat History

需要覆盖：

- 无消息时隐藏区域
- 有消息时展示并滚动到底部
- 用户消息显示为 "You"
- assistant 消息显示为 "AI"
- session 切换时只保留最新请求返回结果，避免旧请求覆盖新请求

### 额外要求

1. 先输出一份 **测试点总表**，按模块归类。
2. 再输出 **不少于 20 条测试用例**。
3. 用例要尽量具体，不要写成空泛描述。
4. 对每个模块补充 1~2 条你认为最容易遗漏的异常场景。
5. 最后再输出一份：
   - P0 用例列表
   - 最适合优先自动化的 5 条用例
   - 最容易出现回归问题的 5 个点

### 输出风格

- 使用中文
- 结构清晰
- 不要写实现代码
- 不要泛泛而谈
- 直接给可执行测试用例内容
