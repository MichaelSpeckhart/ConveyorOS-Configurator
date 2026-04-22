mod config;
use config::{ConfiguratorConfig, TicketTemplateConfig};
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
    use std::process::Command;
    let mut ports: Vec<UsbPortInfo> = Vec::new();

    // USB-serial adapter devices (e.g. Epson TM via RS232 adapter)
    if let Ok(entries) = std::fs::read_dir("/dev") {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("cu.usb") || name.starts_with("cu.usbserial") || name.starts_with("cu.usbmodem") {
                let description = if name.to_lowercase().contains("serial") {
                    "USB Serial Port".to_string()
                } else {
                    "USB Serial / Modem".to_string()
                };
                ports.push(UsbPortInfo { path: format!("/dev/{name}"), description });
            }
        }
    }

    // CUPS printer queues — Epson TM USB Printer Class devices register here on macOS.
    // Raw ESC/POS is sent via: lp -d <queue_name> -o raw <file>
    if let Ok(output) = Command::new("lpstat").arg("-p").output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            if !line.starts_with("printer ") { continue; }
            let rest = &line["printer ".len()..];
            let name = rest.split_whitespace().next().unwrap_or("").to_string();
            if name.is_empty() { continue; }
            let lower = name.to_lowercase();
            let description = if lower.contains("epson") || lower.contains("tm-") || lower.contains("receipt") || lower.contains("thermal") {
                "CUPS Queue — Receipt Printer".to_string()
            } else {
                "CUPS Printer Queue".to_string()
            };
            ports.push(UsbPortInfo { path: name, description });
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

const SAMPLE_VALUES: &[(&str, &str)] = &[
    ("ticketNumber",       "000014684"),
    ("customerIdentifier", "01040363"),
    ("customerName",       "John Smith"),
    ("numItems",           "4 items"),
    ("dropoffDate",        "04/03/2026"),
    ("pickupDate",         "04/10/2026"),
    ("comments",           "Handle with care"),
    ("itemList",           "T1476237  Ld Bag\nT2003925  LD Shirt Hanger\nT1428942  LD Shirt Hanger"),
];

fn build_test_receipt(template: &TicketTemplateConfig) -> Vec<u8> {
    let mut buf: Vec<u8> = Vec::new();

    // Initialize
    buf.extend_from_slice(&[0x1B, 0x40]);
    buf.push(0x0A);

    // Center, bold, double-height for header
    buf.extend_from_slice(&[0x1B, 0x61, 0x01, 0x1B, 0x45, 0x01, 0x1D, 0x21, 0x10]);
    if !template.header_text.is_empty() {
        buf.extend_from_slice(template.header_text.as_bytes());
        buf.push(0x0A);
    }
    // Reset size and bold
    buf.extend_from_slice(&[0x1D, 0x21, 0x00, 0x1B, 0x45, 0x00]);
    buf.extend_from_slice(b"*** TEST PRINT ***\n");
    buf.extend_from_slice(b"--------------------------------\n");

    // Left-align for fields
    buf.extend_from_slice(&[0x1B, 0x61, 0x00]);

    for field in &template.fields {
        if !field.enabled {
            continue;
        }
        let value = SAMPLE_VALUES.iter()
            .find(|(id, _)| *id == field.id)
            .map(|(_, v)| *v)
            .unwrap_or("");
        let show_barcode = field.show_barcode.unwrap_or(false);

        if field.id == "itemList" {
            buf.extend_from_slice(b"-- Garments --\n");
            for line in value.split('\n') {
                buf.extend_from_slice(line.as_bytes());
                buf.push(0x0A);
            }
        } else {
            let line = format!("{}: {}\n", field.label, value);
            buf.extend_from_slice(line.as_bytes());
            if show_barcode {
                // Center barcode, HRI below, height 60, width 2
                buf.extend_from_slice(&[0x1B, 0x61, 0x01, 0x1D, 0x48, 0x02, 0x1D, 0x68, 60, 0x1D, 0x77, 2]);
                // Code128: GS k m n data  (m=73 = Code128)
                let code128_data = format!("{{B{}", value);
                let data_bytes = code128_data.as_bytes();
                buf.extend_from_slice(&[0x1D, 0x6B, 73, data_bytes.len() as u8]);
                buf.extend_from_slice(data_bytes);
                buf.push(0x0A);
                buf.extend_from_slice(&[0x1B, 0x61, 0x00]);
            }
        }
    }

    buf.extend_from_slice(b"--------------------------------\n");

    if !template.footer_text.is_empty() {
        buf.extend_from_slice(&[0x1B, 0x61, 0x01]);
        buf.extend_from_slice(template.footer_text.as_bytes());
        buf.push(0x0A);
        buf.extend_from_slice(&[0x1B, 0x61, 0x00]);
    }

    // Feed 4 lines then partial cut
    buf.extend_from_slice(&[0x0A, 0x0A, 0x0A, 0x0A]);
    buf.extend_from_slice(&[0x1D, 0x56, 0x42, 0x03]);

    buf
}

#[tauri::command]
fn test_print_ticket(port_path: String, template: TicketTemplateConfig) -> Result<(), String> {
    if port_path.is_empty() {
        return Err("No port selected. Select a port or printer queue from the scan results, or type one in manually.".to_string());
    }
    let receipt = build_test_receipt(&template);
    _send_escpos(&port_path, &receipt)
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
fn _send_escpos(port_path: &str, data: &[u8]) -> Result<(), String> {
    use std::io::Write;
    if port_path.starts_with("/dev/") {
        // USB-serial adapter or direct device node
        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .open(port_path)
            .map_err(|e| format!("Cannot open {port_path}: {e}"))?;
        file.write_all(data).map_err(|e| format!("Write error: {e}"))?;
        file.flush().map_err(|e| format!("Flush error: {e}"))?;
    } else {
        // CUPS queue name — write ESC/POS to a temp file and submit via lp -o raw
        use std::process::Command;
        let tmp = std::env::temp_dir().join("conveyoros_escpos.bin");
        std::fs::write(&tmp, data).map_err(|e| format!("Temp file error: {e}"))?;
        let out = Command::new("lp")
            .args(["-d", port_path, "-o", "raw", tmp.to_str().unwrap()])
            .output()
            .map_err(|e| format!("lp command failed: {e}"))?;
        if !out.status.success() {
            let stderr = String::from_utf8_lossy(&out.stderr);
            return Err(format!("lp error: {stderr}"));
        }
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn _send_escpos(port_path: &str, data: &[u8]) -> Result<(), String> {
    use std::io::Write;
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .open(port_path)
        .map_err(|e| format!("Cannot open {port_path}: {e}"))?;
    file.write_all(data).map_err(|e| format!("Write error: {e}"))?;
    file.flush().map_err(|e| format!("Flush error: {e}"))?;
    Ok(())
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
            test_print_ticket,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
