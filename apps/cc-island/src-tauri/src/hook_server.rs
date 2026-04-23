use std::sync::{atomic::Ordering, Arc};

use axum::{extract::State, http::StatusCode, response::IntoResponse, routing::{get, post}, Json, Router};
use serde_json::json;
use tauri::{AppHandle, Emitter};
use tokio::net::TcpListener;

use crate::{shared_types::{HookEvent, HookResponse}, SharedState};

#[derive(Clone)]
struct ServerState {
  app: AppHandle,
  shared: Arc<SharedState>,
}

pub const PORT: u16 = 51515;

pub async fn spawn_hook_server(app: AppHandle, shared: Arc<SharedState>) -> Result<u16, String> {
  let listener = TcpListener::bind(("127.0.0.1", PORT)).await
    .map_err(|e| format!("failed to bind hook server on port {}: {}", PORT, e))?;
  let port = PORT;
  shared.server_port.store(port, Ordering::Relaxed);

  let state = ServerState { app: app.clone(), shared };
  let router = Router::new()
    .route("/health", get(health))
    .route("/hook", post(hook))
    .with_state(state);

  tauri::async_runtime::spawn(async move {
    let _ = app.emit("notification", json!({ "message": format!("Tauri hook server on {}", port) }));
    let _ = axum::serve(listener, router).await;
  });

  Ok(port)
}

async fn health(State(state): State<ServerState>) -> impl IntoResponse {
  let port = state.shared.server_port.load(Ordering::Relaxed);
  Json(json!({ "status": "ok", "port": port }))
}

async fn hook(State(state): State<ServerState>, Json(event): Json<HookEvent>) -> impl IntoResponse {
  match state.shared.hook_router.handle(event, &state.app, &state.shared).await {
    Ok(response) => (StatusCode::OK, Json(response)).into_response(),
    Err(error) => (
      StatusCode::INTERNAL_SERVER_ERROR,
      Json(HookResponse {
        hook_specific_output: Some(crate::shared_types::HookSpecificOutput {
          hook_event_name: "Error".into(),
          decision: Some(crate::shared_types::PermissionDecision {
            behavior: "deny".into(),
            message: Some(error),
            interrupt: false,
          }),
          updated_input: None,
        }),
      }),
    )
      .into_response(),
  }
}
