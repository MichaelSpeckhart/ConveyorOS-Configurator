use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataSourceConfig {
    pub watch_directory: String,
    pub output_directory: String,
}

impl Default for DataSourceConfig {
    fn default() -> Self {
        Self {
            watch_directory: String::new(),
            output_directory: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FieldMappings {
    pub customer_identifier: u32,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub customer_first_name: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub customer_last_name: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub customer_phone: Option<u32>,
    pub full_invoice_number: u32,
    pub display_invoice_number: u32,
    pub num_items: u32,
    pub slot_occupancy: u32,
    pub item_id: u32,
    pub item_description: u32,
    pub dropoff_date: u32,
    pub pickup_date: u32,
    pub comments: u32,
}

impl Default for FieldMappings {
    fn default() -> Self {
        Self {
            customer_identifier: 6,
            customer_first_name: Some(8),
            customer_last_name: Some(7),
            customer_phone: Some(9),
            full_invoice_number: 1,
            display_invoice_number: 2,
            num_items: 3,
            slot_occupancy: 4,
            item_id: 10,
            item_description: 11,
            dropoff_date: 12,
            pickup_date: 13,
            comments: 14,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseConfig {
    pub host: String,
    pub port: u16,
    pub name: String,
    pub user: String,
    pub password: String,
}

impl Default for DatabaseConfig {
    fn default() -> Self {
        Self {
            host: "localhost".to_string(),
            port: 5432,
            name: "conveyor-app".to_string(),
            user: "postgres".to_string(),
            password: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketField {
    pub id: String,
    pub label: String,
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub show_barcode: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketTemplateConfig {
    pub header_text: String,
    pub footer_text: String,
    pub fields: Vec<TicketField>,
}

impl Default for TicketTemplateConfig {
    fn default() -> Self {
        Self {
            header_text: String::new(),
            footer_text: String::new(),
            fields: vec![
                TicketField { id: "ticketNumber".into(),        label: "Ticket Number".into(),       enabled: true,  show_barcode: Some(true) },
                TicketField { id: "customerIdentifier".into(),  label: "Customer ID".into(),         enabled: true,  show_barcode: None },
                TicketField { id: "customerName".into(),        label: "Customer Name".into(),       enabled: true,  show_barcode: None },
                TicketField { id: "numItems".into(),            label: "Number of Items".into(),     enabled: true,  show_barcode: None },
                TicketField { id: "dropoffDate".into(),         label: "Drop-off Date".into(),       enabled: true,  show_barcode: None },
                TicketField { id: "pickupDate".into(),          label: "Pickup Date".into(),         enabled: true,  show_barcode: None },
                TicketField { id: "comments".into(),            label: "Notes / Comments".into(),    enabled: false, show_barcode: None },
                TicketField { id: "itemList".into(),            label: "Garment List".into(),        enabled: true,  show_barcode: Some(false) },
            ],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrinterConfig {
    pub connection_type: String,
    pub selected_printer: String,
    pub port_path: String,
    pub paper_size: String,
    pub orientation: String,
    pub quality: String,
    pub copies: u32,
    pub color_mode: String,
    #[serde(default)]
    pub ticket_template: TicketTemplateConfig,
}

impl Default for PrinterConfig {
    fn default() -> Self {
        Self {
            connection_type: "system".to_string(),
            selected_printer: String::new(),
            port_path: String::new(),
            paper_size: "Letter".to_string(),
            orientation: "portrait".to_string(),
            quality: "normal".to_string(),
            copies: 1,
            color_mode: "grayscale".to_string(),
            ticket_template: TicketTemplateConfig::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PosSettingsConfig {
    pub receipt_printing: String,
    pub receipt_layout: String,
    pub auto_complete_orders: bool,
    pub duplicate_ticket_handling: String,
}

impl Default for PosSettingsConfig {
    fn default() -> Self {
        Self {
            receipt_printing: "oas".to_string(),
            receipt_layout: "dynamic".to_string(),
            auto_complete_orders: true,
            duplicate_ticket_handling: "skip".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrameConfig {
    pub latches: u8,
    pub slots: Vec<bool>,
}

impl Default for FrameConfig {
    fn default() -> Self {
        Self {
            latches: 5,
            slots: vec![true; 5],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfiguratorConfig {
    pub pos_system: String,
    #[serde(default)]
    pub pos_settings: PosSettingsConfig,
    pub data_source: DataSourceConfig,
    pub field_mappings: FieldMappings,
    pub database: DatabaseConfig,
    pub opc_server_url: String,
    #[serde(default = "default_frames")]
    pub frames: Vec<FrameConfig>,
    #[serde(default)]
    pub printer: PrinterConfig,
}

fn default_frames() -> Vec<FrameConfig> {
    vec![FrameConfig::default()]
}

impl Default for ConfiguratorConfig {
    fn default() -> Self {
        Self {
            pos_system: "spot".to_string(),
            pos_settings: PosSettingsConfig::default(),
            data_source: DataSourceConfig::default(),
            field_mappings: FieldMappings::default(),
            database: DatabaseConfig::default(),
            opc_server_url: "opc.tcp://localhost:4840".to_string(),
            frames: default_frames(),
            printer: PrinterConfig::default(),
        }
    }
}
