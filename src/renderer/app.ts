/**
 * Renderer 逻辑 — 灵动岛 UI
 *
 * 通过 window.claude (preload 暴露) 与 Main Process 通信
 * 处理: 面板状态切换, 会话状态更新, 审批请求, 通知
 */

export {};

declare global {
  interface Window {
    claude: {
      approveDecision: (id: string, behavior: 'allow' | 'deny', reason?: string)
        => Promise<any>;
      getState: () => Promise<any>;
      togglePanel: (state: 'compact' | 'expanded') => Promise<void>;
      onStateUpdate: (cb: (data: any) => void) => void;
      onApprovalRequest: (cb: (data: any) => void) => void;
      onPanelState: (cb: (data: any) => void) => void;
      onNotification: (cb: (data: any) => void) => void;
    };
  }
}

// ── DOM 引用 ──

const compactView = document.getElementById('compact-view')!;
const expandedView = document.getElementById('expanded-view')!;
const statusDot = compactView.querySelector('.status-dot')!;
const statusText = compactView.querySelector('.status-text')!;
const approvalsContainer = document.getElementById('approvals')!;
const tasksContainer = document.getElementById('tasks')!;
const recentToolsContainer = document.getElementById('recent-tools')!;

// ── 面板状态切换 ──

window.claude.onPanelState((data) => {
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

window.claude.onStateUpdate((state) => {
  // 更新紧凑态
  if (state.currentTool) {
    statusDot.className = 'status-dot active';
    statusText.textContent = `${state.currentTool.toolName}: ${state.currentTool.description}`;
  } else if (state.isActive) {
    statusDot.className = 'status-dot idle';
    statusText.textContent = 'Claude Code';
  } else {
    statusDot.className = 'status-dot';
    statusText.textContent = 'Claude Code (idle)';
  }

  // 更新展开态 - 头部
  const cwdEl = expandedView.querySelector('.cwd');
  if (cwdEl && state.cwd) {
    cwdEl.textContent = shortenPath(state.cwd);
  }

  const elapsedEl = expandedView.querySelector('.elapsed');
  if (elapsedEl && state.startTime) {
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    elapsedEl.textContent = formatDuration(elapsed);
  }

  // 更新任务列表
  renderTasks(state.tasks || []);

  // 更新工具历史
  renderRecentTools(state.recentTools || []);
});

// ── 审批请求 ──

window.claude.onApprovalRequest((data) => {
  // 更新紧凑态为 pending 状态
  statusDot.className = 'status-dot pending';

  const card = document.createElement('div');
  card.className = 'approval-card';
  card.id = `approval-${data.id}`;
  card.innerHTML = `
    <div class="label">⚠ 需要审批</div>
    <div class="tool-desc">${escapeHtml(data.toolName)}: ${escapeHtml(data.description)}</div>
    <div class="actions">
      <button class="btn btn-deny" data-id="${escapeHtml(data.id)}">拒绝</button>
      <button class="btn btn-allow" data-id="${escapeHtml(data.id)}">允许 ✓</button>
    </div>
  `;

  // 绑定按钮事件
  card.querySelector('.btn-deny')!.addEventListener('click', async () => {
    await window.claude.approveDecision(data.id, 'deny', 'Denied via Claude Island');
    card.remove();
  });

  card.querySelector('.btn-allow')!.addEventListener('click', async () => {
    await window.claude.approveDecision(data.id, 'allow');
    card.remove();
  });

  approvalsContainer.appendChild(card);
});

// ── 通知 ──

window.claude.onNotification((data) => {
  const toast = document.createElement('div');
  toast.className = 'notification-toast';
  toast.textContent = data.message || 'Notification';
  approvalsContainer.prepend(toast);

  // 5 秒后移除
  setTimeout(() => toast.remove(), 5000);
});

// ── 渲染函数 ──

function renderTasks(tasks: any[]): void {
  if (tasks.length === 0) {
    tasksContainer.innerHTML = '';
    return;
  }

  tasksContainer.innerHTML = `
    <div class="section-title">Tasks</div>
    ${tasks.map((t: any) => `
      <div class="task-row">
        <span class="task-icon ${t.status}">${
          t.status === 'completed' ? '✓' :
          t.status === 'in_progress' ? '●' : '○'
        }</span>
        <span>${escapeHtml(t.status === 'in_progress' ? t.activeForm : t.content)}</span>
      </div>
    `).join('')}
  `;
}

function renderRecentTools(tools: any[]): void {
  if (tools.length === 0) {
    recentToolsContainer.innerHTML = '';
    return;
  }

  recentToolsContainer.innerHTML = `
    <div class="section-title">Recent</div>
    ${tools.slice(-5).map((t: any) => `
      <div class="tool-row">
        <span class="name">${escapeHtml(t.toolName)}</span>
        <span class="desc">${escapeHtml(t.description)}</span>
        <span class="duration">${t.duration ? t.duration.toFixed(1) + 's' : '...'}</span>
      </div>
    `).join('')}
  `;
}

// ── 工具函数 ──

function shortenPath(p: string): string {
  const home = '/Users/';
  if (p.startsWith(home)) {
    const rest = p.slice(home.length);
    const parts = rest.split('/');
    return '~/' + parts.slice(1).join('/');
  }
  return p;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s > 0 ? ` ${s}s` : ''}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── 初始化: 获取当前状态 ──
window.claude.getState().then((state) => {
  if (state && state.isActive) {
    statusDot.className = 'status-dot active';
  }
});
