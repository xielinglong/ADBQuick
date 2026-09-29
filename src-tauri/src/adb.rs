use crate::error::{AppError, AppResult};
use std::path::PathBuf;
use std::time::Duration;
use tokio::process::Command;
use tokio::time::timeout;

/// 单条 adb 命令的超时上限，避免设备无响应时前端一直转圈。
const ADB_TIMEOUT: Duration = Duration::from_secs(20);

/// 定位 adb.exe 的路径。
///
/// 优先级：`ADB_PATH` 环境变量 > 已知安装路径 > PATH 中的 `adb`。
fn adb_path() -> AppResult<PathBuf> {
    if let Ok(p) = std::env::var("ADB_PATH") {
        let pb = PathBuf::from(&p);
        if pb.is_file() {
            return Ok(pb);
        }
    }

    const CANDIDATES: [&str; 2] = [
        r"C:\tools\platform-tools-latest-windows\platform-tools\adb.exe",
        "adb",
    ];
    for c in CANDIDATES {
        let pb = PathBuf::from(c);
        if pb.is_absolute() {
            if pb.is_file() {
                return Ok(pb);
            }
        } else {
            // 依赖 PATH，交给 Command 去解析
            return Ok(pb);
        }
    }

    Err(AppError::AdbNotFound(
        "未找到 adb.exe，请设置 ADB_PATH 环境变量指向 adb.exe".into(),
    ))
}

pub(crate) fn adb_exe() -> AppResult<PathBuf> {
    adb_path()
}

/// 带超时地执行一条 adb 命令，返回完整 Output。
async fn output_with_timeout(
    adb: &PathBuf,
    args: &[String],
) -> AppResult<std::process::Output> {
    match timeout(ADB_TIMEOUT, Command::new(adb).args(args).output()).await {
        Err(_) => Err(AppError::Command(format!(
            "adb {} 执行超时（{}s）",
            args.join(" "),
            ADB_TIMEOUT.as_secs()
        ))),
        Ok(Err(e)) => Err(AppError::Io(e)),
        Ok(Ok(out)) => Ok(out),
    }
}

/// 执行 adb 命令并返回 stdout 文本（命令失败时返回 stderr 信息）。
pub async fn run_adb(args: &[String]) -> AppResult<String> {
    let adb = adb_path()?;
    let out = output_with_timeout(&adb, args).await?;
    if !out.status.success() {
        let err = String::from_utf8_lossy(&out.stderr);
        return Err(AppError::Command(format!(
            "adb {} 失败：{}",
            args.join(" "),
            err.trim()
        )));
    }
    Ok(String::from_utf8_lossy(&out.stdout).into_owned())
}

/// 执行 adb 命令并返回原始 stdout 字节（用于截图等二进制场景）。
pub async fn run_adb_raw(args: &[String]) -> AppResult<Vec<u8>> {
    let adb = adb_path()?;
    let out = output_with_timeout(&adb, args).await?;
    if !out.status.success() {
        let err = String::from_utf8_lossy(&out.stderr);
        return Err(AppError::Command(format!(
            "adb {} 失败：{}",
            args.join(" "),
            err.trim()
        )));
    }
    Ok(out.stdout)
}
