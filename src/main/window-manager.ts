/**
 * WindowManager — 灵动岛窗口定位 + 展开/收起
 *
 * 控制 BrowserWindow 的三种状态: hidden / compact / expanded
 * - compact: 220x36 药丸状, 屏幕顶部居中 (刘海附近)
 * - expanded: 380x420 面板, 显示任务列表和审批卡片
 * - hidden: 隐藏窗口
 *
 * 自动行为:
 * - PermissionRequest → 立即展开
 * - SessionStart → 显示紧凑态
 * - PreToolUse/PostToolUse → 5s 无新事件则收起
 * - Notification → 展开 3s 后收起
 * - SessionEnd → 3s 后完全隐藏
 * - 有待审批时始终展开
 */

import { BrowserWindow, screen } from 'electron';
import type { HookEvent, PanelState } from '../shared/types';
import { IPC_CHANNELS } from '../shared/types';
import type { ApprovalManager } from './approval-manager';

export class WindowManager {
  private win: BrowserWindow | null = null;
  private state: PanelState = 'hidden';
  private collapseTimer: NodeJS.Timeout | null = null;
  private hideTimer: NodeJS.Timeout | null = null;

  /** 绑定 BrowserWindow 实例 */
  setWindow(win: BrowserWindow): void {
    this.win = win;
  }

  /** 获取当前面板状态 */
  getState(): PanelState {
    return this.state;
  }

  /** 显示窗口 (紧凑态 或 展开态) */
  show(state: 'compact' | 'expanded'): void {
    if (!this.win) return;
    this.clearTimers();

    this.state = state;
    const bounds = this.calculateBounds(state);
    this.win.setBounds(bounds, true);  // animate = true
    this.win.showInactive();            // 显示但不抢焦点!
    // Debug: 输出实际窗口位置
    const actual = this.win.getBounds();
    console.log(`[WindowManager] requested y=${bounds.y}, actual y=${actual.y}, menuBar=${screen.getPrimaryDisplay().workArea.y}`);
    this.sendToRenderer(IPC_CHANNELS.PANEL_STATE, { state });
  }

  /** 隐藏窗口 */
  hide(): void {
    this.state = 'hidden';
    this.win?.hide();
    this.sendToRenderer(IPC_CHANNELS.PANEL_STATE, { state: 'hidden' });
  }

  /**
   * 根据 Hook 事件自动控制展开/收起
   * 在 HookRouter.handle() 中调用
   */
  onEvent(event: HookEvent, approvalManager: ApprovalManager): void {
    this.clearTimers();

    switch (event.hook_event_name) {
      case 'PermissionRequest':
        this.show('expanded');
        break;

      case 'SessionStart':
        this.show('compact');
        break;

      case 'PreToolUse':
        if (this.state === 'hidden') this.show('compact');
        this.scheduleCollapse(5000);
        this.scheduleHide(120_000);
        break;

      case 'PostToolUse':
        this.scheduleCollapse(5000);
        break;

      case 'Notification':
        this.show('expanded');
        this.scheduleCollapse(3000);
        break;

      case 'Stop':
        // 保持 compact 显示 "✅ 任务完成" 5s
        this.scheduleHide(5000);
        break;

      case 'SessionEnd':
        this.scheduleCollapse(1000);
        this.scheduleHide(3000);
        break;
    }

    // 有待审批时始终保持展开
    if (approvalManager.hasPending()) {
      this.show('expanded');
    }
  }

  /** 向 Renderer 发送消息 */
  sendToRenderer(channel: string, data: unknown): void {
    this.win?.webContents.send(channel, data);
  }

  // ── 定位计算 ──

  private calculateBounds(state: 'compact' | 'expanded') {
    const display = screen.getPrimaryDisplay();
    const { width: screenW } = display.size;

    // 检测刘海 (macOS 12+)
    // Electron 没有直接暴露 safeAreaInsets
    // 通过 workArea 和 size 差值推算: workArea.y = 菜单栏高度
    const workArea = display.workArea;
    const menuBarHeight = workArea.y;
    const hasNotch = menuBarHeight > 25; // 刘海机型菜单栏 ~38px

    const width = state === 'compact' ? 440 : 440;
    const height = state === 'compact' ? 36 : 160;
    const x = Math.round(screenW / 2 - width / 2);

    let y: number;
    if (hasNotch) {
      // 刘海机型: 用负值把窗口推进菜单栏区域, 尽量贴近刘海底部
      // menuBarHeight ≈ 37~38, 刘海底部 ≈ menuBarHeight - 6
      // 窗口 y = menuBarHeight - pillHeight 把药丸底部对齐菜单栏底部
      y = state === 'compact' ? menuBarHeight - height : menuBarHeight - height + 4;
    } else {
      // 非刘海: 菜单栏下方 4px
      y = menuBarHeight + 4;
    }

    return { x, y, width, height };
  }

  private scheduleCollapse(ms: number): void {
    this.collapseTimer = setTimeout(() => {
      if (this.state === 'expanded') this.show('compact');
    }, ms);
  }

  private scheduleHide(ms: number): void {
    this.hideTimer = setTimeout(() => this.hide(), ms);
  }

  private clearTimers(): void {
    if (this.collapseTimer) {
      clearTimeout(this.collapseTimer);
      this.collapseTimer = null;
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
