/**
 * SessionState — 会话状态管理
 *
 * SessionInstance: 单个会话的状态
 * SessionManager: 管理多个并发会话, 按优先级排序
 */

import type { HookEvent, SessionSnapshot, ToolActivity, TaskItem, SessionPhase, LogEntry, SessionListItem } from '../shared/types';
import { describeToolInput } from '../shared/tool-description';

const MAX_RECENT_TOOLS = 200;

/** 单个 Claude Code 会话实例 */
export class SessionInstance {
  isActive = false;
  phase: SessionPhase = 'idle';
  sessionId?: string;
  cwd?: string;
  transcriptPath?: string;
  startTime?: number;
  currentTool?: ToolActivity;
  recentTools: ToolActivity[] = [];
  activityLog: LogEntry[] = [];
  tasks: TaskItem[] = [];
  lastEventTime?: number;
  lastMessage?: string;
  toolCount = 0;

  handleSessionStart(event: HookEvent): void {
    this.isActive = true;
    this.phase = 'thinking';
    this.sessionId = event.session_id;
    this.cwd = event.cwd;
    if (event.transcript_path) this.transcriptPath = event.transcript_path;
    this.startTime = Date.now();
    this.currentTool = undefined;
    this.recentTools = [];
    this.activityLog = [];
    this.tasks = [];
    this.lastMessage = undefined;
    this.toolCount = 0;
    this.lastEventTime = Date.now();
  }

  handleUserPromptSubmit(event: HookEvent): void {
    this.lastEventTime = Date.now();
    if (!this.isActive) {
      this.isActive = true;
      this.sessionId = event.session_id;
      this.cwd = event.cwd;
      this.startTime = Date.now();
      this.lastMessage = undefined;
      this.toolCount = 0;
    }
    if (event.cwd) this.cwd = event.cwd;
    if (event.transcript_path) this.transcriptPath = event.transcript_path;
    this.phase = 'thinking';
  }

  handlePreToolUse(event: HookEvent): void {
    this.lastEventTime = Date.now();
    if (!this.isActive) {
      this.isActive = true;
      this.sessionId = event.session_id;
      this.cwd = event.cwd;
      this.startTime = Date.now();
      this.lastMessage = undefined;
      this.toolCount = 0;
    }
    if (event.cwd) this.cwd = event.cwd;
    if (event.transcript_path) this.transcriptPath = event.transcript_path;

    this.phase = 'tool';
    this.toolCount++;
    const input = event.tool_input || {};
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
    this.phase = 'thinking';

    if (this.currentTool && this.currentTool.id === event.tool_use_id) {
      this.currentTool.endTime = Date.now();
      this.currentTool.duration = (this.currentTool.endTime - this.currentTool.startTime) / 1000;
      this.currentTool.status = 'completed';
      this.activityLog.push({
        toolName: this.currentTool.toolName,
        description: this.currentTool.description,
      });
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
    this.phase = 'tool';
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
    if (event.last_assistant_message) {
      const firstLine = event.last_assistant_message
        .replace(/\*\*/g, '')
        .replace(/[#*`]/g, '')
        .split('\n')
        .filter((l: string) => l.trim().length > 0)[0] || '';
      this.lastMessage = firstLine.length > 80
        ? firstLine.slice(0, 77) + '...'
        : firstLine;
    }
  }

  handleSessionEnd(_event: HookEvent): void {
    this.isActive = false;
    this.phase = 'done';
    this.currentTool = undefined;
    this.lastEventTime = Date.now();
  }

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

// ── 阶段优先级 ──

const PHASE_PRIORITY: Record<string, number> = {
  tool: 5,
  thinking: 4,
  responding: 3,
  done: 2,
  idle: 1,
};

/** 多会话管理器 */
export class SessionManager {
  private sessions = new Map<string, SessionInstance>();

  /** 获取或创建会话 */
  getOrCreate(sessionId: string): SessionInstance {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = new SessionInstance();
      session.sessionId = sessionId;
      this.sessions.set(sessionId, session);
    }
    return session;
  }

  get(sessionId: string): SessionInstance | undefined {
    return this.sessions.get(sessionId);
  }

  /** 获取最高优先级的会话 (用于紧凑态显示) */
  getFocusedSession(): SessionInstance | undefined {
    if (this.sessions.size === 0) return undefined;

    let best: SessionInstance | undefined;
    let bestScore = -1;
    let bestTime = 0;

    for (const session of this.sessions.values()) {
      if (!session.isActive && session.phase !== 'done') continue;
      const score = PHASE_PRIORITY[session.phase] || 0;
      const time = session.lastEventTime || 0;
      if (score > bestScore || (score === bestScore && time > bestTime)) {
        best = session;
        bestScore = score;
        bestTime = time;
      }
    }

    return best || this.sessions.values().next().value;
  }

  /** 获取焦点会话快照 */
  getFocusedSnapshot(): SessionSnapshot {
    const session = this.getFocusedSession();
    if (!session) {
      return { isActive: false, phase: 'idle', recentTools: [], activityLog: [], tasks: [] };
    }
    return session.getSnapshot();
  }

  /** 获取所有会话列表项 */
  getAllSnapshots(): SessionListItem[] {
    const items: SessionListItem[] = [];
    for (const [id, session] of this.sessions) {
      if (!session.isActive && session.phase === 'idle') continue; // 跳过未激活的空会话
      items.push({
        sessionId: id,
        cwd: session.cwd,
        phase: session.phase,
        lastMessage: session.lastMessage,
        toolCount: session.toolCount,
        isActive: session.isActive,
      });
    }
    return items.sort((a, b) => {
      return (PHASE_PRIORITY[b.phase] || 0) - (PHASE_PRIORITY[a.phase] || 0);
    });
  }

  /** 焦点会话的 lastMessage */
  get lastMessage(): string | undefined {
    return this.getFocusedSession()?.lastMessage;
  }

  /** 清理超过 5 分钟的已结束会话 */
  cleanup(): void {
    const cutoff = Date.now() - 5 * 60 * 1000;
    for (const [id, session] of this.sessions) {
      if (!session.isActive && session.phase === 'done' && (session.lastEventTime || 0) < cutoff) {
        this.sessions.delete(id);
      }
    }
  }
}

// 保留旧导出名以兼容
export { SessionInstance as SessionState };
