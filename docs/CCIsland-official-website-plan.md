# CCIsland 官网方案

> 目标：为 CCIsland 设计一个适合上线到 Vercel 的产品官网，用于展示产品价值、建立信任并承接下载转化。

---

## 1. 项目定位

CCIsland 是面向 Claude Code 用户的桌面伴侣应用，在屏幕顶部以 Dynamic Island 形式实时展示执行进度、审批请求和问题卡片，全程不抢焦点。

官网的职责不是承载完整文档，而是完成三件事：

1. 让用户快速理解产品是什么
2. 让用户相信它真实可用
3. 让用户进入下载或 GitHub 仓库

因此官网应定位为单页 marketing site，强调产品感、演示感和转化效率，而不是工程文档展示页。

---

## 2. 官网目标

### 核心目标

- 展示 CCIsland 的产品价值
- 承接 GitHub Releases 下载
- 强化「Claude Code + Dynamic Island」这一记忆点
- 为后续 Product Hunt、社交媒体分享、搜索引擎收录做准备

### 次级目标

- 建立开源项目可信度
- 说明产品工作原理
- 呈现支持平台与安装方式
- 为未来增加 changelog、download、privacy 等页面预留结构

---

## 3. 设计方向

官网整体采用 Apple-inspired 的视觉语言，但不直接模仿 Apple 官网内容结构。目标是形成「Apple 气质 + 开发者产品表达」的统一风格。

### 视觉原则

- 黑色 `#000000` 与浅灰 `#f5f5f7` 交替分段
- 交互强调色只使用 Apple Blue `#0071e3`
- 大标题、短句、强留白
- Hero 用真实产品图或录屏作为视觉中心
- 不使用多余渐变、复杂纹理、彩色装饰
- 导航采用深色半透明毛玻璃

### 文案原则

- 先说产品价值，再说实现方式
- 句子短，少空话，少形容词
- 以真实功能点为主：
  - real-time progress
  - approval requests
  - AskUserQuestion cards
  - multi-session awareness
  - no focus stealing

---

## 4. 首页信息架构

建议首页采用单页结构，按下面顺序组织。

### 4.1 Header

- 左侧：CCIsland wordmark / icon
- 右侧：GitHub、Download
- 样式：48px 高，`rgba(0,0,0,0.8)` + blur
- 行为：sticky 顶部悬浮

### 4.2 Hero

#### 目标

在 5 秒内让用户明白产品是什么，并引导点击下载或查看 GitHub。

#### 推荐文案

- Eyebrow：`For Claude Code`
- H1：`Dynamic Island for Claude Code.`
- Subcopy：`在屏幕顶部实时显示执行进度、审批请求和问题卡片，全程不抢焦点。`
- CTA 1：`Download for macOS`
- CTA 2：`View on GitHub`

#### 视觉内容

Hero 中心应放以下内容之一：

1. 顶部悬浮岛运行态录屏
2. 多状态拼接展示图
3. 产品 UI 的精修静态图

优先级建议：真实录屏 > 真机截图 > 概念图。

### 4.3 Value Grid

三列价值卡片即可，不建议过多。

- Real-time progress  
  实时展示 Read、Edit、Bash 等执行状态
- Approvals in place  
  在岛上直接处理 Allow / Deny / Always
- Stays out of your way  
  默认不抢焦点，只在需要时出现

### 4.4 Feature Scene 1 - Progress

- 背景：黑色
- 标题：`See Claude Code as it works.`
- 内容：突出工具执行过程可视化
- 配图：执行中状态的大尺寸 UI 图

### 4.5 Feature Scene 2 - Approval

- 背景：浅灰
- 标题：`Approve without leaving the flow.`
- 内容：突出 PermissionRequest 的同步审批交互
- 配图：Allow / Deny / Always 审批卡片

### 4.6 Feature Scene 3 - Questions and Sessions

- 背景：黑色
- 标题：`Questions and sessions, surfaced intelligently.`
- 内容：突出 AskUserQuestion 和多会话聚焦能力
- 配图：问答卡片与会话切换界面

### 4.7 How It Works

这一段用于建立技术可信度，不宜过长。

推荐流程：

1. Claude Code emits HTTP hook events
2. CCIsland receives events on `localhost:51515`
3. Floating UI updates in real time
4. Approval decisions return synchronously

推荐标题：`Built on Claude Code HTTP Hooks.`

### 4.8 Platform and Install

用于承接转化。

建议展示：

- macOS 14+
- Windows 10+
- Tauri v2
- Rust + TypeScript
- GitHub Releases 下载入口
- 一键安装命令
- Build from source 简要说明

### 4.9 Open Source

推荐内容：

- GitHub 仓库链接
- MIT License
- Releases
- Issues

### 4.10 Footer

保持极简，只保留：

- CCIsland
- GitHub
- Releases
- License

---

## 5. 页面建议

### 第一阶段必须页面

- `/` 首页

### 第二阶段可扩展页面

- `/download` 下载页
- `/changelog` 版本更新页
- `/privacy` 隐私页
- `/press` 媒体素材页

第一阶段建议先做单页首页，尽快上线，再逐步扩展。

---

## 6. 技术实现方案

## 6.1 方案结论

官网建议使用独立的 Next.js 应用，部署到 Vercel。

不建议直接复用当前 Tauri 渲染层 `src/renderer` 作为官网，原因如下：

- 当前渲染层服务于桌面 App，不服务于 SEO 和 Web 部署
- 官网和桌面 UI 的职责不同
- Vercel 更适合部署独立的 Web 前端应用
- 后续增加页面、SEO、OG 图、Preview Deployments 会更顺畅

### 6.2 推荐技术栈

- Next.js
- TypeScript
- Tailwind CSS 或 CSS Modules
- App Router
- Vercel Analytics
- Vercel Speed Insights

### 6.3 推荐目录结构

```txt
CCIsland/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── download/page.tsx
│       │   ├── globals.css
│       │   └── opengraph-image.tsx
│       ├── components/
│       │   ├── site-header.tsx
│       │   ├── hero-showcase.tsx
│       │   ├── value-grid.tsx
│       │   ├── feature-scene.tsx
│       │   ├── how-it-works.tsx
│       │   ├── platform-section.tsx
│       │   └── site-footer.tsx
│       ├── lib/
│       │   └── site.ts
│       └── public/
│           ├── hero-demo.mp4
│           ├── screenshots/
│           └── og/
├── src/
├── src-tauri/
└── package.json
```

### 6.4 组件职责建议

- `site-header.tsx`：顶部导航
- `hero-showcase.tsx`：首屏文案与主视觉
- `value-grid.tsx`：价值卡片区
- `feature-scene.tsx`：大图区块复用组件
- `how-it-works.tsx`：工作原理流程图
- `platform-section.tsx`：支持平台和安装方式
- `site-footer.tsx`：页脚链接

### 6.5 样式建议

- 尽量减少客户端状态和复杂动画
- 首屏以静态内容和轻量交互为主
- 用 CSS 控制 section 节奏，不依赖重型动画库
- 图片和视频素材尽量真实，避免过度概念化

---

## 7. 设计 Token 建议

### 颜色

- Black: `#000000`
- Light Gray: `#f5f5f7`
- Primary Text: `#1d1d1f`
- White: `#ffffff`
- Apple Blue: `#0071e3`
- Link Blue Light: `#0066cc`
- Link Blue Dark: `#2997ff`

### 字体

优先使用系统字体栈：

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
```

### 圆角

- 按钮 / 卡片：8px
- 输入类：11px
- pill link：980px

### 导航

```css
background: rgba(0, 0, 0, 0.8);
backdrop-filter: saturate(180%) blur(20px);
```

### 阴影

```css
box-shadow: rgba(0, 0, 0, 0.22) 3px 5px 30px 0px;
```

阴影只在少量卡片中使用，整体仍以平面和留白为主。

---

## 8. 内容素材建议

官网素材优先顺序如下：

1. 真机录屏
2. 实际运行截图
3. 产品 UI 精修图
4. 技术流程图

建议准备以下素材：

- Hero 主视觉图
- Progress 场景图
- Approval 场景图
- AskUserQuestion 场景图
- 多会话场景图
- Open Graph 分享图

---

## 9. 下载与转化策略

### 首页 CTA

首页首屏只放两个主要动作：

- Download for macOS
- View on GitHub

Windows 下载入口可以放在下载区或下载页，不一定需要和 macOS 同级抢首屏注意力。

### 下载分发建议

- 安装包继续放 GitHub Releases
- 官网按钮跳转到 Releases 或 `/download`
- `/download` 页面按平台拆分 macOS / Windows 入口
- 可根据 User-Agent 默认推荐平台，但必须保留手动选择

不建议初期将安装包直接托管到 Vercel。

---

## 10. SEO 与分享策略

### 首页 metadata 建议

- Title：`CCIsland - Dynamic Island for Claude Code`
- Description：`A floating island for Claude Code on macOS and Windows. See real-time progress, approvals, and questions without losing focus.`

### SEO 关键词方向

- Claude Code
- Dynamic Island for Claude Code
- Claude Code desktop companion
- approval UI for Claude Code
- macOS developer utility

### Open Graph 图建议

- 黑底
- 产品截图或录屏关键帧
- 一句短标题
- 不堆过多元素

---

## 11. Vercel 部署方案

### 11.1 部署方式

- 将 GitHub 仓库连接到 Vercel
- Root Directory 指向 `apps/web`
- Framework Preset 选择 Next.js
- Production Branch 使用 `main`
- 开启 Preview Deployments

### 11.2 域名建议

可选域名示例：

- `ccisland.dev`
- `ccisland.app`
- `www.ccisland.dev`

### 11.3 运行配置建议

第一版官网尽量做到零环境变量。

如果只承载静态展示内容，建议不引入数据库、不引入服务端鉴权、不引入复杂后端逻辑。

### 11.4 监控建议

上线后建议同时启用：

- Vercel Analytics
- Vercel Speed Insights

用于观察：

- 首屏性能
- 页面访问路径
- CTA 点击效果
- 移动端体验

---

## 12. 实施节奏建议

### Phase 1 - 最小可上线版本

目标：尽快拥有一个可公开访问的产品官网。

范围：

- 单页首页
- Hero
- Value Grid
- 3 个 Feature Scenes
- How It Works
- Platform and Install
- Footer
- Vercel 部署

### Phase 2 - 增强版本

范围：

- `/download`
- `/changelog`
- Open Graph 图优化
- 多语言支持
- 更完善的截图和视频素材
- 更细的转化分析

---

## 13. 最终建议

官网方案最终建议如下：

- 视觉语言：Apple-inspired
- 官网定位：单页 marketing site
- 技术实现：Next.js 独立前端应用
- 部署平台：Vercel
- 下载分发：GitHub Releases
- 首发重点：Hero、演示感、产品价值、安装转化

最重要的原则不是复刻桌面 App 的全部细节，而是把用户记住的三个点做强：

1. 顶部悬浮
2. 实时反馈
3. 审批交互
