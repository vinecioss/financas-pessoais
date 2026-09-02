"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  createTransaction,
  deleteTransaction,
  getAccounts,
  getAllTransactions,
  getCategories,
  updateTransaction,
  type TransactionInput,
} from "@/lib/queries";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { TransactionRow } from "@/components/TransactionRow";
import { TransactionFormModal } from "@/components/TransactionFormModal";
import type { Account, Category, TransactionWithCategory } from "@/types/database";

type Filter = "todos" | "receita" | "despesa";

export default function LancamentosPage() {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionWithCategory | null>(null);

  async function reload() {
    const supabase = createClient();
    const [tx, cat, acc] = await Promise.all([
      getAllTransactions(supabase),
      getCategories(supabase),
      getAccounts(supabase),
    ]);
    setTransactions(tx);
    setCategories(cat);
    setAccounts(acc);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    reload().finally(() => setLoading(false));
  }, []);

  const filtered = transactions.filter((t) => filter === "todos" || t.tipo === filter);

  async function handleSave(input: TransactionInput) {
    const supabase = createClient();
    if (editing) {
      await updateTransaction(supabase, editing.id, input);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await createTransaction(supabase, user.id, input);
    }
    setModalOpen(false);
    setEditing(null);
    await reload();
  }

  async function handleDelete() {
    if (!editing) return;
    const supabase = createClient();
    await deleteTransaction(supabase, editing.id);
    setModalOpen(false);
    setEditing(null);
    await reload();
  }

  return (
    <div className="flex flex-col">
      <Header title="Lançamentos" subtitle="Todos os seus ganhos e gastos" />

      <div className="mx-auto w-full max-w-3xl px-6 lg:px-10">
        <div className="flex items-center justify-between gap-3 py-4">
          <div className="flex gap-1 rounded-full bg-[var(--color-surface-alt)] p-1">
            {(
              [
                ["todos", "Todos"],
                ["receita", "Ganhos"],
                ["despesa", "Gastos"],
              ] as [Filter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className="rounded-full px-3 py-1.5 text-sm transition-colors"
                style={{
                  background: filter === value ? "var(--color-surface)" : "transparent",
                  color: filter === value ? "var(--color-text)" : "var(--color-text-secondary)",
                  fontWeight: filter === value ? 600 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-full bg-[var(--color-green)] px-4 py-2 text-sm font-medium text-[var(--color-bg)]"
          >
            <Plus size={16} />
            Novo
          </button>
        </div>

        <div className="pb-10">
          <Card>
            {loading ? (
              <p className="py-4 text-sm text-[var(--color-text-secondary)]">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="py-4 text-sm text-[var(--color-text-secondary)]">
                Nenhum lançamento encontrado.
              </p>
            ) : (
              filtered.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  onClick={() => {
                    setEditing(t);
                    setModalOpen(true);
                  }}
                />
              ))
            )}
          </Card>
        </div>
      </div>

      {modalOpen && (
        <TransactionFormModal
          categories={categories}
          accounts={accounts}
          editing={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
          onDelete={editing ? handleDelete : undefined}
        />
      )}
    </div>
  );
}
