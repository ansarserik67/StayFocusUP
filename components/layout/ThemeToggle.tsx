"use client";

import { Moon, Sun } from "lucide-react";

import { useLang } from "@/components/i18n/LanguageProvider";
import { useTheme } from "@/components/theme/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLang();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="btn-icon relative overflow-hidden"
      aria-label={dark ? t("header.themeLight") : t("header.themeDark")}
      title={dark ? t("header.themeLight") : t("header.themeDark")}
    >
      <Sun
        size={17}
        className={`absolute transition-all duration-300 ${
          dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100 text-amber"
        }`}
      />
      <Moon
        size={17}
        className={`absolute transition-all duration-300 ${
          dark ? "rotate-0 scale-100 opacity-100 text-cyan" : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </button>
  );
}
