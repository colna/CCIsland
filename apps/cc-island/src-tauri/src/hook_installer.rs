use std::{fs, path::PathBuf};

use serde_json::{json, Value};

pub fn settings_path() -> PathBuf {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| "~".into());
    PathBuf::from(home).join(".claude").join("settings.json")
}

const BLOCKING_EVENTS: &[&str] = &["PreToolUse", "PermissionRequest"];
const NOTIFYING_EVENTS: &[&str] = &[
    "UserPromptSubmit",
    "SessionStart",
    "SessionEnd",
    "PostToolUse",
    "Notification",
    "Stop",
];

pub fn install_hooks(port: u16) -> Result<(), String> {
    let path = settings_path();
    let mut settings: Value = if path.exists() {
        let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&raw).unwrap_or_else(|_| json!({}))
    } else {
        json!({})
    };

    if !settings.is_object() {
        settings = json!({});
    }

    let url = format!("http://localhost:{}/hook", port);
    let marker = format!("localhost:{}", port);

    if settings.get("hooks").is_none() {
        settings["hooks"] = json!({});
    }

    for event in BLOCKING_EVENTS {
        let existing = settings["hooks"]
            .get(*event)
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();
        settings["hooks"][*event] =
            Value::Array(merge_hook_entry(&existing, &url, &marker, 120));
    }

    for event in NOTIFYING_EVENTS {
        let existing = settings["hooks"]
            .get(*event)
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();
        settings["hooks"][*event] =
            Value::Array(merge_hook_entry(&existing, &url, &marker, 5));
    }

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let pretty = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&path, pretty).map_err(|e| e.to_string())?;

    eprintln!("[HookInstaller] Hooks installed to {:?}", path);
    Ok(())
}

fn merge_hook_entry(existing: &[Value], url: &str, marker: &str, timeout: u32) -> Vec<Value> {
    let mut others: Vec<Value> = existing
        .iter()
        .filter(|m| {
            let hooks = m.get("hooks").and_then(|v| v.as_array());
            !hooks
                .map(|hooks| {
                    hooks.iter().any(|h| {
                        h.get("url")
                            .and_then(|u| u.as_str())
                            .map(|u| u.contains(marker))
                            .unwrap_or(false)
                    })
                })
                .unwrap_or(false)
        })
        .cloned()
        .collect();

    others.push(json!({
        "hooks": [{ "type": "http", "url": url, "timeout": timeout }]
    }));

    others
}

pub fn remove_hooks(port: u16) -> Result<(), String> {
    let path = settings_path();
    if !path.exists() {
        return Ok(());
    }

    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut settings: Value = serde_json::from_str(&raw).unwrap_or_else(|_| json!({}));
    let marker = format!("localhost:{}", port);

    if let Some(hooks) = settings.get_mut("hooks").and_then(|v| v.as_object_mut()) {
        let keys: Vec<String> = hooks.keys().cloned().collect();
        for key in keys {
            if let Some(matchers) = hooks.get_mut(&key).and_then(|v| v.as_array_mut()) {
                matchers.retain(|m| {
                    let hook_arr = m.get("hooks").and_then(|v| v.as_array());
                    !hook_arr
                        .map(|hooks| {
                            hooks.iter().any(|h| {
                                h.get("url")
                                    .and_then(|u| u.as_str())
                                    .map(|u| u.contains(&marker))
                                    .unwrap_or(false)
                            })
                        })
                        .unwrap_or(false)
                });
            }
            if hooks
                .get(&key)
                .and_then(|v| v.as_array())
                .map(|a| a.is_empty())
                .unwrap_or(false)
            {
                hooks.remove(&key);
            }
        }
        if hooks.is_empty() {
            settings
                .as_object_mut()
                .map(|obj| obj.remove("hooks"));
        }
    }

    let pretty = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&path, pretty).map_err(|e| e.to_string())?;
    eprintln!("[HookInstaller] Hooks removed");
    Ok(())
}

pub fn is_installed(port: u16) -> bool {
    let path = settings_path();
    let marker = format!("localhost:{}", port);
    match fs::read_to_string(path) {
        Ok(raw) => raw.contains(&marker),
        Err(_) => false,
    }
}
