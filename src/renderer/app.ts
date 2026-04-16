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

var compactView = document.getElementById('compact-view')!;
var expandedView = document.getElementById('expanded-view')!;
var statusDot = compactView.querySelector('.status-dot')!;
var statusText = compactView.querySelector('.status-text')!;
var closeBtn = compactView.querySelector('.close-btn')!;
var approvalsContainer = document.getElementById('approvals')!;
var sessionListContainer = document.getElementById('session-list')!;
var logList = document.getElementById('log-list')!;
var terminalBtn = document.getElementById('terminal-btn');
var latestState: any = null; // 缓存最新状态用于渲染日志

// ── 点击事件: 展开/收回/关闭 ──

closeBtn.addEventListener('click', function(e) {
  e.stopPropagation();
  window.claude.togglePanel('hidden');
});

compactView.addEventListener('click', function(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('.close-btn')) return;
  window.claude.togglePanel('expanded');
  if (latestState) renderLog(latestState);
});

expandedView.addEventListener('click', function(e: MouseEvent) {
  // 点击按钮、输入框、选项时不收回
  var target = e.target as HTMLElement;
  if (target.closest('.btn') || target.closest('.option-chip') ||
      target.closest('.other-input') || target.closest('.question-card') ||
      target.closest('.session-row') || target.closest('.terminal-btn')) return;
  window.claude.togglePanel('compact');
});

// ── 终端跳转按钮 ──

if (terminalBtn) {
  terminalBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    window.claude.jumpToTerminal().then(function(result: any) {
      if (!result.success) {
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
      var lastTools = state.recentTools || [];
      var last = lastTools[lastTools.length - 1];
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

  // 展开态: 刷新日志
  if (!expandedView.classList.contains('hidden')) {
    renderLog(state);
  }
});

// ── 多会话列表 ──

window.claude.onSessionList((sessions: any[]) => {
  if (!sessionListContainer) return;
  if (!sessions || sessions.length <= 1) {
    sessionListContainer.innerHTML = '';
    sessionListContainer.className = 'session-list';
    return;
  }

  sessionListContainer.className = 'session-list has-sessions';
  sessionListContainer.innerHTML = '';

  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    var row = document.createElement('div');
    var activeClass = (latestState && s.sessionId === latestState.sessionId) ? ' active' : '';
    row.className = 'session-row' + activeClass;

    var dot = document.createElement('span');
    var dotClass = 'dot ';
    switch (s.phase) {
      case 'tool': dotClass += 'dot-running'; break;
      case 'thinking': dotClass += 'dot-thinking'; break;
      case 'done': dotClass += 'dot-done'; break;
      default: dotClass += 'dot-idle'; break;
    }
    dot.className = dotClass;
    row.appendChild(dot);

    var cwdSpan = document.createElement('span');
    cwdSpan.className = 'session-cwd';
    var cwd = s.cwd || 'unknown';
    var parts = cwd.split('/');
    if (parts.length > 3) cwd = '.../' + parts.slice(-2).join('/');
    cwdSpan.textContent = cwd;
    row.appendChild(cwdSpan);

    var toolsSpan = document.createElement('span');
    toolsSpan.className = 'session-tools';
    toolsSpan.textContent = String(s.toolCount);
    row.appendChild(toolsSpan);

    // 点击切换会话
    (function(sessionId: string) {
      row.addEventListener('click', function(e) {
        e.stopPropagation();
        window.claude.switchSession(sessionId);
      });
    })(s.sessionId);

    sessionListContainer.appendChild(row);
  }
});

// ── 审批请求 ──

window.claude.onApprovalRequest((data: any) => {
  console.log('[app] approvalRequest:', data);
  statusDot.className = 'status-dot pending';

  var card = document.createElement('div');
  card.className = 'approval-card';
  card.id = 'approval-' + data.id;

  var label = document.createElement('div');
  label.className = 'label';
  label.textContent = '\u26A0 ' + data.toolName;
  card.appendChild(label);

  var toolDesc = document.createElement('div');
  toolDesc.className = 'tool-desc';
  toolDesc.textContent = data.description;
  card.appendChild(toolDesc);

  var actions = document.createElement('div');
  actions.className = 'actions';

  var denyBtn = document.createElement('button');
  denyBtn.className = 'btn btn-deny';
  denyBtn.textContent = 'Deny';
  denyBtn.addEventListener('click', function() {
    window.claude.approveDecision(data.id, 'deny', 'Denied via Claude Island');
    card.remove();
  }, { once: true });

  var allowBtn = document.createElement('button');
  allowBtn.className = 'btn btn-allow';
  allowBtn.textContent = 'Allow';
  allowBtn.addEventListener('click', function() {
    window.claude.approveDecision(data.id, 'allow');
    card.remove();
  }, { once: true });

  var allowAlwaysBtn = document.createElement('button');
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
  statusDot.className = 'status-dot pending';

  var card = document.createElement('div');
  card.className = 'question-card';
  card.id = 'question-' + data.id;

  // 跟踪每个问题的选择
  var selections: Record<string, string | string[]> = {};

  for (var qi = 0; qi < data.questions.length; qi++) {
    var q = data.questions[qi];
    var questionKey = q.question;

    // Header
    if (q.header) {
      var header = document.createElement('div');
      header.className = 'question-header';
      header.textContent = q.header;
      card.appendChild(header);
    }

    // 问题文本
    var questionText = document.createElement('div');
    questionText.className = 'question-text';
    questionText.textContent = q.question;
    card.appendChild(questionText);

    // 选项 chips
    var optionsContainer = document.createElement('div');
    optionsContainer.className = 'options-container';

    if (q.multiSelect) {
      selections[questionKey] = [];
    }

    for (var oi = 0; oi < q.options.length; oi++) {
      var opt = q.options[oi];
      var chip = document.createElement('button');
      chip.className = 'option-chip';
      chip.textContent = opt.label;
      if (opt.description) {
        chip.title = opt.description;
      }

      // 闭包捕获变量
      (function(chipEl: HTMLElement, qKey: string, label: string, isMulti: boolean, container: HTMLElement) {
        chipEl.addEventListener('click', function(e) {
          e.stopPropagation();
          if (isMulti) {
            chipEl.classList.toggle('selected');
            var arr = selections[qKey] as string[];
            var idx = arr.indexOf(label);
            if (idx >= 0) { arr.splice(idx, 1); } else { arr.push(label); }
          } else {
            var siblings = container.querySelectorAll('.option-chip');
            for (var s = 0; s < siblings.length; s++) {
              siblings[s].classList.remove('selected');
            }
            chipEl.classList.add('selected');
            selections[qKey] = label;
          }
          // 清空 Other 输入
          var otherInput = card.querySelectorAll('.other-input')[qi] as HTMLInputElement;
          if (otherInput && !isMulti) otherInput.value = '';
        });
      })(chip, questionKey, opt.label, q.multiSelect, optionsContainer);

      optionsContainer.appendChild(chip);
    }

    card.appendChild(optionsContainer);

    // "Other" 自由输入
    var otherRow = document.createElement('div');
    otherRow.className = 'other-row';
    var otherInput = document.createElement('input');
    otherInput.type = 'text';
    otherInput.className = 'other-input';
    otherInput.placeholder = 'Or type your answer...';

    (function(inputEl: HTMLInputElement, qKey: string, isMulti: boolean, container: HTMLElement) {
      inputEl.addEventListener('input', function() {
        if (inputEl.value.trim() && !isMulti) {
          var siblings = container.querySelectorAll('.option-chip');
          for (var s = 0; s < siblings.length; s++) {
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

  // Submit 按钮
  var submitBtn = document.createElement('button');
  submitBtn.className = 'btn btn-submit';
  submitBtn.textContent = 'Submit';
  submitBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    // 收集最终答案
    var finalAnswers: Record<string, string | string[]> = {};
    var otherInputs = card.querySelectorAll('.other-input') as NodeListOf<HTMLInputElement>;
    for (var i = 0; i < data.questions.length; i++) {
      var qKey = data.questions[i].question;
      var otherVal = otherInputs[i] ? otherInputs[i].value.trim() : '';
      if (otherVal && !data.questions[i].multiSelect) {
        finalAnswers[qKey] = otherVal;
      } else {
        finalAnswers[qKey] = selections[qKey] || '';
      }
    }

    window.claude.answerQuestion(data.id, finalAnswers, data.questions);
    card.remove();
  }, { once: true });

  card.appendChild(submitBtn);
  approvalsContainer.appendChild(card);
});

// ── 审批/问题卡片被后端自动消解 (abort) ──

window.claude.onApprovalDismissed((data: any) => {
  console.log('[app] approvalDismissed:', data);
  var card = document.getElementById('approval-' + data.id) ||
             document.getElementById('question-' + data.id);
  if (card) card.remove();
});

// ── 通知 (简化: 在紧凑态 statusText 显示) ──

window.claude.onNotification((data: any) => {
  statusText.textContent = data.message || 'Notification';
  setTimeout(function() { statusText.textContent = 'Claude Code'; }, 5000);
});

// ── 日志渲染 ──

function renderLog(state: any) {
  var html = '';
  var log = state.activityLog || [];

  // 全部日志条目 (Pre: 只有工具名, Post: 工具名+描述)
  for (var i = 0; i < log.length; i++) {
    var entry = log[i];
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

  // 底部 Thinking 状态条
  if (state.phase === 'thinking' || state.phase === 'tool') {
    html += '<div class="log-thinking-bar">' +
      '<span class="dot dot-thinking"></span>' +
      '<span>Thinking...</span>' +
      '</div>';
  }

  logList.innerHTML = html;
  logList.scrollTop = logList.scrollHeight;
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
  if (state && state.isActive) {
    statusDot.className = 'status-dot active';
  }
});
