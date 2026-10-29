"use client";

import { CloudRain, Music2, VolumeX } from "lucide-react";

import { useFocus } from "@/components/focus/FocusProvider";
import { useLang } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";
import type { AmbientTrack } from "@/lib/types";

const TRACKS: Array<{
  id: AmbientTrack;
  icon: typeof Music2;
  labelKey: "audio.off" | "audio.lofi" | "audio.rain";
}> = [
  { id: "off", icon: VolumeX, labelKey: "audio.off" },
  { id: "lofi", icon: Music2, labelKey: "audio.lofi" },
  { id: "rain", icon: CloudRain, labelKey: "audio.rain" },
];

export function AudioControls({ compact = false }: { compact?: boolean }) {
  const { state, updateSettings } = useFocus();
  const { t } = useLang();
  const { push } = useToast();
  const { track, volume } = state.settings;

  const select = (next: AmbientTrack) => {
    updateSettings({ track: next });
    push(next === "off" ? t("toast.soundOff") : t("toast.soundOn"), "info");
  };

  return (
    <div className={compact ? "space-y-2.5" : "space-y-4"}>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("header.audio")}>
        {TRACKS.map(({ id, icon: Icon, labelKey }) => {
          const active = track === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => select(id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${
                active
                  ? "border-emerald/50 bg-emerald/15 text-emerald"
                  : "border-line bg-surface-2/50 text-ink-soft hover:border-line-strong hover:text-ink"
              }`}
            >
              <Icon size={14} />
              {t(labelKey)}
            </button>
          );
        })}
      </div>

      <label className="block">
        <span className="mb-1.5 flex items-center justify-between text-[12px] text-ink-mute">
          <span>{t("audio.volume")}</span>
          <span className="font-mono">{Math.round(volume * 100)}%</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(event) => updateSettings({ volume: Number(event.target.value) / 100 })}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-emerald"
          aria-label={t("audio.volume")}
        />
      </label>
    </div>
  );
}
