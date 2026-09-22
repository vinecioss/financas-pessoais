"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Check, Undo2 } from "lucide-react";
import { createClient } from "@/lib/neon/client";
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
import {
  computeGastosFixosStatus,
  summarizeGastosFixos,
  type GastoFixoStatus,
} from "@/lib/gastosFixos";
import { Header } from "@/components/Header";
import { MonthSelector } from "@/components/MonthSelector";
import { Card } from "@/components/Card";
import { TransactionFormModal } from "@/components/TransactionFormModal";
import { daysInMonth, formatCurrency, todayISO } from "@/lib/format";
import type {
  Account,
  Category,
  GastoFixo,
  Tipo,
  TransactionWithCategory,
} from "@/types/database";

const GROUPS: {
  tipo: Tipo;
  title: string;
  addLabel: string;
  actionLabel: string;
  paidLabel: string;
  pendingLabel: string;
  accentColor: string;
}[] = [
  {
    tipo: "receita",
    title: "Ganhos fixos",
    addLabel: "Adicionar ganho fixo",
    actionLabel: "Receber",
    paidLabel: "Recebido",
    pendingLabel: "A receber",
    accentColor: "var(--color-income)",
  },
  {
    tipo: "despesa",
    title: "Gastos fixos",
    addLabel: "Adicionar gasto fixo",
    actionLabel: "Pagar",
    paidLabel: "Pago",
    pendingLabel: "Pendente",
    accentColor: "var(--color-expense)",
  },
];

export default function GastosFixosPage() {
  const [gastosFixos, setGastosFixos] = useState<GastoFixo[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [payingGasto, setPayingGasto] = useState<GastoFixo | null>(null);

  async function reload() {
    const db = createClient();
    const [gf, tx, cat, acc] = await Promise.all([
      getGastosFixos(db),
      getAllTransactions(db),
      getCategories(db),
      getAccounts(db),
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
  const receitaStatus = status.filter((s) => s.gastoFixo.tipo === "receita");
  const despesaStatus = status.filter((s) => s.gastoFixo.tipo === "despesa");
  const receitaTotal = summarizeGastosFixos(receitaStatus).total;
  const despesaTotal = summarizeGastosFixos(despesaStatus).total;
  const saldoFixo = receitaTotal - despesaTotal;

  async function handleSaveGastoFixo(id: string | null, input: GastoFixoInput) {
    const db = createClient();
    if (id) {
      await updateGastoFixo(db, id, input);
    } else {
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) return;
      await createGastoFixo(db, user.id, input);
    }
    await reload();
  }

  async function handleRemove(id: string) {
    const db = createClient();
    await deleteGastoFixo(db, id);
    await reload();
  }

  async function handlePay(input: TransactionInput) {
    if (!payingGasto) return;
    const db = createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return;
    await createTransaction(db, user.id, { ...input, gasto_fixo_id: payingGasto.id });
    setPayingGasto(null);
    await reload();
  }

  async function handleUndo(transacaoId: string) {
    const db = createClient();
    await deleteTransaction(db, transacaoId);
    await reload();
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Lançamentos fixos" subtitle="Ganhos e gastos que se repetem todo mês" />
        <p className="mx-auto w-full max-w-3xl px-6 py-4 text-sm text-[var(--color-text-secondary)] lg:px-10">
          Carregando...
        </p>
      </div>
    );
  }

  const paying = payingGasto;

  return (
    <div className="flex flex-col">
      <Header title="Lançamentos fixos" subtitle="Ganhos e gastos que se repetem todo mês" />

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

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pb-10 lg:px-10">
        <Card className="text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">Saldo fixo do mês</p>
          <p
            className="num-serif mt-1 text-3xl"
            style={{ color: saldoFixo >= 0 ? "var(--color-income)" : "var(--color-expense)" }}
          >
            {formatCurrency(saldoFixo)}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Ganhos fixos menos gastos fixos, considerando todos cadastrados
          </p>
        </Card>

        {GROUPS.map((group) => (
          <GastoFixoGroup
            key={group.tipo}
            group={group}
            items={group.tipo === "receita" ? receitaStatus : despesaStatus}
            categories={categories.filter((c) => c.tipo === group.tipo)}
            accounts={accounts}
            year={year}
            month={month}
            onSave={handleSaveGastoFixo}
            onRemove={handleRemove}
            onPay={setPayingGasto}
            onUndo={handleUndo}
          />
        ))}
      </div>

      {paying && (
        <TransactionFormModal
          categories={categories}
          accounts={accounts}
          editing={null}
          title={`${paying.tipo === "receita" ? "Receber" : "Pagar"} — ${paying.nome}`}
          initial={{
            tipo: paying.tipo,
            valor: Number(paying.valor),
            categoria_id: paying.categoria_id,
            conta_id: paying.conta_id,
            descricao: paying.nome,
            data: todayISO(),
          }}
          onClose={() => setPayingGasto(null)}
          onSave={handlePay}
        />
      )}
    </div>
  );
}

function GastoFixoGroup({
  group,
  items,
  categories,
  accounts,
  year,
  month,
  onSave,
  onRemove,
  onPay,
  onUndo,
}: {
  group: (typeof GROUPS)[number];
  items: GastoFixoStatus[];
  categories: Category[];
  accounts: Account[];
  year: number;
  month: number;
  onSave: (id: string | null, input: GastoFixoInput) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onPay: (gastoFixo: GastoFixo) => void;
  onUndo: (transacaoId: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  const { pago, pendente } = summarizeGastosFixos(items);

  async function handleUndoClick(transacaoId: string) {
    setUndoingId(transacaoId);
    await onUndo(transacaoId);
    setUndoingId(null);
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm text-[var(--color-text-secondary)]">{group.title}</p>
        <p className="text-xs text-[var(--color-text-secondary)]">
          {group.paidLabel} {formatCurrency(pago)} · {group.pendingLabel} {formatCurrency(pendente)}
        </p>
      </div>

      <Card className="flex flex-col divide-y divide-[var(--color-border)] p-0">
        {items.length === 0 && !adding && (
          <p className="px-5 py-4 text-sm text-[var(--color-text-secondary)]">
            Nenhum {group.tipo === "receita" ? "ganho" : "gasto"} fixo cadastrado.
          </p>
        )}

        {items.map(({ gastoFixo, pago: isPago, transacao }) => (
          <div key={gastoFixo.id} className="px-5 py-4">
            {editingId === gastoFixo.id ? (
              <GastoFixoForm
                tipo={group.tipo}
                categories={categories}
                accounts={accounts}
                initial={gastoFixo}
                onSave={async (input) => {
                  await onSave(gastoFixo.id, input);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[var(--color-text)]">{gastoFixo.nome}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {formatCurrency(Number(gastoFixo.valor))}
                    {gastoFixo.dia_vencimento &&
                      ` · vence dia ${Math.min(gastoFixo.dia_vencimento, daysInMonth(year, month))}`}
                  </p>

                  {isPago && transacao ? (
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: group.accentColor }}
                      >
                        <Check size={14} /> {group.paidLabel}
                      </span>
                      <button
                        onClick={() => handleUndoClick(transacao.id)}
                        disabled={undoingId === transacao.id}
                        className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        <Undo2 size={12} />
                        Desfazer
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onPay(gastoFixo)}
                      className="mt-2 rounded-full bg-[var(--color-green)] px-3 py-1 text-xs font-medium text-[var(--color-bg)]"
                    >
                      {group.actionLabel}
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
                        onClick={() => onRemove(gastoFixo.id)}
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
              tipo={group.tipo}
              categories={categories}
              accounts={accounts}
              onSave={async (input) => {
                await onSave(null, input);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-sm text-[var(--color-green)]"
            >
              <Plus size={16} />
              {group.addLabel}
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

function GastoFixoForm({
  tipo,
  categories,
  accounts,
  initial,
  onSave,
  onCancel,
}: {
  tipo: Tipo;
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
        tipo,
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
        placeholder={tipo === "receita" ? "Nome (ex: Vale Alimentação)" : "Nome (ex: Aluguel)"}
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
          placeholder="Dia (31 = último)"
          className="w-32 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-green)]"
        />
      </div>
      <select
        value={categoriaId}
        onChange={(e) => setCategoriaId(e.target.value)}
        className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-green)]"
      >
        {categories.length === 0 && <option value="">Nenhuma categoria</option>}
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
