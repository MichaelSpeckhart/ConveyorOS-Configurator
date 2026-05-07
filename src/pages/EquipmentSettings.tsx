import { ConfiguratorConfig, FrameConfig } from "../types/config";

interface Props {
  config: ConfiguratorConfig;
  onChange: (updates: Partial<ConfiguratorConfig>) => void;
}

function makeFrame(latches: 5 | 10): FrameConfig {
  return { latches, slots: Array(latches).fill(true) };
}

function setFrameLatches(frame: FrameConfig, latches: 5 | 10): FrameConfig {
  const slots = Array(latches)
    .fill(false)
    .map((_, i) => frame.slots[i] ?? true);
  return { latches, slots };
}

export default function EquipmentSettings({ config, onChange }: Props) {
  const frames: FrameConfig[] = config.frames ?? [makeFrame(5)];

  function updateFrames(next: FrameConfig[]) {
    onChange({ frames: next });
  }

  function setLatches(fi: number, latches: 5 | 10) {
    const next = frames.map((f, i) => (i === fi ? setFrameLatches(f, latches) : f));
    updateFrames(next);
  }

  function toggleSlot(fi: number, si: number) {
    const next = frames.map((f, i) => {
      if (i !== fi) return f;
      const slots = f.slots.map((v, j) => (j === si ? !v : v));
      return { ...f, slots };
    });
    updateFrames(next);
  }

  function addFrame() {
    updateFrames([...frames, makeFrame(5)]);
  }

  function removeFrame(fi: number) {
    updateFrames(frames.filter((_, i) => i !== fi));
  }

  // Flatten all slots for the right-hand list
  const allSlots = frames.flatMap((f, fi) =>
    f.slots.map((enabled, si) => ({ fi, si, enabled }))
  );

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Equipment</h2>
        <p className="mt-1 text-slate-500 text-sm">
          Configure the connection to your conveyor hardware controller.
        </p>
      </div>

      {/* OPC Address */}
      <div className="bg-white border border-[#ddd8d0] rounded-xl p-6 mb-6">
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

      {/* Two lists side-by-side */}
      <div className="grid grid-cols-2 gap-4">

        {/* Frames list */}
        <div className="bg-white border border-[#ddd8d0] rounded-xl flex flex-col">
          <div className="px-4 pt-4 pb-2 border-b border-[#ddd8d0]">
            <h3 className="text-sm font-semibold text-slate-800">Frames</h3>
            <p className="text-xs text-slate-400 mt-0.5">Set latch count per frame</p>
          </div>

          <div className="overflow-y-auto flex-1" style={{ maxHeight: 320 }}>
            {frames.map((frame, fi) => (
              <div
                key={fi}
                className="flex items-center gap-2 px-4 py-2.5 border-b border-[#f0ece6] last:border-0"
              >
                <span className="text-sm text-slate-600 w-16 shrink-0">
                  Frame {fi + 1}
                </span>

                {/* 5 / 10 toggle */}
                <div className="flex rounded-lg border border-[#ddd8d0] overflow-hidden text-xs font-medium">
                  {([5, 10] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setLatches(fi, n)}
                      className={`px-3 py-1.5 transition-colors ${
                        frame.latches === n
                          ? "bg-[#1e3d4f] text-white"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-400">latch</span>

                <button
                  type="button"
                  onClick={() => removeFrame(fi)}
                  disabled={frames.length === 1}
                  className="ml-auto text-slate-300 hover:text-red-400 disabled:opacity-0 disabled:cursor-default text-base leading-none"
                  title="Remove frame"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-[#ddd8d0]">
            <button
              type="button"
              onClick={addFrame}
              className="text-xs font-medium text-[#1e3d4f] hover:underline"
            >
              + Add Frame
            </button>
          </div>
        </div>

        {/* Slots list */}
        <div className="bg-white border border-[#ddd8d0] rounded-xl flex flex-col">
          <div className="px-4 pt-4 pb-2 border-b border-[#ddd8d0]">
            <h3 className="text-sm font-semibold text-slate-800">Slots</h3>
            <p className="text-xs text-slate-400 mt-0.5">Enable or disable each slot</p>
          </div>

          <div className="overflow-y-auto flex-1" style={{ maxHeight: 320 }}>
            {allSlots.length === 0 && (
              <p className="px-4 py-3 text-xs text-slate-400">No slots configured.</p>
            )}
            {allSlots.map(({ fi, si, enabled }) => (
              <div
                key={`${fi}-${si}`}
                className="flex items-center gap-2 px-4 py-2.5 border-b border-[#f0ece6] last:border-0"
              >
                <span className="text-sm text-slate-600 w-24 shrink-0">
                  F{fi + 1} · S{si + 1}
                </span>

                <button
                  type="button"
                  onClick={() => toggleSlot(fi, si)}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                    enabled ? "bg-[#1e3d4f]" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                      enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>

                <span className="text-xs text-slate-400">
                  {enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800 font-medium">
          Need help with these settings?
        </p>
        <p className="text-xs text-amber-700 mt-1">
          The OPC server address and conveyor layout are configured by your
          equipment installer. Do not change these unless instructed.
        </p>
      </div>
    </div>
  );
}
