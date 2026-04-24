/**
 * IPC Handlers — Electron IPC 消息处理
 *
 * 处理 Renderer → Main 的请求:
 * - approval-decision: 用户点击了 Allow/Deny
 * - question-answer: 用户回答了 AskUserQuestion
 * - get-state: 获取当前会话快照
 * - toggle-panel: 切换展开/收起
 * - jump-to-terminal: 跳转到终端
 * - get-chat-history: 获取聊天历史
 */

import type { IpcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { IPC_CHANNELS } from '@ccisland/shared';
import type { ApprovalManager } from './approval-manager';
import type { SessionManager } from './session-state';
import type { WindowManager } from './window-manager';
import { jumpToTerminal } from './terminal-jumper';
import { parseTranscript } from './chat-parser';

const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

/** 把工具名加入 permissions.allow */
function addToAllowedTools(toolName: string): void {
  let settings: Record<string, any> = {};
  try {
    settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch { /* ignore */ }

  if (!settings.permissions) settings.permissions = {};
  if (!Array.isArray(settings.permissions.allow)) settings.permissions.allow = [];

  const rule = toolName;
  if (!settings.permissions.allow.includes(rule)) {
    settings.permissions.allow.push(rule);
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    console.log(`[IPC] Added "${rule}" to permissions.allow`);
  }
}

export function setupIPC(
  ipcMain: IpcMain,
  approvalManager: ApprovalManager,
  sessionManager: SessionManager,
  windowManager: WindowManager
): void {
  // Renderer → Main: 用户点击了审批按钮
  ipcMain.handle(IPC_CHANNELS.APPROVAL_DECISION, (_event, data: {
    toolUseId: string;
    behavior: 'allow' | 'deny' | 'allowAlways';
    reason?: string;
    toolName?: string;
  }) => {
    // allowAlways: 写入 settings.json 永久授权，然后按 allow 处理
    if (data.behavior === 'allowAlways' && data.toolName) {
      addToAllowedTools(data.toolName);
    }

    const resolved = approvalManager.resolve(data.toolUseId, {
      behavior: data.behavior === 'allowAlways' ? 'allow' : data.behavior,
      reason: data.reason,
    });

    // 审批完成后, 如果没有更多待审批, 自动收起
    if (!approvalManager.hasPending()) {
      setTimeout(() => windowManager.show('compact'), 500);
    }

    return { resolved };
  });

  // Renderer → Main: 用户回答了 AskUserQuestion
  ipcMain.handle(IPC_CHANNELS.QUESTION_ANSWER, (_event, data: {
    id: string;
    answers: Record<string, string | string[]>;
    originalQuestions: any[];
  }) => {
    const updatedInput: Record<string, any> = {
      questions: data.originalQuestions,
      answers: data.answers,
    };

    const resolved = approvalManager.resolve(data.id, {
      behavior: 'allow',
      updatedInput,
    });

    if (!approvalManager.hasPending()) {
      setTimeout(() => windowManager.show('compact'), 500);
    }

    return { resolved };
  });

  // Renderer → Main: 请求当前状态快照
  ipcMain.handle(IPC_CHANNELS.GET_STATE, () => {
    return sessionManager.getFocusedSnapshot();
  });

  // Renderer → Main: 用户点击展开/收起/隐藏
  ipcMain.handle(IPC_CHANNELS.TOGGLE_PANEL, (_event, state: 'compact' | 'expanded' | 'hidden') => {
    if (state === 'hidden') {
      windowManager.dismiss(); // 用户主动关闭，不再自动弹出
    } else {
      windowManager.show(state);
    }
  });

  // Renderer → Main: 跳转到终端
  ipcMain.handle(IPC_CHANNELS.JUMP_TO_TERMINAL, () => {
    return jumpToTerminal();
  });

  // Renderer → Main: 获取聊天历史
  ipcMain.handle(IPC_CHANNELS.GET_CHAT_HISTORY, (_event, sessionId?: string) => {
    const session = sessionId
      ? sessionManager.get(sessionId)
      : sessionManager.getFocusedSession();
    if (!session?.transcriptPath) return [];
    return parseTranscript(session.transcriptPath, 30);
  });

  // Renderer → Main: 切换焦点会话
  ipcMain.handle(IPC_CHANNELS.SWITCH_SESSION, (_event, sessionId: string) => {
    if (!sessionManager.setFocus(sessionId)) return null;
    const snapshot = sessionManager.getFocusedSnapshot();
    windowManager.sendToRenderer(IPC_CHANNELS.STATE_UPDATE, snapshot);
    windowManager.sendToRenderer(IPC_CHANNELS.SESSION_LIST, sessionManager.getAllSnapshots());
    return snapshot;
  });
}
