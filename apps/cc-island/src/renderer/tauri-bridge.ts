(function() {
  if (window.claude) return;

  var tauri = window.__TAURI__;
  if (!tauri || !tauri.core || !tauri.event) {
    return;
  }

  function listen(name: string, callback: (payload: any) => void) {
    tauri.event.listen(name, function(event: any) {
      callback(event.payload);
    });
  }

  function invoke(name: string, payload?: Record<string, any>) {
    return tauri.core.invoke(name, payload || {});
  }

  window.claude = {
    approveDecision: function(id, behavior, reason, toolName) {
      return invoke('approve_decision', {
        args: { id: id, behavior: behavior, reason: reason, toolName: toolName },
      });
    },

    answerQuestion: function(id, answers, originalQuestions) {
      return invoke('answer_question', {
        args: { id: id, answers: answers, originalQuestions: originalQuestions },
      });
    },

    jumpToTerminal: function() {
      return invoke('jump_to_terminal', {});
    },

    getChatHistory: function(sessionId) {
      return invoke('get_chat_history', { args: { sessionId: sessionId } });
    },

    switchSession: function(sessionId) {
      return invoke('switch_session', { args: { sessionId: sessionId } });
    },

    setAutoApprove: function(enabled) {
      return invoke('set_auto_approve', { args: { enabled: enabled } });
    },

    getAutoApprove: function() {
      return invoke('get_auto_approve', {});
    },

    getState: function() {
      return invoke('get_state', {});
    },

    togglePanel: function(state) {
      return invoke('toggle_panel', { args: { state: state } });
    },

    onStateUpdate: function(cb) { listen('state-update', cb); },
    onApprovalRequest: function(cb) { listen('approval-request', cb); },
    onQuestionRequest: function(cb) { listen('question-request', cb); },
    onSessionList: function(cb) { listen('session-list', cb); },
    onPanelState: function(cb) { listen('panel-state', cb); },
    onNotification: function(cb) { listen('notification', cb); },
    onApprovalDismissed: function(cb) { listen('approval-dismissed', cb); },
    onAutoApproveChanged: function(cb) { listen('auto-approve-changed', cb); },
  };
})();
