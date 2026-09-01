"use client";

import { formatCurrency } from "@/lib/format";

export function BudgetBar({
  nome,
  gasto,
  limite,
}: {
  nome: string;
  gasto: number;
  limite: number;
}) {
  const pct = Math.min(100, (gasto / limite) * 100);
  const over = gasto > limite;
  const near = !over && pct >= 80;

  const color = over
    ? "var(--color-expense)"
    : near
    ? "var(--color-gold)"
    : "var(--color-income)";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span>{nome}</span>
        <span className="text-[var(--color-text-secondary)]">
          {formatCurrency(gasto)} / {formatCurrency(limite)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-alt)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
