use std::{collections::HashMap, sync::atomic::{AtomicU64, Ordering}, time::{SystemTime, UNIX_EPOCH}};

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

static ID_COUNTER: AtomicU64 = AtomicU64::new(0);

use crate::{
  shared_types::{
    ApprovalDecision, ApprovalRequestData, HookEvent, HookResponse, HookSpecificOutput, LogEntry,
    PanelState, PermissionDecision, QuestionItem, QuestionOption, QuestionRequestData,
    SessionListItem, SessionSnapshot, TaskItem, ToolActivity,
  },
  tray,
  SharedState,
};

const MAX_RECENT_TOOLS: usize = 200;

#[derive(Default)]
pub struct HookRouter {
  sessions: Mutex<HashMap<String, SessionInstance>>,
  focused_session_id: Mutex<Option<String>>,
}

#[derive(Clone, Default)]
struct SessionInstance {
  is_active: bool,
  phase: String,
  session_id: Option<String>,
  cwd: Option<String>,
  transcript_path: Option<String>,
  start_time: Option<u64>,
  current_tool: Option<ToolActivity>,
  recent_tools: Vec<ToolActivity>,
  activity_log: Vec<LogEntry>,
  tasks: Vec<TaskItem>,
  last_event_time: Option<u64>,
  last_message: Option<String>,
  tool_count: u32,
}

impl HookRouter {
  pub async fn handle(&self, event: HookEvent, app: &AppHandle, shared: &SharedState) -> Result<HookResponse, String> {
    let session_id = event.session_id.clone();
    let hook_name = event.hook_event_name.clone();

    self.update_session(&event).await;
    eprintln!("[HookRouter] handle event={} tool={:?} session={}", event.hook_event_name, event.tool_name, event.session_id);
    self.auto_panel_for_event(&event, app, shared).await?;
    self.emit_state(app, shared).await?;

    match hook_name.as_str() {
      "PermissionRequest" => self.handle_permission_request(event, app, shared).await,
      "Notification" => {
        app.emit("notification", json!({ "message": event.notification_message.unwrap_or_else(|| "Notification".into()) }))
          .map_err(|e| e.to_string())?;
        Ok(HookResponse { hook_specific_output: None })
      }
      "Stop" | "SessionEnd" => {
        let _ = session_id;
        Ok(HookResponse { hook_specific_output: None })
      }
      _ => Ok(HookResponse { hook_specific_output: None }),
    }
  }

  pub async fn get_state(&self) -> SessionSnapshot {
    let focused = self.focused_session_id.lock().await.clone();
    let sessions = self.sessions.lock().await;
    if let Some(id) = focused {
      if let Some(session) = sessions.get(&id) {
        return session.snapshot();
      }
    }

    sessions
      .values()
      .max_by_key(|session| (phase_priority(&session.phase), session.last_event_time.unwrap_or(0)))
      .map(|session| session.snapshot())
      .unwrap_or_default()
  }

  pub async fn get_session_list(&self) -> Vec<SessionListItem> {
    let sessions = self.sessions.lock().await;
    let mut items: Vec<SessionListItem> = sessions
      .iter()
      .filter_map(|(id, session)| {
        if !session.is_active && session.phase == "idle" {
          return None;
        }
        Some(SessionListItem {
          session_id: id.clone(),
          cwd: session.cwd.clone(),
          phase: session.phase.clone(),
          last_message: session.last_message.clone(),
          tool_count: session.tool_count,
          is_active: session.is_active,
        })
      })
      .collect();

    items.sort_by_key(|item| std::cmp::Reverse((phase_priority(&item.phase), item.tool_count)));
    items
  }

  pub async fn switch_session(&self, session_id: String) -> Option<SessionSnapshot> {
    let snapshot = {
      let sessions = self.sessions.lock().await;
      sessions.get(&session_id).map(|session| session.snapshot())
    };

    if snapshot.is_some() {
      *self.focused_session_id.lock().await = Some(session_id);
    }

    snapshot
  }

  pub async fn get_transcript_path(&self, session_id: &str) -> Option<String> {
    let sessions = self.sessions.lock().await;
    sessions.get(session_id).and_then(|session| session.transcript_path.clone())
  }

  /// Check all active sessions for staleness (no events within timeout_ms). Returns true if any changed.
  pub async fn check_stale(&self, timeout_ms: u64) -> bool {
    let mut sessions = self.sessions.lock().await;
    let now = now_ms();
    let mut changed = false;

    for session in sessions.values_mut() {
      if !session.is_active {
        continue;
      }
      if session.phase != "thinking" && session.phase != "tool" {
        continue;
      }
      if let Some(last) = session.last_event_time {
        if now.saturating_sub(last) >= timeout_ms {
          session.phase = "done".into();
          session.last_message = Some("Session timed out".into());
          changed = true;
        }
      }
    }

    changed
  }

  /// Remove inactive+done sessions older than 5 minutes.
  pub async fn cleanup(&self) {
    let mut sessions = self.sessions.lock().await;
    let cutoff = now_ms().saturating_sub(5 * 60 * 1000);

    sessions.retain(|_id, session| {
      if !session.is_active && session.phase == "done" {
        session.last_event_time.unwrap_or(0) >= cutoff
      } else {
        true
      }
    });
  }

  async fn emit_state(&self, app: &AppHandle, shared: &SharedState) -> Result<(), String> {
    let snapshot = self.get_state().await;
    app.emit("state-update", &snapshot)
      .map_err(|e| e.to_string())?;
    app.emit("session-list", self.get_session_list().await)
      .map_err(|e| e.to_string())?;

    // Sync tray title: show status text only when island is hidden, clear otherwise
    let panel_state = shared.window_controller.current_state().await;
    if panel_state == PanelState::Hidden {
      let title = tray::compute_status_text(&snapshot);
      tray::update_tray_title(app, &title);
    } else {
      tray::update_tray_title(app, "");
    }
    // Also sync tray icon color
    tray::update_tray_icon(app, &snapshot.phase);

    Ok(())
  }

  async fn auto_panel_for_event(&self, event: &HookEvent, app: &AppHandle, shared: &SharedState) -> Result<(), String> {
    match event.hook_event_name.as_str() {
      "PermissionRequest" => shared.window_controller.show(app, PanelState::Expanded).await,
      "SessionStart" | "UserPromptSubmit" => {
        if shared.window_controller.should_auto_show().await {
          shared.window_controller.show(app, PanelState::Compact).await
        } else {
          Ok(())
        }
      }
      "PreToolUse" => {
        if shared.window_controller.should_auto_show().await && shared.window_controller.current_state().await == PanelState::Hidden {
          shared.window_controller.show(app, PanelState::Compact).await?;
        }
        shared.window_controller.schedule_collapse(app.clone(), PanelState::Compact, 5_000).await;
        shared.window_controller.schedule_hide(app.clone(), 120_000).await;
        Ok(())
      }
      "PostToolUse" => {
        shared.window_controller.schedule_collapse(app.clone(), PanelState::Compact, 5_000).await;
        Ok(())
      }
      "Notification" => {
        if shared.window_controller.should_auto_show().await {
          shared.window_controller.show(app, PanelState::Expanded).await?;
          shared.window_controller.schedule_collapse(app.clone(), PanelState::Compact, 3_000).await;
        }
        Ok(())
      }
      "Stop" | "SessionEnd" => {
        if shared.approval_manager.has_pending().await {
          Ok(())
        } else if shared.window_controller.current_state().await == PanelState::Expanded {
          shared.window_controller.show(app, PanelState::Compact).await
        } else {
          Ok(())
        }
      }
      _ => Ok(()),
    }
  }

  async fn handle_permission_request(&self, event: HookEvent, app: &AppHandle, shared: &SharedState) -> Result<HookResponse, String> {
    let id = event.tool_use_id.clone().unwrap_or_else(unique_id);
    let is_question = event.tool_name.as_deref() == Some("AskUserQuestion");

    // 自动批准：非问答类权限请求直接放行，跳过审批 UI
    if !is_question && shared.auto_approve.load(std::sync::atomic::Ordering::Relaxed) {
      eprintln!("[HookRouter] 自动批准已启用，自动放行 tool={:?}", event.tool_name);
      return Ok(build_permission_response(ApprovalDecision {
        behavior: "allow".into(),
        reason: Some("通过 CCIsland 自动批准".into()),
        updated_input: None,
      }));
    }

    if is_question {
      let questions = extract_questions(event.tool_input.clone().unwrap_or(Value::Null));
      let request = ApprovalRequestData {
        id: id.clone(),
        tool_name: "AskUserQuestion".into(),
        tool_input: event.tool_input.clone().unwrap_or(Value::Null),
        description: "Claude needs your input".into(),
        timestamp: now_ms(),
        session_id: event.session_id.clone(),
      };

      let receiver = shared.approval_manager.wait_for_decision(request).await;
      app.emit(
        "question-request",
        QuestionRequestData {
          id: id.clone(),
          questions: questions.clone(),
          session_id: event.session_id.clone(),
          timestamp: now_ms(),
        },
      )
      .map_err(|e| e.to_string())?;

      let decision = receiver.await.unwrap_or(ApprovalDecision {
        behavior: "allow".into(),
        reason: None,
        updated_input: None,
      });

      app.emit("approval-dismissed", json!({ "id": id }))
        .map_err(|e| e.to_string())?;
      if !shared.approval_manager.has_pending().await {
        let _ = shared.window_controller.show(app, PanelState::Compact).await;
      }
      return Ok(build_permission_response(decision));
    }

    let request = ApprovalRequestData {
      id: id.clone(),
      tool_name: event.tool_name.clone().unwrap_or_else(|| "Unknown".into()),
      tool_input: event.tool_input.clone().unwrap_or(Value::Null),
      description: describe_tool_input(event.tool_name.clone(), event.tool_input.clone()),
      timestamp: now_ms(),
      session_id: event.session_id.clone(),
    };

    let receiver = shared.approval_manager.wait_for_decision(request.clone()).await;
    app.emit("approval-request", request.clone())
      .map_err(|e| e.to_string())?;

    eprintln!("[HookRouter] waiting for approval id={}", id);
    let decision = match receiver.await {
      Ok(decision) => {
        eprintln!("[HookRouter] approval resolved id={} behavior={}", id, decision.behavior);
        decision
      }
      Err(error) => {
        eprintln!("[HookRouter] approval receiver dropped id={} error={}", id, error);
        ApprovalDecision {
          behavior: "allow".into(),
          reason: None,
          updated_input: None,
        }
      }
    };

    app.emit("approval-dismissed", json!({ "id": id }))
      .map_err(|e| e.to_string())?;
    if !shared.approval_manager.has_pending().await {
      let _ = shared.window_controller.show(app, PanelState::Compact).await;
    }

    Ok(build_permission_response(decision))
  }

  async fn update_session(&self, event: &HookEvent) {
    let mut sessions = self.sessions.lock().await;
    let session = sessions.entry(event.session_id.clone()).or_default();
    session.touch(event);
  }
}

impl SessionInstance {
  fn touch(&mut self, event: &HookEvent) {
    self.last_event_time = Some(now_ms());
    if self.session_id.is_none() {
      self.session_id = Some(event.session_id.clone());
    }
    if event.cwd.is_some() {
      self.cwd = event.cwd.clone();
    }
    if event.transcript_path.is_some() {
      self.transcript_path = event.transcript_path.clone();
    }

    match event.hook_event_name.as_str() {
      "SessionStart" => {
        self.is_active = true;
        self.phase = "thinking".into();
        self.start_time = Some(now_ms());
        self.current_tool = None;
        self.recent_tools.clear();
        self.activity_log.clear();
        self.tasks.clear();
        self.last_message = None;
        self.tool_count = 0;
      }
      "UserPromptSubmit" => {
        self.is_active = true;
        self.phase = "thinking".into();
        self.current_tool = None;
        self.recent_tools.clear();
        self.activity_log.clear();
        self.last_message = None;
        self.tool_count = 0;
      }
      "PreToolUse" => {
        self.is_active = true;
        self.phase = "tool".into();
        self.tool_count += 1;
        let tool_name = event.tool_name.clone().unwrap_or_else(|| "Unknown".into());
        let description = describe_tool_input(event.tool_name.clone(), event.tool_input.clone());
        self.activity_log.push(LogEntry { tool_name: tool_name.clone(), description: None });
        self.current_tool = Some(ToolActivity {
          id: event.tool_use_id.clone().unwrap_or_else(unique_id),
          tool_name,
          description,
          start_time: now_ms(),
          end_time: None,
          duration: None,
          status: "running".into(),
        });
      }
      "PostToolUse" => {
        self.phase = "thinking".into();
        if self.current_tool.as_ref().map(|tool| tool.id.clone()) == event.tool_use_id {
          if let Some(current) = self.current_tool.as_mut() {
            current.end_time = Some(now_ms());
            current.duration = current.end_time.map(|end_time| ((end_time - current.start_time) as f64) / 1000.0);
            current.status = "completed".into();
            self.activity_log.push(LogEntry {
              tool_name: current.tool_name.clone(),
              description: Some(current.description.clone()),
            });
            self.recent_tools.push(current.clone());
            if self.recent_tools.len() > MAX_RECENT_TOOLS {
              self.recent_tools.remove(0);
            }
          }
          self.current_tool = None;
        }
      }
      "PermissionRequest" => {
        self.phase = "tool".into();
      }
      "TaskCreated" | "TaskCompleted" => {
        if let Some(tasks) = event.tool_input.as_ref().and_then(|input| input.get("todos")).and_then(|todos| todos.as_array()) {
          self.tasks = tasks.iter().enumerate().map(|(index, task)| TaskItem {
            id: task.get("id").and_then(|v| v.as_str()).map(str::to_string).unwrap_or_else(|| format!("task-{}-{}", now_ms(), index)),
            content: task.get("content").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            active_form: task.get("activeForm").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            status: task.get("status").and_then(|v| v.as_str()).unwrap_or("pending").to_string(),
          }).collect();
        }
      }
      "Stop" => {
        self.phase = "done".into();
        self.last_message = event.last_assistant_message.as_ref().and_then(|message| {
          message
            .lines()
            .map(|line| line.trim())
            .find(|line| !line.is_empty())
            .map(|line| line.chars().take(80).collect::<String>())
        });
      }
      "SessionEnd" => {
        self.is_active = false;
        self.phase = "done".into();
        self.current_tool = None;
      }
      _ => {}
    }
  }

  fn snapshot(&self) -> SessionSnapshot {
    SessionSnapshot {
      is_active: self.is_active,
      phase: if self.phase.is_empty() { "idle".into() } else { self.phase.clone() },
      session_id: self.session_id.clone(),
      cwd: self.cwd.clone(),
      start_time: self.start_time,
      current_tool: self.current_tool.clone(),
      recent_tools: self.recent_tools.clone(),
      activity_log: self.activity_log.clone(),
      tasks: self.tasks.clone(),
      last_message: self.last_message.clone(),
    }
  }
}

fn build_permission_response(decision: ApprovalDecision) -> HookResponse {
  HookResponse {
    hook_specific_output: Some(HookSpecificOutput {
      hook_event_name: "PermissionRequest".into(),
      decision: Some(PermissionDecision {
        behavior: decision.behavior,
        message: decision.reason,
        interrupt: false,
      }),
      updated_input: decision.updated_input,
    }),
  }
}

pub(crate) fn extract_questions(input: Value) -> Vec<QuestionItem> {
  input
    .get("questions")
    .and_then(|value| value.as_array())
    .map(|questions| {
      questions.iter().map(|question| QuestionItem {
        question: question.get("question").and_then(|value| value.as_str()).unwrap_or("").to_string(),
        header: question.get("header").and_then(|value| value.as_str()).map(str::to_string),
        options: question
          .get("options")
          .and_then(|value| value.as_array())
          .map(|options| {
            options.iter().map(|option| QuestionOption {
              label: option.get("label").and_then(|value| value.as_str()).unwrap_or("").to_string(),
              description: option.get("description").and_then(|value| value.as_str()).map(str::to_string),
            }).collect()
          })
          .unwrap_or_default(),
        multi_select: question.get("multiSelect").and_then(|value| value.as_bool()).unwrap_or(false),
      }).collect()
    })
    .unwrap_or_default()
}

fn describe_tool_input(tool_name: Option<String>, tool_input: Option<Value>) -> String {
  let payload = tool_input.unwrap_or(Value::Null);
  match tool_name.as_deref() {
    Some("AskUserQuestion") => "Claude needs your input".into(),
    Some("Bash") => {
      let cmd = payload.get("command").and_then(|v| v.as_str()).unwrap_or("");
      let truncated: String = cmd.chars().take(100).collect();
      if cmd.len() > 100 { format!("$ {}...", truncated) } else { format!("$ {}", truncated) }
    }
    Some("Read") => {
      let path = payload.get("file_path").and_then(|v| v.as_str()).unwrap_or("");
      shorten_path(path)
    }
    Some("Write") => {
      let path = payload.get("file_path").and_then(|v| v.as_str()).unwrap_or("");
      format!("write {}", shorten_path(path))
    }
    Some("Edit") => {
      let path = payload.get("file_path").and_then(|v| v.as_str()).unwrap_or("");
      format!("edit {}", shorten_path(path))
    }
    Some("Glob") => {
      let pattern = payload.get("pattern").and_then(|v| v.as_str()).unwrap_or("");
      format!("glob {}", pattern)
    }
    Some("Grep") => {
      let pattern = payload.get("pattern").and_then(|v| v.as_str()).unwrap_or("");
      let path = payload.get("path").and_then(|v| v.as_str()).unwrap_or("");
      if path.is_empty() {
        format!("grep \"{}\"", pattern)
      } else {
        format!("\"{}\" in {}", pattern, shorten_path(path))
      }
    }
    Some("WebFetch") => {
      let url = payload.get("url").and_then(|v| v.as_str()).unwrap_or("");
      let truncated: String = url.chars().take(80).collect();
      if url.len() > 80 { format!("fetch {}...", truncated) } else { format!("fetch {}", truncated) }
    }
    Some("WebSearch") => {
      let query = payload.get("query").and_then(|v| v.as_str()).unwrap_or("");
      format!("search \"{}\"", query)
    }
    Some("TodoWrite") => "update task list".into(),
    Some("Agent") => {
      let desc = payload.get("description").and_then(|v| v.as_str()).unwrap_or("subagent");
      desc.to_string()
    }
    Some(name) => {
      if payload.is_null() {
        name.to_string()
      } else {
        let serialized = payload.to_string();
        if serialized.len() > 100 {
          format!("{} {}...", name, &serialized[..100])
        } else {
          format!("{} {}", name, serialized)
        }
      }
    }
    None => "Unknown tool".into(),
  }
}

fn shorten_path(path: &str) -> String {
  let path = match std::env::var("HOME") {
    Ok(home) => path.strip_prefix(&home).map(|rest| format!("~{}", rest)).unwrap_or_else(|| path.to_string()),
    Err(_) => path.to_string(),
  };
  let parts: Vec<&str> = path.split('/').collect();
  if parts.len() > 3 {
    format!(".../{}", parts[parts.len()-2..].join("/"))
  } else {
    path
  }
}

fn phase_priority(phase: &str) -> u8 {
  match phase {
    "tool" => 5,
    "thinking" => 4,
    "responding" => 3,
    "done" => 2,
    _ => 1,
  }
}

fn now_ms() -> u64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_millis() as u64)
    .unwrap_or(0)
}

fn unique_id() -> String {
  format!("id-{}-{}", now_ms(), ID_COUNTER.fetch_add(1, Ordering::Relaxed))
}
