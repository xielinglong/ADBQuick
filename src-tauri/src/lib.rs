mod adb;
mod commands;
mod error;
mod parser;
mod state;
mod store;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::list_devices,
            commands::adb_connect,
            commands::adb_root,
            commands::adb_remount,
            commands::list_dir,
            commands::screenshot,
            commands::run_custom,
            commands::list_custom_commands,
            commands::save_custom_commands,
            commands::list_saved_files,
            commands::record_saved_file,
            commands::delete_saved_file,
            commands::logcat_start,
            commands::logcat_stop,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
