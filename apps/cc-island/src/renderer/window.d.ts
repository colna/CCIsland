/** Renderer 全局类型声明 — window.claude API */

type ClaudeBridge = {
  approveDecision: (id: string, behavior: 'allow' | 'deny' | 'allowAlways', reason?: string, toolName?: string)
    => Promise<any>;
  answerQuestion: (id: string, answers: Record<string, string | string[]>, originalQuestions: any[])
    => Promise<any>;
  jumpToTerminal: () => Promise<{ success: boolean; app?: string; reason?: string }>;
  getChatHistory: (sessionId?: string) => Promise<any[]>;
  switchSession: (sessionId: string) => Promise<any>;
  setAutoApprove: (enabled: boolean) => Promise<boolean>;
  getAutoApprove: () => Promise<boolean>;
  getState: () => Promise<any>;
  togglePanel: (state: 'compact' | 'expanded' | 'hidden') => Promise<void>;
  onStateUpdate: (cb: (data: any) => void) => void;
  onApprovalRequest: (cb: (data: any) => void) => void;
  onQuestionRequest: (cb: (data: any) => void) => void;
  onSessionList: (cb: (data: any) => void) => void;
  onPanelState: (cb: (data: any) => void) => void;
  onNotification: (cb: (data: any) => void) => void;
  onApprovalDismissed: (cb: (data: any) => void) => void;
  onAutoApproveChanged: (cb: (data: { enabled: boolean }) => void) => void;
};

declare global {
  interface Window {
    claude: ClaudeBridge;
    __TAURI__?: any;
  }
}

export {};
