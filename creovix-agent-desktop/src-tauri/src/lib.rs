use serde::Serialize;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppPaths {
    project_root: String,
    db_path: String,
    screenshots_dir: String,
    runner_script: String,
}

#[tauri::command]
fn get_app_paths(app: tauri::AppHandle) -> Result<AppPaths, String> {
    let project_root = if cfg!(debug_assertions) {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .canonicalize()
            .map_err(|e| e.to_string())?
    } else {
        app.path()
            .resource_dir()
            .map_err(|e| e.to_string())?
    };

    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;

    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

    let screenshots_dir = data_dir.join("screenshots");
    std::fs::create_dir_all(&screenshots_dir).map_err(|e| e.to_string())?;

    // Same file as Database.load("sqlite:creovix.db") — plugin-sql uses app_config_dir.
    let db_path = config_dir.join("creovix.db");
    let runner_script = project_root.join("scripts").join("runner.js");

    Ok(AppPaths {
        project_root: project_root.to_string_lossy().into_owned(),
        db_path: db_path.to_string_lossy().into_owned(),
        screenshots_dir: screenshots_dir.to_string_lossy().into_owned(),
        runner_script: runner_script.to_string_lossy().into_owned(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![get_app_paths])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
