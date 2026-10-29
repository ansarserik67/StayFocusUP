"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Heart, Wind } from "lucide-react";

import { useLang } from "@/components/i18n/LanguageProvider";
import { Portal } from "@/components/ui/Portal";
import { dailyQuote } from "@/lib/i18n";
import { dayKey } from "@/lib/state";

export type BreathingMode = "giveUp" | "break";

const TOTAL_MS = 10_000;
const INHALE_MS = 4_000;
const HOLD_MS = 2_000;

interface BreathingProps {
  mode: BreathingMode;
  streak?: number;
  onKeepGoing: () => void;
  onExit?: () => void;
}

/** Mounts the dialog only while open so each exercise starts from zero. */
export function BreathingOverlay({
  open,
  ...props
}: BreathingProps & { open: boolean }) {
  if (!open) return null;
  return <BreathingDialog {...props} />;
}

function BreathingDialog({ mode, streak = 0, onKeepGoing, onExit }: BreathingProps) {
  const { t, lang } = useLang();
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const started = performance.now();
    const timer = window.setInterval(() => {
      const next = Math.min(TOTAL_MS, performance.now() - started);
      setElapsed(next);
      if (next >= TOTAL_MS) {
        window.clearInterval(timer);
        setDone(true);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const phase: "inhale" | "hold" | "exhale" =
    elapsed < INHALE_MS ? "inhale" : elapsed < INHALE_MS + HOLD_MS ? "hold" : "exhale";
  const remaining = Math.max(0, Math.ceil((TOTAL_MS - elapsed) / 1000));
  const scale = done ? 1 : phase === "inhale" ? 1.24 : phase === "hold" ? 1.24 : 0.82;
  const transitionMs = phase === "inhale" || phase === "exhale" ? 4000 : 500;
  const phaseLabel =
    phase === "inhale"
      ? t("breathe.inhale")
      : phase === "hold"
        ? t("breathe.hold")
        : t("breathe.exhale");
  const quote =
    mode === "giveUp" ? dailyQuote(lang, dayKey(), streak) : t("breathe.breakText");

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[170] flex flex-col items-center justify-center overflow-y-auto bg-[#04070f]/95 px-5 py-10 backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="breathe-title"
      >
      <div className="flex w-full max-w-[520px] flex-col items-center text-center">
        <span className="chip !border-cyan/30 !bg-cyan/10 !text-cyan">
          <Wind size={13} />
          {mode === "giveUp" ? t("breathe.title") : t("breathe.breakTitle")}
        </span>
        <h2
          id="breathe-title"
          className="font-display mt-5 text-[26px] font-extrabold leading-tight text-white sm:text-[30px]"
        >
          {done
            ? mode === "giveUp"
              ? t("breathe.askTitle")
              : t("breathe.breakDone")
            : t("breathe.title")}
        </h2>
        <p className="mt-2 max-w-[40ch] text-[13.5px] leading-relaxed text-white/65">
          {mode === "giveUp" ? t("breathe.askText") : t("breathe.breakText")}
        </p>

        <div className="relative mt-9 flex h-[236px] w-[236px] items-center justify-center sm:h-[270px] sm:w-[270px]">
          <div
            className="absolute inset-0 rounded-full opacity-40 blur-2xl"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.8) 0%, rgba(34,211,238,0.4) 45%, transparent 70%)",
              transform: `scale(${scale})`,
              transition: `transform ${transitionMs}ms linear`,
            }}
          />
          <div
            className="absolute inset-[26px] rounded-full border border-white/15 bg-white/5"
            style={{
              transform: `scale(${scale})`,
              transition: `transform ${transitionMs}ms linear`,
            }}
          />
          <div
            className="absolute inset-[52px] rounded-full"
            style={{
              transform: `scale(${scale})`,
              transition: `transform ${transitionMs}ms linear`,
              background:
                "radial-gradient(circle at 36% 30%, #6EE7B7, #10B981 45%, #0891B2 100%)",
              boxShadow: "0 24px 70px -22px rgba(16,185,129,0.7)",
            }}
          />
          <div className="relative z-10 flex flex-col items-center">
            <span className="font-display text-[19px] font-extrabold uppercase tracking-[0.18em] text-[#04221b]">
              {done ? t("common.done") : phaseLabel}
            </span>
            {!done && (
              <span className="mt-1 text-[12px] font-semibold text-[#05493b]/80">
                {t("breathe.count", { count: remaining })}
              </span>
            )}
          </div>
        </div>

        {done ? (
          <div className="mt-8 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
            <button type="button" onClick={onKeepGoing} className="btn btn-primary w-full sm:w-auto">
              <Heart size={16} />
              {mode === "giveUp" ? t("breathe.keepGoing") : t("breathe.breakCta")}
            </button>
            {mode === "giveUp" && onExit && (
              <button
                type="button"
                onClick={onExit}
                className="btn w-full border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 sm:w-auto"
              >
                {t("breathe.exit")}
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        ) : (
          <p className="mt-8 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/40">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" />
            {t("breathe.step", {
              current: phase === "inhale" ? 1 : phase === "hold" ? 2 : 3,
              total: 3,
            })}
          </p>
        )}

          <p className="mt-8 max-w-[42ch] border-t border-white/10 pt-5 text-[13.5px] italic leading-relaxed text-white/55">
            “{quote}”
          </p>
        </div>
      </div>
    </Portal>
  );
}
