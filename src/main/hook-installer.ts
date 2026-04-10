/**
 * HookInstaller — 读写 ~/.claude/settings.json
 *
 * 安装: 将 Claude Island 的 HTTP hook 写入 settings.json
 * 卸载: 移除 localhost:PORT 相关的 hook 条目, 保留其他配置
 *
 * Hook 事件分两类:
 * - blocking (120s): PreToolUse, PermissionRequest — 需要等待用户审批
 * - notifying (5s): SessionStart, SessionEnd, PostToolUse 等 — 仅通知
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

const HOOK_EVENTS = {
  blocking: ['PreToolUse', 'PermissionRequest'],
  notifying: [
    'UserPromptSubmit',
    'SessionStart', 'SessionEnd', 'PostToolUse',
    'Notification', 'Stop',
  ],
};

/** 安装 Claude Island hooks 到 ~/.claude/settings.json (合并, 不覆盖已有 hooks) */
export function installHooks(port: number = 51515): void {
  let settings: Record<string, any> = {};
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    settings = JSON.parse(raw);
  } catch {
    // 文件不存在或解析失败
  }

  const url = `http://localhost:${port}/hook`;
  const marker = `localhost:${port}`;
  const existingHooks: Record<string, any[]> = settings.hooks || {};

  // 为每个事件合并 hook: 保留其他来源的 hooks, 追加/替换 cc-island 的
  for (const event of HOOK_EVENTS.blocking) {
    existingHooks[event] = mergeHookEntry(existingHooks[event], url, marker, 120);
  }
  for (const event of HOOK_EVENTS.notifying) {
    existingHooks[event] = mergeHookEntry(existingHooks[event], url, marker, 5);
  }

  settings.hooks = existingHooks;

  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
  console.log(`[HookInstaller] Hooks installed to ${SETTINGS_PATH}`);
}

/** 合并单个事件的 hook 条目: 保留非 cc-island 的, 追加 cc-island 的 */
function mergeHookEntry(existing: any[] | undefined, url: string, marker: string, timeout: number): any[] {
  const others = (existing || []).filter((m: any) => {
    const hooks = m.hooks || [];
    return !hooks.some((h: any) => h.url?.includes(marker));
  });
  others.push({ hooks: [{ type: 'http', url, timeout }] });
  return others;
}

/** 移除 Claude Island hooks, 保留其他配置 */
export function removeHooks(port: number = 51515): void {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    const settings = JSON.parse(raw);

    if (settings.hooks) {
      const marker = `localhost:${port}`;
      for (const [event, matchers] of Object.entries(settings.hooks)) {
        if (Array.isArray(matchers)) {
          settings.hooks[event] = matchers.filter((m: any) => {
            const hooks = m.hooks || [];
            return !hooks.some((h: any) => h.url?.includes(marker));
          });
          if (settings.hooks[event].length === 0) {
            delete settings.hooks[event];
          }
        }
      }
      if (Object.keys(settings.hooks).length === 0) {
        delete settings.hooks;
      }
    }

    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    console.log('[HookInstaller] Hooks removed');
  } catch {
    // 文件不存在则忽略
  }
}

/** 检查当前是否已安装 hooks (每次读文件, 不缓存) */
export function isInstalled(port: number = 51515): boolean {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    const settings = JSON.parse(raw);
    return JSON.stringify(settings.hooks || {}).includes(`localhost:${port}`);
  } catch {
    return false;
  }
}

// CLI 入口
if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === 'install') {
    installHooks();
  } else if (cmd === 'remove') {
    removeHooks();
  } else {
    console.log('Usage: hook-installer [install|remove]');
  }
}
