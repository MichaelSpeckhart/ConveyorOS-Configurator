import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Printer,
  RefreshCw,
  CheckCircle2,
  WifiOff,
  Clock,
  Star,
  Usb,
  ChevronUp,
  ChevronDown,
  Barcode,
  PrinterCheck,
} from "lucide-react";
import { ConfiguratorConfig, PrinterConfig, TicketField, TicketTemplateConfig } from "../types/config";

interface PrinterInfo {
  name: string;
  status: "Ready" | "Offline" | "Busy";
  isDefault: boolean;
}

interface UsbPortInfo {
  path: string;
  description: string;
}

interface Props {
  config: ConfiguratorConfig;
  onChange: (updates: Partial<ConfiguratorConfig>) => void;
}

const PAPER_SIZES = ["Letter", "Legal", "A4", "A3", "4x6", "5x7"];

const STATUS_ICON: Record<string, React.ReactNode> = {
  Ready: <CheckCircle2 size={14} className="text-green-400" />,
  Offline: <WifiOff size={14} className="text-red-400" />,
  Busy: <Clock size={14} className="text-yellow-400" />,
};

const STATUS_LABEL: Record<string, string> = {
  Ready: "text-green-400",
  Offline: "text-red-400",
  Busy: "text-yellow-400",
};

export default function PrinterSettings({ config, onChange }: Props) {
  const printer = config.printer;
  const [discovered, setDiscovered] = useState<PrinterInfo[]>([]);
  const [usbPorts, setUsbPorts] = useState<UsbPortInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  function updatePrinter(updates: Partial<PrinterConfig>) {
    onChange({ printer: { ...printer, ...updates } });
  }

  async function handleScan() {
    setScanning(true);
    setScanError(null);
    try {
      if (printer.connectionType === "usb") {
        const [ports, escpos] = await Promise.all([
          invoke<UsbPortInfo[]>("discover_usb_ports"),
          invoke<UsbPortInfo[]>("discover_escpos_printers"),
        ]);
        const combined = [...ports, ...escpos];
        setUsbPorts(combined);
        setHasScanned(true);
        if (!printer.portPath && combined.length > 0) {
          updatePrinter({ portPath: combined[0].path });
        }
      } else {
        const printers = await invoke<PrinterInfo[]>("discover_printers");
        setDiscovered(printers);
        setHasScanned(true);
        if (!printer.selectedPrinter) {
          const systemDefault = printers.find((p) => p.isDefault);
          if (systemDefault) {
            updatePrinter({ selectedPrinter: systemDefault.name });
          }
        }
      }
    } catch (err) {
      setScanError(String(err));
    } finally {
      setScanning(false);
    }
  }

  function switchConnectionType(type: "system" | "usb") {
    updatePrinter({ connectionType: type });
    setHasScanned(false);
    setScanError(null);
    setDiscovered([]);
    setUsbPorts([]);
  }

  const selectedInfo = discovered.find((p) => p.name === printer.selectedPrinter);
  const isUsb = printer.connectionType === "usb";

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Printer size={22} className="text-blue-600" />
          Printer Settings
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Select a printer and configure output options for tags and receipts.
        </p>
      </div>

      {/* Connection type toggle */}
      <section className="mb-6">
        <h3 className="text-sm font-bold text-slate-600 mb-3">
          Connection Type
        </h3>
        <div className="flex rounded-xl border border-[#ddd8d0] overflow-hidden bg-white">
          <button
            onClick={() => switchConnectionType("system")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
              !isUsb
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-surface"
            }`}
          >
            <Printer size={16} />
            System Printer
          </button>
          <button
            onClick={() => switchConnectionType("usb")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
              isUsb
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-surface"
            }`}
          >
            <Usb size={16} />
            Direct USB
          </button>
        </div>
        {isUsb && (
          <p className="text-xs text-gray-400 mt-2">
            For Epson TM-series and similar receipt printers. On macOS, USB printers appear as CUPS queues — use "Scan" to discover them.
          </p>
        )}
      </section>

      {/* Discovery section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-600">
            {isUsb ? "USB Ports" : "Available Printers"}
          </h3>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw size={14} className={scanning ? "animate-spin" : ""} />
            {scanning ? "Scanning…" : hasScanned ? "Rescan" : isUsb ? "Scan for USB Ports" : "Scan for Printers"}
          </button>
        </div>

        {scanError && (
          <div className="mb-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {scanError}
          </div>
        )}

        {!hasScanned && !scanning && (
          <div className="rounded-xl border-2 border-dashed border-[#ddd8d0] px-6 py-10 text-center">
            {isUsb ? <Usb size={32} className="mx-auto mb-3 text-gray-300" /> : <Printer size={32} className="mx-auto mb-3 text-gray-300" />}
            <p className="text-sm text-gray-400">
              {isUsb
                ? "Click \"Scan for USB Ports\" to detect connected USB printers."
                : "Click \"Scan for Printers\" to detect printers on this machine."}
            </p>
          </div>
        )}

        {/* USB port list */}
        {isUsb && hasScanned && usbPorts.length === 0 && (
          <div className="rounded-xl border border-[#ddd8d0] bg-surface px-6 py-8 text-center">
            <p className="text-sm text-gray-500">
              No USB printer ports found. Make sure the printer is plugged in and powered on.
            </p>
          </div>
        )}

        {isUsb && usbPorts.length > 0 && (
          <div className="space-y-2">
            {usbPorts.map((p) => {
              const selected = printer.portPath === p.path;
              return (
                <button
                  key={p.path}
                  onClick={() => updatePrinter({ portPath: p.path })}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    selected
                      ? "border-blue-500 bg-blue-50"
                      : "border-[#ddd8d0] bg-white hover:border-[#ddd8d0] hover:bg-surface"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      selected ? "border-blue-600" : "border-[#ddd8d0]"
                    }`}
                  >
                    {selected && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                  </div>
                  <Usb size={18} className={selected ? "text-blue-600" : "text-gray-400"} />
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium font-mono truncate block ${selected ? "text-blue-900" : "text-gray-800"}`}>
                      {p.path}
                    </span>
                    <span className="text-xs text-gray-400">{p.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {isUsb && (
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">
              Or enter port path manually
            </label>
            <input
              type="text"
              value={printer.portPath}
              onChange={(e) => updatePrinter({ portPath: e.target.value })}
              placeholder="e.g. /dev/cu.usbserial-1410, COM3, or CUPS queue name"
              className="w-full px-3 py-2 rounded-lg border border-[#ddd8d0] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* System printer list */}
        {!isUsb && hasScanned && discovered.length === 0 && (
          <div className="rounded-xl border border-[#ddd8d0] bg-surface px-6 py-8 text-center">
            <p className="text-sm text-gray-500">
              No printers found. Make sure your printer is connected and powered on.
            </p>
          </div>
        )}

        {!isUsb && discovered.length > 0 && (
          <div className="space-y-2">
            {discovered.map((p) => {
              const selected = printer.selectedPrinter === p.name;
              return (
                <button
                  key={p.name}
                  onClick={() => updatePrinter({ selectedPrinter: p.name })}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    selected
                      ? "border-blue-500 bg-blue-50"
                      : "border-[#ddd8d0] bg-white hover:border-[#ddd8d0] hover:bg-surface"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      selected ? "border-blue-600" : "border-[#ddd8d0]"
                    }`}
                  >
                    {selected && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                  </div>
                  <Printer size={18} className={selected ? "text-blue-600" : "text-gray-400"} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium truncate ${selected ? "text-blue-900" : "text-gray-800"}`}>
                        {p.name}
                      </span>
                      {p.isDefault && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700 font-medium flex-shrink-0">
                          <Star size={10} />
                          System Default
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 mt-0.5 text-xs ${STATUS_LABEL[p.status] ?? "text-gray-400"}`}>
                      {STATUS_ICON[p.status]}
                      {p.status}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!isUsb && (
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">
              Or enter printer name manually
            </label>
            <input
              type="text"
              value={printer.selectedPrinter}
              onChange={(e) => updatePrinter({ selectedPrinter: e.target.value })}
              placeholder="e.g. Brother_HL-L2350DW"
              className="w-full px-3 py-2 rounded-lg border border-[#ddd8d0] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </section>

      {/* Print options — hidden for USB since ESC/POS handles formatting directly */}
      {!isUsb && (
        <section>
          <h3 className="text-sm font-bold text-slate-600 mb-4">
            Print Options
            {selectedInfo && (
              <span className="ml-2 font-normal normal-case text-gray-400">
                — {selectedInfo.name}
              </span>
            )}
          </h3>

          <div className="bg-white border border-[#ddd8d0] rounded-xl divide-y divide-gray-100">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-800">Paper Size</p>
                <p className="text-xs text-gray-400 mt-0.5">Size of media loaded in the printer</p>
              </div>
              <select
                value={printer.paperSize}
                onChange={(e) => updatePrinter({ paperSize: e.target.value })}
                className="px-3 py-1.5 rounded-lg border border-[#ddd8d0] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {PAPER_SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-800">Orientation</p>
                <p className="text-xs text-gray-400 mt-0.5">Page rotation</p>
              </div>
              <div className="flex rounded-lg border border-[#ddd8d0] overflow-hidden text-sm">
                {(["portrait", "landscape"] as const).map((o) => (
                  <button
                    key={o}
                    onClick={() => updatePrinter({ orientation: o })}
                    className={`px-3 py-1.5 capitalize transition-colors cursor-pointer ${
                      printer.orientation === o
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 hover:bg-surface"
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-800">Print Quality</p>
                <p className="text-xs text-gray-400 mt-0.5">Higher quality uses more ink and is slower</p>
              </div>
              <div className="flex rounded-lg border border-[#ddd8d0] overflow-hidden text-sm">
                {(["draft", "normal", "high"] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => updatePrinter({ quality: q })}
                    className={`px-3 py-1.5 capitalize transition-colors cursor-pointer ${
                      printer.quality === q
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 hover:bg-surface"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-800">Color Mode</p>
                <p className="text-xs text-gray-400 mt-0.5">Grayscale is faster and uses less ink</p>
              </div>
              <div className="flex rounded-lg border border-[#ddd8d0] overflow-hidden text-sm">
                {(["color", "grayscale"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => updatePrinter({ colorMode: c })}
                    className={`px-3 py-1.5 capitalize transition-colors cursor-pointer ${
                      printer.colorMode === c
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 hover:bg-surface"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-800">Copies</p>
                <p className="text-xs text-gray-400 mt-0.5">Number of copies to print per job</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updatePrinter({ copies: Math.max(1, printer.copies - 1) })}
                  className="w-8 h-8 rounded-lg border border-[#ddd8d0] flex items-center justify-center text-gray-600 hover:bg-surface transition-colors cursor-pointer text-lg leading-none"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-semibold text-gray-800">
                  {printer.copies}
                </span>
                <button
                  onClick={() => updatePrinter({ copies: Math.min(99, printer.copies + 1) })}
                  className="w-8 h-8 rounded-lg border border-[#ddd8d0] flex items-center justify-center text-gray-600 hover:bg-surface transition-colors cursor-pointer text-lg leading-none"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Ticket layout — USB only */}
      {isUsb && (
        <TicketTemplateEditor
          template={printer.ticketTemplate}
          posSystem={config.posSystem}
          portPath={printer.portPath}
          onChange={(ticketTemplate) => updatePrinter({ ticketTemplate })}
        />
      )}
    </div>
  );
}

// ── Ticket template editor ────────────────────────────────────────────────────

const BARCODE_SUPPORTED = new Set(["ticketNumber", "itemList"]);

const SAMPLE: Record<string, string> = {
  ticketNumber:       "000014684",
  customerIdentifier: "01040363",
  customerName:       "John Smith",
  numItems:           "4 items",
  dropoffDate:        "04/03/2026",
  pickupDate:         "04/10/2026",
  comments:           "Handle with care",
  itemList:           "T1476237  Ld Bag\nT2003925  LD Shirt Hanger\nT1428942  LD Shirt Hanger\nT1444476  LD Shirt Hanger",
};

const FIELDS_UNAVAILABLE_FOR: Record<string, Set<string>> = {
  wincleaners: new Set(["customerName", "customerPhone"]),
};

function TicketTemplateEditor({
  template,
  posSystem,
  portPath,
  onChange,
}: {
  template: TicketTemplateConfig;
  posSystem: string;
  portPath: string;
  onChange: (t: TicketTemplateConfig) => void;
}) {
  const [testPrinting, setTestPrinting] = useState(false);
  const [testPrintResult, setTestPrintResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleTestPrint() {
    setTestPrinting(true);
    setTestPrintResult(null);
    try {
      await invoke("test_print_ticket", { portPath, template });
      setTestPrintResult({ ok: true, msg: "Test print sent successfully." });
    } catch (err) {
      setTestPrintResult({ ok: false, msg: String(err) });
    } finally {
      setTestPrinting(false);
    }
  }

  const unavailable = FIELDS_UNAVAILABLE_FOR[posSystem] ?? new Set<string>();
  function updateField(id: string, updates: Partial<TicketField>) {
    const fields = template.fields.map((f) => (f.id === id ? { ...f, ...updates } : f));
    onChange({ ...template, fields });
  }

  function moveField(id: string, dir: -1 | 1) {
    const visible = template.fields.filter((f) => !unavailable.has(f.id));
    const visibleIdx = visible.findIndex((f) => f.id === id);
    const neighborId = visible[visibleIdx + dir]?.id;
    if (!neighborId) return;
    // Swap the two fields in the full (unfiltered) array
    const fields = [...template.fields];
    const a = fields.findIndex((f) => f.id === id);
    const b = fields.findIndex((f) => f.id === neighborId);
    [fields[a], fields[b]] = [fields[b], fields[a]];
    onChange({ ...template, fields });
  }

  return (
    <div className="mt-2 border-t border-[#ddd8d0] pt-8">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-slate-600">Ticket Layout</h3>
        <button
          onClick={handleTestPrint}
          disabled={testPrinting || !portPath}
          title={!portPath ? "Select a USB port first" : "Send a test print to the printer"}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <PrinterCheck size={14} className={testPrinting ? "animate-pulse" : ""} />
          {testPrinting ? "Printing…" : "Test Print"}
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Configure what prints on each ticket. Drag fields up/down to reorder.
      </p>
      {testPrintResult && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg border text-sm ${
          testPrintResult.ok
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {testPrintResult.msg}
        </div>
      )}

      <div className="flex gap-6 items-start">
        {/* Editor column */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Header */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Header text</label>
            <input
              type="text"
              value={template.headerText}
              onChange={(e) => onChange({ ...template, headerText: e.target.value })}
              placeholder="e.g. ACME DRY CLEANERS"
              className="w-full px-3 py-2 rounded-lg border border-[#ddd8d0] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Fields */}
          <div className="bg-white border border-[#ddd8d0] rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] text-xs font-semibold text-slate-500 bg-surface border-b border-[#ddd8d0] px-4 py-2.5">
              <span>Field</span>
              <span className="pr-3">Barcode</span>
              <span>On/Off</span>
            </div>
            {template.fields.filter((f) => !unavailable.has(f.id)).map((field, i, arr) => (
              <div
                key={field.id}
                className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-3 ${
                  i < arr.length - 1 ? "border-b border-[#f0ede8]" : ""
                } ${!field.enabled ? "opacity-40" : ""}`}
              >
                {/* Move buttons */}
                <div className="flex flex-col">
                  <button
                    onClick={() => moveField(field.id, -1)}
                    disabled={i === 0}
                    className="text-gray-300 hover:text-gray-500 disabled:opacity-0 cursor-pointer"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    onClick={() => moveField(field.id, 1)}
                    disabled={i === arr.length - 1}
                    className="text-gray-300 hover:text-gray-500 disabled:opacity-0 cursor-pointer"
                  >
                    <ChevronDown size={13} />
                  </button>
                </div>

                <span className="text-sm text-gray-800">{field.label}</span>

                {/* Barcode toggle */}
                <div className="pr-3">
                  {BARCODE_SUPPORTED.has(field.id) ? (
                    <button
                      onClick={() => updateField(field.id, { showBarcode: !field.showBarcode })}
                      title="Print barcode"
                      className={`flex items-center justify-center w-7 h-7 rounded-md border transition-colors cursor-pointer ${
                        field.showBarcode
                          ? "border-blue-500 bg-blue-50 text-blue-600"
                          : "border-[#ddd8d0] text-gray-300 hover:border-[#ddd8d0]"
                      }`}
                    >
                      <Barcode size={14} />
                    </button>
                  ) : (
                    <div className="w-7" />
                  )}
                </div>

                {/* Enable toggle */}
                <button
                  onClick={() => updateField(field.id, { enabled: !field.enabled })}
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                    field.enabled ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      field.enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Footer text</label>
            <input
              type="text"
              value={template.footerText}
              onChange={(e) => onChange({ ...template, footerText: e.target.value })}
              placeholder="e.g. Thank you for your business!"
              className="w-full px-3 py-2 rounded-lg border border-[#ddd8d0] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Preview column */}
        <div className="w-52 flex-shrink-0">
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Preview</p>
          <TicketPreview template={template} posSystem={posSystem} />
        </div>
      </div>
    </div>
  );
}

function TicketPreview({ template, posSystem }: { template: TicketTemplateConfig; posSystem: string }) {
  const unavailable = FIELDS_UNAVAILABLE_FOR[posSystem] ?? new Set<string>();
  const enabled = template.fields.filter((f) => f.enabled && !unavailable.has(f.id));

  return (
    <div className="bg-white border border-[#ddd8d0] rounded-xl p-3 font-mono text-[10px] leading-relaxed text-gray-800 shadow-sm w-full">
      {template.headerText && (
        <>
          <div className="text-center font-bold text-[11px] uppercase tracking-wide">{template.headerText}</div>
          <div className="border-t border-dashed border-[#ddd8d0] my-1.5" />
        </>
      )}

      {enabled.map((field, i) => {
        const value = SAMPLE[field.id] ?? "";
        const isLast = i === enabled.length - 1;

        if (field.id === "itemList") {
          return (
            <div key={field.id} className={`${!isLast ? "mb-1" : ""}`}>
              <div className="text-gray-400 uppercase text-[9px] tracking-wide mb-0.5">Garments</div>
              {value.split("\n").map((line, li) => (
                <div key={li} className="truncate">{line}</div>
              ))}
            </div>
          );
        }

        const LABELS: Record<string, string> = {
          ticketNumber: "Ticket",
          customerIdentifier: "Customer",
          customerName: "Name",
          numItems: "Items",
          dropoffDate: "Drop-off",
          pickupDate: "Pickup",
          comments: "Notes",
        };

        return (
          <div key={field.id} className={`${!isLast ? "mb-0.5" : ""}`}>
            {field.showBarcode ? (
              <div className="mb-1">
                <div>{LABELS[field.id] ?? field.label}: {value}</div>
                <div className="text-[8px] tracking-[0.25em] text-gray-500 my-0.5">
                  ▌▌▌▌▌ ▌▌ ▌▌▌ ▌▌▌▌ ▌▌ ▌▌▌▌▌
                </div>
              </div>
            ) : (
              <div>
                <span className="text-gray-500">{LABELS[field.id] ?? field.label}:</span>{" "}
                {value}
              </div>
            )}
          </div>
        );
      })}

      {template.footerText && (
        <>
          <div className="border-t border-dashed border-[#ddd8d0] my-1.5" />
          <div className="text-center text-gray-500">{template.footerText}</div>
        </>
      )}
    </div>
  );
}
