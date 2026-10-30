"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useFocus } from "@/components/focus/FocusProvider";
import { BreathingOverlay } from "@/components/breathe/BreathingOverlay";
import { useLang } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { notificationPermission, showSystemNotification } from "@/lib/notifications";
import { quoteFor, quoteSlots } from "@/lib/quotes";
import { dayKey } from "@/lib/state";

const BREAK_EVERY_SECONDS = 30 * 60;
/** Which slots already fired today, so a reload never repeats a quote. */
const QUOTE_STORAGE_KEY = "stay-focused.quoteSlots";

/**
 * Tracks active time in the app and opens a 10-second breathing break every
 * 30 minutes. Also fires one localized motivational quote per morning.
 * Both are opt-in through Settings and degrade to an in-app popup when the
 * browser refuses notifications.
 */
export function ReminderScheduler() {
  const { state, now, sessionActive } = useFocus();
  const { t, lang } = useLang();
  const { push } = useToast();
  const [breakOpen, setBreakOpen] = useState(false);
  /** `${day}:${slot}` keys already delivered today. */
  const firedRef = useRef<Set<string>>(new Set());
  const firedDayRef = useRef<string>("");
  /** Seconds accumulated inside social apps today's sessions. */
  const socialRef = useRef(0);
  const lastTickRef = useRef(now);
  const settingsRef = useRef(state.settings);

  useEffect(() => {
    settingsRef.current = state.settings;
  }, [state.settings]);

  const openBreak = useCallback(() => {
    socialRef.current = 0;
    setBreakOpen(true);
    if (settingsRef.current.notifications) {
      void showSystemNotification(
        t("notify.breakTitle"),
        t("notify.breakBody"),
        "stay-focused-break",
      );
    }
  }, [t]);

  useEffect(() => {
    const onBreak = () => openBreak();
    window.addEventListener("stay-focused:break", onBreak);
    return () => window.removeEventListener("stay-focused:break", onBreak);
  }, [openBreak]);

  /**
   * Thirty minutes of social scrolling buys a break — counted only while a
   * session is actually running, so time spent inside StayFocus itself never
   * triggers it. The tab is usually hidden by then, which means the break
   * greets you the moment you come back (plus a system notification).
   */
  useEffect(() => {
    const previous = lastTickRef.current;
    lastTickRef.current = now;
    if (!sessionActive) return;
    const delta = Math.floor((now - previous) / 1000);
    if (delta <= 0) return;
    socialRef.current += delta;
    if (!settingsRef.current.breakReminders) return;
    if (socialRef.current >= BREAK_EVERY_SECONDS) openBreak();
  }, [now, sessionActive, openBreak]);

  /**
   * Quotes land at the slots the user picked (Settings → сколько цитат в день).
   *
   * Delivery is idempotent: every fired slot is remembered for the day, so a
   * reload, a second tab or a throttled timer cannot show the same line twice.
   * Missed slots are collapsed into one catch-up quote instead of a burst of
   * stale notifications after the laptop wakes up.
   */
  useEffect(() => {
    const settings = state.settings;
    // The count itself is the switch: picking quotes works even with system
    // notifications off, they simply arrive as in-app cards.
    if (!settings.quoteNotifications) return;
    const count = settings.quotesPerDay;
    if (count <= 0) return;

    const slots = quoteSlots(count);

    const readFired = () => {
      const today = dayKey();
      if (firedDayRef.current === today) return;
      firedDayRef.current = today;
      const raw = (() => {
        try {
          return window.localStorage.getItem(QUOTE_STORAGE_KEY);
        } catch {
          return null;
        }
      })();
      firedRef.current = new Set<string>();
      if (!raw) return;
      try {
        const stored = JSON.parse(raw) as { day?: string; slots?: number[] };
        if (stored.day !== today || !Array.isArray(stored.slots)) return;
        for (const slot of stored.slots) firedRef.current.add(`${today}:${slot}`);
      } catch {
        /* corrupted value — start the day clean */
      }
    };

    const persist = () => {
      const today = dayKey();
      const slots = [...firedRef.current]
        .filter((key) => key.startsWith(`${today}:`))
        .map((key) => Number(key.split(":")[1]))
        .filter((value) => Number.isFinite(value));
      try {
        window.localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify({ day: today, slots }));
      } catch {
        /* private mode — the in-memory set still prevents duplicates */
      }
    };

    const deliver = (slotIndex: number) => {
      const quote = quoteFor(lang, dayKey(), slotIndex, state.streak);
      push(`${quote.text} — ${quote.author}`, "info");
      if (notificationPermission() === "granted") {
        void showSystemNotification(
          t("notify.quoteTitle"),
          `${quote.text} — ${quote.author}`,
          "stay-focused-quote",
        );
      }
    };

    const tick = () => {
      readFired();
      const today = dayKey();
      const minutes = new Date().getHours() * 60 + new Date().getMinutes();
      const due = slots
        .map((slot, index) => ({ slot, index }))
        .filter(({ slot, index }) => slot <= minutes && !firedRef.current.has(`${today}:${index}`));

      if (due.length === 0) return;
      // Only the newest overdue slot is shown; older ones are marked as served
      // so opening the app in the evening does not replay the whole morning.
      const latest = due[due.length - 1];
      for (const item of due) {
        firedRef.current.add(`${today}:${item.index}`);
      }
      persist();
      deliver(latest.index);
    };

    tick();
    const timer = window.setInterval(tick, 30_000);

    const onTest = () => {
      const quote = quoteFor(lang, dayKey(), Math.floor(Math.random() * 12), state.streak);
      push(`${quote.text} — ${quote.author}`, "info");
      void showSystemNotification(t("notify.quoteTitle"), `${quote.text} — ${quote.author}`, "stay-focused-quote-test");
    };
    window.addEventListener("stay-focused:quote", onTest);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("stay-focused:quote", onTest);
    };
  }, [lang, state.streak, state.settings, push, t]);

  return (
    <BreathingOverlay
      open={breakOpen}
      mode="break"
      onKeepGoing={() => setBreakOpen(false)}
    />
  );
}
