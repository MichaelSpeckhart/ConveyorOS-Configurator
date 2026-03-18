export interface DataSourceConfig {
  watchDirectory: string;
  outputDirectory: string;
}

export interface FieldMappings {
  customerIdentifier: number;
  customerFirstName: number;
  customerLastName: number;
  customerPhone: number;
  fullInvoiceNumber: number;
  displayInvoiceNumber: number;
  numItems: number;
  slotOccupancy: number;
  itemId: number;
  itemDescription: number;
  dropoffDate: number;
  pickupDate: number;
  comments: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

export interface ConfiguratorConfig {
  posSystem: string;
  dataSource: DataSourceConfig;
  fieldMappings: FieldMappings;
  database: DatabaseConfig;
  opcServerUrl: string;
}

export const defaultFieldMappings: FieldMappings = {
  customerIdentifier: 6,
  customerFirstName: 7,
  customerLastName: 8,
  customerPhone: 9,
  fullInvoiceNumber: 1,
  displayInvoiceNumber: 2,
  numItems: 3,
  slotOccupancy: 4,
  itemId: 10,
  itemDescription: 11,
  dropoffDate: 12,
  pickupDate: 13,
  comments: 14,
};

export const defaultConfig: ConfiguratorConfig = {
  posSystem: "spot",
  dataSource: {
    watchDirectory: "",
    outputDirectory: "",
  },
  fieldMappings: defaultFieldMappings,
  database: {
    host: "localhost",
    port: 5432,
    name: "conveyor-app",
    user: "postgres",
    password: "",
  },
  opcServerUrl: "opc.tcp://localhost:4840",
};

export const POS_SYSTEMS = [
  {
    id: "spot",
    name: "SPOT",
    description: "SPOT Business Systems",
    available: true,
  },
  {
    id: "cleancloud",
    name: "CleanCloud",
    description: "CleanCloud POS",
    available: false,
  },
  {
    id: "smrt",
    name: "SMRT",
    description: "SMRT Systems",
    available: false,
  },
  {
    id: "other",
    name: "Other",
    description: "Custom / Other POS",
    available: false,
  },
] as const;

export type NavSection =
  | "pos-system"
  | "data-source"
  | "field-mappings"
  | "database"
  | "equipment";
