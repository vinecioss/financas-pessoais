"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  createCategory,
  deleteBudget,
  deleteCategory,
  getBudgets,
  getCategories,
  upsertBudget,
} from "@/lib/queries";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { formatCurrency } from "@/lib/format";
import type { Budget, Category, Tipo } from "@/types/database";

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    const supabase = createClient();
    const [cat, bud] = await Promise.all([getCategories(supabase), getBudgets(supabase)]);
    setCategories(cat);
    setBudgets(bud);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    reload().finally(() => setLoading(false));
  }, []);

  const receitas = categories.filter((c) => c.tipo === "receita");
  const despesas = categories.filter((c) => c.tipo === "despesa");

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Categorias" subtitle="Organize seus ganhos e gastos" />
        <p className="mx-auto w-full max-w-4xl px-6 py-4 text-sm text-[var(--color-text-secondary)] lg:px-10">
          Carregando...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Categorias" subtitle="Organize seus ganhos e gastos" />

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-6 lg:grid lg:grid-cols-2 lg:items-start lg:px-10">
        <CategoryGroup
          title="Ganhos"
          tipo="receita"
          categories={receitas}
          budgets={budgets}
          onChanged={reload}
        />
        <CategoryGroup
          title="Gastos"
          tipo="despesa"
          categories={despesas}
          budgets={budgets}
          onChanged={reload}
        />
      </div>
    </div>
  );
}

function CategoryGroup({
  title,
  tipo,
  categories,
  budgets,
  onChanged,
}: {
  title: string;
  tipo: Tipo;
  categories: Category[];
  budgets: Budget[];
  onChanged: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [nome, setNome] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleAdd() {
    if (!nome.trim()) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await createCategory(supabase, user.id, tipo, nome.trim());
    setNome("");
    setAdding(false);
    await onChanged();
  }

  async function handleRemove(id: string) {
    const supabase = createClient();
    await deleteCategory(supabase, id);
    setConfirmId(null);
    await onChanged();
  }

  return (
    <div>
      <p className="mb-2 text-sm text-[var(--color-text-secondary)]">{title}</p>
      <Card className="flex flex-col divide-y divide-[var(--color-border)] p-0">
        {categories.map((c) => (
          <div key={c.id} className="flex flex-col gap-2 px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text)]">{c.nome}</span>
              {confirmId === c.id ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRemove(c.id)}
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
                  onClick={() => setConfirmId(c.id)}
                  aria-label={`Remover ${c.nome}`}
                  className="text-[var(--color-text-secondary)]"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {tipo === "despesa" && (
              <BudgetField
                categoryId={c.id}
                budget={budgets.find((b) => b.categoria_id === c.id)}
                onChanged={onChanged}
              />
            )}
          </div>
        ))}

        <div className="px-5 py-4">
          {adding ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Nome da categoria"
                className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-green)]"
              />
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
                }}
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)]"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-sm text-[var(--color-green)]"
            >
              <Plus size={16} />
              Adicionar categoria
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

function BudgetField({
  categoryId,
  budget,
  onChanged,
}: {
  categoryId: string;
  budget?: Budget;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(budget ? String(budget.limite_mensal) : "");

  async function handleSave() {
    const parsed = Number(value.replace(",", "."));
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (!value.trim() || !parsed || parsed <= 0) {
      if (budget) await deleteBudget(supabase, categoryId);
    } else {
      await upsertBudget(supabase, user.id, categoryId, parsed);
    }
    setEditing(false);
    await onChanged();
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="self-start text-xs text-[var(--color-text-secondary)] underline-offset-2 hover:underline"
      >
        {budget
          ? `Orçamento mensal: ${formatCurrency(Number(budget.limite_mensal))}`
          : "Definir orçamento mensal"}
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
      <button
        onClick={handleSave}
        className="text-sm font-medium text-[var(--color-green)]"
      >
        Salvar
      </button>
      <button
        onClick={() => {
          setEditing(false);
          setValue(budget ? String(budget.limite_mensal) : "");
        }}
        className="text-sm text-[var(--color-text-secondary)]"
      >
        Cancelar
      </button>
    </div>
  );
}
