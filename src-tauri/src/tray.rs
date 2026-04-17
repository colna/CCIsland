use std::sync::{atomic::Ordering, Arc};

use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter,
};

use crate::{shared_types::{PanelState, SessionSnapshot}, SharedState};

const ICON_SIZE: u32 = 32;
const CIRCLE_RADIUS: f64 = 12.0;
const AA_BAND: f64 = 1.5;

struct PhaseColor(u8, u8, u8);

fn phase_color(phase: &str) -> PhaseColor {
    match phase {
        "tool" | "responding" => PhaseColor(41, 151, 255),   // @apple-blue-bright #2997ff
        "thinking" => PhaseColor(0, 113, 227),               // @apple-blue #0071e3
        "done" => PhaseColor(52, 199, 89),                   // @color-green #34c759
        _ => PhaseColor(58, 58, 60),                         // @bg-surface-dark-3 #3a3a3c
    }
}

fn create_circle_icon(r: u8, g: u8, b: u8) -> Vec<u8> {
    let center = ICON_SIZE as f64 / 2.0;
    let mut rgba = vec![0u8; (ICON_SIZE * ICON_SIZE * 4) as usize];

    for y in 0..ICON_SIZE {
        for x in 0..ICON_SIZE {
            let dx = x as f64 - center;
            let dy = y as f64 - center;
            let dist = (dx * dx + dy * dy).sqrt();
            let idx = ((y * ICON_SIZE + x) * 4) as usize;

            if dist <= CIRCLE_RADIUS - AA_BAND {
                rgba[idx] = r;
                rgba[idx + 1] = g;
                rgba[idx + 2] = b;
                rgba[idx + 3] = 255;
            } else if dist <= CIRCLE_RADIUS {
                let alpha = ((CIRCLE_RADIUS - dist) / AA_BAND * 255.0) as u8;
                rgba[idx] = r;
                rgba[idx + 1] = g;
                rgba[idx + 2] = b;
                rgba[idx + 3] = alpha;
            }
        }
    }

    rgba
}

pub fn setup_tray(app: &AppHandle, shared: Arc<SharedState>) -> Result<(), String> {
    let PhaseColor(r, g, b) = phase_color("idle");
    let icon_rgba = create_circle_icon(r, g, b);
    let icon = Image::new_owned(icon_rgba, ICON_SIZE, ICON_SIZE);

    // Check initial hook status
    let port = {
        let p = shared.server_port.load(Ordering::Relaxed);
        if p == 0 { 51515 } else { p }
    };
    let hooks_installed = crate::hook_installer::is_installed(port);
    let setup_label = if hooks_installed { "Hooks Installed \u{2713}" } else { "Setup Hooks" };

    let show_island = MenuItemBuilder::with_id("show_island", "Show Island")
        .build(app)
        .map_err(|e| e.to_string())?;
    let auto_approve = MenuItemBuilder::with_id("auto_approve", "Auto Approve")
        .build(app)
        .map_err(|e| e.to_string())?;
    let setup_hooks = MenuItemBuilder::with_id("setup_hooks", setup_label)
        .build(app)
        .map_err(|e| e.to_string())?;
    let remove_hooks = MenuItemBuilder::with_id("remove_hooks", "Remove Hooks")
        .build(app)
        .map_err(|e| e.to_string())?;
    let quit = MenuItemBuilder::with_id("quit", "Quit")
        .build(app)
        .map_err(|e| e.to_string())?;

    let menu = MenuBuilder::new(app)
        .item(&show_island)
        .item(&auto_approve)
        .item(&PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?)
        .item(&setup_hooks)
        .item(&remove_hooks)
        .item(&PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?)
        .item(&quit)
        .build()
        .map_err(|e| e.to_string())?;

    let _tray = TrayIconBuilder::with_id("main")
        .icon(icon)
        .tooltip("CCIsland — Idle")
        .menu(&menu)
        .on_menu_event(move |app, event| {
            let shared = shared.clone();
            let app = app.clone();
            match event.id().as_ref() {
                "show_island" => {
                    let app = app.clone();
                    let shared = shared.clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = shared.window_controller.show(&app, PanelState::Compact).await;
                    });
                }
                "auto_approve" => {
                    let prev = shared.auto_approve.load(Ordering::Relaxed);
                    let next = !prev;
                    shared.auto_approve.store(next, Ordering::Relaxed);
                    let label = if next { "Auto Approve \u{2713}" } else { "Auto Approve" };
                    let _ = auto_approve.set_text(label);
                    let _ = app.emit("auto-approve-changed", serde_json::json!({ "enabled": next }));
                    eprintln!("[CCIsland] 托盘: auto_approve 切换为 {}", next);
                }
                "setup_hooks" => {
                    let port = {
                        let p = shared.server_port.load(Ordering::Relaxed);
                        if p == 0 { 51515 } else { p }
                    };
                    let _ = crate::hook_installer::install_hooks(port);
                    let _ = setup_hooks.set_text("Hooks Installed \u{2713}");
                }
                "remove_hooks" => {
                    let port = {
                        let p = shared.server_port.load(Ordering::Relaxed);
                        if p == 0 { 51515 } else { p }
                    };
                    let _ = crate::hook_installer::remove_hooks(port);
                    let _ = setup_hooks.set_text("Setup Hooks");
                }
                "quit" => {
                    let port = {
                        let p = shared.server_port.load(Ordering::Relaxed);
                        if p == 0 { 51515 } else { p }
                    };
                    let _ = crate::hook_installer::remove_hooks(port);
                    app.exit(0);
                }
                _ => {}
            }
        })
        .build(app)
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn update_tray_icon(app: &AppHandle, phase: &str) {
    let PhaseColor(r, g, b) = phase_color(phase);
    let icon_rgba = create_circle_icon(r, g, b);
    let icon = Image::new_owned(icon_rgba, ICON_SIZE, ICON_SIZE);

    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_icon(Some(icon));
        let tooltip = match phase {
            "thinking" => "CCIsland — Thinking...",
            "tool" => "CCIsland — Executing...",
            "done" => "CCIsland — Done",
            _ => "CCIsland — Idle",
        };
        let _ = tray.set_tooltip(Some(tooltip));
    }
}

const MAX_TITLE_LEN: usize = 40;

fn truncate_title(s: &str) -> String {
    if s.chars().count() <= MAX_TITLE_LEN {
        s.to_string()
    } else {
        let truncated: String = s.chars().take(MAX_TITLE_LEN).collect();
        format!("{}…", truncated)
    }
}

/// Compute status text from session snapshot, mirroring the compact-view logic in app.ts.
pub fn compute_status_text(snapshot: &SessionSnapshot) -> String {
    match snapshot.phase.as_str() {
        "tool" => {
            if let Some(ref tool) = snapshot.current_tool {
                truncate_title(&format!("{}: {}", tool.tool_name, tool.description))
            } else {
                "Executing...".to_string()
            }
        }
        "thinking" => {
            if let Some(last) = snapshot.recent_tools.last() {
                truncate_title(&format!("{}: {}", last.tool_name, last.description))
            } else {
                "Thinking...".to_string()
            }
        }
        "done" => {
            let msg = snapshot.last_message.as_deref().unwrap_or("Done");
            truncate_title(msg)
        }
        _ => String::new(), // idle — clear title
    }
}

/// Update the tray icon title text displayed next to the icon in the menu bar.
pub fn update_tray_title(app: &AppHandle, title: &str) {
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_title(Some(title));
    }
}
