"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Check, Undo2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  createGastoFixo,
  createTransaction,
  deleteGastoFixo,
  deleteTransaction,
  getAccounts,
  getAllTransactions,
  getCategories,
  getGastosFixos,
  updateGastoFixo,
  type GastoFixoInput,
  type TransactionInput,
} from "@/lib/queries";
import { computeGastosFixosStatus, summarizeGastosFixos } from "@/lib/gastosFixos";
import { Header } from "@/components/Header";
import { MonthSelector } from "@/components/MonthSelector";
import { Card } from "@/components/Card";
import { TransactionFormModal } from "@/components/TransactionFormModal";
import { formatCurrency, todayISO } from "@/lib/format";
import type { Account, Category, GastoFixo, TransactionWithCategory } from "@/types/database";

export default function GastosFixosPage() {
  const [gastosFixos, setGastosFixos] = useState<GastoFixo[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [payingGasto, setPayingGasto] = useState<GastoFixo | null>(null);
  const [undoing, setUndoing] = useState<string | null>(null);

  const despesaCategories = categories.filter((c) => c.tipo === "despesa");

  async function reload() {
    const supabase = createClient();
    const [gf, tx, cat, acc] = await Promise.all([
      getGastosFixos(supabase),
      getAllTransactions(supabase),
      getCategories(supabase),
      getAccounts(supabase),
    ]);
    setGastosFixos(gf);
    setTransactions(tx);
    setCategories(cat);
    setAccounts(acc);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    reload().finally(() => setLoading(false));
  }, []);

  const status = computeGastosFixosStatus(gastosFixos, transactions, year, month);
  const { total, pago, pendente } = summarizeGastosFixos(status);

  async function handleSaveGastoFixo(id: string | null, input: GastoFixoInput) {
    const supabase = createClient();
    if (id) {
      await updateGastoFixo(supabase, id, input);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await createGastoFixo(supabase, user.id, input);
    }
    setAdding(false);
    setEditingId(null);
    await reload();
  }

  async function handleRemove(id: string) {
    const supabase = createClient();
    await deleteGastoFixo(supabase, id);
    setConfirmDeleteId(null);
    await reload();
  }

  async function handlePay(input: TransactionInput) {
    if (!payingGasto) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await createTransaction(supabase, user.id, { ...input, gasto_fixo_id: payingGasto.id });
    setPayingGasto(null);
    await reload();
  }

  async function handleUndo(transacaoId: string) {
    setUndoing(transacaoId);
    const supabase = createClient();
    await deleteTransaction(supabase, transacaoId);
    await reload();
    setUndoing(null);
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Gastos fixos" subtitle="Suas contas recorrentes" />
        <p className="mx-auto w-full max-w-3xl px-6 py-4 text-sm text-[var(--color-text-secondary)] lg:px-10">
          Carregando...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Gastos fixos" subtitle="Suas contas recorrentes" />

      <div className="mx-auto w-full max-w-3xl lg:px-4">
        <MonthSelector
          year={year}
          month={month}
          onChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 pb-10 lg:px-10">
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <p className="text-xs text-[var(--color-text-secondary)]">Total</p>
            <p className="num-serif mt-1 text-lg">{formatCurrency(total)}</p>
          </Card>
          <Card>
            <p className="text-xs text-[var(--color-text-secondary)]">Pago</p>
            <p className="num-serif mt-1 text-lg text-[var(--color-income)]">
              {formatCurrency(pago)}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-[var(--color-text-secondary)]">Pendente</p>
            <p className="num-serif mt-1 text-lg text-[var(--color-expense)]">
              {formatCurrency(pendente)}
            </p>
          </Card>
        </div>

        <Card className="flex flex-col divide-y divide-[var(--color-border)] p-0">
          {status.length === 0 && !adding && (
            <p className="px-5 py-4 text-sm text-[var(--color-text-secondary)]">
              Nenhum gasto fixo cadastrado.
            </p>
          )}

          {status.map(({ gastoFixo, pago: isPago, transacao }) => (
            <div key={gastoFixo.id} className="px-5 py-4">
              {editingId === gastoFixo.id ? (
                <GastoFixoForm
                  categories={despesaCategories}
                  accounts={accounts}
                  initial={gastoFixo}
                  onSave={(input) => handleSaveGastoFixo(gastoFixo.id, input)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[var(--color-text)]">{gastoFixo.nome}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {formatCurrency(Number(gastoFixo.valor))}
                      {gastoFixo.dia_vencimento && ` · vence dia ${gastoFixo.dia_vencimento}`}
                    </p>

                    {isPago && transacao ? (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-[var(--color-income)]">
                          <Check size={14} /> Pago
                        </span>
                        <button
                          onClick={() => handleUndo(transacao.id)}
                          disabled={undoing === transacao.id}
                          className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] underline-offset-2 hover:underline disabled:opacity-50"
                        >
                          <Undo2 size={12} />
                          Desfazer
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPayingGasto(gastoFixo)}
                        className="mt-2 rounded-full bg-[var(--color-green)] px-3 py-1 text-xs font-medium text-[var(--color-bg)]"
                      >
                        Pagar
                      </button>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      onClick={() => setEditingId(gastoFixo.id)}
                      aria-label={`Editar ${gastoFixo.nome}`}
                      className="text-[var(--color-text-secondary)]"
                    >
                      <Pencil size={16} />
                    </button>
                    {confirmDeleteId === gastoFixo.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRemove(gastoFixo.id)}
                          className="text-sm font-medium text-[var(--color-expense)]"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-sm text-[var(--color-text-secondary)]"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(gastoFixo.id)}
                        aria-label={`Remover ${gastoFixo.nome}`}
                        className="text-[var(--color-text-secondary)]"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="px-5 py-4">
            {adding ? (
              <GastoFixoForm
                categories={despesaCategories}
                accounts={accounts}
                onSave={(input) => handleSaveGastoFixo(null, input)}
                onCancel={() => setAdding(false)}
              />
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="flex items-center gap-1.5 text-sm text-[var(--color-green)]"
              >
                <Plus size={16} />
                Adicionar gasto fixo
              </button>
            )}
          </div>
        </Card>
      </div>

      {payingGasto && (
        <TransactionFormModal
          categories={categories}
          accounts={accounts}
          editing={null}
          title={`Pagar — ${payingGasto.nome}`}
          initial={{
            tipo: "despesa",
            valor: Number(payingGasto.valor),
            categoria_id: payingGasto.categoria_id,
            conta_id: payingGasto.conta_id,
            descricao: payingGasto.nome,
            data: todayISO(),
          }}
          onClose={() => setPayingGasto(null)}
          onSave={handlePay}
        />
      )}
    </div>
  );
}

function GastoFixoForm({
  categories,
  accounts,
  initial,
  onSave,
  onCancel,
}: {
  categories: Category[];
  accounts: Account[];
  initial?: GastoFixo;
  onSave: (input: GastoFixoInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [valor, setValor] = useState(initial ? String(initial.valor) : "");
  const [categoriaId, setCategoriaId] = useState(
    initial?.categoria_id ?? categories[0]?.id ?? ""
  );
  const [contaId, setContaId] = useState(initial?.conta_id ?? "");
  const [diaVencimento, setDiaVencimento] = useState(
    initial?.dia_vencimento ? String(initial.dia_vencimento) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    const parsedValor = Number(valor.replace(",", "."));
    if (!nome.trim()) {
      setError("Informe um nome.");
      return;
    }
    if (!parsedValor || parsedValor <= 0) {
      setError("Informe um valor válido.");
      return;
    }
    if (!categoriaId) {
      setError("Selecione uma categoria.");
      return;
    }
    const dia = Number(diaVencimento);
    setSaving(true);
    try {
      await onSave({
        nome: nome.trim(),
        valor: parsedValor,
        categoria_id: categoriaId,
        conta_id: contaId || null,
        dia_vencimento: dia >= 1 && dia <= 31 ? dia : null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome (ex: Aluguel)"
        className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-green)]"
      />
      <div className="flex gap-2">
        <input
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Valor"
          className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-green)]"
        />
        <input
          inputMode="numeric"
          value={diaVencimento}
          onChange={(e) => setDiaVencimento(e.target.value)}
          placeholder="Dia vence"
          className="w-24 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-green)]"
        />
      </div>
      <select
        value={categoriaId}
        onChange={(e) => setCategoriaId(e.target.value)}
        className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-green)]"
      >
        {categories.length === 0 && <option value="">Nenhuma categoria de gasto</option>}
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>
      <select
        value={contaId}
        onChange={(e) => setContaId(e.target.value)}
        className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-green)]"
      >
        <option value="">Sem conta padrão</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nome}
          </option>
        ))}
      </select>

      {error && <p className="text-xs text-[var(--color-expense)]">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="rounded-lg bg-[var(--color-green)] px-3 py-2 text-sm font-medium text-[var(--color-bg)] disabled:opacity-60"
        >
          Salvar
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
