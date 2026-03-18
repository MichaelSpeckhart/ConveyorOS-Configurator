import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Upload, RotateCcw, Info, Database } from "lucide-react";
import { ConfiguratorConfig, FieldMappings as FieldMappingsType, defaultFieldMappings } from "../types/config";

interface Props {
  config: ConfiguratorConfig;
  onChange: (updates: Partial<ConfiguratorConfig>) => void;
}

interface FieldRow {
  key: keyof FieldMappingsType;
  label: string;
  description: string;
}

const FIELD_ROWS: FieldRow[] = [
  { key: "fullInvoiceNumber", label: "Invoice Number (Full)", description: "The complete invoice/ticket number" },
  { key: "displayInvoiceNumber", label: "Invoice Number (Display)", description: "Shortened invoice number shown to staff" },
  { key: "numItems", label: "Number of Items", description: "Total garment count on the ticket" },
  { key: "slotOccupancy", label: "Slot Number", description: "Conveyor slot assigned to this order" },
  { key: "customerIdentifier", label: "Customer ID", description: "Unique customer identifier from your POS" },
  { key: "customerFirstName", label: "Customer First Name", description: "" },
  { key: "customerLastName", label: "Customer Last Name", description: "" },
  { key: "customerPhone", label: "Customer Phone", description: "" },
  { key: "itemId", label: "Item / Garment ID", description: "Unique ID for each garment on the ticket" },
  { key: "itemDescription", label: "Item Description", description: "Garment type or description" },
  { key: "dropoffDate", label: "Drop-off Date", description: "When the order was dropped off" },
  { key: "pickupDate", label: "Pick-up Date", description: "When the order is due for pickup" },
  { key: "comments", label: "Order Comments", description: "Any notes or special instructions" },
];

export default function FieldMappings({ config, onChange }: Props) {
  const [csvPreview, setCsvPreview] = useState<string[]>([]);
  const [csvLoaded, setCsvLoaded] = useState(false);

  async function loadSampleCsv() {
    const selected = await open({
      multiple: false,
      filters: [{ name: "CSV Files", extensions: ["csv", "txt"] }],
    });
    if (selected && typeof selected === "string") {
      try {
        const columns = await invoke<string[]>("parse_csv_sample", { path: selected });
        setCsvPreview(columns);
        setCsvLoaded(true);
      } catch {
        setCsvLoaded(false);
      }
    }
  }

  function updateMapping(key: keyof FieldMappingsType, value: number) {
    onChange({
      fieldMappings: { ...config.fieldMappings, [key]: value },
    });
  }

  function resetToDefaults() {
    onChange({ fieldMappings: { ...defaultFieldMappings } });
  }

  const previewAtCol = (col: number) => {
    if (!csvLoaded || csvPreview.length === 0) return null;
    return csvPreview[col] ?? null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top section — constrained width */}
      <div className="p-8 max-w-3xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Field Mappings</h2>
          <p className="mt-1 text-slate-500 text-sm">
            Each row tells ConveyorOS which column in your POS file contains that
            piece of information. Column numbers start at 0.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={loadSampleCsv}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:border-blue-400 text-slate-700 text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            <Upload size={15} />
            Load sample file to preview columns
          </button>
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:border-orange-400 text-slate-700 text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw size={15} />
            Reset to SPOT defaults
          </button>
        </div>

        {csvLoaded && (
          <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
            <Info size={14} className="text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">
              Sample file loaded — column preview shown in gray below each
              mapping.
            </p>
          </div>
        )}

        {/* Field table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_120px] text-xs font-semibold text-slate-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200 px-5 py-3">
            <span>Field</span>
            <span className="text-center">Column #</span>
          </div>

          {FIELD_ROWS.map((row, i) => {
            const colValue = config.fieldMappings[row.key];
            const preview = previewAtCol(colValue);

            return (
              <div
                key={row.key}
                className={`grid grid-cols-[1fr_120px] items-center px-5 py-3.5 ${
                  i < FIELD_ROWS.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {row.label}
                  </p>
                  {row.description && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {row.description}
                    </p>
                  )}
                  {preview !== null && (
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Preview: <span className="text-slate-600">{preview}</span>
                    </p>
                  )}
                </div>
                <div className="flex justify-center">
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={colValue}
                    onChange={(e) =>
                      updateMapping(row.key, parseInt(e.target.value) || 0)
                    }
                    className="w-16 text-center border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-400 mt-4">
          Not sure about column numbers? Load a sample file from your POS using
          the button above to preview what's in each column.
        </p>
      </div>

      {/* DB Preview — full width */}
      {csvLoaded && csvPreview.length > 0 && (
        <div className="px-8 pb-8">
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} className="text-slate-500" />
            <h3 className="text-base font-semibold text-slate-800">
              Database Preview
            </h3>
            <span className="text-xs text-slate-400 ml-1">
              — how this row will land in each table
            </span>
          </div>

          <div className="flex flex-col gap-4">
            <DbTablePreview
              title="customers"
              rows={[
                { col: "customer_identifier", value: csvPreview[config.fieldMappings.customerIdentifier] },
                { col: "first_name", value: csvPreview[config.fieldMappings.customerFirstName] },
                { col: "last_name", value: csvPreview[config.fieldMappings.customerLastName] },
                { col: "phone_number", value: csvPreview[config.fieldMappings.customerPhone] },
              ]}
            />
            <DbTablePreview
              title="tickets"
              rows={[
                { col: "full_invoice_number", value: csvPreview[config.fieldMappings.fullInvoiceNumber] },
                { col: "display_invoice_number", value: csvPreview[config.fieldMappings.displayInvoiceNumber] },
                { col: "number_of_items", value: csvPreview[config.fieldMappings.numItems] },
                { col: "customer_identifier", value: csvPreview[config.fieldMappings.customerIdentifier] },
                { col: "customer_first_name", value: csvPreview[config.fieldMappings.customerFirstName] },
                { col: "customer_last_name", value: csvPreview[config.fieldMappings.customerLastName] },
                { col: "customer_phone_number", value: csvPreview[config.fieldMappings.customerPhone] },
                { col: "invoice_dropoff_date", value: csvPreview[config.fieldMappings.dropoffDate] },
                { col: "invoice_pickup_date", value: csvPreview[config.fieldMappings.pickupDate] },
              ]}
            />
            <DbTablePreview
              title="garments"
              rows={[
                { col: "full_invoice_number", value: csvPreview[config.fieldMappings.fullInvoiceNumber] },
                { col: "display_invoice_number", value: csvPreview[config.fieldMappings.displayInvoiceNumber] },
                { col: "item_id", value: csvPreview[config.fieldMappings.itemId] },
                { col: "item_description", value: csvPreview[config.fieldMappings.itemDescription] },
                { col: "invoice_dropoff_date", value: csvPreview[config.fieldMappings.dropoffDate] },
                { col: "invoice_pickup_date", value: csvPreview[config.fieldMappings.pickupDate] },
                { col: "invoice_comments", value: csvPreview[config.fieldMappings.comments] },
                { col: "slot_number", value: csvPreview[config.fieldMappings.slotOccupancy] },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DbTablePreview({
  title,
  rows,
}: {
  title: string;
  rows: { col: string; value: string | undefined }[];
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2">
        <span className="text-xs font-mono font-semibold text-slate-600">{title}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              {rows.map((r) => (
                <th key={r.col} className="px-4 py-2 text-left font-mono font-medium text-slate-400 whitespace-nowrap">
                  {r.col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {rows.map((r) => (
                <td key={r.col} className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                  {r.value ?? <span className="text-slate-300 italic">—</span>}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
