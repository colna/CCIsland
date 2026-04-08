/**
 * HookRouter — 事件路由与分发
 *
 * 解析 Claude Code Hook 事件的 hook_event_name,
 * 分发到 SessionState / ApprovalManager / WindowManager
 *
 * PermissionRequest 事件通过 ApprovalManager.waitForDecision() 阻塞,
 * 直到用户在 UI 点击 Allow/Deny 后才返回 HTTP 响应
 */

import type { HookEvent, HookResponse, ApprovalRequestData } from '../shared/types';
import { IPC_CHANNELS } from '../shared/types';
import { describeToolInput } from '../shared/tool-description';
import type { SessionState } from './session-state';
import type { ApprovalManager } from './approval-manager';
import type { WindowManager } from './window-manager';

export class HookRouter {
  constructor(
    private sessionState: SessionState,
    private approvalManager: ApprovalManager,
    private windowManager: WindowManager
  ) {}

  /**
   * 处理 hook 事件, 返回 JSON 响应给 Claude Code
   * 对于 PermissionRequest, 此方法会一直阻塞到用户审批
   */
  async handle(event: HookEvent): Promise<HookResponse> {
    const { hook_event_name } = event;
    console.log(`[HookRouter] Event: ${hook_event_name}, tool: ${event.tool_name}, keys: ${Object.keys(event).join(',')}`);

    // 自动控制窗口展开/收起
    this.windowManager.onEvent(event, this.approvalManager);

    switch (hook_event_name) {
      case 'SessionStart':
        this.sessionState.handleSessionStart(event);
        this.windowManager.show('compact');
        return {};

      case 'PreToolUse':
        this.sessionState.handlePreToolUse(event);
        this.windowManager.sendToRenderer(IPC_CHANNELS.STATE_UPDATE,
          this.sessionState.getSnapshot());
        return {};

      case 'PostToolUse':
        this.sessionState.handlePostToolUse(event);
        this.windowManager.sendToRenderer(IPC_CHANNELS.STATE_UPDATE,
          this.sessionState.getSnapshot());
        return {};

      case 'PermissionRequest': {
        // 核心: 阻塞等待用户审批
        this.sessionState.handlePermissionRequest(event);
        this.windowManager.show('expanded');

        const approvalRequest: ApprovalRequestData = {
          id: event.tool_use_id || `perm-${Date.now()}`,
          toolName: event.tool_name || 'Unknown',
          toolInput: event.tool_input || {},
          description: describeToolInput(event.tool_name, event.tool_input || {}),
          timestamp: Date.now(),
          sessionId: event.session_id,
        };

        this.windowManager.sendToRenderer(IPC_CHANNELS.APPROVAL_REQUEST, approvalRequest);

        // Promise 挂起, 等待用户点击 Allow/Deny
        const decision = await this.approvalManager.waitForDecision(approvalRequest);

        return this.buildPermissionResponse(decision);
      }

      case 'TaskCreated':
        this.sessionState.handleTaskCreated(event);
        this.windowManager.sendToRenderer(IPC_CHANNELS.STATE_UPDATE,
          this.sessionState.getSnapshot());
        return {};

      case 'TaskCompleted':
        this.sessionState.handleTaskCompleted(event);
        this.windowManager.sendToRenderer(IPC_CHANNELS.STATE_UPDATE,
          this.sessionState.getSnapshot());
        return {};

      case 'Notification':
        this.sessionState.handleNotification(event);
        this.windowManager.show('expanded');
        this.windowManager.sendToRenderer(IPC_CHANNELS.NOTIFICATION,
          { message: event.notification_message });
        // 3 秒后自动收起
        setTimeout(() => this.windowManager.show('compact'), 3000);
        return {};

      case 'Stop':
        this.sessionState.handleStop(event);
        this.windowManager.sendToRenderer(IPC_CHANNELS.STATE_UPDATE,
          this.sessionState.getSnapshot());
        // done 状态显示 5s 后隐藏, 让用户看清 "✅ 任务完成"
        setTimeout(() => this.windowManager.hide(), 5000);
        return {};

      case 'SessionEnd':
        this.sessionState.handleSessionEnd(event);
        this.windowManager.sendToRenderer(IPC_CHANNELS.STATE_UPDATE,
          this.sessionState.getSnapshot());
        setTimeout(() => this.windowManager.hide(), 3000);
        return {};

      default:
        return {};
    }
  }

  /** 构建 PermissionRequest 的 HTTP 响应体 */
  private buildPermissionResponse(
    decision: { behavior: 'allow' | 'deny'; reason?: string }
  ): HookResponse {
    return {
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        decision: {
          behavior: decision.behavior,
          ...(decision.reason ? { message: decision.reason } : {}),
          interrupt: false,
        },
      },
    };
  }
}
