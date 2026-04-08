/**
 * Tray — 系统托盘图标 + 菜单
 *
 * 在菜单栏显示 Claude Island 图标:
 * - 根据 session phase 动态切换图标颜色
 * - tooltip 显示当前任务动作
 * - 菜单第一行显示状态
 * - Setup/Remove Hooks, Show Island, Quit
 */

import { Tray, Menu, nativeImage, BrowserWindow } from 'electron';
import type { SessionState } from './session-state';
import type { SessionPhase } from '../shared/types';
import { installHooks, removeHooks, isInstalled, invalidateCache } from './hook-installer';
import type { WindowManager } from './window-manager';

// 颜色映射
const PHASE_COLORS: Record<string, [number, number, number]> = {
  idle:      [150, 150, 150], // 灰色
  thinking:  [110, 92, 230],  // 蓝紫色 #6e5ce6
  tool:      [52, 199, 89],   // 绿色 #34c759
  responding:[52, 199, 89],
  done:      [52, 199, 89],
};

/** 创建指定颜色的 16x16 托盘图标 */
function createColorIcon(r: number, g: number, b: number): Electron.NativeImage {
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - size / 2;
      const dy = y - size / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 4;

      if (dist <= 6) {
        canvas[idx] = r;
        canvas[idx + 1] = g;
        canvas[idx + 2] = b;
        canvas[idx + 3] = dist <= 5 ? 255 : 128;
      } else {
        canvas[idx + 3] = 0;
      }
    }
  }

  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

// 缓存图标避免重复创建
const iconCache = new Map<string, Electron.NativeImage>();
function getIcon(phase: string): Electron.NativeImage {
  if (iconCache.has(phase)) return iconCache.get(phase)!;
  const [r, g, b] = PHASE_COLORS[phase] || PHASE_COLORS.idle;
  const icon = createColorIcon(r, g, b);
  iconCache.set(phase, icon);
  return icon;
}

export class TrayManager {
  private tray: Tray;
  private sessionState: SessionState;
  private windowManager: WindowManager;
  private statusText = 'Idle';
  private menuInterval: NodeJS.Timeout;

  constructor(mainWindow: BrowserWindow, sessionState: SessionState, windowManager: WindowManager) {
    this.sessionState = sessionState;
    this.windowManager = windowManager;
    this.tray = new Tray(getIcon('idle'));
    this.tray.setToolTip('Claude Island — Idle');

    this.updateMenu();
    this.menuInterval = setInterval(() => this.updateMenu(), 10_000);
    this.tray.on('click', () => this.updateMenu());
  }

  /** 更新 tray 图标和 tooltip */
  updateStatus(phase: SessionPhase, description?: string): void {
    this.tray.setImage(getIcon(phase));

    switch (phase) {
      case 'thinking':
        this.statusText = description || 'Thinking...';
        break;
      case 'tool':
        this.statusText = description || 'Executing...';
        break;
      case 'done':
        this.statusText = description || 'Done';
        break;
      case 'idle':
      default:
        this.statusText = 'Idle';
        break;
    }

    this.tray.setToolTip(`Claude Island — ${this.statusText}`);
    this.updateMenu();
  }

  private updateMenu(): void {
    const installed = isInstalled();

    const contextMenu = Menu.buildFromTemplate([
      { label: this.statusText, enabled: false },
      { type: 'separator' },
      {
        label: installed ? 'Hooks Installed \u2713' : 'Setup Hooks',
        click: () => {
          if (!installed) {
            installHooks();
            invalidateCache();
            this.updateMenu();
          }
        },
        enabled: !installed,
      },
      {
        label: 'Remove Hooks',
        click: () => {
          removeHooks();
          invalidateCache();
          this.updateMenu();
        },
        enabled: installed,
      },
      { type: 'separator' },
      {
        label: 'Show Island',
        click: () => this.windowManager.show('compact'),
      },
      { type: 'separator' },
      { label: 'Quit', role: 'quit' },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  getTray(): Tray {
    return this.tray;
  }
}
