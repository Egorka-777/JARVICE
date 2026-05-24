use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppPaths {
    project_root: String,
    db_path: String,
    screenshots_dir: String,
    runner_script: String,
    playwright_browsers_path: String,
    bundled_runtime: bool,
}

fn bundled_runtime_dir(resource_dir: &Path) -> PathBuf {
    resource_dir.join("runtime")
}

fn resolve_runtime_root(app: &tauri::AppHandle) -> Result<(PathBuf, bool), String> {
    if cfg!(debug_assertions) {
        let dev_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .canonicalize()
            .map_err(|e| e.to_string())?;
        return Ok((dev_root, false));
    }

    if let Ok(env_root) = std::env::var("CREOVIX_PROJECT_ROOT") {
        let root = PathBuf::from(&env_root);
        if root.join("scripts").join("runner.js").is_file() {
            return Ok((root, false));
        }
    }

    let resource_dir = app.path().resource_dir().map_err(|e| e.to_string())?;
    let bundled = bundled_runtime_dir(&resource_dir);
    if bundled.join("scripts").join("runner.js").is_file() {
        return Ok((bundled, true));
    }

    if let Ok(exe_dir) = app.path().executable_dir() {
        let mut dir = exe_dir;
        for _ in 0..6 {
            if dir.join("scripts").join("runner.js").is_file() {
                return Ok((dir, false));
            }
            let Some(parent) = dir.parent() else {
                break;
            };
            dir = parent.to_path_buf();
        }
    }

    Err(
        "Не найден встроенный runtime автоматизации. Переустановите J.A.R.V.I.C.E из JARVICE-Setup.exe."
            .to_string(),
    )
}

fn playwright_browsers_path(runtime_root: &Path, bundled_runtime: bool) -> String {
    if bundled_runtime {
        runtime_root
            .join("playwright-browsers")
            .to_string_lossy()
            .into_owned()
    } else {
        String::new()
    }
}

#[tauri::command]
fn get_app_paths(app: tauri::AppHandle) -> Result<AppPaths, String> {
    let (project_root, bundled_runtime) = resolve_runtime_root(&app)?;

    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;

    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

    let screenshots_dir = data_dir.join("screenshots");
    std::fs::create_dir_all(&screenshots_dir).map_err(|e| e.to_string())?;

    let db_path = config_dir.join("creovix.db");
    let runner_script = project_root.join("scripts").join("runner.js");

    Ok(AppPaths {
        project_root: project_root.to_string_lossy().into_owned(),
        db_path: db_path.to_string_lossy().into_owned(),
        screenshots_dir: screenshots_dir.to_string_lossy().into_owned(),
        runner_script: runner_script.to_string_lossy().into_owned(),
        playwright_browsers_path: playwright_browsers_path(&project_root, bundled_runtime),
        bundled_runtime,
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
