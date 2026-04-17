const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL;
const normalizedSiteUrl = rawSiteUrl
  ? rawSiteUrl.startsWith("http")
    ? rawSiteUrl
    : `https://${rawSiteUrl}`
  : "http://localhost:3000";

export const siteConfig = {
  name: "CCIsland",
  description:
    "A floating Dynamic Island for Claude Code on macOS and Windows. See progress, approvals, and questions without losing focus.",
  siteUrl: normalizedSiteUrl,
  githubUrl: "https://github.com/colna/CCIsland",
  releasesUrl: "https://github.com/colna/CCIsland/releases",
  installCommand:
    "curl -fsSL https://raw.githubusercontent.com/colna/CCIsland/main/install.sh | bash",
};

export const heroStats = [
  { label: "Platforms", value: "macOS + Windows" },
  { label: "Built with", value: "Tauri v2" },
  { label: "Runtime", value: "Rust + TypeScript" },
];

export const valueProps = [
  {
    title: "Real-time progress",
    description: "Read、Edit、Bash 等执行状态会持续浮现在屏幕顶部。",
  },
  {
    title: "Approvals in place",
    description: "Allow / Deny / Always 直接在岛上完成，不必来回切回终端。",
  },
  {
    title: "Stays out of your way",
    description: "默认不抢焦点，只有在真正需要你决策时才主动出现。",
  },
];

export const featureScenes = [
  {
    eyebrow: "Live progress",
    title: "See Claude Code as it works.",
    description:
      "文件读取、编辑、命令执行和完成状态都在你看得到的位置持续更新。",
    image: "/screenshots/design.png",
    dark: true,
  },
  {
    eyebrow: "Approval flow",
    title: "Approve without leaving the flow.",
    description:
      "当 Claude Code 请求权限时，你可以直接在 CCIsland 中做出 Allow / Deny / Always 决策。",
    image: "/screenshots/workflow.png",
    dark: false,
  },
  {
    eyebrow: "Questions and sessions",
    title: "Questions and sessions, surfaced intelligently.",
    description:
      "AskUserQuestion 卡片和多会话状态会被及时抬到前台，让你在并行工作时也不会丢失上下文。",
    image: "/screenshots/icon.png",
    dark: true,
  },
];

export const steps = [
  "Claude Code emits hook events.",
  "CCIsland receives them on localhost:51515.",
  "The floating island updates in real time.",
  "Approval decisions return synchronously.",
];

export const faqs = [
  {
    question: "CCIsland 会把我的对话上传到云端吗？",
    answer:
      "不会。CCIsland 通过本地 localhost hook 接收事件，官网本身也不处理你的终端对话内容。",
  },
  {
    question: "Windows 和 macOS 功能一样吗？",
    answer:
      "核心浮窗体验一致，但某些依赖系统能力的特性，例如终端跳转，更偏向 macOS。",
  },
  {
    question: "下载入口在哪里？",
    answer:
      "当前安装包继续通过 GitHub Releases 分发，官网负责说明产品和承接下载转化。",
  },
];
