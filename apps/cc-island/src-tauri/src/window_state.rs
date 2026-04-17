use std::{sync::Arc, time::Duration};

use serde_json::json;
use tauri::{AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, Position, Size};
use tokio::sync::Mutex;

use crate::{shared_types::PanelState, tray};

struct WindowControlState {
  state: PanelState,
  user_dismissed: bool,
  collapse_timer_version: u64,
  hide_timer_version: u64,
}

impl Default for WindowControlState {
  fn default() -> Self {
    Self {
      state: PanelState::Hidden,
      user_dismissed: false,
      collapse_timer_version: 0,
      hide_timer_version: 0,
    }
  }
}

#[derive(Default)]
pub struct WindowController {
  inner: Mutex<WindowControlState>,
}

impl WindowController {
  pub async fn show(&self, app: &AppHandle, state: PanelState) -> Result<(), String> {
    let window = app
      .get_webview_window("main")
      .ok_or_else(|| "main window not found".to_string())?;

    let (width, height) = match state {
      PanelState::Compact => (440.0, 36.0),
      PanelState::Expanded => (440.0, 360.0),
      PanelState::Hidden => (440.0, 36.0),
    };

    let (x, y) = window
      .current_monitor()
      .ok()
      .flatten()
      .map(|monitor| {
        let scale = monitor.scale_factor();
        let position = monitor.position();
        let work_area = monitor.work_area();
        // Monitor returns physical pixels; convert to logical for LogicalPosition
        let wa_x = work_area.position.x as f64 / scale;
        let wa_y = work_area.position.y as f64 / scale;
        let wa_w = work_area.size.width as f64 / scale;
        let mon_y = position.y as f64 / scale;
        let top = if work_area.position.y > position.y {
          wa_y + 8.0
        } else {
          mon_y + 32.0
        };
        (
          wa_x + ((wa_w - width) / 2.0).round(),
          top,
        )
      })
      .unwrap_or((0.0, 32.0));

    window
      .set_size(Size::Logical(LogicalSize::new(width, height)))
      .map_err(|e| e.to_string())?;
    window
      .set_position(Position::Logical(LogicalPosition::new(x, y)))
      .map_err(|e| e.to_string())?;
    window.set_always_on_top(true).map_err(|e| e.to_string())?;
    let _ = window.set_visible_on_all_workspaces(true);
    eprintln!("[WindowController] show state={} x={} y={} width={} height={}", state.as_str(), x, y, width, height);
    window.show().map_err(|e| e.to_string())?;

    let mut inner = self.inner.lock().await;
    inner.state = state;
    inner.user_dismissed = false;
    inner.collapse_timer_version += 1;
    inner.hide_timer_version += 1;
    drop(inner);

    app.emit("panel-state", json!({ "state": state.as_str() }))
      .map_err(|e| e.to_string())?;

    // Clear tray title when island is visible (compact or expanded)
    tray::update_tray_title(app, "");

    Ok(())
  }

  pub async fn hide(&self, app: &AppHandle) -> Result<(), String> {
    let window = app
      .get_webview_window("main")
      .ok_or_else(|| "main window not found".to_string())?;
    window.hide().map_err(|e| e.to_string())?;

    let mut inner = self.inner.lock().await;
    inner.state = PanelState::Hidden;
    inner.collapse_timer_version += 1;
    inner.hide_timer_version += 1;
    drop(inner);

    app.emit("panel-state", json!({ "state": "hidden" }))
      .map_err(|e| e.to_string())?;
    Ok(())
  }

  pub async fn dismiss(&self, app: &AppHandle) -> Result<(), String> {
    {
      let mut inner = self.inner.lock().await;
      inner.user_dismissed = true;
      inner.collapse_timer_version += 1;
      inner.hide_timer_version += 1;
    }
    self.hide(app).await
  }

  pub async fn should_auto_show(&self) -> bool {
    !self.inner.lock().await.user_dismissed
  }

  pub async fn current_state(&self) -> PanelState {
    self.inner.lock().await.state
  }

  pub async fn schedule_collapse(self: &Arc<Self>, app: AppHandle, state: PanelState, delay_ms: u64) {
    let version = {
      let mut inner = self.inner.lock().await;
      inner.collapse_timer_version += 1;
      inner.collapse_timer_version
    };
    let controller = Arc::clone(self);
    tauri::async_runtime::spawn(async move {
      tokio::time::sleep(Duration::from_millis(delay_ms)).await;
      let should_run = {
        let inner = controller.inner.lock().await;
        inner.collapse_timer_version == version && inner.state == PanelState::Expanded
      };
      if should_run {
        let _ = controller.show(&app, state).await;
      }
    });
  }

  pub async fn schedule_hide(self: &Arc<Self>, app: AppHandle, delay_ms: u64) {
    let version = {
      let mut inner = self.inner.lock().await;
      inner.hide_timer_version += 1;
      inner.hide_timer_version
    };
    let controller = Arc::clone(self);
    tauri::async_runtime::spawn(async move {
      tokio::time::sleep(Duration::from_millis(delay_ms)).await;
      let should_run = {
        let inner = controller.inner.lock().await;
        inner.hide_timer_version == version && inner.state != PanelState::Hidden
      };
      if should_run {
        let _ = controller.hide(&app).await;
      }
    });
  }
}
