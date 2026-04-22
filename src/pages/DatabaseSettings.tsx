import { DatabaseConfig, ConfiguratorConfig } from "../types/config";

interface Props {
  config: ConfiguratorConfig;
  onChange: (updates: Partial<ConfiguratorConfig>) => void;
}

interface FieldProps {
  label: string;
  hint?: string;
  value: string | number;
  type?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

function Field({ label, hint, value, type = "text", placeholder, onChange }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      {hint && <p className="text-xs text-slate-400 mb-1.5">{hint}</p>}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-[#ddd8d0] rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-navy focus:ring-1 focus:ring-[rgba(30,61,79,0.12)]"
      />
    </div>
  );
}

export default function DatabaseSettings({ config, onChange }: Props) {
  function updateDb(updates: Partial<DatabaseConfig>) {
    onChange({ database: { ...config.database, ...updates } });
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Database</h2>
        <p className="mt-1 text-slate-500 text-sm">
          ConveyorOS stores all order data in a PostgreSQL database. Enter the
          connection details provided by your IT team or installer.
        </p>
      </div>

      <div className="bg-white border border-[#ddd8d0] rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <Field
            label="Host"
            hint="The computer or server running the database"
            value={config.database.host}
            placeholder="localhost"
            onChange={(v) => updateDb({ host: v })}
          />
          <Field
            label="Port"
            hint="Default is 5432"
            value={config.database.port}
            type="number"
            placeholder="5432"
            onChange={(v) => updateDb({ port: parseInt(v) || 5432 })}
          />
        </div>

        <Field
          label="Database Name"
          hint="The name of the ConveyorOS database"
          value={config.database.name}
          placeholder="conveyor-app"
          onChange={(v) => updateDb({ name: v })}
        />

        <div className="grid grid-cols-2 gap-5">
          <Field
            label="Username"
            value={config.database.user}
            placeholder="postgres"
            onChange={(v) => updateDb({ user: v })}
          />
          <Field
            label="Password"
            value={config.database.password}
            type="password"
            placeholder="••••••••"
            onChange={(v) => updateDb({ password: v })}
          />
        </div>
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800 font-medium">
          Need help with these settings?
        </p>
        <p className="text-xs text-amber-700 mt-1">
          Contact your ConveyorOS installer or IT support. Incorrect database
          settings will prevent orders from being saved.
        </p>
      </div>
    </div>
  );
}
