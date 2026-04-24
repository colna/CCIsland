"use client";

import { useEffect, useState } from "react";

type Phase =
  | "idle"
  | "active"
  | "thinking"
  | "done"
  | "expanded-log"
  | "approval"
  | "question";

const PHASES: { id: Phase; duration: number }[] = [
  { id: "idle", duration: 2500 },
  { id: "active", duration: 2500 },
  { id: "thinking", duration: 2000 },
  { id: "done", duration: 2500 },
  { id: "expanded-log", duration: 3500 },
  { id: "approval", duration: 3500 },
  { id: "question", duration: 3500 },
];

export function IslandDemo() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const { duration } = PHASES[index];
    const fadeOut = setTimeout(() => setVisible(false), duration - 300);
    const next = setTimeout(() => {
      setIndex((i) => (i + 1) % PHASES.length);
      setVisible(true);
    }, duration);
    return () => {
      clearTimeout(fadeOut);
      clearTimeout(next);
    };
  }, [index]);

  const phase = PHASES[index].id;
  const isCompact = ["idle", "active", "thinking", "done"].includes(phase);

  return (
    <div className="island-demo">
      <div
        className={`island-frame ${visible ? "island-visible" : "island-hidden"}`}
      >
        {isCompact ? <CompactPill phase={phase} /> : <ExpandedPanel phase={phase} />}
      </div>
    </div>
  );
}

function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <span
      className={`island-dot ${pulse ? "island-dot-pulse" : ""}`}
      style={{ background: color }}
    />
  );
}

function CompactPill({ phase }: { phase: Phase }) {
  const configs: Record<string, { color: string; text: string; pulse?: boolean; close?: boolean }> = {
    idle: { color: "#4a4a50", text: "Claude Code" },
    active: { color: "#007AFF", text: "Read: src/renderer/styles.less", close: true },
    thinking: { color: "#007AFF", text: "Thinking...", pulse: true },
    done: { color: "#34C759", text: "Task completed successfully" },
  };
  const c = configs[phase] || configs.idle;
  return (
    <div className="island-pill">
      <Dot color={c.color} pulse={c.pulse} />
      <span className="island-pill-text">{c.text}</span>
      {c.close && <span className="island-pill-close">&times;</span>}
    </div>
  );
}

function ExpandedPanel({ phase }: { phase: Phase }) {
  return (
    <div className="island-expanded">
      <div className="island-header">
        <span className="island-title">Claude Code</span>
        <span className="island-kbd">&#x2318;T</span>
      </div>
      {phase === "expanded-log" && <ActivityLog />}
      {phase === "approval" && <ApprovalCard />}
      {phase === "question" && <QuestionCard />}
    </div>
  );
}

function ActivityLog() {
  return (
    <>
      <div className="island-sessions">
        <div className="island-session active">
          <Dot color="#007AFF" />
          <span className="island-session-cwd">.../cc-island</span>
          <span className="island-session-count">12</span>
        </div>
        <div className="island-session">
          <Dot color="#34C759" />
          <span className="island-session-cwd">.../DataAnalyst</span>
          <span className="island-session-count">8</span>
        </div>
      </div>
      <div className="island-log">
        <LogLine color="#34C759" bold="Glob" text="src/renderer/**/*.less" />
        <LogLine color="#34C759" bold="Read" text="src/renderer/styles.less" />
        <LogLine color="#34C759" bold="Edit" text="Apply Apple design tokens" />
        <LogLine color="#34C759" bold="Bash" text="npx lessc styles.less" />
        <LogLine color="#34C759" bold="Write" text="src/renderer/app.ts" />
        <LogLine color="#007AFF" bold="" text="Thinking..." />
      </div>
    </>
  );
}

function LogLine({ color, bold, text }: { color: string; bold: string; text: string }) {
  return (
    <div className="island-log-line">
      <Dot color={color} />
      {bold && <span className="island-log-bold">{bold}</span>}
      <span className="island-log-text">{text}</span>
    </div>
  );
}

function ApprovalCard() {
  return (
    <>
      <div className="island-approval">
        <div className="island-approval-label">&#x26A0; Bash</div>
        <div className="island-approval-desc">npm run build &amp;&amp; npm test</div>
        <div className="island-approval-actions">
          <button className="island-btn island-btn-deny" type="button">Deny</button>
          <button className="island-btn island-btn-allow" type="button">Allow</button>
          <button className="island-btn island-btn-always" type="button">Always</button>
        </div>
      </div>
      <div className="island-log">
        <LogLine color="#34C759" bold="Read" text="package.json" />
        <LogLine color="#34C759" bold="Edit" text="src/main/index.ts" />
      </div>
    </>
  );
}

function QuestionCard() {
  return (
    <div className="island-question">
      <div className="island-question-header">APPROACH</div>
      <div className="island-question-text">Which design framework should we use?</div>
      <div className="island-question-options">
        <span className="island-chip island-chip-selected">Apple HIG</span>
        <span className="island-chip">Material</span>
        <span className="island-chip">Fluent</span>
      </div>
      <input
        className="island-question-input"
        placeholder="Or type your answer..."
        readOnly
        aria-label="Answer input"
      />
      <button className="island-btn island-btn-submit" type="button">Submit</button>
    </div>
  );
}
