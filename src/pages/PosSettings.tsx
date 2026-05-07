import { ConfiguratorConfig, PosSettingsConfig } from "../types/config";

interface Props {
  config: ConfiguratorConfig;
  onChange: (updates: Partial<ConfiguratorConfig>) => void;
}

function update(
  config: ConfiguratorConfig,
  onChange: Props["onChange"],
  patch: Partial<PosSettingsConfig>
) {
  onChange({ posSettings: { ...config.posSettings, ...patch } });
}

interface OptionGroupProps<T extends string> {
  label: string;
  description: string;
  value: T;
  options: { value: T; label: string; description: string }[];
  onChange: (v: T) => void;
}

function OptionGroup<T extends string>({
  label,
  description,
  value,
  options,
  onChange,
}: OptionGroupProps<T>) {
  return (
    <div className="bg-white border border-[#ddd8d0] rounded-xl p-6">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5 mb-4">{description}</p>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                active
                  ? "border-[#1e3d4f] bg-[#1e3d4f]/5"
                  : "border-[#ddd8d0] hover:border-slate-400"
              }`}
            >
              <p className={`text-sm font-semibold ${active ? "text-[#1e3d4f]" : "text-slate-700"}`}>
                {opt.label}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{opt.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <div className="bg-white border border-[#ddd8d0] rounded-xl p-6 flex items-center gap-4">
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
          value ? "bg-[#1e3d4f]" : "bg-slate-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function PosSettings({ config, onChange }: Props) {
  const s = config.posSettings;

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">POS Settings</h2>
        <p className="mt-1 text-slate-500 text-sm">
          Control how ConveyorOS integrates with your POS system.
        </p>
      </div>

      <div className="space-y-4">
        <OptionGroup
          label="Receipt Printing"
          description="Which system is responsible for printing the customer receipt."
          value={s.receiptPrinting}
          options={[
            {
              value: "oas",
              label: "Printed by OAS",
              description: "ConveyorOS prints the receipt using its ticket template.",
            },
            {
              value: "pos",
              label: "Printed by POS",
              description: "Your POS handles printing. OAS does not print receipts.",
            },
          ]}
          onChange={(v) => update(config, onChange, { receiptPrinting: v })}
        />

        <OptionGroup
          label="Receipt Layout"
          description="The format used when OAS prints receipts."
          value={s.receiptLayout}
          options={[
            {
              value: "dynamic",
              label: "Dynamic",
              description: "Uses your custom ticket template from Printer Settings.",
            },
            {
              value: "simple",
              label: "Simple",
              description: "Fixed layout: ticket number, customer, item count, dates.",
            },
          ]}
          onChange={(v) => update(config, onChange, { receiptLayout: v })}
        />

        <OptionGroup
          label="Duplicate Ticket Handling"
          description="What to do when the same ticket number arrives more than once."
          value={s.duplicateTicketHandling}
          options={[
            {
              value: "skip",
              label: "Skip",
              description: "Ignore the duplicate. The existing record is kept as-is.",
            },
            {
              value: "overwrite",
              label: "Overwrite",
              description: "Replace the existing record with the newer data.",
            },
          ]}
          onChange={(v) => update(config, onChange, { duplicateTicketHandling: v })}
        />

        <ToggleRow
          label="Auto-Complete Orders"
          description="Automatically mark an order as complete when all garments have been picked up from the conveyor."
          value={s.autoCompleteOrders}
          onChange={(v) => update(config, onChange, { autoCompleteOrders: v })}
        />
      </div>
    </div>
  );
}
