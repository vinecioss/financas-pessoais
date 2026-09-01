"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getBudgets, getCategories, getTransactionsInRange } from "@/lib/queries";
import { formatCurrency, monthRange } from "@/lib/format";
import { Header } from "@/components/Header";
import { MonthSelector } from "@/components/MonthSelector";
import { Card } from "@/components/Card";
import { ExpenseDonut } from "@/components/ExpenseDonut";
import { IncomeBars } from "@/components/IncomeBars";
import { BudgetBar } from "@/components/BudgetBar";
import { TransactionRow } from "@/components/TransactionRow";
import type { Budget, Category, TransactionWithCategory } from "@/types/database";

export default function PainelPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets loading state when the selected month changes
    setLoading(true);
    const supabase = createClient();
    const { start, end } = monthRange(year, month);

    Promise.all([
      getTransactionsInRange(supabase, start, end),
      getBudgets(supabase),
      getCategories(supabase),
    ])
      .then(([tx, bg, cat]) => {
        if (!active) return;
        setTransactions(tx);
        setBudgets(bg);
        setCategories(cat);
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [year, month]);

  const { totalReceita, totalDespesa, despesasPorCategoria, receitasPorCategoria } =
    useMemo(() => {
      let totalReceita = 0;
      let totalDespesa = 0;
      const despesaMap = new Map<string, number>();
      const receitaMap = new Map<string, number>();

      for (const t of transactions) {
        const nome = t.categories?.nome ?? "Outros";
        if (t.tipo === "receita") {
          totalReceita += Number(t.valor);
          receitaMap.set(nome, (receitaMap.get(nome) ?? 0) + Number(t.valor));
        } else {
          totalDespesa += Number(t.valor);
          despesaMap.set(nome, (despesaMap.get(nome) ?? 0) + Number(t.valor));
        }
      }

      const despesasPorCategoria = Array.from(despesaMap, ([nome, total]) => ({
        nome,
        total,
      })).sort((a, b) => b.total - a.total);

      const receitasPorCategoria = Array.from(receitaMap, ([nome, total]) => ({
        nome,
        total,
      })).sort((a, b) => b.total - a.total);

      return { totalReceita, totalDespesa, despesasPorCategoria, receitasPorCategoria };
    }, [transactions]);

  const saldo = totalReceita - totalDespesa;

  const orcamentosComGasto = useMemo(() => {
    return budgets
      .map((b) => {
        const nome = categories.find((c) => c.id === b.categoria_id)?.nome;
        const gasto = transactions
          .filter((t) => t.categoria_id === b.categoria_id && t.tipo === "despesa")
          .reduce((sum, t) => sum + Number(t.valor), 0);
        return { id: b.id, nome, gasto, limite: Number(b.limite_mensal) };
      })
      .filter((b): b is { id: string; nome: string; gasto: number; limite: number } =>
        Boolean(b.nome)
      );
  }, [budgets, transactions, categories]);

  const recentes = transactions.slice(0, 5);

  return (
    <div className="flex flex-col">
      <Header title="Caderno" subtitle="Seu resumo financeiro" />
      <MonthSelector year={year} month={month} onChange={(y, m) => {
        setYear(y);
        setMonth(m);
      }} />

      <div className="flex flex-col gap-4 px-6 pb-6">
        <Card className="text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">Saldo do mês</p>
          <p
            className="num-serif mt-1 text-4xl"
            style={{ color: saldo >= 0 ? "var(--color-income)" : "var(--color-expense)" }}
          >
            {formatCurrency(saldo)}
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <p className="text-sm text-[var(--color-text-secondary)]">Ganhos</p>
            <p className="num-serif mt-1 text-xl text-[var(--color-income)]">
              {formatCurrency(totalReceita)}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-[var(--color-text-secondary)]">Gastos</p>
            <p className="num-serif mt-1 text-xl text-[var(--color-expense)]">
              {formatCurrency(totalDespesa)}
            </p>
          </Card>
        </div>

        <Card>
          <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
            Gastos por categoria
          </p>
          <ExpenseDonut data={despesasPorCategoria} />
        </Card>

        <Card>
          <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
            Ganhos por categoria
          </p>
          <IncomeBars data={receitasPorCategoria} />
        </Card>

        {orcamentosComGasto.length > 0 && (
          <Card>
            <p className="mb-3 text-sm text-[var(--color-text-secondary)]">Orçamentos</p>
            <div className="flex flex-col gap-4">
              {orcamentosComGasto.map((o) => (
                <BudgetBar key={o.id} nome={o.nome} gasto={o.gasto} limite={o.limite} />
              ))}
            </div>
          </Card>
        )}

        <Card>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm text-[var(--color-text-secondary)]">Últimos lançamentos</p>
            <Link
              href="/lancamentos"
              className="text-sm text-[var(--color-green)] underline-offset-2 hover:underline"
            >
              Ver todos
            </Link>
          </div>
          {loading ? (
            <p className="py-4 text-sm text-[var(--color-text-secondary)]">Carregando...</p>
          ) : recentes.length === 0 ? (
            <p className="py-4 text-sm text-[var(--color-text-secondary)]">
              Nenhum lançamento neste mês.
            </p>
          ) : (
            recentes.map((t) => <TransactionRow key={t.id} transaction={t} />)
          )}
        </Card>
      </div>
    </div>
  );
}
