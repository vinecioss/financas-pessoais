"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel } from "@/lib/format";

export function MonthSelector({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  function shift(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    onChange(d.getFullYear(), d.getMonth() + 1);
  }

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <button
        onClick={() => shift(-1)}
        aria-label="Mês anterior"
        className="rounded-full p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-alt)]"
      >
        <ChevronLeft size={20} />
      </button>
      <span className="text-sm font-medium capitalize text-[var(--color-text)]">
        {monthLabel(year, month)}
      </span>
      <button
        onClick={() => shift(1)}
        aria-label="Próximo mês"
        className="rounded-full p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-alt)]"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
