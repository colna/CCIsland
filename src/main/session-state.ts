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
      description: this.describeToolInput(event.tool_name, input),
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
    // 更新 CWD (如果有)
    if (event.cwd) this.cwd = event.cwd;
  }

  handleTaskCreated(event: HookEvent): void {
    this.lastEventTime = Date.now();
    // TaskCreated 事件可能包含 task list (需要根据实际 payload 调整)
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

  handleTaskCompleted(event: HookEvent): void {
    this.lastEventTime = Date.now();
    // 类似 TaskCreated, 更新 task list
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

  handleNotification(event: HookEvent): void {
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

  /** 从 tool_input 生成人类可读描述 */
  private describeToolInput(toolName: string | undefined, input: Record<string, any>): string {
    switch (toolName) {
      case 'Bash':
        return (input.command as string || 'shell command').slice(0, 80);
      case 'Read':
        return this.shortenPath(input.file_path as string || 'file');
      case 'Write':
        return this.shortenPath(input.file_path as string || 'file');
      case 'Edit':
        return this.shortenPath(input.file_path as string || 'file');
      case 'Glob':
        return input.pattern as string || 'pattern';
      case 'Grep':
        return `"${input.pattern || ''}" in ${this.shortenPath(input.path as string || 'cwd')}`;
      case 'WebFetch':
        return (input.url as string || 'URL').slice(0, 60);
      case 'WebSearch':
        return input.query as string || 'search';
      case 'Task':
        return input.description as string || 'subagent task';
      case 'TodoWrite':
        return 'update task list';
      default:
        return toolName || 'unknown';
    }
  }

  private shortenPath(p: string): string {
    // ~/xxx 格式缩短
    const home = process.env.HOME || '/Users/user';
    if (p.startsWith(home)) {
      return '~' + p.slice(home.length);
    }
    // 只保留最后两级目录
    const parts = p.split('/');
    if (parts.length > 3) {
      return '.../' + parts.slice(-2).join('/');
    }
    return p;
  }
}
