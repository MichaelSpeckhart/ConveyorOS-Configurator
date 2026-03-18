import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { ConfiguratorConfig } from "../types/config";

interface Props {
  config: ConfiguratorConfig;
  onChange: (updates: Partial<ConfiguratorConfig>) => void;
}

interface FolderFieldProps {
  label: string;
  description: string;
  value: string;
  onPick: () => void;
  status: "unchecked" | "ok" | "error";
}

function FolderField({
  label,
  description,
  value,
  onPick,
  status,
}: FolderFieldProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm">{label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          {value ? (
            <div className="flex items-center gap-2 mt-3">
              {status === "ok" && (
                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
              )}
              {status === "error" && (
                <XCircle size={14} className="text-red-500 shrink-0" />
              )}
              <code className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded truncate block">
                {value}
              </code>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-3 italic">
              No folder selected
            </p>
          )}
        </div>
        <button
          onClick={onPick}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <FolderOpen size={15} />
          Browse
        </button>
      </div>
    </div>
  );
}

export default function DataSource({ config, onChange }: Props) {
  const [watchStatus, setWatchStatus] = useState<"unchecked" | "ok" | "error">(
    "unchecked"
  );
  const [outputStatus, setOutputStatus] = useState<
    "unchecked" | "ok" | "error"
  >("unchecked");

  async function checkFolder(
    path: string,
    setStatus: (s: "unchecked" | "ok" | "error") => void
  ) {
    if (!path) return;
    const ok = await invoke<boolean>("check_folder", { path });
    setStatus(ok ? "ok" : "error");
  }

  async function pickWatchFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (selected && typeof selected === "string") {
      onChange({
        dataSource: { ...config.dataSource, watchDirectory: selected },
      });
      setWatchStatus("unchecked");
      await checkFolder(selected, setWatchStatus);
    }
  }

  async function pickOutputFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (selected && typeof selected === "string") {
      onChange({
        dataSource: { ...config.dataSource, outputDirectory: selected },
      });
      setOutputStatus("unchecked");
      await checkFolder(selected, setOutputStatus);
    }
  }

  const posLabel =
    config.posSystem === "spot" ? "SPOT" : config.posSystem.toUpperCase();

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Data Source</h2>
        <p className="mt-1 text-slate-500 text-sm">
          Tell ConveyorOS where {posLabel} saves its files and where to write
          responses back.
        </p>
      </div>

      <div className="space-y-4">
        <FolderField
          label={`${posLabel} Export Folder`}
          description={`The folder where ${posLabel} drops its order files. ConveyorOS watches this folder for new data.`}
          value={config.dataSource.watchDirectory}
          onPick={pickWatchFolder}
          status={watchStatus}
        />

        <div className="flex justify-center">
          <ArrowRight size={20} className="text-slate-300" />
        </div>

        <FolderField
          label="ConveyorOS Response Folder"
          description={`The folder where ConveyorOS writes back to ${posLabel} (conveyor slot confirmations and updates).`}
          value={config.dataSource.outputDirectory}
          onPick={pickOutputFolder}
          status={outputStatus}
        />
      </div>

      {config.dataSource.watchDirectory &&
        config.dataSource.outputDirectory && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium flex items-center gap-2">
              <CheckCircle2 size={15} />
              Both folders are configured
            </p>
            <p className="text-xs text-green-700 mt-1">
              Make sure {posLabel} is also pointed at these same folders in its
              own settings.
            </p>
          </div>
        )}
    </div>
  );
}
