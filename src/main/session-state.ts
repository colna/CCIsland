/**
 * SessionState — 会话状态管理
 *
 * 跟踪 Claude Code 会话的运行状态:
 * - phase: idle → thinking → tool → thinking → tool → responding → done
 * - 当前正在执行的工具
 * - 最近的工具历史 (最近 8 条)
 * - 任务列表进度
 * - 会话元信息 (ID, CWD, 开始时间)
 */

import type { HookEvent, SessionSnapshot, ToolActivity, TaskItem, SessionPhase, LogEntry } from '../shared/types';
import { describeToolInput } from '../shared/tool-description';

const MAX_RECENT_TOOLS = 200; // 保留会话全部日志

export class SessionState {
  isActive = false;
  phase: SessionPhase = 'idle';
  sessionId?: string;
  cwd?: string;
  startTime?: number;
  currentTool?: ToolActivity;
  recentTools: ToolActivity[] = [];
  activityLog: LogEntry[] = [];
  tasks: TaskItem[] = [];
  lastEventTime?: number;
  lastMessage?: string;
  toolCount = 0; // 本次会话工具调用计数

  handleSessionStart(event: HookEvent): void {
    this.isActive = true;
    this.phase = 'thinking';
    this.sessionId = event.session_id;
    this.cwd = event.cwd;
    this.startTime = Date.now();
    this.currentTool = undefined;
    this.recentTools = [];
    this.activityLog = [];
    this.tasks = [];
    this.lastMessage = undefined;
    this.toolCount = 0;
    this.lastEventTime = Date.now();
  }

  handlePreToolUse(event: HookEvent): void {
    this.lastEventTime = Date.now();

    // 自动激活会话 (Claude Code 不发 SessionStart 事件)
    if (!this.isActive || this.sessionId !== event.session_id) {
      this.isActive = true;
      this.sessionId = event.session_id;
      this.cwd = event.cwd;
      this.startTime = Date.now();
      this.lastMessage = undefined;
      this.toolCount = 0;
      if (this.sessionId !== event.session_id) {
        this.recentTools = [];
        this.activityLog = [];
        this.tasks = [];
      }
    }
    if (event.cwd) this.cwd = event.cwd;

    this.phase = 'tool';
    this.toolCount++;
    const input = event.tool_input || {};

    // PreToolUse: 只记录工具名
    this.activityLog.push({ toolName: event.tool_name || 'Unknown' });

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
    if (event.cwd) this.cwd = event.cwd;

    // 工具完成后进入 thinking (等待下一个工具或回复)
    this.phase = 'thinking';

    if (this.currentTool && this.currentTool.id === event.tool_use_id) {
      this.currentTool.endTime = Date.now();
      this.currentTool.duration = (this.currentTool.endTime - this.currentTool.startTime) / 1000;
      this.currentTool.status = 'completed';

      // PostToolUse: 工具名 + 描述
      this.activityLog.push({
        toolName: this.currentTool.toolName,
        description: this.currentTool.description,
      });

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
    this.phase = 'tool'; // 等待审批也算工具阶段
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

  handleStop(event: HookEvent): void {
    this.lastEventTime = Date.now();
    this.phase = 'done';

    // 提取最后消息摘要 (第一行, 最多 80 字符)
    if (event.last_assistant_message) {
      const firstLine = event.last_assistant_message
        .replace(/\*\*/g, '')  // 去除 markdown 粗体
        .replace(/[#*`]/g, '') // 去除 markdown 标记
        .split('\n')
        .filter((l: string) => l.trim().length > 0)[0] || '';
      this.lastMessage = firstLine.length > 80
        ? firstLine.slice(0, 77) + '...'
        : firstLine;
    }
  }

  handleSessionEnd(_event: HookEvent): void {
    this.isActive = false;
    this.phase = 'idle';
    this.currentTool = undefined;
    this.lastMessage = undefined;
    this.lastEventTime = Date.now();
  }

  /** 生成快照 (发送给 Renderer) */
  getSnapshot(): SessionSnapshot {
    return {
      isActive: this.isActive,
      phase: this.phase,
      sessionId: this.sessionId,
      cwd: this.cwd,
      startTime: this.startTime,
      currentTool: this.currentTool ? { ...this.currentTool } : undefined,
      recentTools: [...this.recentTools],
      activityLog: [...this.activityLog],
      tasks: [...this.tasks],
      lastMessage: this.lastMessage,
    };
  }

  /** 从事件更新任务列表 */
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
