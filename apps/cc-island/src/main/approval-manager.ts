/**
 * ApprovalManager — 阻塞式审批管理器 (核心机制)
 *
 * 工作原理:
 * 1. PermissionRequest 到达 → waitForDecision() 创建 Promise
 * 2. Promise 的 resolve 函数被存储到 pending Map
 * 3. HTTP handler 挂起, 连接保持打开
 * 4. 用户在 Renderer UI 点击 Allow/Deny
 * 5. 通过 IPC 调用 resolve(), Promise 被 resolve
 * 6. HTTP handler 恢复, 返回审批响应给 Claude Code
 */

import type { ApprovalDecision, ApprovalRequestData } from '@ccisland/shared';

interface PendingApproval {
  id: string;
  request: ApprovalRequestData;
  resolve: (decision: ApprovalDecision) => void;
  createdAt: number;
}

export class ApprovalManager {
  private pending = new Map<string, PendingApproval>();

  /**
   * 挂起当前 HTTP handler, 等待用户审批决策
   * 返回的 Promise 在用户点击 Allow/Deny 后才会 resolve
   */
  waitForDecision(request: ApprovalRequestData): Promise<ApprovalDecision> {
    return new Promise<ApprovalDecision>((resolve) => {
      this.pending.set(request.id, {
        id: request.id,
        request,
        resolve,
        createdAt: Date.now(),
      });
    });
  }

  /**
   * 用户在 Renderer 点击了 Allow 或 Deny
   * 通过 IPC 传到 Main Process, 调用此方法 resolve Promise
   */
  resolve(toolUseId: string, decision: ApprovalDecision): boolean {
    const pending = this.pending.get(toolUseId);
    if (!pending) return false;

    pending.resolve(decision);
    this.pending.delete(toolUseId);
    return true;
  }

  /** 获取所有待审批请求 */
  getPendingRequests(): ApprovalRequestData[] {
    return Array.from(this.pending.values()).map((p) => p.request);
  }

  /** 获取所有待审批请求 ID */
  getPendingIds(): string[] {
    return Array.from(this.pending.keys());
  }

  /** 是否有待审批请求 */
  hasPending(): boolean {
    return this.pending.size > 0;
  }

  /** 待审批数量 */
  get pendingCount(): number {
    return this.pending.size;
  }
}
