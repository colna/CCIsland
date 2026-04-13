# Claude Island

A all system Dynamic Island for Claude Code — displays real-time execution progress and approval actions from your terminal Claude Code session as a floating island at the top of your screen.

![Electron](https://img.shields.io/badge/Electron-33+-47848F?logo=electron&logoColor=white)
[![(Compiler) TypeScript](https://github.com/facebook/react/actions/workflows/compiler_typescript.yml/badge.svg?branch=main)](https://github.com/facebook/react/actions/workflows/compiler_typescript.yml) 
![macOS](https://img.shields.io/badge/macOS-Sonoma+-000000?logo=apple&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

<p align="center">
  <img src="docs/design.png" alt="Claude Island Design" width="360" />
</p>

---

## Features

| Feature | Description |
|---------|-------------|
| Apple Design | Apple-inspired UI — SF Pro typography, glass blur, Apple Blue accent |
| Tool Progress | Real-time display of file operations and command execution |
| Approval Requests | Three-option permission decisions: Allow / Deny / Always |
| Question Cards | Answer AskUserQuestion directly in the island UI |
| Multi-Session | Track multiple concurrent sessions, auto-focus the most active |
| Terminal Jump | ⌘T to jump back to the running terminal window |
| Timeout Recovery | Auto-detect and recover from stale sessions caused by API errors |
| Release Script | Interactive `scripts/release.sh` for versioned tag-based releases |

Runs entirely **without stealing focus**.

---

## How It Works

![alt text](image.png)

Claude Code's [HTTP Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) POST events to `localhost:51515`. For `PermissionRequest` events, the HTTP connection blocks until the user makes a decision in the island UI — achieving **synchronous approval blocking**.

---

## Quick Start

### Prerequisites

- macOS 14 (Sonoma) or later
- Claude Code CLI installed

### Install

**One-line install (recommended)**

```bash
curl -fsSL https://raw.githubusercontent.com/colna/CCIsland/main/install.sh | bash
```

Auto-detects CPU architecture (Apple Silicon / Intel) and installs to `/Applications`.

**Manual download**

Go to [Releases](https://github.com/colna/CCIsland/releases) and grab the DMG for your architecture:

- `Claude Island-*-arm64.dmg` — Apple Silicon (M1/M2/M3/M4)
- `Claude Island-*.dmg` — Intel

**Build from source**

```bash
git clone https://github.com/colna/CCIsland.git
cd CCIsland
pnpm install --dev
pnpm dev
```

### Setup Hooks

**Option 1: Tray menu (recommended)**

Click the tray icon → `Setup Hooks` after launch. Hooks are automatically written to `~/.claude/settings.json`.

**Option 2: Manual config**

Edit `~/.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "type": "http", "url": "http://localhost:51515/hook" }
    ],
    "PreToolUse": [
      { "type": "http", "url": "http://localhost:51515/hook" }
    ],
    "PostToolUse": [
      { "type": "http", "url": "http://localhost:51515/hook" }
    ],
    "Notification": [
      { "type": "http", "url": "http://localhost:51515/hook" }
    ],
    "Stop": [
      { "type": "http", "url": "http://localhost:51515/hook" }
    ]
  }
}
```

**Remove hooks:** Tray icon → `Remove Hooks`

---

## Panel States

| State | Description | Trigger |
|-------|-------------|---------|
| **Hidden** | Invisible | No active session |
| **Compact** | Pill capsule | Tool use, Thinking, Done |
| **Expanded** | Full panel | Approval request, Question card, or click the pill |

---

## Project Structure

```
src/
├── main/                    # Electron Main Process
│   ├── index.ts             # App entry
│   ├── hook-server.ts       # HTTP server (:51515, auto-fallback)
│   ├── hook-router.ts       # Event dispatcher
│   ├── window-manager.ts    # Tri-state window + notch detection
│   ├── session-state.ts     # SessionManager + SessionInstance
│   ├── approval-manager.ts  # Promise-blocking approval
│   ├── ipc-handlers.ts      # IPC message handlers
│   ├── hook-installer.ts    # Hook install/uninstall + health check
│   ├── tray.ts              # System tray (dynamic icon color)
│   ├── terminal-jumper.ts   # Terminal jump (AppleScript)
│   └── chat-parser.ts       # JSONL chat history parser
├── renderer/                # Electron Renderer Process
│   ├── index.html           # Pill + panel layout
│   ├── styles.less          # Apple design system (Less)
│   ├── app.ts               # UI logic
│   └── preload.ts           # contextBridge IPC bridge
├── shared/
│   ├── types.ts             # Type definitions + IPC channels
│   └── tool-description.ts  # Tool description generator
scripts/
│   └── release.sh           # Interactive version release tool
.agents/skills/
│   └── apple-design/        # Apple design system skill for Claude Code
```

---

## Build & Release

```bash
# Dev mode
pnpm dev

# Package DMG/ZIP
pnpm build
```

**Interactive release** (recommended):

```bash
./scripts/release.sh
```

Prompts for version bump type (patch/minor/major), updates `package.json`, creates a git tag, and pushes to trigger GitHub Actions auto-build & release.

**Manual tag release:**

```bash
git tag v0.4.0
git push origin v0.4.0
```

---

## Tech Stack

| Tech | Usage |
|------|-------|
| Electron 33+ | Window management, tray, IPC |
| TypeScript 5.5 | Type safety |
| Less | Style preprocessing |
| Node.js HTTP | Hook server (zero external deps) |
| electron-builder | Packaging & distribution |

## License

MIT
