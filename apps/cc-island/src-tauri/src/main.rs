mod approval_manager;
mod hook_installer;
mod hook_router;
mod hook_server;
mod shared_types;
mod tray;
mod window_state;

use std::{fs, process::Command, sync::{atomic::{AtomicBool, AtomicU16, Ordering}, Arc}, time::Duration};

use approval_manager::ApprovalManager;
use hook_router::extract_questions;
use serde::Deserialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager, State};
use window_state::WindowController;

use crate::shared_types::{AppError, ApprovalDecision, Behavior, PanelState, Phase};

pub struct SharedState {
  pub approval_manager: ApprovalManager,
  pub hook_router: hook_router::HookRouter,
  pub window_controller: Arc<WindowController>,
  pub server_port: AtomicU16,
  pub auto_approve: AtomicBool,
}

impl Default for SharedState {
  fn default() -> Self {
    Self {
      approval_manager: ApprovalManager::default(),
      hook_router: hook_router::HookRouter::default(),
      window_controller: Arc::new(WindowController::default()),
      server_port: AtomicU16::new(0),
      auto_approve: AtomicBool::new(false),
    }
  }
}

impl SharedState {
  pub fn effective_port(&self) -> u16 {
    let p = self.server_port.load(Ordering::Relaxed);
    if p == 0 { hook_server::PORT } else { p }
  }
}

#[derive(Deserialize)]
struct TogglePanelArgs {
  state: PanelState,
}

#[derive(Deserialize)]
struct ApproveDecisionArgs {
  id: String,
  behavior: String,
  reason: Option<String>,
  #[serde(rename = "toolName")]
  tool_name: Option<String>,
}

#[derive(Deserialize)]
struct AnswerQuestionArgs {
  id: String,
  answers: serde_json::Value,
  #[serde(rename = "originalQuestions")]
  original_questions: serde_json::Value,
}

#[derive(Deserialize)]
struct SessionArgs {
  #[serde(rename = "sessionId")]
  session_id: String,
}

#[derive(Deserialize, Default)]
struct ChatHistoryArgs {
  #[serde(rename = "sessionId")]
  session_id: Option<String>,
}

#[derive(Deserialize)]
struct AutoApproveArgs {
  enabled: bool,
}

#[tauri::command]
async fn approve_decision(
  app: AppHandle,
  state: State<'_, Arc<SharedState>>,
  args: ApproveDecisionArgs,
) -> Result<serde_json::Value, AppError> {
  if args.behavior == "allowAlways" {
    if let Some(tool_name) = args.tool_name.as_deref() {
      let _ = add_allowed_tool(tool_name)?;
    }
  }

  let behavior = if args.behavior == "deny" { Behavior::Deny } else { Behavior::Allow };
  let resolved = state.approval_manager.resolve(
    &args.id,
    ApprovalDecision {
      behavior,
      reason: args.reason,
      updated_input: None,
    },
  ).await;

  app.emit("approval-dismissed", json!({ "id": args.id }))?;

  if !state.approval_manager.has_pending().await {
    let _ = state.window_controller.show(&app, PanelState::Compact).await;
  }

  Ok(json!({ "resolved": resolved, "toolName": args.tool_name }))
}

#[tauri::command]
async fn answer_question(
  app: AppHandle,
  state: State<'_, Arc<SharedState>>,
  args: AnswerQuestionArgs,
) -> Result<serde_json::Value, AppError> {
  let updated_input = json!({
    "questions": args.original_questions,
    "answers": args.answers,
  });

  let resolved = state.approval_manager.resolve(
    &args.id,
    ApprovalDecision {
      behavior: Behavior::Allow,
      reason: None,
      updated_input: Some(updated_input),
    },
  ).await;

  app.emit("approval-dismissed", json!({ "id": args.id }))?;

  if !state.approval_manager.has_pending().await {
    let _ = state.window_controller.show(&app, PanelState::Compact).await;
  }

  Ok(json!({ "resolved": resolved }))
}

#[tauri::command]
async fn get_state(app: AppHandle, state: State<'_, Arc<SharedState>>) -> Result<shared_types::SessionSnapshot, AppError> {
  let snapshot = state.hook_router.get_state().await;
  let pending_requests = state.approval_manager.pending_requests().await;
  let panel_state = state.window_controller.current_state().await;

  app.emit("panel-state", json!({ "state": panel_state.as_str() }))?;
  app.emit("session-list", state.hook_router.get_session_list().await)?;

  for request in pending_requests {
    if request.tool_name == "AskUserQuestion" {
      app.emit(
        "question-request",
        shared_types::QuestionRequestData {
          id: request.id.clone(),
          questions: extract_questions(Some(&request.tool_input)),
          session_id: request.session_id.clone(),
          timestamp: request.timestamp,
        },
      )?;
    } else {
      app.emit("approval-request", request)?;
    }
  }

  Ok(snapshot)
}

#[tauri::command]
async fn toggle_panel(
  app: AppHandle,
  state: State<'_, Arc<SharedState>>,
  args: TogglePanelArgs,
) -> Result<(), AppError> {
  match args.state {
    PanelState::Hidden => state.window_controller.dismiss(&app).await,
    PanelState::Compact => state.window_controller.show(&app, PanelState::Compact).await,
    PanelState::Expanded => state.window_controller.show(&app, PanelState::Expanded).await,
  }
}

#[tauri::command]
async fn switch_session(
  app: AppHandle,
  state: State<'_, Arc<SharedState>>,
  args: SessionArgs,
) -> Result<serde_json::Value, AppError> {
  let session_id = args.session_id;
  let snapshot = state.hook_router.switch_session(session_id.clone()).await;
  if let Some(snapshot) = snapshot {
    app.emit("state-update", &snapshot)?;
    app.emit("session-list", state.hook_router.get_session_list().await)?;

    // 一并返回 chat messages, 避免前端再发 getChatHistory 造成双倍 round-trip
    let messages = match state.hook_router.get_transcript_path(&session_id).await {
      Some(transcript_path) => tokio::task::spawn_blocking(move || parse_transcript(&transcript_path, usize::MAX))
        .await
        .map_err(|e| AppError::Window(e.to_string()))?
        .unwrap_or_default(),
      None => vec![],
    };

    Ok(json!({
      "snapshot": snapshot,
      "messages": messages,
    }))
  } else {
    Ok(serde_json::Value::Null)
  }
}

#[tauri::command]
async fn jump_to_terminal() -> Result<serde_json::Value, AppError> {
  jump_to_terminal_impl()
}

#[tauri::command]
async fn get_chat_history(
  state: State<'_, Arc<SharedState>>,
  args: ChatHistoryArgs,
) -> Result<Vec<serde_json::Value>, AppError> {
  let session_id = match args.session_id {
    Some(id) => Some(id),
    None => state.hook_router.get_state().await.session_id,
  };

  let Some(session_id) = session_id else {
    return Ok(vec![]);
  };

  let transcript_path = state.hook_router.get_transcript_path(&session_id).await;
  let Some(transcript_path) = transcript_path else {
    return Ok(vec![]);
  };

  tokio::task::spawn_blocking(move || parse_transcript(&transcript_path, usize::MAX))
    .await
    .map_err(|e| AppError::Window(e.to_string()))?
}

#[tauri::command]
async fn set_auto_approve(
  app: AppHandle,
  state: State<'_, Arc<SharedState>>,
  args: AutoApproveArgs,
) -> Result<bool, AppError> {
  state.auto_approve.store(args.enabled, Ordering::Relaxed);
  app.emit("auto-approve-changed", json!({ "enabled": args.enabled }))?;
  eprintln!("[CCIsland] auto_approve 已设置为 {}", args.enabled);
  Ok(args.enabled)
}

#[tauri::command]
async fn get_auto_approve(
  state: State<'_, Arc<SharedState>>,
) -> Result<bool, AppError> {
  Ok(state.auto_approve.load(Ordering::Relaxed))
}

fn add_allowed_tool(tool_name: &str) -> Result<bool, AppError> {
  let path = hook_installer::settings_path()?;
  let content = fs::read_to_string(&path).unwrap_or_else(|_| "{}".into());
  let mut settings: Value = serde_json::from_str(&content).unwrap_or_else(|_| json!({}));

  if !settings.is_object() {
    settings = json!({});
  }
  if settings.get("permissions").and_then(|value| value.as_object()).is_none() {
    settings["permissions"] = json!({});
  }
  if settings["permissions"].get("allow").and_then(|value| value.as_array()).is_none() {
    settings["permissions"]["allow"] = json!([]);
  }

  let allow = settings["permissions"]["allow"]
    .as_array_mut()
    .ok_or_else(|| AppError::Window("permissions.allow is not an array".into()))?;

  if allow.iter().any(|value| value.as_str() == Some(tool_name)) {
    return Ok(false);
  }

  allow.push(Value::String(tool_name.to_string()));
  if let Some(parent) = path.parent() {
    fs::create_dir_all(parent)?;
  }
  fs::write(&path, serde_json::to_vec_pretty(&settings)?)?;
  Ok(true)
}

fn parse_transcript(transcript_path: &str, limit: usize) -> Result<Vec<serde_json::Value>, AppError> {
  let raw = fs::read_to_string(transcript_path)?;
  let mut messages = Vec::new();

  for line in raw.lines().filter(|line| !line.trim().is_empty()) {
    let Ok(entry) = serde_json::from_str::<Value>(line) else {
      continue;
    };
    let message = entry.get("message").cloned().unwrap_or_else(|| entry.clone());
    let role = message.get("role").and_then(|value| value.as_str())
      .or_else(|| entry.get("type").and_then(|value| value.as_str()));

    let normalized_role = match role {
      Some("user") | Some("human") => Some("user"),
      Some("assistant") => Some("assistant"),
      _ => None,
    };

    let Some(role) = normalized_role else {
      continue;
    };

    let content = extract_text_content(&message);
    if content.is_empty() {
      continue;
    }

    messages.push(json!({
      "role": role,
      "content": content,
      "timestamp": entry.get("timestamp").cloned().unwrap_or(Value::Null),
    }));
  }

  let start = messages.len().saturating_sub(limit);
  Ok(messages.into_iter().skip(start).collect())
}

// ── macOS: AppleScript-based terminal activation ──

#[cfg(target_os = "macos")]
const TERMINALS_MAC: &[(&str, &str, &str)] = &[
  ("iTerm2", "com.googlecode.iterm2", "tell application \"iTerm\" to activate"),
  ("Terminal", "com.apple.Terminal", "tell application \"Terminal\" to activate"),
  ("VS Code", "com.microsoft.VSCode", "tell application \"Visual Studio Code\" to activate"),
  ("Cursor", "todesktop.com.Cursor", "tell application \"Cursor\" to activate"),
  ("Windsurf", "com.codeium.windsurf", "tell application \"Windsurf\" to activate"),
  ("Ghostty", "com.mitchellh.ghostty", "tell application \"Ghostty\" to activate"),
  ("Warp", "dev.warp.Warp-Stable", "tell application \"Warp\" to activate"),
];

#[cfg(target_os = "macos")]
fn run_osascript(script: &str) -> bool {
  Command::new("osascript")
    .arg("-e")
    .arg(script)
    .output()
    .map(|output| output.status.success())
    .unwrap_or(false)
}

#[cfg(target_os = "macos")]
fn is_running(bundle_id: &str) -> bool {
  Command::new("osascript")
    .arg("-e")
    .arg(format!(
      "tell application \"System Events\" to (name of processes whose bundle identifier is \"{}\") as text",
      bundle_id
    ))
    .output()
    .map(|output| output.status.success() && !output.stdout.is_empty() && output.stdout.iter().any(|&b| b != b'\n' && b != b'\r'))
    .unwrap_or(false)
}

// ── Windows: PowerShell-based terminal activation ──

#[cfg(target_os = "windows")]
const TERMINALS_WIN: &[(&str, &str)] = &[
  ("Windows Terminal", "WindowsTerminal"),
  ("VS Code", "Code"),
  ("Cursor", "Cursor"),
  ("Windsurf", "Windsurf"),
  ("PowerShell", "powershell"),
  ("pwsh", "pwsh"),
  ("cmd", "cmd"),
];

#[cfg(target_os = "windows")]
fn win_process_running(process_name: &str) -> bool {
  Command::new("powershell")
    .args(["-NoProfile", "-Command",
      &format!("Get-Process -Name '{}' -ErrorAction SilentlyContinue | Select-Object -First 1", process_name)])
    .output()
    .map(|output| output.status.success() && !output.stdout.is_empty())
    .unwrap_or(false)
}

#[cfg(target_os = "windows")]
fn win_activate(process_name: &str) -> bool {
  let script = format!(
    "$p = Get-Process -Name '{}' -ErrorAction SilentlyContinue | Select-Object -First 1; \
     if ($p) {{ \
       $sig = '[DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr hWnd);'; \
       Add-Type -MemberDefinition $sig -Name WinAPI -Namespace Temp -ErrorAction SilentlyContinue; \
       [Temp.WinAPI]::SetForegroundWindow($p.MainWindowHandle) | Out-Null; \
       $true \
     }} else {{ $false }}",
    process_name
  );
  Command::new("powershell")
    .args(["-NoProfile", "-Command", &script])
    .output()
    .map(|output| output.status.success())
    .unwrap_or(false)
}

// ── Platform dispatch ──

#[expect(clippy::unnecessary_wraps)]
fn jump_to_terminal_impl() -> Result<serde_json::Value, AppError> {
  #[cfg(target_os = "macos")]
  {
    for (name, bundle_id, script) in TERMINALS_MAC {
      if is_running(bundle_id) && run_osascript(script) {
        return Ok(json!({ "success": true, "app": name }));
      }
    }
    // Fallback: open Terminal.app
    if run_osascript(TERMINALS_MAC[1].2) {
      return Ok(json!({ "success": true, "app": "Terminal" }));
    }
    Ok(json!({ "success": false, "reason": "not-found" }))
  }

  #[cfg(target_os = "windows")]
  {
    for (name, process_name) in TERMINALS_WIN {
      if win_process_running(process_name) && win_activate(process_name) {
        return Ok(json!({ "success": true, "app": name }));
      }
    }
    Ok(json!({ "success": false, "reason": "not-found" }))
  }

  #[cfg(not(any(target_os = "macos", target_os = "windows")))]
  {
    Ok(json!({ "success": false, "reason": "unsupported-platform" }))
  }
}

fn extract_text_content(message: &Value) -> String {
  if let Some(content) = message.get("content").and_then(|value| value.as_str()) {
    return content.to_string();
  }

  message
    .get("content")
    .and_then(|value| value.as_array())
    .map(|blocks| {
      blocks.iter()
        .filter(|block| block.get("type").and_then(|value| value.as_str()) == Some("text"))
        .filter_map(|block| block.get("text").and_then(|value| value.as_str()))
        .collect::<Vec<_>>()
        .join("\n")
    })
    .unwrap_or_default()
}

/// Spawn background timers for stale session detection, session cleanup, and hook re-installation.
fn spawn_background_timers(app: AppHandle, shared: Arc<SharedState>) {
  // Stale session detection: every 15s, mark sessions with >90s no events as done
  let app_clone = app.clone();
  let shared_clone = shared.clone();
  tauri::async_runtime::spawn(async move {
    let mut interval = tokio::time::interval(Duration::from_secs(15));
    loop {
      interval.tick().await;
      if shared_clone.hook_router.check_stale(90_000).await {
        eprintln!("[CCIsland] Stale session detected — marking done");
        let snapshot = shared_clone.hook_router.get_state().await;
        let _ = app_clone.emit("state-update", &snapshot);
        let _ = app_clone.emit("session-list", shared_clone.hook_router.get_session_list().await);
        tray::update_tray_icon(&app_clone, Phase::Done);
      }
      // Cleanup stale approvals (2 min timeout) — handles disconnected clients
      let stale_ids = shared_clone.approval_manager.cleanup_stale(120_000).await;
      for id in stale_ids {
        let _ = app_clone.emit("approval-dismissed", json!({ "id": id }));
      }
    }
  });

  // Session cleanup: every 60s, remove inactive+done sessions
  let shared_clone = shared.clone();
  tauri::async_runtime::spawn(async move {
    let mut interval = tokio::time::interval(Duration::from_secs(60));
    loop {
      interval.tick().await;
      shared_clone.hook_router.cleanup().await;
    }
  });

  // Hook re-installation: every 30s, check if hooks are still installed
  let shared_clone = shared.clone();
  tauri::async_runtime::spawn(async move {
    let mut interval = tokio::time::interval(Duration::from_secs(30));
    loop {
      interval.tick().await;
      let port = shared_clone.effective_port();
      if port == 0 { continue; }
      if !hook_installer::is_installed(port) {
        eprintln!("[CCIsland] Hooks missing — re-installing");
        let _ = hook_installer::install_hooks(port);
      }
    }
  });

  // Tray icon phase sync + title sync: every 5s
  let app_clone = app;
  let shared_clone = shared;
  tauri::async_runtime::spawn(async move {
    let mut interval = tokio::time::interval(Duration::from_secs(5));
    loop {
      interval.tick().await;
      let snapshot = shared_clone.hook_router.get_state().await;
      tray::update_tray_icon(&app_clone, snapshot.phase);

      // Sync tray title: show status only when island is hidden
      let panel_state = shared_clone.window_controller.current_state().await;
      if panel_state == PanelState::Hidden {
        let title = tray::compute_status_text(&snapshot);
        tray::update_tray_title(&app_clone, &title);
      } else {
        tray::update_tray_title(&app_clone, "");
      }
    }
  });
}

fn main() {
  let shared = Arc::new(SharedState::default());
  let shared_for_exit = shared.clone();

  tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {
      eprintln!("[CCIsland] Another instance attempted to start — blocked");
    }))
    .manage(shared.clone())
    .setup(move |app| {
      // Hide main window initially
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
      }

      // Hide dock icon on macOS (LSUIElement in bundle config handles this for release builds)
      #[cfg(target_os = "macos")]
      {
        app.set_activation_policy(tauri::ActivationPolicy::Accessory);
      }

      // Setup system tray
      let app_handle = app.handle().clone();
      if let Err(e) = tray::setup_tray(&app_handle, shared.clone()) {
        eprintln!("[CCIsland] Failed to setup tray: {}", e);
      }

      // Spawn hook server
      let app_handle = app.handle().clone();
      let shared_for_server = shared.clone();
      let shared_for_timers = shared;
      tauri::async_runtime::spawn(async move {
        match hook_server::spawn_hook_server(app_handle.clone(), shared_for_server.clone()).await {
          Ok(port) => {
            eprintln!("[CCIsland] Hook server on port {}", port);
            // Auto-install hooks
            if !hook_installer::is_installed(port) {
              if let Err(e) = hook_installer::install_hooks(port) {
                eprintln!("[CCIsland] Failed to install hooks: {}", e);
              } else {
                eprintln!("[CCIsland] Hooks auto-installed");
              }
            }
          }
          Err(e) => {
            eprintln!("[CCIsland] Failed to start hook server: {}", e);
          }
        }

        // Start background timers after server is ready
        spawn_background_timers(app_handle, shared_for_timers);
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      approve_decision,
      answer_question,
      get_state,
      toggle_panel,
      switch_session,
      jump_to_terminal,
      get_chat_history,
      set_auto_approve,
      get_auto_approve,
    ])
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(move |_app, event| {
      if let tauri::RunEvent::Exit = event {
        let port = shared_for_exit.effective_port();
        if port > 0 {
          let _ = hook_installer::remove_hooks(port);
          eprintln!("[CCIsland] Hooks removed on exit");
        }
      }
    });
}

#[cfg(test)]
mod tests {
  use super::*;
  use serde_json::json;

  #[test]
  fn extract_text_from_string_content() {
    let msg = json!({"content": "hello world"});
    assert_eq!(extract_text_content(&msg), "hello world");
  }

  #[test]
  fn extract_text_from_content_blocks() {
    let msg = json!({
      "content": [
        {"type": "text", "text": "line1"},
        {"type": "image", "source": {}},
        {"type": "text", "text": "line2"}
      ]
    });
    assert_eq!(extract_text_content(&msg), "line1\nline2");
  }

  #[test]
  fn extract_text_empty_on_missing_content() {
    let msg = json!({"role": "user"});
    assert_eq!(extract_text_content(&msg), "");
  }
}
