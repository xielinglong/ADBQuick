use crate::adb;
use crate::error::{AppError, AppResult};
use crate::parser::{parse_ls, FileEntry};
use crate::state::AppState;
use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;
use tokio::process::Command;

#[derive(Debug, Clone, Serialize)]
pub struct Device {
    pub serial: String,
    pub state: String,
    pub model: String,
}

/// 构造带 `-s <serial>` 前缀的 adb 参数。
fn adb_args(serial: &str, sub: &[&str]) -> Vec<String> {
    let mut v: Vec<String> = Vec::new();
    if !serial.is_empty() {
        v.push("-s".into());
        v.push(serial.into());
    }
    v.extend(sub.iter().map(|s| s.to_string()));
    v
}

#[tauri::command]
pub async fn list_devices() -> AppResult<Vec<Device>> {
    let out = adb::run_adb(&adb_args("", &["devices", "-l"])).await?;
    let mut devs = Vec::new();
    for line in out.lines().skip(1) {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let mut parts = line.split_whitespace();
        let serial = parts.next().unwrap_or("").to_string();
        let state = parts.next().unwrap_or("").to_string();
        let mut model = String::new();
        for kv in parts {
            if let Some(v) = kv.strip_prefix("model:") {
                model = v.replace('_', " ");
            }
        }
        devs.push(Device { serial, state, model });
    }
    Ok(devs)
}

#[tauri::command]
pub async fn adb_root(serial: String) -> AppResult<String> {
    adb::run_adb(&adb_args(&serial, &["root"])).await
}

#[tauri::command]
pub async fn adb_remount(serial: String) -> AppResult<String> {
    adb::run_adb(&adb_args(&serial, &["remount"])).await
}

#[tauri::command]
pub async fn list_dir(serial: String, path: String) -> AppResult<Vec<FileEntry>> {
    let p = if path.is_empty() { "/" } else { path.as_str() };
    let out = adb::run_adb(&adb_args(&serial, &["shell", "ls", "-la", p])).await?;
    Ok(parse_ls(&out))
}

#[tauri::command]
pub async fn screenshot(serial: String) -> AppResult<String> {
    let bytes = adb::run_adb_raw(&adb_args(&serial, &["exec-out", "screencap", "-p"])).await?;
    // 校验 PNG 魔数，防 Windows 下二进制被 CRLF 污染
    if bytes.len() < 8 || &bytes[0..8] != b"\x89PNG\r\n\x1a\n" {
        return Err(AppError::Command(
            "截图输出不是有效 PNG（二进制可能被污染）".into(),
        ));
    }
    use base64::Engine;
    Ok(base64::engine::general_purpose::STANDARD.encode(&bytes))
}

fn default_log_path(serial: &str) -> String {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".into());
    let dir = format!("{}\\adbquick-logs", home);
    let _ = std::fs::create_dir_all(&dir);
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("{}\\logcat-{}-{}.log", dir, serial, ts)
}

#[tauri::command]
pub async fn logcat_start(state: State<'_, AppState>, serial: String) -> AppResult<String> {
    let save_path = default_log_path(&serial);
    let adb = adb::adb_exe()?;
    // 直接把 adb logcat 的 stdout 重定向到本地文件，前端只管状态
    let file = std::fs::File::create(&save_path).map_err(AppError::Io)?;
    let child = Command::new(&adb)
        .args(adb_args(&serial, &["logcat"]))
        .stdout(std::process::Stdio::from(file))
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(AppError::Io)?;

    let mut procs = state.logcat_procs.lock().await;
    if let Some(mut old) = procs.remove(&serial) {
        let _ = old.kill().await;
    }
    procs.insert(serial, child);
    Ok(save_path)
}

#[tauri::command]
pub async fn logcat_stop(state: State<'_, AppState>, serial: String) -> AppResult<()> {
    let mut procs = state.logcat_procs.lock().await;
    if let Some(mut child) = procs.remove(&serial) {
        let _ = child.kill().await;
    }
    Ok(())
}
