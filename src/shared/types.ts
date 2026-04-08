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
  };
}

/** 审批决策 */
export interface ApprovalDecision {
  behavior: 'allow' | 'deny';
  reason?: string;
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

/** 会话阶段 */
export type SessionPhase = 'idle' | 'thinking' | 'tool' | 'responding' | 'done';

/** 会话快照 (Main → Renderer) */
export interface SessionSnapshot {
  isActive: boolean;
  phase: SessionPhase;
  sessionId?: string;
  cwd?: string;
  startTime?: number;
  currentTool?: ToolActivity;
  recentTools: ToolActivity[];
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
} as const;
