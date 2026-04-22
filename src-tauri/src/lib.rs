mod config;
use config::ConfiguratorConfig;
use serde::Serialize;
use std::fs;
use tauri::Manager;

const OAS_BUNDLE_ID: &str = "com.michaelspeckhart.conveyoros-oas";

fn oas_data_dir() -> Result<std::path::PathBuf, String> {
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
        Ok(std::path::PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join(OAS_BUNDLE_ID))
    }
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA").map_err(|_| "APPDATA not set".to_string())?;
        Ok(std::path::PathBuf::from(appdata).join(OAS_BUNDLE_ID))
    }
    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
        Ok(std::path::PathBuf::from(home)
            .join(".local")
            .join("share")
            .join(OAS_BUNDLE_ID))
    }
}

#[tauri::command]
fn apply_to_oas(config: ConfiguratorConfig) -> Result<String, String> {
    let dir = oas_data_dir()?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let field_mappings = serde_json::to_value(&config.field_mappings)
        .map_err(|e| e.to_string())?;

    let ticket_template = serde_json::to_value(&config.printer.ticket_template)
        .map_err(|e| e.to_string())?;

    let app_settings = serde_json::json!({
        "posCsvDir":            config.data_source.watch_directory,
        "conveyorCsvOutputDir": config.data_source.output_directory,
        "dbHost":               config.database.host,
        "dbPort":               config.database.port,
        "dbName":               config.database.name,
        "dbUser":               config.database.user,
        "dbPassword":           config.database.password,
        "opcServerUrl":         config.opc_server_url,
        "posSystem":            config.pos_system,
        "fieldMappings":        field_mappings,
        "printer": {
            "connectionType":   config.printer.connection_type,
            "selectedPrinter":  config.printer.selected_printer,
            "portPath":         config.printer.port_path,
            "paperSize":        config.printer.paper_size,
            "orientation":      config.printer.orientation,
            "quality":          config.printer.quality,
            "copies":           config.printer.copies,
            "colorMode":        config.printer.color_mode,
            "ticketTemplate":   ticket_template,
        },
    });

    // tauri-plugin-store format: top-level object keyed by store key
    let store = serde_json::json!({ "app_settings": app_settings });
    let path = dir.join("settings.json");
    fs::write(&path, serde_json::to_string_pretty(&store).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;

    Ok(path.to_string_lossy().to_string())
}

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

    // Prefer ADDITEM (SPOT), then GARMENT_CREATE (WinCleaners), then first line
    let upper: Vec<&str> = content.lines().collect();
    let target_line = upper
        .iter()
        .find(|l| l.to_uppercase().contains("ADDITEM"))
        .or_else(|| upper.iter().find(|l| l.to_uppercase().contains("GARMENT_CREATE")))
        .or_else(|| upper.first())
        .copied()
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PrinterInfo {
    name: String,
    status: String,
    is_default: bool,
}

#[tauri::command]
fn discover_printers() -> Result<Vec<PrinterInfo>, String> {
    _discover_printers_impl()
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
fn _discover_printers_impl() -> Result<Vec<PrinterInfo>, String> {
    use std::process::Command;
    
    // Determine the system default printer
    let default_name = Command::new("lpstat")
        .arg("-d")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .and_then(|s| {
            s.lines()
                .find(|l| l.contains("system default destination:"))
                .and_then(|l| l.splitn(2, ':').nth(1))
                .map(|s| s.trim().to_string())
        })
        .unwrap_or_default();

    let output = Command::new("lpstat")
        .arg("-p")
        .output()
        .map_err(|e| format!("Failed to run lpstat: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut printers: Vec<PrinterInfo> = Vec::new();

    for line in stdout.lines() {
        if !line.starts_with("printer ") {
            continue;
        }
        let rest = &line["printer ".len()..];
        let name = rest.split_whitespace().next().unwrap_or("").to_string();
        if name.is_empty() {
            continue;
        }
        let status = if line.contains("idle") {
            "Ready".to_string()
        } else if line.contains("disabled") || line.contains("not accepting") {
            "Offline".to_string()
        } else {
            "Busy".to_string()
        };
        printers.push(PrinterInfo {
            is_default: name == default_name,
            name,
            status,
        });
    }

    Ok(printers)
}

#[cfg(target_os = "windows")]
fn _discover_printers_impl() -> Result<Vec<PrinterInfo>, String> {
    use std::process::Command;

    // PowerShell: emit pipe-delimited Name|IsDefault|WorkOffline per printer
    let script = r#"Get-WmiObject -Class Win32_Printer | ForEach-Object { "$($_.Name)|$($_.Default)|$($_.WorkOffline)" }"#;
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .output()
        .map_err(|e| format!("Failed to query printers: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut printers: Vec<PrinterInfo> = Vec::new();

    for line in stdout.lines() {
        let parts: Vec<&str> = line.splitn(3, '|').collect();
        if parts.len() < 3 {
            continue;
        }
        let name = parts[0].trim().to_string();
        if name.is_empty() {
            continue;
        }
        let is_default = parts[1].trim().eq_ignore_ascii_case("true");
        let offline = parts[2].trim().eq_ignore_ascii_case("true");
        let status = if offline {
            "Offline".to_string()
        } else {
            "Ready".to_string()
        };
        printers.push(PrinterInfo {
            name,
            status,
            is_default,
        });
    }

    Ok(printers)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UsbPortInfo {
    path: String,
    description: String,
}

#[tauri::command]
fn discover_usb_ports() -> Result<Vec<UsbPortInfo>, String> {
    _discover_usb_ports_impl()
}

#[cfg(target_os = "macos")]
fn _discover_usb_ports_impl() -> Result<Vec<UsbPortInfo>, String> {
    let mut ports: Vec<UsbPortInfo> = Vec::new();
    // macOS USB serial/printer devices appear under /dev/cu.*
    if let Ok(entries) = std::fs::read_dir("/dev") {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("cu.usb") || name.starts_with("cu.usbserial") || name.starts_with("cu.usbmodem") {
                let description = if name.to_lowercase().contains("serial") {
                    "USB Serial Device".to_string()
                } else {
                    "USB Modem / Printer".to_string()
                };
                ports.push(UsbPortInfo { path: format!("/dev/{name}"), description });
            }
        }
    }
    // Also check /dev/usb/lp* (USB printer class devices via macOS CUPS backend)
    if let Ok(entries) = std::fs::read_dir("/dev/usb") {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("lp") {
                ports.push(UsbPortInfo {
                    path: format!("/dev/usb/{name}"),
                    description: "USB Line Printer".to_string(),
                });
            }
        }
    }
    ports.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(ports)
}

#[cfg(target_os = "linux")]
fn _discover_usb_ports_impl() -> Result<Vec<UsbPortInfo>, String> {
    let mut ports: Vec<UsbPortInfo> = Vec::new();
    for (dir, prefix, desc) in [
        ("/dev", "ttyUSB", "USB Serial Device"),
        ("/dev", "ttyACM", "USB ACM Device"),
        ("/dev/usb", "lp", "USB Line Printer"),
    ] {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with(prefix) {
                    ports.push(UsbPortInfo {
                        path: format!("{dir}/{name}"),
                        description: desc.to_string(),
                    });
                }
            }
        }
    }
    ports.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(ports)
}

#[cfg(target_os = "windows")]
fn _discover_usb_ports_impl() -> Result<Vec<UsbPortInfo>, String> {
    use std::process::Command;
    // Query USB serial / printer ports via WMI
    let script = r#"Get-WmiObject Win32_PnPEntity | Where-Object { $_.Name -match 'COM\d+|USB Printing' } | ForEach-Object { "$($_.Name)|$($_.DeviceID)" }"#;
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .output()
        .map_err(|e| format!("Failed to query USB ports: {e}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut ports: Vec<UsbPortInfo> = Vec::new();
    for line in stdout.lines() {
        let parts: Vec<&str> = line.splitn(2, '|').collect();
        if parts.is_empty() { continue; }
        let name = parts[0].trim().to_string();
        if name.is_empty() { continue; }
        // Extract COM port number for the path
        let path = if let Some(start) = name.find("COM") {
            let com: String = name[start..].chars().take_while(|c| c.is_alphanumeric()).collect();
            format!("\\\\.\\{com}")
        } else {
            name.clone()
        };
        ports.push(UsbPortInfo { path, description: name });
    }
    Ok(ports)
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
            discover_printers,
            discover_usb_ports,
            apply_to_oas,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
