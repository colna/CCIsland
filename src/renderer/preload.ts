/**
 * Preload 脚本 — 安全暴露 IPC 给 Renderer
 *
 * 使用 contextBridge 将 IPC 方法暴露到 window.claude
 * Renderer 中通过 window.claude.xxx() 调用
 *
 * 每个监听器注册前先 removeAllListeners 防止热重载累积 (fix #7)
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

contextBridge.exposeInMainWorld('claude', {
  // ── Renderer → Main ──

  /** 发送审批决策 */
  approveDecision: (toolUseId: string, behavior: 'allow' | 'deny', reason?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.APPROVAL_DECISION, { toolUseId, behavior, reason }),

  /** 获取当前会话状态快照 */
  getState: () => ipcRenderer.invoke(IPC_CHANNELS.GET_STATE),

  /** 切换面板状态 */
  togglePanel: (state: 'compact' | 'expanded') =>
    ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_PANEL, state),

  // ── Main → Renderer (监听) ──
  // 注册前清除旧监听器, 防止热重载时累积 (fix #7 memory leak)

  /** 监听会话状态更新 */
  onStateUpdate: (callback: (data: any) => void) => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.STATE_UPDATE);
    ipcRenderer.on(IPC_CHANNELS.STATE_UPDATE, (_event, data) => callback(data));
  },

  /** 监听新的审批请求 */
  onApprovalRequest: (callback: (data: any) => void) => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.APPROVAL_REQUEST);
    ipcRenderer.on(IPC_CHANNELS.APPROVAL_REQUEST, (_event, data) => callback(data));
  },

  /** 监听面板状态变化 */
  onPanelState: (callback: (data: any) => void) => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.PANEL_STATE);
    ipcRenderer.on(IPC_CHANNELS.PANEL_STATE, (_event, data) => callback(data));
  },

  /** 监听通知消息 */
  onNotification: (callback: (data: any) => void) => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.NOTIFICATION);
    ipcRenderer.on(IPC_CHANNELS.NOTIFICATION, (_event, data) => callback(data));
  },
});
