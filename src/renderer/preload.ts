/**
 * Preload 脚本 — 安全暴露 IPC 给 Renderer
 *
 * 使用 contextBridge 将 IPC 方法暴露到 window.claude
 * Renderer 中通过 window.claude.xxx() 调用
 *
 * 注意: preload 在沙箱中运行, 只能 require('electron'),
 * 不能 require 自定义模块, 所以 IPC 通道名直接内联
 */

const { contextBridge, ipcRenderer } = require('electron');

// IPC 通道名 (与 shared/types.ts IPC_CHANNELS 保持一致)
const CH = {
  APPROVAL_DECISION: 'approval-decision',
  GET_STATE: 'get-state',
  TOGGLE_PANEL: 'toggle-panel',
  STATE_UPDATE: 'state-update',
  APPROVAL_REQUEST: 'approval-request',
  PANEL_STATE: 'panel-state',
  NOTIFICATION: 'notification',
};

contextBridge.exposeInMainWorld('claude', {
  // ── Renderer → Main ──

  approveDecision: (toolUseId: string, behavior: 'allow' | 'deny' | 'allowAlways', reason?: string, toolName?: string) =>
    ipcRenderer.invoke(CH.APPROVAL_DECISION, { toolUseId, behavior, reason, toolName }),

  getState: () => ipcRenderer.invoke(CH.GET_STATE),

  togglePanel: (state: 'compact' | 'expanded' | 'hidden') =>
    ipcRenderer.invoke(CH.TOGGLE_PANEL, state),

  // ── Main → Renderer (监听) ──

  onStateUpdate: (callback: (data: any) => void) => {
    ipcRenderer.removeAllListeners(CH.STATE_UPDATE);
    ipcRenderer.on(CH.STATE_UPDATE, (_event: any, data: any) => callback(data));
  },

  onApprovalRequest: (callback: (data: any) => void) => {
    ipcRenderer.removeAllListeners(CH.APPROVAL_REQUEST);
    ipcRenderer.on(CH.APPROVAL_REQUEST, (_event: any, data: any) => callback(data));
  },

  onPanelState: (callback: (data: any) => void) => {
    ipcRenderer.removeAllListeners(CH.PANEL_STATE);
    ipcRenderer.on(CH.PANEL_STATE, (_event: any, data: any) => callback(data));
  },

  onNotification: (callback: (data: any) => void) => {
    ipcRenderer.removeAllListeners(CH.NOTIFICATION);
    ipcRenderer.on(CH.NOTIFICATION, (_event: any, data: any) => callback(data));
  },
});
