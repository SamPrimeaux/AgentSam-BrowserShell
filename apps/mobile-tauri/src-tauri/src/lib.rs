//! AgentSam Tauri mobile lane — Rust capability boundary.
//!
//! Language boundary rule: Rust owns device authority (filesystem, process,
//! crypto, indexing, media). TypeScript describes and invokes; it never
//! re-implements. The command names here are the contract declared by
//! `@inneranimalmedia/agentsam-platform-tauri` (`TAURI_COMMANDS`).

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// Mirrors `CapabilityState` from @inneranimalmedia/agentsam-platform.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CapabilityState {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permission: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub implementation: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub features: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

impl CapabilityState {
    fn available(implementation: &str, features: &[&str]) -> Self {
        Self {
            status: "available".into(),
            permission: Some("granted".into()),
            implementation: Some(implementation.into()),
            features: Some(features.iter().map(|value| value.to_string()).collect()),
            reason: None,
        }
    }

    fn requires_permission(implementation: &str, features: &[&str]) -> Self {
        Self {
            status: "requires-permission".into(),
            permission: Some("prompt".into()),
            implementation: Some(implementation.into()),
            features: Some(features.iter().map(|value| value.to_string()).collect()),
            reason: None,
        }
    }

    fn unavailable(reason: &str) -> Self {
        Self {
            status: "unavailable".into(),
            permission: Some("not-applicable".into()),
            implementation: Some("tauri.none".into()),
            features: Some(vec![]),
            reason: Some(reason.into()),
        }
    }
}

/// Mirrors `TauriCapabilityReport`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CapabilityReport {
    pub lane: String,
    pub os: String,
    pub form_factor: String,
    pub app_version: String,
    pub capabilities: std::collections::BTreeMap<String, CapabilityState>,
}

/// Mirrors `FileEntry`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub path: String,
    pub name: String,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<u64>,
}

const MOBILE: bool = cfg!(any(target_os = "ios", target_os = "android"));

fn current_os() -> &'static str {
    if cfg!(target_os = "ios") {
        "ios"
    } else if cfg!(target_os = "android") {
        "android"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "windows") {
        "windows"
    } else {
        "linux"
    }
}

/// App-scoped data root. Every filesystem command is confined to it: the UI
/// cannot address arbitrary paths, which is the whole point of Rust authority.
fn data_root() -> PathBuf {
    let base = std::env::var("AGENTSAM_DATA_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| std::env::temp_dir().join("agentsam"));
    let _ = fs::create_dir_all(&base);
    base
}

fn resolve(path: &str) -> Result<PathBuf, String> {
    let root = data_root();
    let candidate = root.join(path.trim_start_matches('/'));
    let normalized = normalize(&candidate);
    if !normalized.starts_with(&root) {
        return Err(format!("Path escapes the AgentSam data root: {path}"));
    }
    Ok(normalized)
}

fn normalize(path: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for component in path.components() {
        match component {
            std::path::Component::ParentDir => {
                out.pop();
            }
            std::path::Component::CurDir => {}
            other => out.push(other.as_os_str()),
        }
    }
    out
}

#[tauri::command]
fn agentsam_platform_probe() -> CapabilityReport {
    let mut capabilities = std::collections::BTreeMap::new();

    capabilities.insert(
        "filesystem".to_string(),
        CapabilityState::available("tauri.rust-fs", &["read", "write", "list", "delete", "mkdir"]),
    );
    capabilities.insert(
        "secureStore".to_string(),
        CapabilityState::available("tauri.rust-keychain", &["get", "set", "delete", "keys"]),
    );
    capabilities.insert(
        "clipboard".to_string(),
        CapabilityState::available("tauri.plugin-clipboard", &["read-text", "write-text"]),
    );
    capabilities.insert(
        "network".to_string(),
        CapabilityState::available("tauri.rust-network", &["status", "fetch"]),
    );
    capabilities.insert(
        "browser".to_string(),
        CapabilityState::available("tauri.plugin-opener", &["external", "embedded-surface"]),
    );
    capabilities.insert(
        "camera".to_string(),
        CapabilityState::requires_permission("tauri.plugin-camera", &["photo"]),
    );
    capabilities.insert(
        "microphone".to_string(),
        CapabilityState::requires_permission("tauri.plugin-audio", &["record"]),
    );
    capabilities.insert(
        "notifications".to_string(),
        CapabilityState::requires_permission("tauri.plugin-notification", &["immediate"]),
    );
    capabilities.insert(
        "share".to_string(),
        if MOBILE {
            CapabilityState::available("tauri.plugin-share", &["text", "url"])
        } else {
            CapabilityState::unavailable("Desktop share is not wired in this scaffold.")
        },
    );
    capabilities.insert(
        "terminal".to_string(),
        if MOBILE {
            CapabilityState::unavailable("iOS and Android forbid spawning processes.")
        } else {
            CapabilityState::available("tauri.rust-process", &["exec"])
        },
    );
    capabilities.insert(
        "localModels".to_string(),
        CapabilityState::unavailable("No inference runtime is embedded in this build."),
    );
    capabilities.insert(
        "backgroundExecution".to_string(),
        CapabilityState::unavailable("Background scheduling is not wired in this scaffold."),
    );

    CapabilityReport {
        lane: "tauri".into(),
        os: current_os().into(),
        form_factor: if MOBILE { "phone".into() } else { "desktop".into() },
        app_version: env!("CARGO_PKG_VERSION").into(),
        capabilities,
    }
}

#[tauri::command]
fn agentsam_platform_request_permission(capability: String) -> CapabilityState {
    // Real permission prompts are delegated to the Tauri mobile plugins as
    // they are added. Reporting the probe value keeps the contract honest.
    agentsam_platform_probe()
        .capabilities
        .remove(&capability)
        .unwrap_or_else(|| CapabilityState::unavailable("Unknown capability."))
}

#[tauri::command]
fn agentsam_fs_roots() -> Vec<String> {
    vec![data_root().to_string_lossy().to_string()]
}

#[tauri::command]
fn agentsam_fs_list(path: String) -> Result<Vec<FileEntry>, String> {
    let target = resolve(&path)?;
    let mut entries = Vec::new();
    for entry in fs::read_dir(&target).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let metadata = entry.metadata().map_err(|error| error.to_string())?;
        entries.push(FileEntry {
            path: format!("{}/{}", path.trim_end_matches('/'), entry.file_name().to_string_lossy()),
            name: entry.file_name().to_string_lossy().to_string(),
            kind: if metadata.is_dir() { "directory".into() } else { "file".into() },
            size_bytes: Some(metadata.len()),
        });
    }
    Ok(entries)
}

#[tauri::command]
fn agentsam_fs_exists(path: String) -> Result<bool, String> {
    Ok(resolve(&path)?.exists())
}

#[tauri::command]
fn agentsam_fs_read_text(path: String) -> Result<String, String> {
    fs::read_to_string(resolve(&path)?).map_err(|error| error.to_string())
}

#[tauri::command]
fn agentsam_fs_write_text(path: String, contents: String) -> Result<FileEntry, String> {
    let target = resolve(&path)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(&target, contents.as_bytes()).map_err(|error| error.to_string())?;
    Ok(FileEntry {
        path,
        name: target.file_name().map(|name| name.to_string_lossy().to_string()).unwrap_or_default(),
        kind: "file".into(),
        size_bytes: Some(contents.len() as u64),
    })
}

#[tauri::command]
fn agentsam_fs_remove(path: String) -> Result<(), String> {
    let target = resolve(&path)?;
    if target.is_dir() {
        fs::remove_dir_all(target).map_err(|error| error.to_string())
    } else {
        fs::remove_file(target).map_err(|error| error.to_string())
    }
}

#[tauri::command]
fn agentsam_fs_mkdir(path: String) -> Result<(), String> {
    fs::create_dir_all(resolve(&path)?).map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            agentsam_platform_probe,
            agentsam_platform_request_permission,
            agentsam_fs_roots,
            agentsam_fs_list,
            agentsam_fs_exists,
            agentsam_fs_read_text,
            agentsam_fs_write_text,
            agentsam_fs_remove,
            agentsam_fs_mkdir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AgentSam Tauri lane");
}
