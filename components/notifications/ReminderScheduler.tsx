"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useFocus } from "@/components/focus/FocusProvider";
import { BreathingOverlay } from "@/components/breathe/BreathingOverlay";
import { useLang } from "@/components/i18n/LanguageProvider";
import { dailyQuote } from "@/lib/i18n";
import { notificationPermission, showSystemNotification } from "@/lib/notifications";
import { dayKey } from "@/lib/state";

const BREAK_EVERY_SECONDS = 30 * 60;
const QUOTE_STORAGE_KEY = "stay-focused.lastQuoteDay";

/**
 * Tracks active time in the app and opens a 10-second breathing break every
 * 30 minutes. Also fires one localized motivational quote per morning.
 * Both are opt-in through Settings and degrade to an in-app popup when the
 * browser refuses notifications.
 */
export function ReminderScheduler() {
  const { state, now, sessionActive } = useFocus();
  const { t, lang } = useLang();
  const [breakOpen, setBreakOpen] = useState(false);
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

  useEffect(() => {
    const checkQuote = () => {
      if (!settingsRef.current.notifications || !settingsRef.current.quoteNotifications) return;
      if (notificationPermission() !== "granted") return;
      if (new Date().getHours() < 9) return;
      const today = dayKey();
      try {
        if (window.localStorage.getItem(QUOTE_STORAGE_KEY) === today) return;
        window.localStorage.setItem(QUOTE_STORAGE_KEY, today);
      } catch {
        /* still show once per session */
      }
      void showSystemNotification(
        t("notify.quoteTitle"),
        dailyQuote(lang, today, state.streak),
        "stay-focused-quote",
      );
    };

    checkQuote();
    const timer = window.setInterval(checkQuote, 60_000);
    const onQuote = () => {
      void showSystemNotification(
        t("notify.quoteTitle"),
        dailyQuote(lang, dayKey(), state.streak),
        "stay-focused-quote-test",
      );
    };
    window.addEventListener("stay-focused:quote", onQuote);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("stay-focused:quote", onQuote);
    };
  }, [lang, state.streak, t]);

  return (
    <BreathingOverlay
      open={breakOpen}
      mode="break"
      onKeepGoing={() => setBreakOpen(false)}
    />
  );
}
