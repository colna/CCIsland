/**
 * Claude Island — 主入口
 *
 * Electron Main Process 启动流程:
 * 1. 隐藏 Dock 图标 (纯菜单栏 App)
 * 2. 创建灵动岛窗口 (frameless + transparent + focusable: false)
 * 3. 初始化系统托盘
 * 4. 注册 IPC 通信
 * 5. 启动 HTTP Hook 服务 (port 51515)
 */

import { app, BrowserWindow, screen, ipcMain } from 'electron';
import path from 'node:path';
import { HookServer } from './hook-server';
import { HookRouter } from './hook-router';
import { WindowManager } from './window-manager';
import { SessionState } from './session-state';
import { ApprovalManager } from './approval-manager';
import { setupIPC } from './ipc-handlers';
import { createTray } from './tray';
import { installHooks, isInstalled } from './hook-installer';

let mainWindow: BrowserWindow;
let server: HookServer;

const sessionState = new SessionState();
const approvalManager = new ApprovalManager();
const windowManager = new WindowManager();

app.whenReady().then(async () => {
  // 隐藏 Dock 图标 (纯菜单栏 App)
  app.dock?.hide();

  // 创建灵动岛窗口
  mainWindow = createIslandWindow();
  windowManager.setWindow(mainWindow);

  // 系统托盘
  createTray(mainWindow, sessionState);

  // IPC 通信
  setupIPC(ipcMain, approvalManager, sessionState, windowManager);

  // 事件路由器
  const router = new HookRouter(sessionState, approvalManager, windowManager);

  // 启动 HTTP Hook 服务
  server = new HookServer((event) => router.handle(event));
  await server.start(51515);

  // 自动注册 hooks 到 ~/.claude/settings.json
  if (!isInstalled(server.port)) {
    installHooks(server.port);
    console.log('[Claude Island] Hooks auto-installed');
  }

  console.log(`[Claude Island] Running on port ${server.port}`);
});

// 优雅关闭: 清理 hooks + 停止 HTTP 服务器
app.on('will-quit', () => {
  try {
    const { removeHooks } = require('./hook-installer');
    removeHooks(server?.port || 51515);
  } catch { /* ignore */ }
  server?.stop();
});

function createIslandWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay();
  const { width: screenWidth } = display.size;

  const win = new BrowserWindow({
    width: 220,
    height: 36,
    x: Math.round(screenWidth / 2 - 110),
    y: 0,

    frame: false,
    transparent: true,
    hasShadow: true,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    show: false,
    type: 'panel', // macOS: 面板级窗口, 不激活父应用

    webPreferences: {
      preload: path.join(__dirname, '..', 'renderer', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // screen-saver level: 覆盖菜单栏/刘海区域
  win.setAlwaysOnTop(true, 'screen-saver');

  // 开发模式: 打开 DevTools 查看 renderer console
  win.webContents.openDevTools({ mode: 'detach' });

  // 打印 renderer 日志到主进程终端
  win.webContents.on('console-message', (_e, _level, message) => {
    console.log('[Renderer]', message);
  });

  return win;
}

// 防止 App 完全退出
app.on('window-all-closed', () => { /* noop */ });
