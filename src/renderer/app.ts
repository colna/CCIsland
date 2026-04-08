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
var approvalsContainer = document.getElementById('approvals')!;
var tasksContainer = document.getElementById('tasks')!;
var recentToolsContainer = document.getElementById('recent-tools')!;

// ── 点击事件 (替代 inline onclick, 避免 CSP 违规) ──

compactView.addEventListener('click', function() {
  window.claude.togglePanel('expanded');
});

var collapseBtn = document.getElementById('collapse-btn');
if (collapseBtn) {
  collapseBtn.addEventListener('click', function() {
    window.claude.togglePanel('compact');
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

    case 'thinking':
      statusDot.className = 'status-dot thinking';
      statusText.className = 'status-text shimmer';
      statusText.textContent = 'Thinking...';
      break;

    case 'done':
      statusDot.className = 'status-dot done';
      statusText.className = 'status-text';
      statusText.textContent = '\u2705 \u4efb\u52a1\u5b8c\u6210';
      break;

    case 'idle':
    default:
      statusDot.className = 'status-dot';
      statusText.className = 'status-text';
      statusText.textContent = 'Claude Code';
      break;
  }

  // 更新展开态 - 头部
  var cwdEl = expandedView.querySelector('.cwd');
  if (cwdEl && state.cwd) {
    cwdEl.textContent = shortenPath(state.cwd);
  }

  var elapsedEl = expandedView.querySelector('.elapsed');
  if (elapsedEl && state.startTime) {
    var elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    elapsedEl.textContent = formatDuration(elapsed);
  }

  // 更新任务列表
  renderTasks(state.tasks || []);

  // 更新工具历史
  renderRecentTools(state.recentTools || []);
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
  label.textContent = '\u26A0 需要审批';
  card.appendChild(label);

  var toolDesc = document.createElement('div');
  toolDesc.className = 'tool-desc';
  toolDesc.textContent = data.toolName + ': ' + data.description;
  card.appendChild(toolDesc);

  var actions = document.createElement('div');
  actions.className = 'actions';

  var denyBtn = document.createElement('button');
  denyBtn.className = 'btn btn-deny';
  denyBtn.textContent = '拒绝';
  denyBtn.addEventListener('click', function() {
    window.claude.approveDecision(data.id, 'deny', 'Denied via Claude Island');
    card.remove();
  }, { once: true });

  var allowBtn = document.createElement('button');
  allowBtn.className = 'btn btn-allow';
  allowBtn.textContent = '允许 ✓';
  allowBtn.addEventListener('click', function() {
    window.claude.approveDecision(data.id, 'allow');
    card.remove();
  }, { once: true });

  actions.appendChild(denyBtn);
  actions.appendChild(allowBtn);
  card.appendChild(actions);

  approvalsContainer.appendChild(card);
});

// ── 通知 ──

window.claude.onNotification((data: any) => {
  var toast = document.createElement('div');
  toast.className = 'notification-toast';
  toast.textContent = data.message || 'Notification';
  approvalsContainer.prepend(toast);
  setTimeout(function() { toast.remove(); }, 5000);
});

// ── 渲染函数 ──

function renderTasks(tasks: any[]) {
  if (tasks.length === 0) {
    tasksContainer.innerHTML = '';
    return;
  }
  tasksContainer.innerHTML =
    '<div class="section-title">Tasks</div>' +
    tasks.map(function(t: any) {
      var icon = t.status === 'completed' ? '✓' : t.status === 'in_progress' ? '●' : '○';
      var cls = t.status;
      var text = t.status === 'in_progress' ? t.activeForm : t.content;
      return '<div class="task-row"><span class="task-icon ' + escapeHtml(cls) + '">' + icon +
        '</span><span>' + escapeHtml(text) + '</span></div>';
    }).join('');
}

function renderRecentTools(tools: any[]) {
  if (tools.length === 0) {
    recentToolsContainer.innerHTML = '';
    return;
  }
  recentToolsContainer.innerHTML =
    '<div class="section-title">Recent</div>' +
    tools.slice(-5).map(function(t: any) {
      return '<div class="tool-row"><span class="name">' + escapeHtml(t.toolName) +
        '</span><span class="desc">' + escapeHtml(t.description) +
        '</span><span class="duration">' + (t.duration ? t.duration.toFixed(1) + 's' : '...') +
        '</span></div>';
    }).join('');
}

// ── 工具函数 ──

function shortenPath(p: string) {
  var home = '/Users/';
  if (p.startsWith(home)) {
    var rest = p.slice(home.length);
    var parts = rest.split('/');
    return '~/' + parts.slice(1).join('/');
  }
  return p;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return seconds + 's';
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  return m + 'm' + (s > 0 ? ' ' + s + 's' : '');
}

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
