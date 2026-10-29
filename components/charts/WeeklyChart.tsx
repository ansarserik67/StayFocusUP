"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useFocus } from "@/components/focus/FocusProvider";
import { useLang } from "@/components/i18n/LanguageProvider";
import { WEEKDAYS } from "@/lib/i18n";

export function WeeklyChart({ height = 220 }: { height?: number }) {
  const { week } = useFocus();
  const { lang, t } = useLang();

  const data = week.map((point) => ({
    label: WEEKDAYS[lang].short[point.weekday],
    screen: Math.round(point.screenSeconds / 60),
    exercise: Math.round(point.workoutSeconds / 60),
  }));
  const empty = data.every((point) => point.screen === 0 && point.exercise === 0);

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 6" stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11 }}
            dy={6}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10 }}
            width={44}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-2)", opacity: 0.55 }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--ink)",
              fontSize: 12,
            }}
            formatter={(value, name) => [
              `${Number(value)} ${t("common.minutes")}`,
              name === "screen" ? t("pet.chart.screen") : t("pet.chart.exercise"),
            ]}
          />
          <Bar
            dataKey="screen"
            fill="var(--cyan)"
            opacity={0.55}
            radius={[6, 6, 2, 2]}
            maxBarSize={22}
            name="screen"
          />
          <Line
            type="monotone"
            dataKey="exercise"
            stroke="var(--emerald)"
            strokeWidth={2.4}
            dot={{ r: 3, fill: "var(--emerald)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            name="exercise"
          />
        </ComposedChart>
      </ResponsiveContainer>
      {empty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full border border-line bg-surface/90 px-3 py-1.5 text-[11.5px] text-ink-mute shadow-sm">
            {t("pet.emptyChart")}
          </span>
        </div>
      )}
    </div>
  );
}
