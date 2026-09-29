use serde::Serialize;

/// 统一的命令错误类型。
///
/// 之所以不用 anyhow，是因为 Tauri 命令要求错误类型实现 `Serialize`
/// 才能把错误信息返回给前端，这里手动序列化成字符串。
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("未找到 adb.exe：{0}")]
    AdbNotFound(String),
    #[error("IO 错误：{0}")]
    Io(#[from] std::io::Error),
    #[error("命令执行失败：{0}")]
    Command(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
