"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface BalanceDataPoint {
  mes: string;
  ingresos: number;
  egresos: number;
}

export function BalanceChart({ data }: { data: BalanceDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
          tickLine={false}
          axisLine={false}
          width={50}
        />
        <Tooltip
          formatter={
            ((v: number | string) =>
              `$${Number(v).toLocaleString("es-VE", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}`) as never
          }
          contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e5e7eb" }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="ingresos" name="Ingresos" fill="#16a34a" radius={[3, 3, 0, 0]} maxBarSize={36} />
        <Bar dataKey="egresos" name="Egresos" fill="#dc2626" radius={[3, 3, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
