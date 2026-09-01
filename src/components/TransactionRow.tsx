"use client";

import { formatCurrency, formatDate } from "@/lib/format";
import type { TransactionWithCategory } from "@/types/database";

export function TransactionRow({
  transaction,
  onClick,
}: {
  transaction: TransactionWithCategory;
  onClick?: () => void;
}) {
  const isIncome = transaction.tipo === "receita";

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 border-b border-[var(--color-border)] py-3 text-left last:border-b-0"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[var(--color-text)]">
          {transaction.descricao || transaction.categories?.nome || "Sem descrição"}
        </p>
        <p className="text-xs text-[var(--color-text-secondary)]">
          {transaction.categories?.nome} <span className="opacity-60">em</span> {formatDate(transaction.data)}
        </p>
      </div>
      <span
        className="num-serif shrink-0 text-sm"
        style={{
          color: isIncome ? "var(--color-income)" : "var(--color-expense)",
        }}
      >
        {isIncome ? "+" : "-"} {formatCurrency(transaction.valor)}
      </span>
    </button>
  );
}
