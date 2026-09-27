"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Analytics } from "@/lib/analytics";
import { formatMoney } from "@/lib/money";
import { formatYmdShort } from "@/lib/time";
import { useLocale, useT } from "@/lib/i18n/client";

export type ChartsProps = Pick<Analytics, "daily" | "methods"> & { categories: (Analytics["categories"][number] & { label: string })[] };

// Validated pair (light surface): passes lightness, chroma, CVD ≥ 8 and contrast checks.
const COLLECTED = "#2f7d4a";
const OUTSTANDING = "#b3478f";
const AXIS = { fontSize: 12, fill: "#6e655c" };
const GRID = "#efe6d6";

const compact = (paise: number) => {
  const r = paise / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(1)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(r >= 10000 ? 0 : 1)}k`;
  return `₹${Math.round(r)}`;
};

function MoneyTooltip({ active, payload, label, labelFormat }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; labelFormat?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-sm shadow-card">
      <div className="mb-1 font-semibold">{labelFormat ? labelFormat(String(label)) : label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm" style={{ background: p.color }} />
          <span className="text-muted">{p.name}</span>
          <span className="ml-auto font-semibold tabular-nums">{formatMoney(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {note && <p className="text-xs text-muted">{note}</p>}
      <div className="mt-3 h-60">{children}</div>
    </section>
  );
}

export default function ChartsImpl({ daily, methods, categories }: ChartsProps) {
  const t = useT();
  const locale = useLocale();
  const many = daily.length > 14;
  const tickDay = (d: string) => formatYmdShort(d, locale);
  const methodRows = methods.map((m) => ({ ...m, label: t(`method.${m.method}` as const) }));
  const catRows = categories.slice(0, 8);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title={t("chart.daily")} note={t("chart.dailyNote")}>
        <ResponsiveContainer>
          <BarChart data={daily} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barCategoryGap={many ? 1 : "25%"}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="day" tickFormatter={tickDay} tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis tickFormatter={compact} tick={AXIS} tickLine={false} axisLine={false} width={52} />
            <Tooltip content={<MoneyTooltip labelFormat={tickDay} />} cursor={{ fill: "rgb(30 86 49 / 0.06)" }} />
            <Bar dataKey="collected" name={t("chart.collected")} fill={COLLECTED} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title={t("chart.cvo")} note={t("chart.cvoNote")}>
        <ResponsiveContainer>
          <BarChart data={daily} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barGap={2} barCategoryGap={many ? 1 : "20%"}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="day" tickFormatter={tickDay} tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis tickFormatter={compact} tick={AXIS} tickLine={false} axisLine={false} width={52} />
            <Tooltip content={<MoneyTooltip labelFormat={tickDay} />} cursor={{ fill: "rgb(30 86 49 / 0.06)" }} />
            <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 13, color: "#1f1a17" }} />
            <Bar dataKey="collected" name={t("chart.collected")} fill={COLLECTED} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="outstanding" name={t("chart.outstanding")} fill={OUTSTANDING} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title={t("chart.methods")} note={t("chart.methodsNote")}>
        <ResponsiveContainer>
          <BarChart data={methodRows} layout="vertical" margin={{ top: 4, right: 56, left: 0, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" tickFormatter={compact} tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="label" tick={{ ...AXIS, fill: "#1f1a17" }} tickLine={false} axisLine={false} width={48} />
            <Tooltip content={<MoneyTooltip />} cursor={{ fill: "rgb(30 86 49 / 0.06)" }} />
            <Bar
              dataKey="amount"
              name={t("chart.received")}
              fill={COLLECTED}
              radius={[0, 4, 4, 0]}
              maxBarSize={32}
              label={{ position: "right", formatter: (v: number) => formatMoney(v), fontSize: 12, fill: "#1f1a17" }}
            />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title={t("chart.byCat")} note={t("chart.byCatNote")}>
        {catRows.length === 0 ? (
          <p className="grid h-full place-items-center text-sm text-muted">{t("an.noSales")}</p>
        ) : (
          <ResponsiveContainer>
            <BarChart data={catRows} layout="vertical" margin={{ top: 4, right: 56, left: 0, bottom: 0 }} barCategoryGap="25%">
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" tickFormatter={compact} tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={{ ...AXIS, fill: "#1f1a17" }} tickLine={false} axisLine={false} width={92} />
              <Tooltip content={<MoneyTooltip />} cursor={{ fill: "rgb(30 86 49 / 0.06)" }} />
              <Bar
                dataKey="revenue"
                name={t("chart.sales")}
                fill={COLLECTED}
                radius={[0, 4, 4, 0]}
                maxBarSize={24}
                label={{ position: "right", formatter: (v: number) => formatMoney(v), fontSize: 12, fill: "#1f1a17" }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </div>
  );
}
