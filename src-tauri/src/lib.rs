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
    let path = dir.join("settings.json");

    // Read whatever OAS already has so we only overwrite the keys we own —
    // setup-complete flags and other OAS-internal state are preserved.
    let mut store: serde_json::Value = if path.exists() {
        fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_else(|| serde_json::json!({ "app_settings": {} }))
    } else {
        serde_json::json!({ "app_settings": {} })
    };

    

    let field_mappings = serde_json::to_value(&config.field_mappings)
        .map_err(|e| e.to_string())?;
    let ticket_template = serde_json::to_value(&config.printer.ticket_template)
        .map_err(|e| e.to_string())?;

    let settings = store["app_settings"]
        .as_object_mut()
        .ok_or_else(|| "app_settings is not an object".to_string())?;

    settings.insert("posCsvDir".into(),            config.data_source.watch_directory.into());
    settings.insert("conveyorCsvOutputDir".into(), config.data_source.output_directory.into());
    settings.insert("dbHost".into(),               config.database.host.into());
    settings.insert("dbPort".into(),               config.database.port.into());
    settings.insert("dbName".into(),               config.database.name.into());
    settings.insert("dbUser".into(),               config.database.user.into());
    settings.insert("dbPassword".into(),           config.database.password.into());
    settings.insert("opcServerUrl".into(),         config.opc_server_url.into());
    settings.insert("posSystem".into(),            config.pos_system.into());
    settings.insert("fieldMappings".into(),        field_mappings);
    settings.insert("printer".into(), serde_json::json!({
        "connectionType":  config.printer.connection_type,
        "selectedPrinter": config.printer.selected_printer,
        "portPath":        config.printer.port_path,
        "paperSize":       config.printer.paper_size,
        "orientation":     config.printer.orientation,
        "quality":         config.printer.quality,
        "copies":          config.printer.copies,
        "colorMode":       config.printer.color_mode,
        "ticketTemplate":  ticket_template,
    }));

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

    // Get-CimInstance works in all PowerShell versions (3+ including PS 7);
    // Get-WmiObject is not available in PS 7 cross-platform installs.
    let script = r#"Get-CimInstance -ClassName Win32_Printer | ForEach-Object { "$($_.Name)|$($_.Default)|$($_.WorkOffline)" }"#;
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

    // CUPS printer queues — only include queues that look like receipt/ESC-POS printers.
    if let Ok(output) = Command::new("lpstat").arg("-p").output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            if !line.starts_with("printer ") { continue; }
            let rest = &line["printer ".len()..];
            let name = rest.split_whitespace().next().unwrap_or("").to_string();
            if name.is_empty() { continue; }
            let lower = name.to_lowercase();
            let is_receipt = lower.contains("epson")
                || lower.contains("tm-")
                || lower.contains("tm_")
                || lower.contains("receipt")
                || lower.contains("thermal")
                || lower.contains("star")
                || lower.contains("bixolon")
                || lower.contains("citizen");
            if !is_receipt { continue; }
            ports.push(UsbPortInfo { path: name, description: "CUPS Queue — Receipt Printer".to_string() });
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
fn _is_receipt_printer_name(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.contains("epson")
        || lower.contains("tm-")
        || lower.contains("tm_")
        || lower.contains("receipt")
        || lower.contains("thermal")
        || lower.contains("star")
        || lower.contains("bixolon")
        || lower.contains("citizen")
}

#[cfg(target_os = "windows")]
fn _discover_usb_ports_impl() -> Result<Vec<UsbPortInfo>, String> {
    use std::process::Command;
    let mut ports: Vec<UsbPortInfo> = Vec::new();

    // Hardware-level COM ports and USB printing devices via PnP.
    // Mirrors the /dev/cu.usb* scan on macOS.
    // Named printer queues are returned by discover_escpos_printers on Windows.
    let pnp_script = r#"Get-CimInstance -ClassName Win32_PnPEntity | Where-Object { $_.Name -match 'COM\d+|USB Printing' } | ForEach-Object { "$($_.Name)|$($_.DeviceID)" }"#;
    if let Ok(output) = Command::new("powershell")
        .args(["-NoProfile", "-Command", pnp_script])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            let parts: Vec<&str> = line.splitn(2, '|').collect();
            if parts.is_empty() {
                continue;
            }
            let name = parts[0].trim().to_string();
            if name.is_empty() {
                continue;
            }
            let path = if let Some(start) = name.find("COM") {
                let com: String = name[start..]
                    .chars()
                    .take_while(|c| c.is_alphanumeric())
                    .collect();
                format!("\\\\.\\{com}")
            } else {
                name.clone()
            };
            ports.push(UsbPortInfo { path, description: name });
        }
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

    println!("Port Path is: {port_path}");
    let receipt = build_test_receipt(&template);
    _send_escpos(&port_path, &receipt)
}

fn parse_vid_pid(s: &str) -> Result<(u16, u16), String> {
    let parts: Vec<&str> = s.splitn(2, ':').collect();
    if parts.len() != 2 {
        return Err(format!("Expected VID:PID format (e.g. 04b8:0202), got: {s}"));
    }
    let vid = u16::from_str_radix(parts[0].trim(), 16)
        .map_err(|_| format!("Invalid vendor ID: {}", parts[0]))?;
    let pid = u16::from_str_radix(parts[1].trim(), 16)
        .map_err(|_| format!("Invalid product ID: {}", parts[1]))?;
    Ok((vid, pid))
}

fn looks_like_ip(s: &str) -> bool {
    // Accept bare IP (192.168.1.50) or IP:port (192.168.1.50:9100)
    let host = s.splitn(2, ':').next().unwrap_or(s);
    let parts: Vec<&str> = host.split('.').collect();
    parts.len() == 4 && parts.iter().all(|p| p.parse::<u8>().is_ok())
}

#[cfg(target_os = "windows")]
fn _send_raw_windows_printer(printer_name: &str, data: &[u8]) -> Result<(), String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use std::ptr;
    use winapi::shared::minwindef::DWORD;
    use winapi::um::winspool::{
        ClosePrinter, EndDocPrinter, EndPagePrinter, OpenPrinterW, StartDocPrinterW,
        StartPagePrinter, WritePrinter, DOC_INFO_1W,
    };

    fn to_wide(s: &str) -> Vec<u16> {
        OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
    }

    let mut name_w = to_wide(printer_name);
    let mut datatype_w = to_wide("RAW");
    let mut docname_w = to_wide("ESC/POS");

    let mut handle = ptr::null_mut();
    unsafe {
        if OpenPrinterW(name_w.as_mut_ptr(), &mut handle, ptr::null_mut()) == 0 {
            return Err(format!(
                "Cannot open printer '{}': {}",
                printer_name,
                std::io::Error::last_os_error()
            ));
        }

        let mut doc_info = DOC_INFO_1W {
            pDocName: docname_w.as_mut_ptr(),
            pOutputFile: ptr::null_mut(),
            pDatatype: datatype_w.as_mut_ptr(),
        };
        let job = StartDocPrinterW(handle, 1, &mut doc_info as *mut _ as *mut _);
        if job == 0 {
            ClosePrinter(handle);
            return Err(format!(
                "StartDocPrinter failed: {}",
                std::io::Error::last_os_error()
            ));
        }

        if StartPagePrinter(handle) == 0 {
            EndDocPrinter(handle);
            ClosePrinter(handle);
            return Err(format!(
                "StartPagePrinter failed: {}",
                std::io::Error::last_os_error()
            ));
        }

        let mut written: DWORD = 0;
        let ok = WritePrinter(
            handle,
            data.as_ptr() as *mut _,
            data.len() as DWORD,
            &mut written,
        );
        EndPagePrinter(handle);
        EndDocPrinter(handle);
        ClosePrinter(handle);

        if ok == 0 {
            return Err(format!(
                "WritePrinter failed: {}",
                std::io::Error::last_os_error()
            ));
        }
    }
    Ok(())
}

fn _send_escpos(port_path: &str, data: &[u8]) -> Result<(), String> {
    use std::io::Write;

    // VID:PID hex (e.g. "04b8:0202") → direct USB via escpos_rs
    if let Ok((vid, pid)) = parse_vid_pid(port_path) {
        use escpos_rs::{Printer, PrinterProfile};
        let profile = PrinterProfile::usb_builder(vid, pid).build();
        let printer = Printer::new(profile)
            .map_err(|e| format!("Failed to connect to printer: {e}"))?
            .ok_or_else(|| format!("Printer {port_path} not found on USB. Make sure it is connected and powered on."))?;
        return printer.raw(data).map_err(|e| format!("Failed to send data to printer: {e}"));
    }

    // IP address → TCP port 9100 (Epson/Star raw printing standard)
    if looks_like_ip(port_path) {
        let addr = if port_path.contains(':') {
            port_path.to_string()
        } else {
            format!("{port_path}:9100")
        };
        use std::net::TcpStream;
        use std::time::Duration;
        let mut stream = TcpStream::connect(&addr)
            .map_err(|e| format!("Cannot connect to {addr}: {e}"))?;
        stream.set_write_timeout(Some(Duration::from_secs(5)))
            .map_err(|e| format!("Timeout error: {e}"))?;
        stream.write_all(data).map_err(|e| format!("Network write error: {e}"))?;
        stream.flush().map_err(|e| format!("Network flush error: {e}"))?;
        return Ok(());
    }

    // macOS/Linux CUPS queue name → submit via lp -o raw
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    if !port_path.starts_with("/dev/") {
        use std::process::Command;
        let tmp = std::env::temp_dir().join("conveyoros_escpos.bin");
        std::fs::write(&tmp, data).map_err(|e| format!("Temp file error: {e}"))?;
        let out = Command::new("lp")
            .args(["-d", port_path, "-o", "raw", tmp.to_str().unwrap()])
            .output()
            .map_err(|e| format!("lp command failed: {e}"))?;
        if !out.status.success() {
            return Err(format!("lp error: {}", String::from_utf8_lossy(&out.stderr)));
        }
        return Ok(());
    }

    // Windows named printer (not a COM/device path) → raw spool via winspool.drv
    #[cfg(target_os = "windows")]
    {
        let is_device_path = port_path.starts_with("\\\\.\\")
            || port_path.to_uppercase().starts_with("COM");
        if !is_device_path {
            return _send_raw_windows_printer(port_path, data);
        }
    }

    // Serial port or device node (/dev/cu.usb*, \\.\COM1, etc.) → write bytes directly
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .open(port_path)
        .map_err(|e| format!("Cannot open {port_path}: {e}"))?;
    file.write_all(data).map_err(|e| format!("Write error: {e}"))?;
    file.flush().map_err(|e| format!("Flush error: {e}"))?;
    Ok(())
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct EscposPrinterInfo {
    path: String,
    description: String,
}

#[cfg(not(target_os = "windows"))]
fn vendor_name(vid: u16) -> &'static str {
    match vid {
        0x04b8 => "Epson",
        0x0519 => "Star Micronics",
        0x1504 => "Bixolon",
        0x1d90 => "Citizen",
        0x0dd4 => "Custom",
        0x0fe6 => "ICS",
        _ => "",
    }
}

#[tauri::command]
fn discover_escpos_printers() -> Result<Vec<EscposPrinterInfo>, String> {
    _discover_escpos_printers_impl()
}

// macOS / Linux: enumerate USB devices directly via libusb/rusb.
// Epson TM and similar receipt printers are matched by known vendor IDs.
#[cfg(not(target_os = "windows"))]
fn _discover_escpos_printers_impl() -> Result<Vec<EscposPrinterInfo>, String> {
    let devices = rusb::devices().map_err(|e| format!("USB enumeration error: {e}"))?;
    let mut printers = Vec::new();
    for device in devices.iter() {
        let Ok(desc) = device.device_descriptor() else { continue };
        let vid = desc.vendor_id();
        let pid = desc.product_id();
        // Epson TM and many other receipt printers use vendor-specific USB class (255)
        // rather than printer class (7), so a class check would miss them.
        let name = vendor_name(vid);
        if name.is_empty() {
            continue;
        }
        printers.push(EscposPrinterInfo {
            path: format!("{:04x}:{:04x}", vid, pid),
            description: format!("{} ({:04x}:{:04x})", name, vid, pid),
        });
    }
    Ok(printers)
}

// Windows: libusb/rusb cannot enumerate printers managed by the Windows printer
// subsystem (Epson APD uses a Windows driver, not WinUSB). Query Win32_Printer
// and filter by PortName — USB-connected printers get ports named "USB001",
// "USB002", etc. regardless of what the queue is called. Brand-name matching
// alone is unreliable because the queue name can be anything.
// _send_escpos routes non-device-path strings to _send_raw_windows_printer.
#[cfg(target_os = "windows")]
fn _discover_escpos_printers_impl() -> Result<Vec<EscposPrinterInfo>, String> {
    use std::collections::HashSet;
    use std::process::Command;
    // Emit "QueueName|PortName" for every installed printer
    let script = r#"Get-CimInstance -ClassName Win32_Printer | ForEach-Object { "$($_.Name)|$($_.PortName)" }"#;
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .output()
        .map_err(|e| format!("Failed to query printers: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut printers = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();
    for line in stdout.lines() {
        let parts: Vec<&str> = line.splitn(2, '|').collect();
        if parts.len() < 2 {
            continue;
        }
        let name = parts[0].trim().to_string();
        let port = parts[1].trim().to_string();
        if name.is_empty() {
            continue;
        }
        // Accept printers on USB ports (USB001, USB002 …) OR with a receipt-brand name.
        // The port check is hardware-level and catches any USB printer regardless of
        // what the user or installer named the queue.
        let on_usb = port.to_uppercase().starts_with("USB");
        if !on_usb && !_is_receipt_printer_name(&name) {
            continue;
        }
        if !seen.insert(name.to_lowercase()) {
            continue;
        }
        let description = if on_usb {
            format!("USB Printer — {name} (port: {port})")
        } else {
            format!("Windows Printer Queue — {name}")
        };
        printers.push(EscposPrinterInfo { path: name, description });
    }
    Ok(printers)
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
            discover_escpos_printers,
            apply_to_oas,
            test_print_ticket,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
