import { ConfiguratorConfig } from "../types/config";

interface Props {
  config: ConfiguratorConfig;
  onChange: (updates: Partial<ConfiguratorConfig>) => void;
}

export default function EquipmentSettings({ config, onChange }: Props) {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Equipment</h2>
        <p className="mt-1 text-slate-500 text-sm">
          Configure the connection to your conveyor hardware controller.
        </p>
      </div>

      <div className="bg-white border border-[#ddd8d0] rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            OPC Server Address
          </label>
          <p className="text-xs text-slate-400 mb-1.5">
            The network address of the conveyor controller. Your equipment
            installer will provide this.
          </p>
          <input
            type="text"
            value={config.opcServerUrl}
            placeholder="opc.tcp://localhost:4840"
            onChange={(e) => onChange({ opcServerUrl: e.target.value })}
            className="w-full border border-[#ddd8d0] rounded-lg px-3 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:border-navy focus:ring-1 focus:ring-[rgba(30,61,79,0.12)]"
          />
        </div>
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800 font-medium">
          Need help with these settings?
        </p>
        <p className="text-xs text-amber-700 mt-1">
          The OPC server address is configured by your conveyor hardware
          installer. Do not change this unless instructed.
        </p>
      </div>
    </div>
  );
}
