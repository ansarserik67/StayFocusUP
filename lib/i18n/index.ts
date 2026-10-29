import { en, type TranslationKey } from "./en";
import { ru } from "./ru";
import { kk } from "./kk";

export type { TranslationKey };

export type Lang = "en" | "ru" | "kk";

export const LANGS: ReadonlyArray<{
  id: Lang;
  label: string;
  short: string;
  htmlLang: string;
  locale: string;
}> = [
  { id: "en", label: "English", short: "EN", htmlLang: "en", locale: "en-US" },
  { id: "ru", label: "Русский", short: "RU", htmlLang: "ru", locale: "ru-RU" },
  { id: "kk", label: "Қазақша", short: "KK", htmlLang: "kk", locale: "kk-KZ" },
];

const DICTIONARIES: Record<Lang, Record<TranslationKey, string>> = {
  en,
  ru,
  kk,
};

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "ru" || value === "kk";
}

export function localeOf(lang: Lang): string {
  return LANGS.find((item) => item.id === lang)?.locale ?? "en-US";
}

export function htmlLangOf(lang: Lang): string {
  return LANGS.find((item) => item.id === lang)?.htmlLang ?? "en";
}

type Vars = Record<string, string | number>;

export function translate(lang: Lang, key: TranslationKey, vars?: Vars): string {
  const template = DICTIONARIES[lang][key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    vars[name] === undefined ? match : String(vars[name]),
  );
}

/** Fills placeholders without going through the dictionary (used for quotes). */
export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    vars[name] === undefined ? match : String(vars[name]),
  );
}

export const MONTHS: Record<Lang, string[]> = {
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  ru: [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ],
  kk: [
    "Қаңтар",
    "Ақпан",
    "Наурыз",
    "Сәуір",
    "Мамыр",
    "Маусым",
    "Шілде",
    "Тамыз",
    "Қыркүйек",
    "Қазан",
    "Қараша",
    "Желтоқсан",
  ],
};

/** Monday-first, matching the calendar grid. */
export const WEEKDAYS: Record<Lang, { short: string[]; long: string[] }> = {
  en: {
    short: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    long: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
  },
  ru: {
    short: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    long: [
      "Понедельник",
      "Вторник",
      "Среда",
      "Четверг",
      "Пятница",
      "Суббота",
      "Воскресенье",
    ],
  },
  kk: {
    short: ["Дс", "Сс", "Ср", "Бс", "Жм", "Сн", "Жк"],
    long: [
      "Дүйсенбі",
      "Сейсенбі",
      "Сәрсенбі",
      "Бейсенбі",
      "Жұма",
      "Сенбі",
      "Жексенбі",
    ],
  },
};

/** Rotating lines shown in the breathing overlay and daily notifications. */
export const QUOTES: Record<Lang, string[]> = {
  en: [
    "Is ten minutes of scrolling really worth losing your {streak}-day streak?",
    "You do not need more content. You need a little quiet.",
    "The feed will still be there tomorrow. Your attention will not.",
    "Discipline is choosing what you want most over what you want now.",
    "One set now buys thirty minutes of freedom later.",
  ],
  ru: [
    "Неужели 10 минут скролла стоят потери серии в {streak} дней?",
    "Тебе не нужно больше контента. Тебе нужно немного тишины.",
    "Лента будет здесь и завтра. А твоё внимание — не факт.",
    "Дисциплина — это выбор того, что хочешь сильнее, вместо того, что хочешь сейчас.",
    "Один подход сейчас — тридцать минут свободы потом.",
  ],
  kk: [
    "10 минут скролл {streak} күндік серияңды жоғалтуға тұрарлық па?",
    "Саған көбірек контент керек емес. Саған сәл тыныштық керек.",
    "Лента ертең де осында болады. Ал назарың — олай емес.",
    "Тәртіп — қазір қалағаныңнан гөрі көбірек қалағаныңды таңдау.",
    "Қазір бір сет — кейін отыз минут бостандық.",
  ],
};

/** Deterministic per-day quote so the same day does not shuffle on rerender. */
export function dailyQuote(lang: Lang, dayKey: string, streak = 0): string {
  const list = QUOTES[lang];
  let hash = 0;
  for (let index = 0; index < dayKey.length; index += 1) {
    hash = (hash * 31 + dayKey.charCodeAt(index)) % 100000;
  }
  return interpolate(list[hash % list.length], { streak });
}

export function formatDate(
  lang: Lang,
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
): string {
  const value = typeof date === "string" ? new Date(`${date}T12:00:00`) : date;
  return new Intl.DateTimeFormat(localeOf(lang), options).format(value);
}

/** "mm:ss" for the budget, "h:mm" once it passes an hour. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatMinutes(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}
