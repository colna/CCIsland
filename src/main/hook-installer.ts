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
    'SessionStart', 'SessionEnd', 'PostToolUse',
    'Notification', 'TaskCreated', 'TaskCompleted',
    'SubagentStart', 'SubagentStop', 'Stop',
  ],
};

// 缓存安装状态, 避免每 10s 读磁盘 (fix #3)
let _installedCache: boolean | null = null;

/** 安装 Claude Island hooks 到 ~/.claude/settings.json */
export function installHooks(port: number = 51515): void {
  let settings: Record<string, any> = {};
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    settings = JSON.parse(raw);
  } catch {
    // 文件不存在或解析失败
  }

  const hooks: Record<string, any[]> = {};
  const url = `http://localhost:${port}/hook`;

  for (const event of HOOK_EVENTS.blocking) {
    hooks[event] = [{ hooks: [{ type: 'http', url, timeout: 120 }] }];
  }
  for (const event of HOOK_EVENTS.notifying) {
    hooks[event] = [{ hooks: [{ type: 'http', url, timeout: 5 }] }];
  }

  settings.hooks = { ...(settings.hooks || {}), ...hooks };

  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
  _installedCache = true;
  console.log(`[HookInstaller] Hooks installed to ${SETTINGS_PATH}`);
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
          // 精确匹配 hook URL 而非 JSON.stringify (fix #13)
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
    _installedCache = false;
    console.log('[HookInstaller] Hooks removed');
  } catch {
    // 文件不存在则忽略
  }
}

/** 检查当前是否已安装 hooks (使用内存缓存) */
export function isInstalled(port: number = 51515): boolean {
  if (_installedCache !== null) return _installedCache;
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    const settings = JSON.parse(raw);
    _installedCache = JSON.stringify(settings.hooks || {}).includes(`localhost:${port}`);
    return _installedCache;
  } catch {
    return false;
  }
}

/** 手动失效缓存 */
export function invalidateCache(): void {
  _installedCache = null;
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
