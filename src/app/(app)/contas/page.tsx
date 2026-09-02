"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Wallet, CreditCard, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  createAccount,
  deleteAccount,
  getAccounts,
  getAllTransactions,
  updateAccount,
} from "@/lib/queries";
import { computeAccountBalance, computeCardTotal } from "@/lib/accounts";
import { Header } from "@/components/Header";
import { MonthSelector } from "@/components/MonthSelector";
import { Card } from "@/components/Card";
import { formatCurrency, monthLabel, monthRange } from "@/lib/format";
import type { Account, ContaTipo, TransactionWithCategory } from "@/types/database";

const GROUPS: { tipo: ContaTipo; title: string; icon: typeof Wallet }[] = [
  { tipo: "conta", title: "Contas e vale", icon: Wallet },
  { tipo: "cartao", title: "Cartões", icon: CreditCard },
  { tipo: "investimento", title: "Investimentos", icon: TrendingUp },
];

export default function ContasPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  async function reload() {
    const supabase = createClient();
    const [acc, tx] = await Promise.all([getAccounts(supabase), getAllTransactions(supabase)]);
    setAccounts(acc);
    setTransactions(tx);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    reload().finally(() => setLoading(false));
  }, []);

  const { start, end } = monthRange(year, month);

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Contas" subtitle="Saldos, fatura e investimentos" />
        <p className="mx-auto w-full max-w-3xl px-6 py-4 text-sm text-[var(--color-text-secondary)] lg:px-10">
          Carregando...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Contas" subtitle="Saldos, fatura e investimentos" />

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pb-10 lg:px-10">
        {GROUPS.map((group) => (
          <AccountGroup
            key={group.tipo}
            group={group}
            accounts={accounts.filter((a) => a.tipo === group.tipo)}
            transactions={transactions}
            cardRange={group.tipo === "cartao" ? { start, end } : undefined}
            onChanged={reload}
          />
        ))}

        <div>
          <p className="mb-2 mt-2 text-sm text-[var(--color-text-secondary)]">
            Mês da fatura dos cartões
          </p>
          <Card className="p-0">
            <MonthSelector
              year={year}
              month={month}
              onChange={(y, m) => {
                setYear(y);
                setMonth(m);
              }}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

function AccountGroup({
  group,
  accounts,
  transactions,
  cardRange,
  onChanged,
}: {
  group: { tipo: ContaTipo; title: string; icon: typeof Wallet };
  accounts: Account[];
  transactions: TransactionWithCategory[];
  cardRange?: { start: string; end: string };
  onChanged: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [nome, setNome] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const Icon = group.icon;

  async function handleAdd() {
    if (!nome.trim()) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const inicial = Number(saldoInicial.replace(",", ".")) || 0;
    await createAccount(supabase, user.id, group.tipo, nome.trim(), inicial);
    setNome("");
    setSaldoInicial("");
    setAdding(false);
    await onChanged();
  }

  async function handleRemove(id: string) {
    const supabase = createClient();
    await deleteAccount(supabase, id);
    setConfirmId(null);
    await onChanged();
  }

  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <Icon size={16} strokeWidth={1.75} />
        {group.title}
      </p>
      <Card className="flex flex-col divide-y divide-[var(--color-border)] p-0">
        {accounts.length === 0 && !adding && (
          <p className="px-5 py-4 text-sm text-[var(--color-text-secondary)]">
            Nenhuma conta cadastrada.
          </p>
        )}

        {accounts.map((account) => {
          const valor =
            group.tipo === "cartao" && cardRange
              ? computeCardTotal(account, transactions, cardRange.start, cardRange.end)
              : computeAccountBalance(account, transactions);
          const negativo = valor < 0;

          return (
            <div key={account.id} className="flex flex-col gap-2 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[var(--color-text)]">{account.nome}</p>
                  {group.tipo === "cartao" && cardRange && (
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Fatura de {monthLabelFromRange(cardRange)}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className="num-serif text-base"
                    style={{
                      color: negativo ? "var(--color-expense)" : "var(--color-text)",
                    }}
                  >
                    {formatCurrency(valor)}
                  </span>
                  {confirmId === account.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRemove(account.id)}
                        className="text-sm font-medium text-[var(--color-expense)]"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="text-sm text-[var(--color-text-secondary)]"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(account.id)}
                      aria-label={`Remover ${account.nome}`}
                      className="text-[var(--color-text-secondary)]"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {group.tipo !== "cartao" && (
                <SaldoInicialField account={account} onChanged={onChanged} />
              )}
            </div>
          );
        })}

        <div className="px-5 py-4">
          {adding ? (
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome da conta"
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-green)]"
              />
              {group.tipo !== "cartao" && (
                <input
                  inputMode="decimal"
                  value={saldoInicial}
                  onChange={(e) => setSaldoInicial(e.target.value)}
                  placeholder="Saldo inicial (opcional)"
                  className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-green)]"
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  className="rounded-lg bg-[var(--color-green)] px-3 py-2 text-sm font-medium text-[var(--color-bg)]"
                >
                  Salvar
                </button>
                <button
                  onClick={() => {
                    setAdding(false);
                    setNome("");
                    setSaldoInicial("");
                  }}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-sm text-[var(--color-green)]"
            >
              <Plus size={16} />
              Adicionar
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

function monthLabelFromRange({ start }: { start: string }) {
  const [year, month] = start.split("-").map(Number);
  return monthLabel(year, month);
}

function SaldoInicialField({
  account,
  onChanged,
}: {
  account: Account;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(account.saldo_inicial));

  async function handleSave() {
    const parsed = Number(value.replace(",", ".")) || 0;
    const supabase = createClient();
    await updateAccount(supabase, account.id, { saldo_inicial: parsed });
    setEditing(false);
    await onChanged();
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="self-start text-xs text-[var(--color-text-secondary)] underline-offset-2 hover:underline"
      >
        Saldo inicial: {formatCurrency(Number(account.saldo_inicial))}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        placeholder="0,00"
        className="w-28 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-green)]"
      />
      <button onClick={handleSave} className="text-sm font-medium text-[var(--color-green)]">
        Salvar
      </button>
      <button
        onClick={() => {
          setEditing(false);
          setValue(String(account.saldo_inicial));
        }}
        className="text-sm text-[var(--color-text-secondary)]"
      >
        Cancelar
      </button>
    </div>
  );
}
