/**
 * IPC Handlers — Electron IPC 消息处理
 *
 * 处理 Renderer → Main 的请求:
 * - approval-decision: 用户点击了 Allow/Deny
 * - get-state: 获取当前会话快照
 * - toggle-panel: 切换展开/收起
 */

import type { IpcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { IPC_CHANNELS } from '../shared/types';
import type { ApprovalManager } from './approval-manager';
import type { SessionState } from './session-state';
import type { WindowManager } from './window-manager';

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
  sessionState: SessionState,
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

  // Renderer → Main: 请求当前状态快照
  ipcMain.handle(IPC_CHANNELS.GET_STATE, () => {
    return sessionState.getSnapshot();
  });

  // Renderer → Main: 用户点击展开/收起/隐藏
  ipcMain.handle(IPC_CHANNELS.TOGGLE_PANEL, (_event, state: 'compact' | 'expanded' | 'hidden') => {
    if (state === 'hidden') {
      windowManager.dismiss(); // 用户主动关闭，不再自动弹出
    } else {
      windowManager.show(state);
    }
  });
}
