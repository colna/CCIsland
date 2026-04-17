/**
 * WindowManager — 灵动岛窗口定位 + 展开/收起
 *
 * 控制 BrowserWindow 的三种状态: hidden / compact / expanded
 * - compact: 440x36 药丸状, 屏幕顶部居中 (刘海附近)
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
import type { HookEvent, PanelState } from '@ccisland/shared';
import { IPC_CHANNELS } from '@ccisland/shared';
import type { ApprovalManager } from './approval-manager';

const isMac = process.platform === 'darwin';

export class WindowManager {
  private win: BrowserWindow | null = null;
  private state: PanelState = 'hidden';
  private userDismissed = false; // 用户手动关闭后不再自动弹出
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
    this.userDismissed = false; // 主动调用 show 时重置

    this.state = state;
    const bounds = this.calculateBounds(state);
    this.win.setBounds(bounds, true);
    this.win.showInactive();
    const actual = this.win.getBounds();
    console.log(`[WindowManager] state=${state}, requested y=${bounds.y}, actual y=${actual.y}, menuBar=${screen.getPrimaryDisplay().workArea.y}`);
    this.sendToRenderer(IPC_CHANNELS.PANEL_STATE, { state });
  }

  /** 隐藏窗口 */
  hide(): void {
    this.state = 'hidden';
    this.win?.hide();
    this.sendToRenderer(IPC_CHANNELS.PANEL_STATE, { state: 'hidden' });
  }

  /** 用户手动隐藏窗口 (不再自动弹出) */
  dismiss(): void {
    this.userDismissed = true;
    this.hide();
  }

  /**
   * 根据 Hook 事件自动控制展开/收起
   * 在 HookRouter.handle() 中调用
   */
  onEvent(event: HookEvent, approvalManager: ApprovalManager): void {
    this.clearTimers();

    switch (event.hook_event_name) {
      case 'UserPromptSubmit':
        if (!this.userDismissed) this.show('compact');
        break;

      case 'PermissionRequest':
        this.show('expanded'); // 审批必须弹出
        break;

      case 'SessionStart':
        if (!this.userDismissed) this.show('compact');
        break;

      case 'PreToolUse':
        if (!this.userDismissed && this.state === 'hidden') this.show('compact');
        this.scheduleCollapse(5000);
        this.scheduleHide(120_000);
        break;

      case 'PostToolUse':
        this.scheduleCollapse(5000);
        break;

      case 'Notification':
        if (!this.userDismissed) {
          this.show('expanded');
          this.scheduleCollapse(3000);
        }
        break;

      case 'Stop':
        // 任务完成后保持 compact 常驻显示
        if (this.state === 'expanded') this.show('compact');
        break;

      case 'SessionEnd':
        // 会话结束后保持 compact 常驻显示完成状态
        if (this.state === 'expanded') this.show('compact');
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

    const workArea = display.workArea;
    const menuBarHeight = workArea.y;
    const hasNotch = isMac && menuBarHeight > 25;

    const width = 440;
    const height = state === 'compact' ? 36 : 360;
    const x = Math.round(screenW / 2 - width / 2);
    const y = isMac ? (hasNotch ? menuBarHeight + 6 : menuBarHeight + 4) : workArea.y + 8;

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
