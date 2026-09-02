import type { Account, TransactionWithCategory } from "@/types/database";

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
