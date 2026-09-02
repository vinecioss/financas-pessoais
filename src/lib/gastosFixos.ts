import type { GastoFixo, TransactionWithCategory } from "@/types/database";
import { monthRange } from "@/lib/format";

export interface GastoFixoStatus {
  gastoFixo: GastoFixo;
  pago: boolean;
  transacao: TransactionWithCategory | null;
}

/** Para cada gasto fixo, encontra (se existir) o lançamento que o quitou no mês informado. */
export function computeGastosFixosStatus(
  gastosFixos: GastoFixo[],
  transactions: TransactionWithCategory[],
  year: number,
  month: number
): GastoFixoStatus[] {
  const { start, end } = monthRange(year, month);

  return gastosFixos.map((gastoFixo) => {
    const transacao =
      transactions.find(
        (t) => t.gasto_fixo_id === gastoFixo.id && t.data >= start && t.data <= end
      ) ?? null;

    return { gastoFixo, pago: Boolean(transacao), transacao };
  });
}

export function summarizeGastosFixos(status: GastoFixoStatus[]) {
  let pago = 0;
  let pendente = 0;

  for (const s of status) {
    if (s.pago && s.transacao) {
      pago += Number(s.transacao.valor);
    } else {
      pendente += Number(s.gastoFixo.valor);
    }
  }

  return { total: pago + pendente, pago, pendente };
}
