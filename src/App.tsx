import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  LayoutGrid,
  FolderOpen,
  Columns3,
  Database,
  Cpu,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { ConfiguratorConfig, NavSection, defaultConfig } from "./types/config";
import PosSelection from "./pages/PosSelection";
import DataSource from "./pages/DataSource";
import FieldMappings from "./pages/FieldMappings";
import DatabaseSettings from "./pages/DatabaseSettings";
import EquipmentSettings from "./pages/EquipmentSettings";

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ReactNode }[] = [
  { id: "pos-system", label: "POS System", icon: <LayoutGrid size={18} /> },
  { id: "data-source", label: "Data Source", icon: <FolderOpen size={18} /> },
  {
    id: "field-mappings",
    label: "Field Mappings",
    icon: <Columns3 size={18} />,
  },
  { id: "database", label: "Database", icon: <Database size={18} /> },
  { id: "equipment", label: "Equipment", icon: <Cpu size={18} /> },
];

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>("pos-system");
  const [config, setConfig] = useState<ConfiguratorConfig>(defaultConfig);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    invoke<ConfiguratorConfig>("load_config")
      .then((loaded) => setConfig(loaded))
      .catch(console.error);
  }, []);

  function updateConfig(updates: Partial<ConfiguratorConfig>) {
    setConfig((prev) => ({ ...prev, ...updates }));
    setIsDirty(true);
    setSaveStatus("idle");
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-700">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
            ConveyorOS
          </p>
          <h1 className="text-white text-base font-semibold leading-tight">
            Configurator
          </h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeSection === item.id
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Save button + status */}
        <div className="px-3 pb-5 space-y-2">
          {saveStatus === "saved" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-900/40 text-green-400 text-xs">
              <CheckCircle2 size={14} />
              Settings saved
            </div>
          )}
          {saveStatus === "error" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/40 text-red-400 text-xs">
              <AlertCircle size={14} />
              Save failed
            </div>
          )}
          {isDirty && saveStatus === "idle" && (
            <p className="text-xs text-slate-500 text-center">
              Unsaved changes
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              saveStatus === "saving"
                ? "bg-blue-800 text-blue-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            <Save size={16} />
            {saveStatus === "saving" ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {activeSection === "pos-system" && <PosSelection {...pageProps} />}
        {activeSection === "data-source" && <DataSource {...pageProps} />}
        {activeSection === "field-mappings" && <FieldMappings {...pageProps} />}
        {activeSection === "database" && <DatabaseSettings {...pageProps} />}
        {activeSection === "equipment" && <EquipmentSettings {...pageProps} />}
      </main>
    </div>
  );
}
