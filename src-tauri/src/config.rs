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
    pub customer_first_name: u32,
    pub customer_last_name: u32,
    pub customer_phone: u32,
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
            customer_first_name: 8,
            customer_last_name: 7,
            customer_phone: 9,
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
pub struct ConfiguratorConfig {
    pub pos_system: String,
    pub data_source: DataSourceConfig,
    pub field_mappings: FieldMappings,
    pub database: DatabaseConfig,
    pub opc_server_url: String,
}

impl Default for ConfiguratorConfig {
    fn default() -> Self {
        Self {
            pos_system: "spot".to_string(),
            data_source: DataSourceConfig::default(),
            field_mappings: FieldMappings::default(),
            database: DatabaseConfig::default(),
            opc_server_url: "opc.tcp://localhost:4840".to_string(),
        }
    }
}
