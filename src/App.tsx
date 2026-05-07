import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  LayoutGrid,
  FolderOpen,
  Columns3,
  Database,
  Cpu,
  Printer,
  Save,
  CheckCircle2,
  AlertCircle,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import { ConfiguratorConfig, NavSection, defaultConfig, getDefaultFieldMappings } from "./types/config";
import PosSelection from "./pages/PosSelection";
import DataSource from "./pages/DataSource";
import FieldMappings from "./pages/FieldMappings";
import DatabaseSettings from "./pages/DatabaseSettings";
import EquipmentSettings from "./pages/EquipmentSettings";
import PrinterSettings from "./pages/PrinterSettings";
import PosSettings from "./pages/PosSettings";

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ReactNode }[] = [
  { id: "pos-system",      label: "POS System",    icon: <LayoutGrid size={18} /> },
  { id: "pos-settings",    label: "POS Settings",  icon: <SlidersHorizontal size={18} /> },
  { id: "data-source",     label: "Data Source",   icon: <FolderOpen size={18} /> },
  { id: "field-mappings",  label: "Field Mappings",icon: <Columns3 size={18} /> },
  { id: "database",        label: "Database",      icon: <Database size={18} /> },
  { id: "equipment",       label: "Equipment",     icon: <Cpu size={18} /> },
  { id: "printer-settings",label: "Printer",       icon: <Printer size={18} /> },
];

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>("pos-system");
  const [config, setConfig] = useState<ConfiguratorConfig>(defaultConfig);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [applyStatus, setApplyStatus] = useState<"idle" | "applying" | "applied" | "error">("idle");

  useEffect(() => {
    invoke<ConfiguratorConfig>("load_config")
      .then((loaded) => setConfig(loaded))
      .catch(console.error);
  }, []);

  function updateConfig(updates: Partial<ConfiguratorConfig>) {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      if (updates.posSystem && updates.posSystem !== prev.posSystem) {
        next.fieldMappings = getDefaultFieldMappings(updates.posSystem);
      }
      return next;
    });
    setIsDirty(true);
    setSaveStatus("idle");
  }

  async function handleApplyToOas() {
    setApplyStatus("applying");
    try {
      await invoke("apply_to_oas", { config });
      setApplyStatus("applied");
      setTimeout(() => setApplyStatus("idle"), 4000);
    } catch {
      setApplyStatus("error");
    }
  }

  async function handleSave() {
    setSaveStatus("saving");
    try {
      await invoke("save_config", { config });
      setIsDirty(false);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    }
  }

  const pageProps = { config, onChange: updateConfig };

  return (
    <div className="flex h-screen bg-surface">
      {/* Sidebar */}
      <aside className="w-60 bg-navy flex flex-col flex-shrink-0 p-2.5 gap-2">

        {/* Brand */}
        <div className="px-3 py-3 rounded-2xl bg-navy border border-white/15">
          <p className="text-xs font-semibold text-navy-muted mb-0.5">ConveyorOS</p>
          <h1 className="text-white text-base font-bold leading-tight">Configurator</h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-sm transition-all cursor-pointer border ${
                activeSection === item.id
                  ? "bg-white/15 border-white/15 text-white font-semibold"
                  : "border-transparent text-white/75 hover:bg-white/[0.08] hover:text-white font-medium"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="flex flex-col gap-2 px-1 pb-1">
          {/* Save status */}
          {saveStatus === "saved" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/20 text-green-300 text-xs font-semibold">
              <CheckCircle2 size={14} /> Settings saved
            </div>
          )}
          {saveStatus === "error" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/20 text-red-300 text-xs font-semibold">
              <AlertCircle size={14} /> Save failed
            </div>
          )}
          {isDirty && saveStatus === "idle" && (
            <p className="text-xs text-navy-muted text-center">Unsaved changes</p>
          )}

          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              saveStatus === "saving"
                ? "bg-blue-900/60 text-blue-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            <Save size={16} />
            {saveStatus === "saving" ? "Saving…" : "Save Settings"}
          </button>

          {/* Apply status */}
          {applyStatus === "applied" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/20 text-green-300 text-xs font-semibold">
              <CheckCircle2 size={14} /> Applied — restart OAS
            </div>
          )}
          {applyStatus === "error" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/20 text-red-300 text-xs font-semibold">
              <AlertCircle size={14} /> OAS not found
            </div>
          )}

          <button
            onClick={handleApplyToOas}
            disabled={applyStatus === "applying"}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              applyStatus === "applying"
                ? "bg-emerald-900/60 text-emerald-400 cursor-not-allowed"
                : "bg-emerald-700 hover:bg-emerald-600 text-white"
            }`}
          >
            <Send size={16} />
            {applyStatus === "applying" ? "Applying…" : "Apply to OAS"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-surface">
        {activeSection === "pos-system"       && <PosSelection {...pageProps} />}
        {activeSection === "pos-settings"     && <PosSettings {...pageProps} />}
        {activeSection === "data-source"      && <DataSource {...pageProps} />}
        {activeSection === "field-mappings"   && <FieldMappings {...pageProps} />}
        {activeSection === "database"         && <DatabaseSettings {...pageProps} />}
        {activeSection === "equipment"        && <EquipmentSettings {...pageProps} />}
        {activeSection === "printer-settings" && <PrinterSettings {...pageProps} />}
      </main>
    </div>
  );
}
