/**
 * Renderer 逻辑 — 灵动岛 UI
 *
 * 通过 window.claude (preload 暴露) 与 Main Process 通信
 * 处理: 面板状态切换, 会话状态更新, 审批请求, 通知
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
var logList = document.getElementById('log-list')!;
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
  // 点击按钮时不收回 (审批按钮)
  if ((e.target as HTMLElement).closest('.btn')) return;
  window.claude.togglePanel('compact');
});

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
