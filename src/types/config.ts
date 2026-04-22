export interface DataSourceConfig {
  watchDirectory: string;
  outputDirectory: string;
}

export interface FieldMappings {
  customerIdentifier: number;
  customerFirstName?: number;
  customerLastName?: number;
  customerPhone?: number;
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

export interface TicketField {
  id: string;
  label: string;
  enabled: boolean;
  showBarcode?: boolean;
}

export interface TicketTemplateConfig {
  headerText: string;
  footerText: string;
  fields: TicketField[];
}

export const defaultTicketTemplate: TicketTemplateConfig = {
  headerText: "",
  footerText: "",
  fields: [
    { id: "ticketNumber",       label: "Ticket Number",     enabled: true,  showBarcode: true  },
    { id: "customerIdentifier", label: "Customer ID",       enabled: true,  showBarcode: false },
    { id: "customerName",       label: "Customer Name",     enabled: true,  showBarcode: false },
    { id: "numItems",           label: "Number of Items",   enabled: true,  showBarcode: false },
    { id: "dropoffDate",        label: "Drop-off Date",     enabled: true,  showBarcode: false },
    { id: "pickupDate",         label: "Pickup Date",       enabled: true,  showBarcode: false },
    { id: "comments",           label: "Notes / Comments",  enabled: false, showBarcode: false },
    { id: "itemList",           label: "Garment List",      enabled: true,  showBarcode: false },
  ],
};

export interface PrinterConfig {
  connectionType: "system" | "usb";
  selectedPrinter: string;
  portPath: string;
  paperSize: string;
  orientation: "portrait" | "landscape";
  quality: "draft" | "normal" | "high";
  copies: number;
  colorMode: "color" | "grayscale";
  ticketTemplate: TicketTemplateConfig;
}

export interface ConfiguratorConfig {
  posSystem: string;
  dataSource: DataSourceConfig;
  fieldMappings: FieldMappings;
  database: DatabaseConfig;
  opcServerUrl: string;
  printer: PrinterConfig;
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

// WinCleaners exports TICKET_CREATE and GARMENT_CREATE rows.
// These mappings apply to GARMENT_CREATE rows (the primary garment data source).
// Pickup date lives in TICKET_CREATE col 3; OAS must cross-reference by invoice number.
// Customer name/phone are not present in the CSV — only the account number (col 1).
export const winCleanersFieldMappings: FieldMappings = {
  customerIdentifier: 1,
  fullInvoiceNumber: 2,
  displayInvoiceNumber: 2,
  numItems: 5,            // quantity (always 1 per garment row)
  slotOccupancy: 5,
  itemId: 3,              // tag barcode (T/F prefix + number)
  itemDescription: 4,     // garment type (e.g. "LD Shirt Hanger", "Pants")
  dropoffDate: 8,
  pickupDate: 3,          // TICKET_CREATE col 3 — OAS must look up via invoice number
  comments: 7,            // starch level / brand / color notes
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
  printer: {
    connectionType: "system",
    selectedPrinter: "",
    portPath: "",
    paperSize: "Letter",
    orientation: "portrait",
    quality: "normal",
    copies: 1,
    colorMode: "grayscale",
    ticketTemplate: defaultTicketTemplate,
  },
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
    id: "wincleaners",
    name: "WinCleaners",
    description: "Computer Connections WinCleaners",
    available: true,
  },
  {
    id: "other",
    name: "Other",
    description: "Custom / Other POS",
    available: false,
  },
] as const;

export function getDefaultFieldMappings(posSystem: string): FieldMappings {
  switch (posSystem) {
    case "wincleaners":
      return winCleanersFieldMappings;
    default:
      return defaultFieldMappings;
  }
}

export type NavSection =
  | "pos-system"
  | "data-source"
  | "field-mappings"
  | "database"
  | "equipment"
  | "printer-settings";
