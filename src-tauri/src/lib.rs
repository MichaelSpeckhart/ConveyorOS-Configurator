mod config;
use config::ConfiguratorConfig;
use std::fs;
use tauri::Manager;

fn config_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    Ok(config_dir.join("config.json"))
}

#[tauri::command]
fn load_config(app: tauri::AppHandle) -> Result<ConfiguratorConfig, String> {
    let path = config_path(&app)?;
    if path.exists() {
        let data = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&data).map_err(|e| e.to_string())
    } else {
        Ok(ConfiguratorConfig::default())
    }
}

#[tauri::command]
fn save_config(app: tauri::AppHandle, config: ConfiguratorConfig) -> Result<(), String> {
    let path = config_path(&app)?;
    let data = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&path, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn check_folder(path: String) -> bool {
    std::path::Path::new(&path).is_dir()
}

#[tauri::command]
fn parse_csv_sample(path: String) -> Result<Vec<String>, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;

    // Prefer an ADDITEM line (SPOT pos.csv format); fall back to first line
    let target_line = content
        .lines()
        .find(|l| l.to_uppercase().contains("ADDITEM"))
        .or_else(|| content.lines().next())
        .unwrap_or("")
        .to_string();

    // Simple CSV split that respects quoted fields
    let mut columns: Vec<String> = Vec::new();
    let mut field = String::new();
    let mut in_quotes = false;
    for ch in target_line.chars() {
        match ch {
            '"' => in_quotes = !in_quotes,
            ',' if !in_quotes => {
                columns.push(field.trim().to_string());
                field = String::new();
            }
            _ => field.push(ch),
        }
    }
    columns.push(field.trim().to_string());
    Ok(columns)
}

#[tauri::command]
fn get_config_path(app: tauri::AppHandle) -> Result<String, String> {
    config_path(&app).map(|p| p.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_config,
            save_config,
            check_folder,
            parse_csv_sample,
            get_config_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
