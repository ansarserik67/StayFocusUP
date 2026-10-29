"use client";

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-none items-center rounded-full border transition-colors duration-200 ${
        checked
          ? "border-emerald/60 bg-emerald/30"
          : "border-line-strong bg-surface-2"
      }`}
    >
      <span
        className={`inline-block h-4.5 w-4.5 rounded-full bg-ink shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[23px] bg-emerald" : "translate-x-[3px] bg-ink-mute"
        }`}
        style={{ height: 18, width: 18 }}
      />
    </button>
  );
}
