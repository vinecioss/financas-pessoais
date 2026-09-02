"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { FORMAS_PAGAMENTO } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import type { Category, Tipo, TransactionWithCategory } from "@/types/database";
import type { TransactionInput } from "@/lib/queries";

export function TransactionFormModal({
  categories,
  editing,
  onClose,
  onSave,
  onDelete,
}: {
  categories: Category[];
  editing: TransactionWithCategory | null;
  onClose: () => void;
  onSave: (input: TransactionInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [tipo, setTipo] = useState<Tipo>(editing?.tipo ?? "despesa");
  const [valor, setValor] = useState(editing ? String(editing.valor) : "");
  const [categoriaId, setCategoriaId] = useState(editing?.categoria_id ?? "");
  const [data, setData] = useState(editing?.data ?? todayISO());
  const [descricao, setDescricao] = useState(editing?.descricao ?? "");
  const [formaPagamento, setFormaPagamento] = useState(editing?.forma_pagamento ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCategories = categories.filter((c) => c.tipo === tipo);

  function handleTipoChange(next: Tipo) {
    setTipo(next);
    const stillValid = categories.some(
      (c) => c.tipo === next && c.id === categoriaId
    );
    if (!stillValid) {
      setCategoriaId(categories.find((c) => c.tipo === next)?.id ?? "");
    }
  }

  async function handleSubmit() {
    setError(null);
    const parsedValor = Number(valor.replace(",", "."));
    if (!parsedValor || parsedValor <= 0) {
      setError("Informe um valor válido.");
      return;
    }
    if (!categoriaId) {
      setError("Selecione uma categoria.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        tipo,
        valor: parsedValor,
        categoria_id: categoriaId,
        data,
        descricao: descricao.trim() || null,
        forma_pagamento: formaPagamento || null,
      });
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/30 sm:items-center">
      <div className="flex max-h-[90dvh] w-full max-w-[420px] flex-col overflow-y-auto rounded-t-2xl bg-[var(--color-surface)] p-6 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="num-serif text-xl text-[var(--color-text)]">
            {editing ? "Editar lançamento" : "Novo lançamento"}
          </h2>
          <button onClick={onClose} aria-label="Fechar">
            <X size={20} className="text-[var(--color-text-secondary)]" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => handleTipoChange("receita")}
            className="rounded-lg border py-2 text-sm font-medium"
            style={{
              borderColor: tipo === "receita" ? "var(--color-income)" : "var(--color-border)",
              background: tipo === "receita" ? "var(--color-income)" : "transparent",
              color: tipo === "receita" ? "var(--color-bg)" : "var(--color-text)",
            }}
          >
            Ganho
          </button>
          <button
            onClick={() => handleTipoChange("despesa")}
            className="rounded-lg border py-2 text-sm font-medium"
            style={{
              borderColor: tipo === "despesa" ? "var(--color-expense)" : "var(--color-border)",
              background: tipo === "despesa" ? "var(--color-expense)" : "transparent",
              color: tipo === "despesa" ? "var(--color-bg)" : "var(--color-text)",
            }}
          >
            Gasto
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <Field label="Valor">
            <input
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              className="input"
            />
          </Field>

          <Field label="Categoria">
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="input"
            >
              {filteredCategories.length === 0 && <option value="">Nenhuma categoria</option>}
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Data">
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Descrição (opcional)">
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: mercado da semana"
              className="input"
            />
          </Field>

          <Field label="Forma de pagamento">
            <select
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
              className="input"
            >
              <option value="">Não informado</option>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {error && <p className="mt-3 text-sm text-[var(--color-expense)]">{error}</p>}

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-[var(--color-green)] py-3 font-medium text-[var(--color-bg)] disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>

          {editing && onDelete && (
            <>
              {confirmDelete ? (
                <div className="flex gap-2">
                  <button
                    onClick={onDelete}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--color-expense)] py-3 text-sm font-medium text-[var(--color-expense)]"
                  >
                    <Trash2 size={16} />
                    Confirmar exclusão
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-secondary)]"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center justify-center gap-2 rounded-lg py-3 text-sm text-[var(--color-expense)]"
                >
                  <Trash2 size={16} />
                  Excluir lançamento
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        .input {
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          padding: 0.65rem 0.85rem;
          background: var(--color-surface);
          color: var(--color-text);
          outline: none;
        }
        .input:focus {
          border-color: var(--color-green);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-[var(--color-text-secondary)]">
      {label}
      {children}
    </label>
  );
}
