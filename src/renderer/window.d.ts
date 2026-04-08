/** Renderer 全局类型声明 — window.claude API */

interface Window {
  claude: {
    approveDecision: (id: string, behavior: 'allow' | 'deny' | 'allowAlways', reason?: string, toolName?: string)
      => Promise<any>;
    getState: () => Promise<any>;
    togglePanel: (state: 'compact' | 'expanded' | 'hidden') => Promise<void>;
    onStateUpdate: (cb: (data: any) => void) => void;
    onApprovalRequest: (cb: (data: any) => void) => void;
    onPanelState: (cb: (data: any) => void) => void;
    onNotification: (cb: (data: any) => void) => void;
  };
}
