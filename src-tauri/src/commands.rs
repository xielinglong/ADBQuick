use crate::adb;
use crate::error::{AppError, AppResult};
use crate::parser::{parse_ls, FileEntry};
use crate::state::AppState;
use crate::store::{self, CustomCommand, SavedFile};
use serde::Serialize;
use std::path::Path;
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

fn user_home_dir() -> String {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".into())
}

fn timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// 根据本地路径 + 类型构造一条「已保存文件」记录。
fn saved_file_from_path(path: &str, kind: &str) -> SavedFile {
    let p = Path::new(path);
    let name = p
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.to_string());
    let dir = p
        .parent()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default();
    let time = std::fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or_else(timestamp);
    SavedFile {
        name,
        dir,
        path: path.to_string(),
        kind: kind.to_string(),
        time,
    }
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
pub async fn adb_connect(addr: String) -> AppResult<String> {
    adb::run_adb(&adb_args("", &["connect", addr.as_str()])).await
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
    let dir = format!("{}\\adbquick-screenshots", user_home_dir());
    std::fs::create_dir_all(&dir).map_err(AppError::Io)?;
    let path = format!("{}\\screenshot-{}-{}.png", dir, serial, timestamp());
    std::fs::write(&path, &bytes).map_err(AppError::Io)?;
    Ok(path)
}

#[tauri::command]
pub async fn run_custom(serial: String, command: String) -> AppResult<String> {
    let args: Vec<String> = command.split_whitespace().map(String::from).collect();
    if args.is_empty() {
        return Err(AppError::Command("命令不能为空".into()));
    }
    let mut full: Vec<String> = Vec::new();
    if !serial.is_empty() {
        full.push("-s".into());
        full.push(serial);
    }
    full.extend(args);
    adb::run_adb_combined(&full).await
}

#[tauri::command]
pub fn list_custom_commands(serial: String) -> AppResult<Vec<CustomCommand>> {
    store::load_commands(&serial)
}

#[tauri::command]
pub fn save_custom_commands(serial: String, commands: Vec<CustomCommand>) -> AppResult<()> {
    store::save_commands(&serial, &commands)
}

#[tauri::command]
pub fn list_saved_files(serial: String) -> AppResult<Vec<SavedFile>> {
    store::load_saved_files(&serial)
}

#[tauri::command]
pub fn record_saved_file(serial: String, path: String, kind: String) -> AppResult<SavedFile> {
    let file = saved_file_from_path(&path, &kind);
    store::record_saved_file(&serial, file)
}

#[tauri::command]
pub fn delete_saved_file(serial: String, path: String) -> AppResult<()> {
    store::delete_saved_file(&serial, &path)?;
    // 顺带删除本地实际文件（尽力而为）
    let _ = std::fs::remove_file(&path);
    Ok(())
}

fn default_log_path(serial: &str) -> String {
    let dir = format!("{}\\adbquick-logs", user_home_dir());
    let _ = std::fs::create_dir_all(&dir);
    format!("{}\\logcat-{}-{}.log", dir, serial, timestamp())
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
