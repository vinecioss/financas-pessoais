import type { Account, TransactionWithCategory } from "@/types/database";
import { monthRange, shiftMonth } from "@/lib/format";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

/**
 * Intervalo de datas da fatura de um cartão para o mês/ano de referência.
 * Sem dia de fechamento configurado, cai de volta no mês do calendário.
 * Com dia de fechamento D, o ciclo vai do dia (D+1) do mês anterior até o
 * dia D do mês de referência — mesma lógica de fatura de cartão de crédito.
 */
export function computeCardCycleRange(account: Account, year: number, month: number) {
  if (!account.dia_fechamento) {
    return monthRange(year, month);
  }

  const closingDay = Math.min(account.dia_fechamento, daysInMonth(year, month));
  const end = `${year}-${pad(month)}-${pad(closingDay)}`;

  const prev = shiftMonth(year, month, -1);
  const startDay = Math.min(account.dia_fechamento + 1, daysInMonth(prev.year, prev.month));
  const start = `${prev.year}-${pad(prev.month)}-${pad(startDay)}`;

  return { start, end };
}

/** Saldo atual (para contas e investimentos): inicial + receitas − despesas de todo o histórico. */
export function computeAccountBalance(
  account: Account,
  transactions: TransactionWithCategory[]
): number {
  let saldo = Number(account.saldo_inicial);
  for (const t of transactions) {
    if (t.conta_id !== account.id) continue;
    saldo += t.tipo === "receita" ? Number(t.valor) : -Number(t.valor);
  }
  return saldo;
}

/** Total gasto no cartão dentro do intervalo de datas informado (fatura do mês). */
export function computeCardTotal(
  account: Account,
  transactions: TransactionWithCategory[],
  start: string,
  end: string
): number {
  let total = 0;
  for (const t of transactions) {
    if (t.conta_id !== account.id || t.tipo !== "despesa") continue;
    if (t.data < start || t.data > end) continue;
    total += Number(t.valor);
  }
  return total;
}
