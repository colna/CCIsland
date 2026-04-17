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
    description: "Read, Edit, Bash and other tool executions surface continuously at the top of your screen.",
  },
  {
    title: "Approvals in place",
    description: "Allow, Deny, or Always — decide right on the island without switching back to the terminal.",
  },
  {
    title: "Stays out of your way",
    description: "Never steals focus by default. Only surfaces when it truly needs your decision.",
  },
];

export const featureScenes = [
  {
    eyebrow: "Live progress",
    title: "See Claude Code as it works.",
    description:
      "File reads, edits, command executions and completion status update continuously right where you can see them.",
    mockup: "activity-log" as const,
    dark: true,
  },
  {
    eyebrow: "Approval flow",
    title: "Approve without leaving the flow.",
    description:
      "When Claude Code requests permission, make Allow / Deny / Always decisions directly from CCIsland.",
    mockup: "approval" as const,
    dark: false,
  },
  {
    eyebrow: "Questions and sessions",
    title: "Questions and sessions, surfaced intelligently.",
    description:
      "AskUserQuestion cards and multi-session status are surfaced just in time, so you never lose context while working in parallel.",
    mockup: "question" as const,
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
    question: "Does CCIsland upload my conversations to the cloud?",
    answer:
      "No. CCIsland receives events via a local localhost hook. Your terminal conversations never leave your machine.",
  },
  {
    question: "Is the experience the same on Windows and macOS?",
    answer:
      "The core floating island experience is identical. Some OS-level features like terminal focus switching are more refined on macOS.",
  },
  {
    question: "Where do I download it?",
    answer:
      "Builds are distributed through GitHub Releases. Click the download button above or visit the Releases page directly.",
  },
];
