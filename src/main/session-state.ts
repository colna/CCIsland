/**
 * SessionState — 会话状态管理
 *
 * 跟踪 Claude Code 会话的运行状态:
 * - 当前正在执行的工具
 * - 最近的工具历史 (最近 8 条)
 * - 任务列表进度
 * - 会话元信息 (ID, CWD, 开始时间)
 */

import type { HookEvent, SessionSnapshot, ToolActivity, TaskItem } from '../shared/types';
import { describeToolInput } from '../shared/tool-description';

const MAX_RECENT_TOOLS = 8;

export class SessionState {
  isActive = false;
  sessionId?: string;
  cwd?: string;
  startTime?: number;
  currentTool?: ToolActivity;
  recentTools: ToolActivity[] = [];
  tasks: TaskItem[] = [];
  lastEventTime?: number;

  handleSessionStart(event: HookEvent): void {
    this.isActive = true;
    this.sessionId = event.session_id;
    this.cwd = event.cwd;
    this.startTime = Date.now();
    this.currentTool = undefined;
    this.recentTools = [];
    this.tasks = [];
    this.lastEventTime = Date.now();
  }

  handlePreToolUse(event: HookEvent): void {
    this.lastEventTime = Date.now();
    const input = event.tool_input || {};

    this.currentTool = {
      id: event.tool_use_id || `tool-${Date.now()}`,
      toolName: event.tool_name || 'Unknown',
      description: describeToolInput(event.tool_name, input, (p) => this.shortenPath(p)),
      startTime: Date.now(),
      status: 'running',
    };
  }

  handlePostToolUse(event: HookEvent): void {
    this.lastEventTime = Date.now();

    if (this.currentTool && this.currentTool.id === event.tool_use_id) {
      this.currentTool.endTime = Date.now();
      this.currentTool.duration = (this.currentTool.endTime - this.currentTool.startTime) / 1000;
      this.currentTool.status = 'completed';

      // 移入历史
      this.recentTools.push({ ...this.currentTool });
      if (this.recentTools.length > MAX_RECENT_TOOLS) {
        this.recentTools.shift();
      }

      this.currentTool = undefined;
    }
  }

  handlePermissionRequest(event: HookEvent): void {
    this.lastEventTime = Date.now();
    if (event.cwd) this.cwd = event.cwd;
  }

  handleTaskCreated(event: HookEvent): void {
    this.updateTasksFromEvent(event);
  }

  handleTaskCompleted(event: HookEvent): void {
    this.updateTasksFromEvent(event);
  }

  handleNotification(_event: HookEvent): void {
    this.lastEventTime = Date.now();
  }

  handleSessionEnd(_event: HookEvent): void {
    this.isActive = false;
    this.currentTool = undefined;
    this.lastEventTime = Date.now();
  }

  /** 生成快照 (发送给 Renderer) */
  getSnapshot(): SessionSnapshot {
    return {
      isActive: this.isActive,
      sessionId: this.sessionId,
      cwd: this.cwd,
      startTime: this.startTime,
      currentTool: this.currentTool ? { ...this.currentTool } : undefined,
      recentTools: [...this.recentTools],
      tasks: [...this.tasks],
    };
  }

  /** 从事件更新任务列表 (DRY: TaskCreated 和 TaskCompleted 共用) (fix #6) */
  private updateTasksFromEvent(event: HookEvent): void {
    this.lastEventTime = Date.now();
    const input = event.tool_input || {};
    if (input.todos && Array.isArray(input.todos)) {
      this.tasks = input.todos.map((t: any) => ({
        id: t.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        content: t.content || '',
        activeForm: t.activeForm || t.content || '',
        status: t.status || 'pending',
      }));
    }
  }

  private shortenPath(p: string): string {
    const home = process.env.HOME || '/Users/user';
    if (p.startsWith(home)) {
      return '~' + p.slice(home.length);
    }
    const parts = p.split('/');
    if (parts.length > 3) {
      return '.../' + parts.slice(-2).join('/');
    }
    return p;
  }
}
