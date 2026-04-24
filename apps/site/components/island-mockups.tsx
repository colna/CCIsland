function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <span
      className={`island-dot ${pulse ? "island-dot-pulse" : ""}`}
      style={{ background: color }}
    />
  );
}

function LogLine({ color, bold, text }: { color: string; bold: string; text: string }) {
  return (
    <div className="island-log-line">
      <Dot color={color} />
      {bold && <span className="island-log-bold">{bold}</span>}
      <span>{text}</span>
    </div>
  );
}

export function MockupActivityLog() {
  return (
    <div className="island-expanded">
      <div className="island-header">
        <span className="island-title">Claude Code</span>
        <span className="island-kbd">&#x2318;T</span>
      </div>
      <div className="island-sessions">
        <div className="island-session active">
          <Dot color="#007AFF" />
          <span className="island-session-cwd">.../my-project</span>
          <span className="island-session-count">14</span>
        </div>
        <div className="island-session">
          <Dot color="#34C759" />
          <span className="island-session-cwd">.../api-server</span>
          <span className="island-session-count">6</span>
        </div>
      </div>
      <div className="island-log">
        <LogLine color="#34C759" bold="Glob" text="src/**/*.tsx" />
        <LogLine color="#34C759" bold="Read" text="src/components/header.tsx" />
        <LogLine color="#34C759" bold="Edit" text="Update navigation layout" />
        <LogLine color="#34C759" bold="Bash" text="npm run typecheck" />
        <LogLine color="#34C759" bold="Write" text="src/components/header.tsx" />
        <LogLine color="#007AFF" bold="" text="Thinking..." />
      </div>
    </div>
  );
}

export function MockupApproval() {
  return (
    <div className="island-expanded">
      <div className="island-header">
        <span className="island-title">Claude Code</span>
        <span className="island-kbd">&#x2318;T</span>
      </div>
      <div className="island-approval">
        <div className="island-approval-label">&#x26A0; Bash</div>
        <div className="island-approval-desc">npm run build &amp;&amp; npm test</div>
        <div className="island-approval-actions">
          <span className="island-btn island-btn-deny">Deny</span>
          <span className="island-btn island-btn-allow">Allow</span>
          <span className="island-btn island-btn-always">Always</span>
        </div>
      </div>
      <div className="island-log">
        <LogLine color="#34C759" bold="Read" text="package.json" />
        <LogLine color="#34C759" bold="Edit" text="src/main/index.ts" />
      </div>
    </div>
  );
}

export function MockupQuestion() {
  return (
    <div className="island-expanded">
      <div className="island-header">
        <span className="island-title">Claude Code</span>
        <span className="island-kbd">&#x2318;T</span>
      </div>
      <div className="island-question">
        <div className="island-question-header">APPROACH</div>
        <div className="island-question-text">Which design framework should we use?</div>
        <div className="island-question-options">
          <span className="island-chip island-chip-selected">Apple HIG</span>
          <span className="island-chip">Material</span>
          <span className="island-chip">Fluent</span>
        </div>
        <input className="island-question-input" placeholder="Or type your answer..." readOnly tabIndex={-1} />
        <span className="island-btn island-btn-submit" style={{ display: "inline-block", marginTop: "8px", width: 'auto' }}>Submit</span>
      </div>
    </div>
  );
}
