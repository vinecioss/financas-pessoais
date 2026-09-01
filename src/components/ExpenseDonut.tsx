"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/format";
import { CHART_COLORS } from "@/lib/constants";

export interface CategoryTotal {
  nome: string;
  total: number;
}

export function ExpenseDonut({ data }: { data: CategoryTotal[] }) {
  const total = data.reduce((sum, d) => sum + d.total, 0);

  if (total === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[var(--color-text-secondary)]">
        Nenhum gasto neste mês.
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="nome"
              innerRadius="65%"
              outerRadius="95%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-[var(--color-text-secondary)]">Total gasto</span>
          <span className="num-serif text-xl text-[var(--color-expense)]">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {data.map((d, i) => (
          <li key={d.nome} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              {d.nome}
            </span>
            <span className="text-[var(--color-text-secondary)]">
              {formatCurrency(d.total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
