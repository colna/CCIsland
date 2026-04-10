/**
 * Claude Island — 共享类型定义
 * Main Process 和 Renderer Process 共用
 */

/** Claude Code Hook 推送的事件 */
export interface HookEvent {
  session_id: string;
  transcript_path?: string;
  cwd?: string;
  permission_mode?: string;
  hook_event_name: string;

  // 工具相关
  tool_name?: string;
  tool_input?: Record<string, any>;
  tool_response?: Record<string, any>;
  tool_use_id?: string;

  // Agent 相关
  agent_id?: string;
  agent_type?: string;

  // 通知
  notification_message?: string;

  // Stop 事件
  last_assistant_message?: string;
  stop_hook_active?: boolean;
  reason?: string;
}

/** 返回给 Claude Code 的 Hook 响应 */
export interface HookResponse {
  hookSpecificOutput?: {
    hookEventName: string;
    permissionDecision?: 'allow' | 'deny';
    permissionDecisionReason?: string;
    decision?: {
      behavior: 'allow' | 'deny';
      message?: string;
      interrupt?: boolean;
    };
    updatedInput?: Record<string, any>;
  };
}

/** 审批决策 */
export interface ApprovalDecision {
  behavior: 'allow' | 'deny';
  reason?: string;
  updatedInput?: Record<string, any>;
}

/** AskUserQuestion 选项 */
export interface QuestionOption {
  label: string;
  description?: string;
}

/** AskUserQuestion 单个问题 */
export interface QuestionItem {
  question: string;
  header?: string;
  options: QuestionOption[];
  multiSelect: boolean;
}

/** AskUserQuestion 请求 (Main → Renderer) */
export interface QuestionRequestData {
  id: string;
  questions: QuestionItem[];
  sessionId: string;
  timestamp: number;
}

/** 审批请求 (Main → Renderer) */
export interface ApprovalRequestData {
  id: string;
  toolName: string;
  toolInput: Record<string, any>;
  description: string;
  timestamp: number;
  sessionId: string;
}

/** 工具活动 */
export interface ToolActivity {
  id: string;
  toolName: string;
  description: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'running' | 'completed' | 'failed';
}

/** 任务项 */
export interface TaskItem {
  id: string;
  content: string;
  activeForm: string;
  status: 'pending' | 'in_progress' | 'completed';
}

/** 活动日志条目 (PreToolUse / PostToolUse) */
export interface LogEntry {
  toolName: string;
  description?: string; // PreToolUse 无描述, PostToolUse 有
}

/** 会话阶段 */
export type SessionPhase = 'idle' | 'thinking' | 'tool' | 'responding' | 'done';

/** 会话列表项 (多会话用) */
export interface SessionListItem {
  sessionId: string;
  cwd?: string;
  phase: SessionPhase;
  lastMessage?: string;
  toolCount: number;
  isActive: boolean;
}

/** 聊天消息 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

/** 会话快照 (Main → Renderer) */
export interface SessionSnapshot {
  isActive: boolean;
  phase: SessionPhase;
  sessionId?: string;
  cwd?: string;
  startTime?: number;
  currentTool?: ToolActivity;
  recentTools: ToolActivity[];
  activityLog: LogEntry[];
  tasks: TaskItem[];
  lastMessage?: string; // Stop 事件的最后回复摘要
}

/** 面板状态 */
export type PanelState = 'hidden' | 'compact' | 'expanded';

/** IPC 通道名 */
export const IPC_CHANNELS = {
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
  SWITCH_SESSION: 'switch-session',
  APPROVAL_DISMISSED: 'approval-dismissed',
} as const;
