/**
 * IPC Handlers — Electron IPC 消息处理
 *
 * 处理 Renderer → Main 的请求:
 * - approval-decision: 用户点击了 Allow/Deny
 * - get-state: 获取当前会话快照
 * - toggle-panel: 切换展开/收起
 */

import type { IpcMain } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import type { ApprovalManager } from './approval-manager';
import type { SessionState } from './session-state';
import type { WindowManager } from './window-manager';

export function setupIPC(
  ipcMain: IpcMain,
  approvalManager: ApprovalManager,
  sessionState: SessionState,
  windowManager: WindowManager
): void {
  // Renderer → Main: 用户点击了审批按钮
  ipcMain.handle(IPC_CHANNELS.APPROVAL_DECISION, (_event, data: {
    toolUseId: string;
    behavior: 'allow' | 'deny';
    reason?: string;
  }) => {
    const resolved = approvalManager.resolve(data.toolUseId, {
      behavior: data.behavior,
      reason: data.reason,
    });

    // 审批完成后, 如果没有更多待审批, 自动收起
    if (!approvalManager.hasPending()) {
      setTimeout(() => windowManager.show('compact'), 500);
    }

    return { resolved };
  });

  // Renderer → Main: 请求当前状态快照
  ipcMain.handle(IPC_CHANNELS.GET_STATE, () => {
    return sessionState.getSnapshot();
  });

  // Renderer → Main: 用户点击展开/收起
  ipcMain.handle(IPC_CHANNELS.TOGGLE_PANEL, (_event, state: 'compact' | 'expanded') => {
    windowManager.show(state);
  });
}
