/**
 * TerminalJumper — 跳转到运行 Claude Code 的终端
 *
 * 使用 AppleScript 激活终端应用
 * 检测顺序: iTerm2 → Terminal.app → VS Code → Cursor → Windsurf
 */

import { execSync } from 'node:child_process';

const TERMINALS = [
  { name: 'iTerm2', bundleId: 'com.googlecode.iterm2', script: 'tell application "iTerm" to activate' },
  { name: 'Terminal', bundleId: 'com.apple.Terminal', script: 'tell application "Terminal" to activate' },
  { name: 'VS Code', bundleId: 'com.microsoft.VSCode', script: 'tell application "Visual Studio Code" to activate' },
  { name: 'Cursor', bundleId: 'todesktop.com.Cursor', script: 'tell application "Cursor" to activate' },
  { name: 'Windsurf', bundleId: 'com.codeium.windsurf', script: 'tell application "Windsurf" to activate' },
  { name: 'Ghostty', bundleId: 'com.mitchellh.ghostty', script: 'tell application "Ghostty" to activate' },
  { name: 'Warp', bundleId: 'dev.warp.Warp-Stable', script: 'tell application "Warp" to activate' },
];

/** 检查 App 是否正在运行 */
function isRunning(bundleId: string): boolean {
  try {
    const result = execSync(
      `osascript -e 'tell application "System Events" to (name of processes whose bundle identifier is "${bundleId}") as text'`,
      { encoding: 'utf-8', timeout: 2000, stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    return result.length > 0;
  } catch {
    return false;
  }
}

/** 跳转到第一个检测到的终端 */
export function jumpToTerminal(): { success: boolean; app?: string } {
  for (const terminal of TERMINALS) {
    if (isRunning(terminal.bundleId)) {
      try {
        execSync(`osascript -e '${terminal.script}'`, {
          timeout: 3000,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        console.log(`[TerminalJumper] Focused ${terminal.name}`);
        return { success: true, app: terminal.name };
      } catch {
        continue;
      }
    }
  }

  // Fallback: 尝试 Terminal.app
  try {
    execSync(`osascript -e '${TERMINALS[1].script}'`, {
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, app: 'Terminal' };
  } catch {
    return { success: false };
  }
}
