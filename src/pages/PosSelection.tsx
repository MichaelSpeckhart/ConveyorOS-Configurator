import { CheckCircle2 } from "lucide-react";
import { ConfiguratorConfig, POS_SYSTEMS } from "../types/config";

interface Props {
  config: ConfiguratorConfig;
  onChange: (updates: Partial<ConfiguratorConfig>) => void;
}

export default function PosSelection({ config, onChange }: Props) {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">POS System</h2>
        <p className="mt-1 text-slate-500 text-sm">
          Select the Point of Sale software your dry cleaning business uses.
          This tells ConveyorOS how to read your order data.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {POS_SYSTEMS.map((pos) => {
          const isSelected = config.posSystem === pos.id;
          const isAvailable = pos.available;

          return (
            <button
              key={pos.id}
              disabled={!isAvailable}
              onClick={() => isAvailable && onChange({ posSystem: pos.id })}
              className={`relative text-left p-5 rounded-xl border-2 transition-all cursor-pointer ${
                !isAvailable
                  ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                  : isSelected
                  ? "border-blue-600 bg-blue-50 shadow-sm"
                  : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm"
              }`}
            >
              {isSelected && isAvailable && (
                <CheckCircle2
                  size={20}
                  className="absolute top-4 right-4 text-blue-600"
                />
              )}
              {!isAvailable && (
                <span className="absolute top-4 right-4 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  Coming soon
                </span>
              )}
              <div
                className={`text-lg font-bold mb-1 ${
                  isSelected ? "text-blue-700" : "text-slate-800"
                }`}
              >
                {pos.name}
              </div>
              <div className="text-sm text-slate-500">{pos.description}</div>
            </button>
          );
        })}
      </div>

      {config.posSystem === "spot" && (
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-medium">SPOT selected</p>
          <p className="text-sm text-blue-700 mt-1">
            SPOT exports data as CSV files. You'll configure the folder
            location on the <strong>Data Source</strong> page.
          </p>
        </div>
      )}
    </div>
  );
}
