/**
 * Tray — 系统托盘图标 + 菜单
 *
 * 在菜单栏显示 Claude Island 图标:
 * - 显示当前连接状态
 * - Setup Hooks / Remove Hooks
 * - 退出
 */

import { Tray, Menu, nativeImage, BrowserWindow } from 'electron';
import type { SessionState } from './session-state';
import { installHooks, removeHooks, isInstalled, invalidateCache } from './hook-installer';

/** 创建 16x16 的简易托盘图标 (内联, 无需外部文件) */
function createTrayIcon(): Electron.NativeImage {
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4); // RGBA

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - size / 2;
      const dy = y - size / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 4;

      if (dist <= 6) {
        canvas[idx] = 255;     // R
        canvas[idx + 1] = 255; // G
        canvas[idx + 2] = 255; // B
        canvas[idx + 3] = dist <= 5 ? 255 : 128; // A
      } else {
        canvas[idx + 3] = 0;
      }
    }
  }

  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

export function createTray(
  mainWindow: BrowserWindow,
  sessionState: SessionState
): Tray {
  const icon = createTrayIcon();
  const tray = new Tray(icon);

  tray.setToolTip('Claude Island');

  const updateMenu = () => {
    const installed = isInstalled();
    const status = sessionState.isActive ? 'Active' : 'Idle';

    const contextMenu = Menu.buildFromTemplate([
      { label: `Claude Island — ${status}`, enabled: false },
      { type: 'separator' },
      {
        label: installed ? 'Hooks Installed ✓' : 'Setup Hooks',
        click: () => {
          if (!installed) {
            installHooks();
            invalidateCache();
            updateMenu();
          }
        },
        enabled: !installed,
      },
      {
        label: 'Remove Hooks',
        click: () => {
          removeHooks();
          invalidateCache();
          updateMenu();
        },
        enabled: installed,
      },
      { type: 'separator' },
      {
        label: 'Show Island',
        click: () => mainWindow.showInactive(),
      },
      { type: 'separator' },
      {
        label: 'Quit',
        role: 'quit',
      },
    ]);

    tray.setContextMenu(contextMenu);
  };

  updateMenu();

  // 定期更新菜单状态 (isInstalled 使用缓存, 不再每次读磁盘)
  const menuInterval = setInterval(updateMenu, 10_000);

  // 托盘销毁时清理 interval (fix #15)
  tray.on('click', updateMenu);

  return tray;
}
