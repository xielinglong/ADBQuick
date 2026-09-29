use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct FileEntry {
    pub name: String,
    pub is_dir: bool,
    pub is_symlink: bool,
    /// 符号链接的目标（`name -> target` 中的 target）
    pub target: Option<String>,
    pub size: u64,
    pub perms: String,
    pub owner: String,
    pub group: String,
    /// 形如 "1970-01-01 08:00"
    pub modified: String,
}

/// 解析 `adb shell ls -la` 的输出。
///
/// Android 用的是 toybox ls，时间列固定为 `YYYY-MM-DD HH:MM`（两列），
/// 因此每行结构为：`perms nlink owner group size date time name...`。
/// 已知限制：文件名里若含空格会破坏解析，骨架阶段可接受。
pub fn parse_ls(output: &str) -> Vec<FileEntry> {
    let mut entries = Vec::new();
    for line in output.lines() {
        let line = line.trim_end();
        if line.is_empty() {
            continue;
        }
        let first = match line.chars().next() {
            Some(c) => c,
            None => continue,
        };
        // 跳过 "total N"、ls 报错行等非条目行
        if !matches!(first, 'd' | '-' | 'l' | 'b' | 'c' | 'p' | 's') {
            continue;
        }
        let tokens: Vec<&str> = line.split_whitespace().collect();
        if tokens.len() < 8 {
            continue;
        }
        let perms = tokens[0].to_string();
        let owner = tokens[2].to_string();
        let group = tokens[3].to_string();
        let size: u64 = tokens[4].parse().unwrap_or(0);
        let modified = format!("{} {}", tokens[5], tokens[6]);
        let name_part = tokens[7..].join(" ");
        let (name, target) = match name_part.split_once(" -> ") {
            Some((n, t)) => (n.to_string(), Some(t.to_string())),
            None => (name_part, None),
        };
        entries.push(FileEntry {
            name,
            is_dir: perms.starts_with('d'),
            is_symlink: perms.starts_with('l'),
            target,
            size,
            perms,
            owner,
            group,
            modified,
        });
    }
    entries
}
