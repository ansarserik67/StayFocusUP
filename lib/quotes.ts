/**
 * Motivational quotes shown through the day, each attributed to a real person.
 *
 * The schedule is pure: `quoteSlots` decides when today's quotes land and
 * `quoteFor` decides which one, so the same day always produces the same plan
 * on every device and a rerender never shuffles anything.
 */

import type { Lang } from "@/lib/i18n";
import { interpolate } from "@/lib/i18n";

export interface Quote {
  text: string;
  author: string;
}

/** How many quotes a day the user may pick from. `0` turns quotes off. */
export const QUOTE_COUNTS = [0, 1, 2, 3, 4, 6, 8] as const;
export const DEFAULT_QUOTES_PER_DAY = 1;

/** Quiet hours: quotes only land between 09:00 and 21:00. */
export const QUOTE_START_HOUR = 9;
export const QUOTE_END_HOUR = 21;

const MINUTES_IN_DAY = 24 * 60;

export const QUOTES: Record<Lang, Quote[]> = {
  en: [
    { text: "You become what you give your attention to.", author: "Epictetus" },
    {
      text: "It is not that we have a short time to live, but that we waste much of it.",
      author: "Seneca",
    },
    { text: "Discipline equals freedom.", author: "Jocko Willink" },
    {
      text: "You do not rise to the level of your goals. You fall to the level of your systems.",
      author: "James Clear",
    },
    { text: "The ability to concentrate is the new superpower.", author: "Cal Newport" },
    {
      text: "Almost everything will work again if you unplug it for a few minutes — including you.",
      author: "Anne Lamott",
    },
    {
      text: "What we fear doing most is usually what we most need to do.",
      author: "Tim Ferriss",
    },
    {
      text: "Between stimulus and response there is a space, and in that space is our power to choose.",
      author: "Viktor Frankl",
    },
    {
      text: "Who looks outside, dreams; who looks inside, awakes.",
      author: "Carl Jung",
    },
    {
      text: "Waste no more time arguing what a good person should be. Be one.",
      author: "Marcus Aurelius",
    },
    { text: "Less, but better.", author: "Dieter Rams" },
    {
      text: "It is not a daily increase, but a daily decrease. Hack away at the inessentials.",
      author: "Bruce Lee",
    },
  ],
  ru: [
    { text: "Ты становишься тем, чему отдаёшь своё внимание.", author: "Эпиктет" },
    {
      text: "Дело не в том, что жизнь коротка, а в том, что мы много её тратим впустую.",
      author: "Сенека",
    },
    { text: "Дисциплина равна свободе.", author: "Джоко Виллинк" },
    {
      text: "Ты не поднимаешься до уровня своих целей — ты опускаешься до уровня своих привычек.",
      author: "Джеймс Клир",
    },
    {
      text: "Способность концентрироваться — новая суперсила.",
      author: "Кэл Ньюпорт",
    },
    {
      text: "Почти всё снова заработает, если выключить это на пару минут. Включая тебя.",
      author: "Энн Лэмотт",
    },
    {
      text: "То, чего мы больше всего боимся делать, обычно и нужно сделать в первую очередь.",
      author: "Тим Феррис",
    },
    {
      text: "Между стимулом и реакцией есть пауза, и в ней — наша свобода выбора.",
      author: "Виктор Франкл",
    },
    {
      text: "Кто смотрит наружу — видит сны. Кто смотрит внутрь — просыпается.",
      author: "Карл Юнг",
    },
    {
      text: "Хватит рассуждать о том, каким должен быть хороший человек. Будь им.",
      author: "Марк Аврелий",
    },
    { text: "Меньше, но лучше.", author: "Дитер Рамс" },
    {
      text: "Не прибавляй каждый день, а убавляй: отсекай всё лишнее.",
      author: "Брюс Ли",
    },
  ],
  kk: [
    { text: "Сен назарыңды неге аударсаң, сол боласың.", author: "Эпиктет" },
    {
      text: "Өмір қысқа емес — біз оның көбін босқа жұмсаймыз.",
      author: "Сенека",
    },
    { text: "Тәртіп — еркіндікке тең.", author: "Джоко Виллинк" },
    {
      text: "Сен мақсаттарыңның деңгейіне көтерілмейсің, әдеттеріңнің деңгейіне түсесің.",
      author: "Джеймс Клир",
    },
    { text: "Зейінді тоқтата білу — жаңа суперкүш.", author: "Кэл Ньюпорт" },
    {
      text: "Кез келген нәрсе бірнеше минут өшіріп қосқанда қайта істейді. Өзің де.",
      author: "Энн Лэмотт",
    },
    {
      text: "Біз ең қатты қорқатын іс — көбіне ең бірінші жасалуы тиіс іс.",
      author: "Тим Феррис",
    },
    {
      text: "Тітіркендіргіш пен жауап арасында үзіліс бар, сол үзілісте — таңдау еркіндігі.",
      author: "Виктор Франкл",
    },
    {
      text: "Сыртқа қараған — түс көреді, ішке қараған — оянады.",
      author: "Карл Юнг",
    },
    {
      text: "Жақсы адам қандай болуы керек деп таласпай, сол адам бол.",
      author: "Марк Аврелий",
    },
    { text: "Азырақ, бірақ жақсырақ.", author: "Дитер Рамс" },
    {
      text: "Күн сайын қосу емес, азайту: артығын кесіп таста.",
      author: "Брюс Ли",
    },
  ],
};

function seedOf(dayKey: string): number {
  let hash = 0;
  for (let index = 0; index < dayKey.length; index += 1) {
    hash = (hash * 31 + dayKey.charCodeAt(index)) % 100_003;
  }
  return hash;
}

/**
 * When today's quotes land, in minutes from midnight.
 *
 * The slots are spread evenly across the quiet window so two quotes are never
 * back to back, and `0` (or a nonsense count) simply means no quotes at all.
 */
export function quoteSlots(
  count: number,
  startHour: number = QUOTE_START_HOUR,
  endHour: number = QUOTE_END_HOUR,
): number[] {
  const safe = Math.max(0, Math.min(12, Math.round(count)));
  if (safe === 0) return [];
  const start = Math.max(0, Math.min(23, startHour)) * 60;
  const end = Math.max(0, Math.min(23, endHour)) * 60;
  if (end <= start) return [start];
  // Evenly spaced, with the first quote at the start of the window and the
  // last one a slot-width before the end, so nothing arrives at midnight.
  const step = (end - start) / safe;
  return Array.from({ length: safe }, (_, index) => Math.round(start + index * step));
}

/**
 * The quote for one slot. Consecutive slots get different people because the
 * pool is walked with an offset that advances with every slot.
 */
export function quoteFor(
  lang: Lang,
  dayKey: string,
  slotIndex: number,
  streak = 0,
): Quote {
  const list = QUOTES[lang] ?? QUOTES.en;
  const index = (seedOf(dayKey) + slotIndex) % list.length;
  const quote = list[index];
  return { text: interpolate(quote.text, { streak }), author: quote.author };
}

/** `HH:MM` for a slot, so the settings screen can show the actual plan. */
export function slotLabel(minutes: number): string {
  const safe = ((Math.round(minutes) % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
