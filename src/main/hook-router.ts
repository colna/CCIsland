/**
 * HookRouter — 事件路由与分发
 *
 * 解析 Claude Code Hook 事件的 hook_event_name,
 * 分发到 SessionManager / ApprovalManager / WindowManager
 *
 * PermissionRequest 事件通过 ApprovalManager.waitForDecision() 阻塞,
 * 直到用户在 UI 点击 Allow/Deny 后才返回 HTTP 响应
 */

import type { HookEvent, HookResponse, ApprovalRequestData, ApprovalDecision, QuestionRequestData, QuestionItem } from '../shared/types';
import { IPC_CHANNELS } from '../shared/types';
import { describeToolInput } from '../shared/tool-description';
import type { SessionManager } from './session-state';
import type { ApprovalManager } from './approval-manager';
import type { WindowManager } from './window-manager';
import type { TrayManager } from './tray';

export class HookRouter {
  constructor(
    private sessionManager: SessionManager,
    private approvalManager: ApprovalManager,
    private windowManager: WindowManager,
    private trayManager: TrayManager
  ) {}

  /**
   * 处理 hook 事件, 返回 JSON 响应给 Claude Code
   * 对于 PermissionRequest, 此方法会一直阻塞到用户审批
   */
  async handle(event: HookEvent, signal: AbortSignal): Promise<HookResponse> {
    const { hook_event_name } = event;
    console.log(`[HookRouter] Event: ${hook_event_name}, tool: ${event.tool_name}, session: ${event.session_id}`);

    // 自动控制窗口展开/收起
    this.windowManager.onEvent(event, this.approvalManager);

    // 路由到对应会话
    const session = this.sessionManager.getOrCreate(event.session_id);

    switch (hook_event_name) {
      case 'SessionStart':
        session.handleSessionStart(event);
        this.windowManager.show('compact');
        this.sendStateUpdate();
        this.trayManager.updateStatus('thinking');
        return {};

      case 'UserPromptSubmit':
        session.handleUserPromptSubmit(event);
        this.windowManager.show('compact');
        this.sendStateUpdate();
        this.trayManager.updateStatus('thinking', 'Thinking...');
        return {};

      case 'PreToolUse':
        session.handlePreToolUse(event);
        this.sendStateUpdate();
        this.trayManager.updateStatus('tool',
          event.tool_name ? `${event.tool_name}` : 'Executing...');
        return {};

      case 'PostToolUse':
        session.handlePostToolUse(event);
        this.sendStateUpdate();
        this.trayManager.updateStatus('thinking');
        return {};

      case 'PermissionRequest': {
        session.handlePermissionRequest(event);
        this.windowManager.show('expanded');

        const permId = event.tool_use_id || `perm-${Date.now()}`;
        const isQuestion = event.tool_name === 'AskUserQuestion';

        if (isQuestion) {
          // ── AskUserQuestion: 显示问题卡片 ──
          const toolInput = event.tool_input || {};
          const questions: QuestionItem[] = (toolInput.questions || []).map((q: any) => ({
            question: q.question || '',
            header: q.header,
            options: (q.options || []).map((o: any) => ({
              label: o.label || '',
              description: o.description,
            })),
            multiSelect: q.multiSelect === true,
          }));

          const questionRequest: QuestionRequestData = {
            id: permId,
            questions,
            sessionId: event.session_id,
            timestamp: Date.now(),
          };

          const approvalRequest: ApprovalRequestData = {
            id: permId,
            toolName: 'AskUserQuestion',
            toolInput: event.tool_input || {},
            description: 'Claude needs your input',
            timestamp: Date.now(),
            sessionId: event.session_id,
          };

          this.windowManager.sendToRenderer(IPC_CHANNELS.QUESTION_REQUEST, questionRequest);

          const aborted = new Promise<ApprovalDecision>((resolve) => {
            signal.addEventListener('abort', () => {
              this.approvalManager.resolve(permId, { behavior: 'allow', reason: '' });
              resolve({ behavior: 'allow', reason: '' });
            }, { once: true });
          });

          const decision = await Promise.race([
            this.approvalManager.waitForDecision(approvalRequest),
            aborted,
          ]);

          return this.buildPermissionResponse(decision);
        }

        // ── 普通审批 ──
        const approvalRequest: ApprovalRequestData = {
          id: permId,
          toolName: event.tool_name || 'Unknown',
          toolInput: event.tool_input || {},
          description: describeToolInput(event.tool_name, event.tool_input || {}),
          timestamp: Date.now(),
          sessionId: event.session_id,
        };

        this.windowManager.sendToRenderer(IPC_CHANNELS.APPROVAL_REQUEST, approvalRequest);

        const aborted = new Promise<ApprovalDecision>((resolve) => {
          signal.addEventListener('abort', () => {
            this.approvalManager.resolve(approvalRequest.id,
              { behavior: 'allow', reason: '' });
            resolve({ behavior: 'allow', reason: '' });
          }, { once: true });
        });

        const decision = await Promise.race([
          this.approvalManager.waitForDecision(approvalRequest),
          aborted,
        ]);

        return this.buildPermissionResponse(decision);
      }

      case 'TaskCreated':
        session.handleTaskCreated(event);
        this.sendStateUpdate();
        return {};

      case 'TaskCompleted':
        session.handleTaskCompleted(event);
        this.sendStateUpdate();
        return {};

      case 'Notification':
        session.handleNotification(event);
        this.windowManager.show('expanded');
        this.windowManager.sendToRenderer(IPC_CHANNELS.NOTIFICATION,
          { message: event.notification_message });
        setTimeout(() => this.windowManager.show('compact'), 3000);
        return {};

      case 'Stop':
        session.handleStop(event);
        this.sendStateUpdate();
        this.trayManager.updateStatus('done',
          this.sessionManager.lastMessage || 'Done');
        return {};

      case 'SessionEnd':
        session.handleSessionEnd(event);
        this.sendStateUpdate();
        this.trayManager.updateStatus('done');
        return {};

      default:
        return {};
    }
  }

  /** 发送焦点会话快照 + 会话列表给 Renderer */
  private sendStateUpdate(): void {
    this.windowManager.sendToRenderer(IPC_CHANNELS.STATE_UPDATE,
      this.sessionManager.getFocusedSnapshot());
    this.windowManager.sendToRenderer(IPC_CHANNELS.SESSION_LIST,
      this.sessionManager.getAllSnapshots());
  }

  /** 构建 PermissionRequest 的 HTTP 响应体 */
  private buildPermissionResponse(
    decision: { behavior: 'allow' | 'deny'; reason?: string; updatedInput?: Record<string, any> }
  ): HookResponse {
    return {
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        decision: {
          behavior: decision.behavior,
          ...(decision.reason ? { message: decision.reason } : {}),
          interrupt: false,
        },
        ...(decision.updatedInput ? { updatedInput: decision.updatedInput } : {}),
      },
    };
  }
}
