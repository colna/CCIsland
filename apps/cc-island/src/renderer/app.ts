/**
 * Renderer 逻辑 — 灵动岛 UI
 *
 * 通过 window.claude (preload 暴露) 与 Main Process 通信
 * 处理: 面板状态切换, 会话状态更新, 审批请求, AskUserQuestion, 通知
 *
 * 类型声明见 window.d.ts
 */

console.log('[app] loaded, window.claude =', typeof window.claude);

if (!window.claude) {
  document.body.innerText = 'ERROR: window.claude undefined';
  throw new Error('preload failed');
}

// ── DOM 引用 ──

let compactView = document.getElementById('compact-view')!;
let expandedView = document.getElementById('expanded-view')!;
let statusDot = compactView.querySelector('.status-dot')!;
let statusText = compactView.querySelector('.status-text')!;
let closeBtn = compactView.querySelector('.close-btn')!;
let approvalsContainer = document.getElementById('approvals')!;
let sessionListContainer = document.getElementById('session-list')!;
let logList = document.getElementById('log-list')!;
let logThinkingBar = document.getElementById('log-thinking-bar')!;
let chatHistory = document.getElementById('chat-history')!;
let terminalBtn = document.getElementById('terminal-btn');
let latestState: any = null; // 缓存最新状态用于渲染日志
let latestSessions: any[] = [];
let renderedChatSessionId: string | null = null;
let pendingChatSessionId: string | null = null;
let chatHistoryRequestToken = 0;
let answeredQuestionIds = new Set<string>();

// ── 自动批准开关 ──

let autoApproveCheckbox = document.getElementById('auto-approve-checkbox') as HTMLInputElement;

autoApproveCheckbox.addEventListener('change', function() {
  window.claude.setAutoApprove(autoApproveCheckbox.checked);
});

window.claude.onAutoApproveChanged(function(data: { enabled: boolean }) {
  autoApproveCheckbox.checked = data.enabled;
});

window.claude.getAutoApprove().then(function(enabled: boolean) {
  autoApproveCheckbox.checked = enabled;
});

// ── 点击事件: 展开/收回/关闭 ──

closeBtn.addEventListener('click', function(e) {
  e.stopPropagation();
  window.claude.togglePanel('hidden');
});

compactView.addEventListener('click', function(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('.close-btn')) return;
  window.claude.togglePanel('expanded');
  // 展开时主动拉取最新状态，避免使用过期缓存
  window.claude.getState().then(function(state: any) {
    if (state) {
      latestState = state;
      renderLog(state);
      refreshChatHistory(state.sessionId);
    }
  });
});

expandedView.addEventListener('click', function(e: MouseEvent) {
  // 点击按钮、输入框、选项时不收回
  let target = e.target as HTMLElement;
  if (target.closest('.btn') || target.closest('.option-chip') ||
      target.closest('.other-input') || target.closest('.question-card') ||
      target.closest('.session-list') || target.closest('.terminal-btn')) return;
  window.claude.togglePanel('compact');
});

// ── 终端跳转按钮 ──

if (terminalBtn) {
  terminalBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    window.claude.jumpToTerminal().then(function(result: any) {
      if (result.success) {
        // 跳转成功后收回灵动岛，避免遮挡终端
        window.claude.togglePanel('compact');
      } else {
        statusText.textContent = result.reason === 'unsupported-platform'
          ? 'Terminal jump unsupported'
          : 'No terminal found';
        setTimeout(function() { statusText.textContent = 'Claude Code'; }, 2000);
      }
    });
  });
}

// ── 面板状态切换 ──

window.claude.onPanelState((data: any) => {
  console.log('[app] panelState:', data.state);
  switch (data.state) {
    case 'compact':
      compactView.classList.remove('hidden');
      expandedView.classList.add('hidden');
      break;
    case 'expanded':
      compactView.classList.add('hidden');
      expandedView.classList.remove('hidden');
      // 展开时主动拉取最新状态
      window.claude.getState().then(function(state: any) {
        if (state) {
          latestState = state;
          renderLog(state);
          refreshChatHistory(state.sessionId);
        }
      });
      break;
    case 'hidden':
      compactView.classList.add('hidden');
      expandedView.classList.add('hidden');
      break;
  }
});

// ── 会话状态更新 ──

window.claude.onStateUpdate((state: any) => {
  console.log('[app] stateUpdate:', JSON.stringify(state).slice(0, 200));
  latestState = state;

  // ── 紧凑态：按 phase 显示不同内容 ──
  switch (state.phase) {
    case 'tool':
      statusDot.className = 'status-dot active';
      statusText.className = 'status-text';
      if (state.currentTool) {
        statusText.textContent = state.currentTool.toolName + ': ' + state.currentTool.description;
      } else {
        statusText.textContent = 'Executing...';
      }
      break;

    case 'thinking': {
      // 胶囊不单独显示 thinking, 保持最后一个工具的信息
      statusText.className = 'status-text';
      let lastTools = state.recentTools || [];
      let last = lastTools[lastTools.length - 1];
      if (last) {
        statusDot.className = 'status-dot active';
        statusText.textContent = last.toolName + ': ' + last.description;
      } else {
        statusDot.className = 'status-dot thinking';
        statusText.textContent = 'Thinking...';
      }
      break;
    }

    case 'done':
      statusDot.className = 'status-dot done';
      statusText.className = 'status-text done-text';
      statusText.textContent = state.lastMessage || 'Done';
      break;

    case 'idle':
    default:
      statusDot.className = 'status-dot';
      statusText.className = 'status-text';
      statusText.textContent = 'Claude Code';
      break;
  }

  // 展开态: 刷新日志和聊天历史
  if (!expandedView.classList.contains('hidden')) {
    renderLog(state);
    if (state.sessionId !== renderedChatSessionId && state.sessionId !== pendingChatSessionId) {
      refreshChatHistory(state.sessionId);
    }
  }
});

// ── 多会话列表 ──
// 使用 diff 式更新(复用节点) + 事件委托,避免高频重建导致 click 丢失

if (sessionListContainer) {
  // 事件委托:click 绑在容器上,即使 row 被替换也不影响
  // 用 mousedown 而非 click: row 在高频 re-render 时 mousedown 触发更稳
  sessionListContainer.addEventListener('mousedown', function(e: MouseEvent) {
    let target = e.target as HTMLElement | null;
    let row = target ? target.closest('.session-row') as HTMLElement | null : null;
    if (!row) return;
    let sessionId = row.getAttribute('data-session-id');
    if (!sessionId) return;
    e.stopPropagation();
    e.preventDefault();
    window.claude.switchSession(sessionId).then(function(snapshot: any) {
      if (!snapshot) return;
      latestState = snapshot;
      renderLog(snapshot);
      refreshChatHistory(snapshot.sessionId);
      renderSessionList(latestSessions);
    }).catch(function(error: any) {
      console.error('[app] switchSession failed:', error);
    });
  });
}

function phaseDotClass(phase: string): string {
  switch (phase) {
    case 'tool': return 'dot dot-running';
    case 'thinking': return 'dot dot-thinking';
    case 'done': return 'dot dot-done';
    default: return 'dot dot-idle';
  }
}

function formatCwd(cwd: string): string {
  let parts = cwd.split('/');
  if (parts.length > 3) return '.../' + parts.slice(-2).join('/');
  return cwd;
}

function renderSessionList(sessions: any[]) {
  if (!sessionListContainer) return;
  latestSessions = sessions || [];

  if (!sessions || sessions.length <= 1) {
    if (sessionListContainer.children.length > 0) {
      sessionListContainer.innerHTML = '';
    }
    sessionListContainer.className = 'session-list';
    return;
  }

  sessionListContainer.className = 'session-list has-sessions';

  // 建索引:已存在的 row 按 sessionId 映射
  let existing: Record<string, HTMLElement> = {};
  for (let i = 0; i < sessionListContainer.children.length; i++) {
    let child = sessionListContainer.children[i] as HTMLElement;
    let id = child.getAttribute('data-session-id');
    if (id) existing[id] = child;
  }

  let seen: Record<string, boolean> = {};

  for (let i = 0; i < sessions.length; i++) {
    let s = sessions[i];
    seen[s.sessionId] = true;
    let isActive = (latestState && s.sessionId === latestState.sessionId);
    let dotClass = phaseDotClass(s.phase);
    let cwd = formatCwd(s.cwd || 'unknown');
    let toolCountStr = String(s.toolCount);

    let row = existing[s.sessionId];
    if (row) {
      // 复用:仅在变化时更新
      let wantClass = 'session-row' + (isActive ? ' active' : '');
      if (row.className !== wantClass) row.className = wantClass;
      let dot = row.children[0] as HTMLElement;
      if (dot && dot.className !== dotClass) dot.className = dotClass;
      let cwdSpan = row.children[1] as HTMLElement;
      if (cwdSpan && cwdSpan.textContent !== cwd) cwdSpan.textContent = cwd;
      let toolsSpan = row.children[2] as HTMLElement;
      if (toolsSpan && toolsSpan.textContent !== toolCountStr) toolsSpan.textContent = toolCountStr;
      // 顺序校正
      if (sessionListContainer.children[i] !== row) {
        sessionListContainer.insertBefore(row, sessionListContainer.children[i] || null);
      }
    } else {
      // 新建
      row = document.createElement('div');
      row.className = 'session-row' + (isActive ? ' active' : '');
      row.setAttribute('data-session-id', s.sessionId);

      let dot = document.createElement('span');
      dot.className = dotClass;
      row.appendChild(dot);

      let cwdSpan = document.createElement('span');
      cwdSpan.className = 'session-cwd';
      cwdSpan.textContent = cwd;
      row.appendChild(cwdSpan);

      let toolsSpan = document.createElement('span');
      toolsSpan.className = 'session-tools';
      toolsSpan.textContent = toolCountStr;
      row.appendChild(toolsSpan);

      let anchor = sessionListContainer.children[i] || null;
      sessionListContainer.insertBefore(row, anchor);
    }
  }

  // 删除不再存在的 row
  for (let id in existing) {
    if (!seen[id]) existing[id].remove();
  }
}

window.claude.onSessionList((sessions: any[]) => {
  renderSessionList(sessions);
});

// ── 审批请求 ──

window.claude.onApprovalRequest((data: any) => {
  console.log('[app] approvalRequest:', data);
  if (document.getElementById('approval-' + data.id)) return;
  compactView.classList.add('hidden');
  expandedView.classList.remove('hidden');
  statusDot.className = 'status-dot pending';

  let card = document.createElement('div');
  card.className = 'approval-card';
  card.id = 'approval-' + data.id;

  let label = document.createElement('div');
  label.className = 'label';
  label.textContent = '\u26A0 ' + data.toolName;
  card.appendChild(label);

  let toolDesc = document.createElement('div');
  toolDesc.className = 'tool-desc';
  toolDesc.textContent = data.description;
  card.appendChild(toolDesc);

  let actions = document.createElement('div');
  actions.className = 'actions';

  let denyBtn = document.createElement('button');
  denyBtn.className = 'btn btn-deny';
  denyBtn.textContent = 'Deny';
  denyBtn.addEventListener('click', function() {
    window.claude.approveDecision(data.id, 'deny', 'Denied via Claude Island');
    card.remove();
  }, { once: true });

  let allowBtn = document.createElement('button');
  allowBtn.className = 'btn btn-allow';
  allowBtn.textContent = 'Allow';
  allowBtn.addEventListener('click', function() {
    window.claude.approveDecision(data.id, 'allow');
    card.remove();
  }, { once: true });

  let allowAlwaysBtn = document.createElement('button');
  allowAlwaysBtn.className = 'btn btn-allow-always';
  allowAlwaysBtn.textContent = 'Always';
  allowAlwaysBtn.addEventListener('click', function() {
    window.claude.approveDecision(data.id, 'allowAlways', undefined, data.toolName);
    card.remove();
  }, { once: true });

  actions.appendChild(denyBtn);
  actions.appendChild(allowBtn);
  actions.appendChild(allowAlwaysBtn);
  card.appendChild(actions);

  approvalsContainer.appendChild(card);
});

// ── AskUserQuestion 请求 ──

window.claude.onQuestionRequest((data: any) => {
  console.log('[app] questionRequest:', data);
  if (answeredQuestionIds.has(data.id) || document.getElementById('question-' + data.id)) return;
  compactView.classList.add('hidden');
  expandedView.classList.remove('hidden');
  statusDot.className = 'status-dot pending';

  let card = document.createElement('div');
  card.className = 'question-card';
  card.id = 'question-' + data.id;

  // 跟踪每个问题的选择
  let selections: Record<string, string | string[]> = {};

  for (let qi = 0; qi < data.questions.length; qi++) {
    let q = data.questions[qi];
    let questionKey = q.question;

    // Header
    if (q.header) {
      let header = document.createElement('div');
      header.className = 'question-header';
      header.textContent = q.header;
      card.appendChild(header);
    }

    // 问题文本
    let questionText = document.createElement('div');
    questionText.className = 'question-text';
    questionText.textContent = q.question;
    card.appendChild(questionText);

    // 选项 chips
    let optionsContainer = document.createElement('div');
    optionsContainer.className = 'options-container';

    if (q.multiSelect) {
      selections[questionKey] = [];
    }

    for (let oi = 0; oi < q.options.length; oi++) {
      let opt = q.options[oi];
      let chip = document.createElement('button');
      chip.className = 'option-chip';
      chip.textContent = opt.label;
      if (opt.description) {
        chip.title = opt.description;
      }

      // 闭包捕获变量
      (function(chipEl: HTMLElement, qKey: string, label: string, isMulti: boolean, container: HTMLElement, qIdx: number) {
        chipEl.addEventListener('click', function(e) {
          e.stopPropagation();
          if (isMulti) {
            chipEl.classList.toggle('selected');
            let arr = selections[qKey] as string[];
            let idx = arr.indexOf(label);
            if (idx >= 0) { arr.splice(idx, 1); } else { arr.push(label); }
          } else {
            let siblings = container.querySelectorAll('.option-chip');
            for (let s = 0; s < siblings.length; s++) {
              siblings[s].classList.remove('selected');
            }
            chipEl.classList.add('selected');
            selections[qKey] = label;
            // 清空 Other 输入
            let otherInput = card.querySelectorAll('.other-input')[qIdx] as HTMLInputElement;
            if (otherInput) otherInput.value = '';
            // 所有单选问题都选好后自动提交
            tryAutoSubmit();
          }
        });
      })(chip, questionKey, opt.label, q.multiSelect, optionsContainer, qi);

      optionsContainer.appendChild(chip);
    }

    card.appendChild(optionsContainer);

    // "Other" 自由输入
    let otherRow = document.createElement('div');
    otherRow.className = 'other-row';
    let otherInput = document.createElement('input');
    otherInput.type = 'text';
    otherInput.className = 'other-input';
    otherInput.placeholder = 'Or type your answer...';

    (function(inputEl: HTMLInputElement, qKey: string, isMulti: boolean, container: HTMLElement) {
      inputEl.addEventListener('input', function() {
        if (inputEl.value.trim() && !isMulti) {
          let siblings = container.querySelectorAll('.option-chip');
          for (let s = 0; s < siblings.length; s++) {
            siblings[s].classList.remove('selected');
          }
          selections[qKey] = inputEl.value.trim();
        }
      });
      inputEl.addEventListener('click', function(e) { e.stopPropagation(); });
    })(otherInput, questionKey, q.multiSelect, optionsContainer);

    otherRow.appendChild(otherInput);
    card.appendChild(otherRow);
  }

  // ── 提交逻辑 ──
  let submitted = false;
  function submitAnswers() {
    if (submitted) return;
    submitted = true;
    let finalAnswers: Record<string, string | string[]> = {};
    let otherInputs = card.querySelectorAll('.other-input') as NodeListOf<HTMLInputElement>;
    for (let i = 0; i < data.questions.length; i++) {
      let qKey = data.questions[i].question;
      let otherVal = otherInputs[i] ? otherInputs[i].value.trim() : '';
      if (otherVal && !data.questions[i].multiSelect) {
        finalAnswers[qKey] = otherVal;
      } else {
        finalAnswers[qKey] = selections[qKey] || '';
      }
    }
    answeredQuestionIds.add(data.id);
    card.remove();
    window.claude.answerQuestion(data.id, finalAnswers, data.questions).catch(function(error: any) {
      console.error('[app] answerQuestion failed', error);
      answeredQuestionIds.delete(data.id);
    });
  }

  // 检查所有单选问题是否已有选择，若是则自动提交
  function tryAutoSubmit() {
    for (let i = 0; i < data.questions.length; i++) {
      let qKey = data.questions[i].question;
      let val = selections[qKey];
      if (data.questions[i].multiSelect) return; // multiSelect 需要手动提交
      if (!val || val === '') return;
    }
    // 所有单选问题都已选择 — 短暂延迟后自动提交，让用户看到选中效果
    setTimeout(submitAnswers, 150);
  }

  // Submit 按钮（兜底，multiSelect 或用户手动提交）
  let submitBtn = document.createElement('button');
  submitBtn.className = 'btn btn-submit';
  submitBtn.textContent = 'Submit';
  submitBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    submitAnswers();
  }, { once: true });

  card.appendChild(submitBtn);
  approvalsContainer.appendChild(card);
});

// ── 审批/问题卡片被后端自动消解 (abort) ──

window.claude.onApprovalDismissed((data: any) => {
  console.log('[app] approvalDismissed:', data);
  let card = document.getElementById('approval-' + data.id) ||
             document.getElementById('question-' + data.id);
  if (card) card.remove();
  if (!approvalsContainer.children.length && !expandedView.classList.contains('hidden') && latestState) {
    renderLog(latestState);
  }
});

// ── 通知 (简化: 在紧凑态 statusText 显示) ──

window.claude.onNotification((data: any) => {
  statusText.textContent = data.message || 'Notification';
  setTimeout(function() { statusText.textContent = 'Claude Code'; }, 5000);
});

// ── 日志渲染 ──

function renderLog(state: any) {
  let distanceFromBottom = logList.scrollHeight - logList.scrollTop - logList.clientHeight;
  let shouldStickToBottom = distanceFromBottom <= 12;
  let html = '';
  let log = state.activityLog || [];

  // 全部日志条目 (Pre: 只有工具名, Post: 工具名+描述)
  for (let i = 0; i < log.length; i++) {
    let entry = log[i];
    if (entry.description) {
      // PostToolUse: 绿色圆点 + 工具名 + 描述
      html += '<div class="log-line done">' +
        '<span class="dot dot-done"></span>' +
        '<b>' + escapeHtml(entry.toolName) + '</b> <code>' + escapeHtml(entry.description) + '</code>' +
        '</div>';
    } else {
      // PreToolUse: 绿色圆点 + 仅工具名
      html += '<div class="log-line done">' +
        '<span class="dot dot-done"></span>' +
        '<b>' + escapeHtml(entry.toolName) + '</b>' +
        '</div>';
    }
  }

  // 完成状态
  if (state.phase === 'done') {
    html += '<div class="log-line complete">' +
      '<span class="dot dot-complete"></span>' +
      '<b>Complete</b>' +
      '</div>';
  }

  logList.innerHTML = html;
  logThinkingBar.classList.toggle('hidden', !(state.phase === 'thinking' || state.phase === 'tool'));
  if (shouldStickToBottom) {
    logList.scrollTop = logList.scrollHeight;
  }
}

function refreshChatHistory(sessionId?: string | null) {
  let targetSessionId = sessionId || null;
  let requestToken = ++chatHistoryRequestToken;
  pendingChatSessionId = targetSessionId;

  chatHistory.classList.add('hidden');
  chatHistory.innerHTML = '';

  window.claude.getChatHistory(targetSessionId || undefined).then(function(messages: any[]) {
    if (requestToken !== chatHistoryRequestToken) return;
    pendingChatSessionId = null;
    renderedChatSessionId = targetSessionId;
    renderChatHistory(messages || []);
  }).catch(function(error: any) {
    if (requestToken !== chatHistoryRequestToken) return;
    pendingChatSessionId = null;
    renderedChatSessionId = targetSessionId;
    console.error('[app] getChatHistory failed', error);
    renderChatHistory([]);
  });
}

function renderChatHistory(messages: any[]) {
  if (!messages || !messages.length) {
    chatHistory.classList.add('hidden');
    chatHistory.innerHTML = '';
    return;
  }

  let html = '';
  for (let i = 0; i < messages.length; i++) {
    let message = messages[i] || {};
    let role = message.role === 'assistant' ? 'AI' : 'You';
    let roleClass = message.role === 'assistant' ? 'chat-assistant' : 'chat-user';
    html += '<div class="chat-line ' + roleClass + '">' +
      '<span class="chat-role">' + role + '</span>' +
      '<div class="chat-content">' + escapeHtml(String(message.content || '')) + '</div>' +
      '</div>';
  }

  chatHistory.innerHTML = html;
  chatHistory.classList.remove('hidden');
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// ── 工具函数 ──

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── 初始化 ──
console.log('[app] registering listeners done');
window.claude.getState().then(function(state: any) {
  console.log('[app] initial state:', state);
  latestState = state;
  if (state && state.isActive) {
    statusDot.className = 'status-dot active';
  }
  if (state && state.phase === 'done') {
    statusText.className = 'status-text done-text';
    statusText.textContent = state.lastMessage || 'Done';
  }
  if (!expandedView.classList.contains('hidden')) {
    renderLog(state);
    refreshChatHistory(state.sessionId);
  }
}).catch(function(error: any) {
  console.error('[app] initial getState failed', error);
});
