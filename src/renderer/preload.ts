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
  QUESTION_REQUEST: 'question-request',
  QUESTION_ANSWER: 'question-answer',
  SESSION_LIST: 'session-list',
  JUMP_TO_TERMINAL: 'jump-to-terminal',
  GET_CHAT_HISTORY: 'get-chat-history',
};

contextBridge.exposeInMainWorld('claude', {
  // ── Renderer → Main ──

  approveDecision: (toolUseId: string, behavior: 'allow' | 'deny' | 'allowAlways', reason?: string, toolName?: string) =>
    ipcRenderer.invoke(CH.APPROVAL_DECISION, { toolUseId, behavior, reason, toolName }),

  answerQuestion: (id: string, answers: Record<string, string | string[]>, originalQuestions: any[]) =>
    ipcRenderer.invoke(CH.QUESTION_ANSWER, { id, answers, originalQuestions }),

  jumpToTerminal: () => ipcRenderer.invoke(CH.JUMP_TO_TERMINAL),

  getChatHistory: (sessionId?: string) => ipcRenderer.invoke(CH.GET_CHAT_HISTORY, sessionId),

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

  onQuestionRequest: (callback: (data: any) => void) => {
    ipcRenderer.removeAllListeners(CH.QUESTION_REQUEST);
    ipcRenderer.on(CH.QUESTION_REQUEST, (_event: any, data: any) => callback(data));
  },

  onSessionList: (callback: (data: any) => void) => {
    ipcRenderer.removeAllListeners(CH.SESSION_LIST);
    ipcRenderer.on(CH.SESSION_LIST, (_event: any, data: any) => callback(data));
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
