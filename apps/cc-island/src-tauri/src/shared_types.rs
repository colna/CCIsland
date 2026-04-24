use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use serde_json::Value;

// ── Error type ──

#[derive(Debug, thiserror::Error)]
pub enum AppError {
  #[error("IO error: {0}")]
  Io(#[from] std::io::Error),

  #[error("JSON error: {0}")]
  Json(#[from] serde_json::Error),

  #[error("Window error: {0}")]
  Window(String),

  #[error("Tauri error: {0}")]
  Tauri(#[from] tauri::Error),
}

impl Serialize for AppError {
  fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
    serializer.serialize_str(&self.to_string())
  }
}

// ── Enums ──

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum Phase {
  #[default]
  Idle,
  Thinking,
  Tool,
  Done,
  Responding,
}

impl Phase {
  pub fn as_str(&self) -> &'static str {
    match self {
      Phase::Idle => "idle",
      Phase::Thinking => "thinking",
      Phase::Tool => "tool",
      Phase::Done => "done",
      Phase::Responding => "responding",
    }
  }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Behavior {
  Allow,
  Deny,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ToolStatus {
  Running,
  Completed,
}

// ── Utilities ──

pub fn now_ms() -> u64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|d| d.as_millis() as u64)
    .unwrap_or(0)
}

// ── Hook types ──

#[derive(Debug, Clone, Deserialize)]
pub struct HookEvent {
  pub session_id: String,
  pub transcript_path: Option<String>,
  pub cwd: Option<String>,
  pub permission_mode: Option<String>,
  pub hook_event_name: String,
  pub tool_name: Option<String>,
  pub tool_input: Option<Value>,
  pub tool_response: Option<Value>,
  pub tool_use_id: Option<String>,
  pub agent_id: Option<String>,
  pub agent_type: Option<String>,
  pub notification_message: Option<String>,
  pub last_assistant_message: Option<String>,
  pub stop_hook_active: Option<bool>,
  pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookResponse {
  #[serde(rename = "hookSpecificOutput", skip_serializing_if = "Option::is_none")]
  pub hook_specific_output: Option<HookSpecificOutput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookSpecificOutput {
  #[serde(rename = "hookEventName")]
  pub hook_event_name: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub decision: Option<PermissionDecision>,
  #[serde(rename = "updatedInput", skip_serializing_if = "Option::is_none")]
  pub updated_input: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionDecision {
  pub behavior: Behavior,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub message: Option<String>,
  #[serde(default)]
  pub interrupt: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApprovalDecision {
  pub behavior: Behavior,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub reason: Option<String>,
  #[serde(rename = "updatedInput", skip_serializing_if = "Option::is_none")]
  pub updated_input: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovalRequestData {
  pub id: String,
  pub tool_name: String,
  pub tool_input: Value,
  pub description: String,
  pub timestamp: u64,
  pub session_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestionOption {
  pub label: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionItem {
  pub question: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub header: Option<String>,
  pub options: Vec<QuestionOption>,
  pub multi_select: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionRequestData {
  pub id: String,
  pub questions: Vec<QuestionItem>,
  pub session_id: String,
  pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolActivity {
  pub id: String,
  pub tool_name: String,
  pub description: String,
  pub start_time: u64,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub end_time: Option<u64>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub duration: Option<f64>,
  pub status: ToolStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskItem {
  pub id: String,
  pub content: String,
  pub active_form: String,
  pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
  pub tool_name: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSnapshot {
  pub is_active: bool,
  pub phase: Phase,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub session_id: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub cwd: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub start_time: Option<u64>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub current_tool: Option<ToolActivity>,
  pub recent_tools: Vec<ToolActivity>,
  pub activity_log: Vec<LogEntry>,
  pub tasks: Vec<TaskItem>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub last_message: Option<String>,
}

impl Default for SessionSnapshot {
  fn default() -> Self {
    Self {
      is_active: false,
      phase: Phase::Idle,
      session_id: None,
      cwd: None,
      start_time: None,
      current_tool: None,
      recent_tools: vec![],
      activity_log: vec![],
      tasks: vec![],
      last_message: None,
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionListItem {
  pub session_id: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub cwd: Option<String>,
  pub phase: Phase,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub last_message: Option<String>,
  pub tool_count: u32,
  pub is_active: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PanelState {
  Hidden,
  Compact,
  Expanded,
}

impl PanelState {
  pub fn as_str(&self) -> &'static str {
    match self {
      PanelState::Hidden => "hidden",
      PanelState::Compact => "compact",
      PanelState::Expanded => "expanded",
    }
  }
}
