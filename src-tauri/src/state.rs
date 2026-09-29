use std::collections::HashMap;
use tokio::sync::Mutex;

/// 应用共享状态。
///
/// 目前只记录每个设备上正在运行的 logcat 子进程，便于「停止抓取」时杀掉。
#[derive(Default)]
pub struct AppState {
    pub logcat_procs: Mutex<HashMap<String, tokio::process::Child>>,
}
