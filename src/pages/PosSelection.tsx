import { CheckCircle2 } from "lucide-react";
import { ConfiguratorConfig, POS_SYSTEMS } from "../types/config";
import XplorSpotLogo from "../assets/XplorSpotLogo.svg";
import CleanCloudLogo from "../assets/CleanCloudLogo.svg";
import SMRTSystemsLogo from "../assets/SMRTSystemsLogo.svg";

const LOGO_MAP: Record<string, string> = {
  spot: XplorSpotLogo,
  cleancloud: CleanCloudLogo,
  smrt: SMRTSystemsLogo,
};

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
                  ? "border-[#ddd8d0] bg-surface opacity-50 cursor-not-allowed"
                  : isSelected
                  ? "border-blue-600 bg-blue-50 shadow-sm"
                  : "border-[#ddd8d0] bg-white hover:border-blue-300 hover:shadow-sm"
              }`}
            >
              {isSelected && isAvailable && (
                <CheckCircle2
                  size={20}
                  className="absolute top-4 right-4 text-blue-600"
                />
              )}
              {!isAvailable && (
                <span className="absolute top-4 right-4 text-xs font-medium text-gray-400 bg-surface px-2 py-0.5 rounded-full">
                  Coming soon
                </span>
              )}
              {LOGO_MAP[pos.id] ? (
                <img
                  src={LOGO_MAP[pos.id]}
                  alt={`${pos.name} logo`}
                  className="h-8 mb-3 object-contain"
                />
              ) : (
                <div
                  className={`text-lg font-bold mb-1 ${
                    isSelected ? "text-blue-700" : "text-slate-800"
                  }`}
                >
                  {pos.name}
                </div>
              )}
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
      {config.posSystem === "wincleaners" && (
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
          <p className="text-sm text-blue-800 font-medium">WinCleaners selected</p>
          <p className="text-sm text-blue-700">
            WinCleaners exports <strong>TICKET_CREATE</strong> and{" "}
            <strong>GARMENT_CREATE</strong> rows. Field mappings have been
            pre-configured for the GARMENT_CREATE row format.
          </p>
          <p className="text-sm text-blue-700">
            Note: customer name and phone are not present in WinCleaners
            exports — only the account number. Pickup date comes from the
            TICKET_CREATE row and must be cross-referenced by invoice number
            in OAS.
          </p>
        </div>
      )}
    </div>
  );
}
