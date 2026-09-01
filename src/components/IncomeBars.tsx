"use client";

import { formatCurrency } from "@/lib/format";

export interface CategoryTotal {
  nome: string;
  total: number;
}

export function IncomeBars({ data }: { data: CategoryTotal[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));

  if (data.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        Nenhum ganho neste mês.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => (
        <li key={d.nome}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span>{d.nome}</span>
            <span className="text-[var(--color-text-secondary)]">
              {formatCurrency(d.total)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-alt)]">
            <div
              className="h-full rounded-full bg-[var(--color-income)]"
              style={{ width: `${(d.total / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
