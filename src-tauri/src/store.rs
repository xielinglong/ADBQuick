use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// 用户自定义的 adb 命令：名称 + 命令。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomCommand {
    pub name: String,
    pub command: String,
}

/// 该设备已保存到本地的文件（日志 / 图片 / 视频 / 导出的其他文件）。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedFile {
    pub name: String,
    pub dir: String,
    pub path: String,
    pub kind: String,
    pub time: u64,
}

/// 单个设备的配置：常用命令 + 已保存文件。
/// 持久化到 `%APPDATA%\adbquick\devices\<sanitized-serial>.json`。
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DeviceConfig {
    #[serde(default)]
    pub commands: Vec<CustomCommand>,
    #[serde(default)]
    pub saved_files: Vec<SavedFile>,
}

/// 把 serial 里的非法文件名字符替换为 `_`，用于生成配置文件名。
fn sanitize(serial: &str) -> String {
    serial
        .chars()
        .map(|c| match c {
            'a'..='z' | 'A'..='Z' | '0'..='9' | '-' | '_' | '.' => c,
            _ => '_',
        })
        .collect()
}

fn config_path(serial: &str) -> AppResult<PathBuf> {
    let base = std::env::var("APPDATA").unwrap_or_else(|_| ".".into());
    let dir = Path::new(&base).join("adbquick").join("devices");
    std::fs::create_dir_all(&dir).map_err(AppError::Io)?;
    Ok(dir.join(format!("{}.json", sanitize(serial))))
}

pub fn load_config(serial: &str) -> AppResult<DeviceConfig> {
    let path = config_path(serial)?;
    if !path.exists() {
        return Ok(DeviceConfig::default());
    }
    let data = std::fs::read_to_string(&path).map_err(AppError::Io)?;
    serde_json::from_str(&data)
        .map_err(|e| AppError::Command(format!("解析设备配置失败：{e}")))
}

pub fn save_config(serial: &str, cfg: &DeviceConfig) -> AppResult<()> {
    let path = config_path(serial)?;
    let data = serde_json::to_string_pretty(cfg)
        .map_err(|e| AppError::Command(format!("序列化设备配置失败：{e}")))?;
    std::fs::write(&path, data).map_err(AppError::Io)
}

pub fn load_commands(serial: &str) -> AppResult<Vec<CustomCommand>> {
    Ok(load_config(serial)?.commands)
}

pub fn save_commands(serial: &str, cmds: &[CustomCommand]) -> AppResult<()> {
    let mut cfg = load_config(serial)?;
    cfg.commands = cmds.to_vec();
    save_config(serial, &cfg)
}

pub fn load_saved_files(serial: &str) -> AppResult<Vec<SavedFile>> {
    Ok(load_config(serial)?.saved_files)
}

pub fn record_saved_file(serial: &str, file: SavedFile) -> AppResult<SavedFile> {
    let mut cfg = load_config(serial)?;
    if !cfg.saved_files.iter().any(|f| f.path == file.path) {
        cfg.saved_files.insert(0, file.clone());
    }
    save_config(serial, &cfg)?;
    Ok(file)
}

pub fn delete_saved_file(serial: &str, path: &str) -> AppResult<()> {
    let mut cfg = load_config(serial)?;
    cfg.saved_files.retain(|f| f.path != path);
    save_config(serial, &cfg)
}
