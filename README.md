# ADBQuick

基于 Rust + Tauri 2 的 Windows ADB 桌面工具:多设备管理、文件浏览、截图、Logcat、自定义命令,一键保存到本地。

## 功能

- **多设备管理** — USB 自动扫描 / `adb connect` 手动连接,每台设备一个 Tab,离线自动提示
- **文件管理器** — 浏览设备 shell 目录
- **截图 / Logcat** — 一键保存到本地
- **自定义 adb 命令** — 按设备持久化(本地 JSON),一键执行
- **已保存文件** — 集中查看日志/图片等,支持打开所在目录、删除

## 技术栈

Rust · Tauri 2 · React 19 · TypeScript · Material UI

## 开发

环境要求:Node.js 18+、Rust、[Tauri 2 前置依赖](https://tauri.app/start/prerequisites/)、adb。

```bash
npm install
npm run tauri dev     # 开发运行
npm run tauri build   # 打包
```

程序通过 `ADB_PATH` 环境变量或已知路径定位 `adb.exe`,也可把 `adb` 加入 `PATH`。

## 数据存储

- 自定义命令 / 已保存文件:`%APPDATA%\adbquick\devices\<serial>.json`
- 截图:`%USERPROFILE%\adbquick-screenshots\`
- 日志:`%USERPROFILE%\adbquick-logs\`
