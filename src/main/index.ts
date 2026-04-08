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

import { app, BrowserWindow, Tray, screen, ipcMain } from 'electron';
import path from 'node:path';
import { HookServer } from './hook-server';
import { HookRouter } from './hook-router';
import { WindowManager } from './window-manager';
import { SessionState } from './session-state';
import { ApprovalManager } from './approval-manager';
import { setupIPC } from './ipc-handlers';
import { createTray } from './tray';

let mainWindow: BrowserWindow;
let tray: Tray | null = null;

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
  tray = createTray(mainWindow, sessionState);

  // IPC 通信
  setupIPC(ipcMain, approvalManager, sessionState, windowManager);

  // 事件路由器
  const router = new HookRouter(sessionState, approvalManager, windowManager);

  // 启动 HTTP Hook 服务, 使用 HookRouter.handle 作为请求处理器
  const server = new HookServer((event) => router.handle(event));
  await server.start(51515);

  console.log(`[Claude Island] Running on port ${server.port}`);
});

function createIslandWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay();
  const { width: screenWidth } = display.size;

  const win = new BrowserWindow({
    width: 220,
    height: 36,
    x: Math.round(screenWidth / 2 - 110),
    y: 0,  // 屏幕顶部, WindowManager 会精确计算

    // 关键: 无边框 + 透明 + 不抢焦点
    frame: false,
    transparent: true,
    hasShadow: true,
    alwaysOnTop: true,
    focusable: false,         // 不抢焦点!
    skipTaskbar: true,
    resizable: false,
    movable: false,
    show: false,              // 初始隐藏, 等待 SessionStart

    webPreferences: {
      preload: path.join(__dirname, '..', 'renderer', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 加载 Renderer HTML
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // macOS: 所有桌面空间可见
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  return win;
}

// 防止 App 完全退出 (窗口关闭后仍在菜单栏运行)
app.on('window-all-closed', () => { /* noop */ });
