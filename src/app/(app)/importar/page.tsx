"use client";

import { useEffect, useMemo, useState } from "react";
import { Upload, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTransaction, getAccounts, getCategories } from "@/lib/queries";
import {
  detectColumns,
  parseCsvFile,
  parseDateFlexible,
  parseValueFlexible,
  type ColumnGuess,
  type ParsedCsv,
} from "@/lib/csv";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { formatCurrency } from "@/lib/format";
import type { Account, Category, Tipo } from "@/types/database";

type Step = "upload" | "mapping" | "review" | "done";

interface ReviewRow {
  id: string;
  include: boolean;
  descricao: string;
  tipo: Tipo;
  valor: number;
  data: string;
  categoria_id: string;
  dataValida: boolean;
}

export default function ImportarPage() {
  const [step, setStep] = useState<Step>("upload");
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnGuess>({ date: null, description: null, value: null });
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contaId, setContaId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([getCategories(supabase), getAccounts(supabase)]).then(([cat, acc]) => {
      setCategories(cat);
      setAccounts(acc);
    });
  }, []);

  const mappingComplete = mapping.date && mapping.description && mapping.value;

  async function handleFile(file: File) {
    setError(null);
    try {
      const parsed = await parseCsvFile(file);
      if (parsed.rows.length === 0) {
        setError("Não encontramos linhas nesse arquivo CSV.");
        return;
      }
      const guess = detectColumns(parsed.headers, parsed.rows);
      setCsv(parsed);
      setMapping(guess);
      if (guess.date && guess.description && guess.value) {
        buildReviewRows(parsed, guess);
        setStep("review");
      } else {
        setStep("mapping");
      }
    } catch {
      setError("Não foi possível ler esse arquivo. Verifique se é um CSV válido.");
    }
  }

  function buildReviewRows(parsed: ParsedCsv, map: ColumnGuess) {
    if (!map.date || !map.description || !map.value) return;
    const defaultDespesa = categories.find((c) => c.tipo === "despesa")?.id ?? "";
    const defaultReceita = categories.find((c) => c.tipo === "receita")?.id ?? "";

    const built: ReviewRow[] = parsed.rows.map((r, i) => {
      const rawDate = r[map.date!] ?? "";
      const rawDesc = r[map.description!] ?? "";
      const rawValue = r[map.value!] ?? "";

      const parsedDate = parseDateFlexible(rawDate);
      const parsedValue = parseValueFlexible(rawValue) ?? 0;
      const tipo: Tipo = parsedValue < 0 ? "despesa" : "receita";

      return {
        id: `${i}-${rawDate}-${rawValue}`,
        include: Boolean(parsedDate),
        descricao: rawDesc.trim(),
        tipo,
        valor: Math.abs(parsedValue),
        data: parsedDate ?? "",
        categoria_id: tipo === "despesa" ? defaultDespesa : defaultReceita,
        dataValida: Boolean(parsedDate),
      };
    });

    setRows(built);
  }

  function confirmMapping() {
    if (!csv || !mappingComplete) return;
    buildReviewRows(csv, mapping);
    setStep("review");
  }

  const includedCount = rows.filter((r) => r.include).length;

  async function handleImport() {
    setImporting(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada. Faça login novamente.");
      setImporting(false);
      return;
    }

    const toImport = rows.filter((r) => r.include && r.dataValida && r.categoria_id);
    let count = 0;
    try {
      for (const r of toImport) {
        await createTransaction(supabase, user.id, {
          tipo: r.tipo,
          valor: r.valor,
          categoria_id: r.categoria_id,
          conta_id: contaId || null,
          data: r.data,
          descricao: r.descricao || null,
          forma_pagamento: null,
        });
        count++;
      }
      setImportedCount(count);
      setStep("done");
    } catch {
      setError(`Importação parcial: ${count} de ${toImport.length} lançamentos salvos antes de um erro.`);
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setStep("upload");
    setCsv(null);
    setMapping({ date: null, description: null, value: null });
    setRows([]);
    setImportedCount(0);
    setError(null);
  }

  return (
    <div className="flex flex-col">
      <Header title="Importar extrato" subtitle="Traga lançamentos de um arquivo CSV" />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-6 lg:px-10">
        {error && (
          <p className="rounded-lg border border-[var(--color-expense)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-expense)]">
            {error}
          </p>
        )}

        {step === "upload" && <UploadStep onFile={handleFile} />}

        {step === "mapping" && csv && (
          <MappingStep
            csv={csv}
            mapping={mapping}
            onChange={setMapping}
            onConfirm={confirmMapping}
            canConfirm={Boolean(mappingComplete)}
          />
        )}

        {step === "review" && (
          <ReviewStep
            rows={rows}
            setRows={setRows}
            categories={categories}
            accounts={accounts}
            contaId={contaId}
            onContaChange={setContaId}
            includedCount={includedCount}
            onImport={handleImport}
            importing={importing}
          />
        )}

        {step === "done" && (
          <Card className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-income)]">
              <Check size={24} color="var(--color-bg)" />
            </div>
            <p className="num-serif text-xl">
              {importedCount} lançamento{importedCount === 1 ? "" : "s"} importado
              {importedCount === 1 ? "" : "s"}
            </p>
            <button
              onClick={reset}
              className="mt-2 rounded-lg bg-[var(--color-green)] px-5 py-2.5 text-sm font-medium text-[var(--color-bg)]"
            >
              Importar outro arquivo
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}

function UploadStep({ onFile }: { onFile: (file: File) => void }) {
  return (
    <Card className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-alt)]">
        <Upload size={22} className="text-[var(--color-green)]" />
      </div>
      <div>
        <p className="text-[var(--color-text)]">Selecione um arquivo CSV</p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Vamos identificar as colunas de data, descrição e valor automaticamente.
        </p>
      </div>
      <label className="cursor-pointer rounded-lg bg-[var(--color-green)] px-5 py-2.5 text-sm font-medium text-[var(--color-bg)]">
        Escolher arquivo
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </label>
    </Card>
  );
}

function MappingStep({
  csv,
  mapping,
  onChange,
  onConfirm,
  canConfirm,
}: {
  csv: ParsedCsv;
  mapping: ColumnGuess;
  onChange: (m: ColumnGuess) => void;
  onConfirm: () => void;
  canConfirm: boolean;
}) {
  const sampleRows = csv.rows.slice(0, 3);

  const fields: { key: keyof ColumnGuess; label: string }[] = [
    { key: "date", label: "Coluna de data" },
    { key: "description", label: "Coluna de descrição" },
    { key: "value", label: "Coluna de valor" },
  ];

  return (
    <Card>
      <p className="mb-1 text-sm text-[var(--color-text-secondary)]">Passo 1 de 2</p>
      <p className="mb-4 text-[var(--color-text)]">
        Não identificamos todas as colunas automaticamente. Indique qual é qual:
      </p>

      <div className="flex flex-col gap-4">
        {fields.map(({ key, label }) => (
          <div key={key}>
            <label className="mb-1.5 block text-sm text-[var(--color-text-secondary)]">
              {label}
            </label>
            <select
              value={mapping[key] ?? ""}
              onChange={(e) => onChange({ ...mapping, [key]: e.target.value || null })}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-green)]"
            >
              <option value="">Selecione a coluna</option>
              {csv.headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            {mapping[key] && (
              <p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">
                Amostra: {sampleRows.map((r) => r[mapping[key] as string]).join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onConfirm}
        disabled={!canConfirm}
        className="mt-6 w-full rounded-lg bg-[var(--color-green)] py-3 text-sm font-medium text-[var(--color-bg)] disabled:opacity-50"
      >
        Continuar
      </button>
    </Card>
  );
}

function ReviewStep({
  rows,
  setRows,
  categories,
  accounts,
  contaId,
  onContaChange,
  includedCount,
  onImport,
  importing,
}: {
  rows: ReviewRow[];
  setRows: (rows: ReviewRow[]) => void;
  categories: Category[];
  accounts: Account[];
  contaId: string;
  onContaChange: (id: string) => void;
  includedCount: number;
  onImport: () => void;
  importing: boolean;
}) {
  function updateRow(id: string, patch: Partial<ReviewRow>) {
    setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const totalLabel = useMemo(
    () => `Passo 2 de 2 — ${includedCount} de ${rows.length} selecionados`,
    [includedCount, rows.length]
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--color-text-secondary)]">{totalLabel}</p>

      {accounts.length > 0 && (
        <Card>
          <label className="mb-1.5 block text-sm text-[var(--color-text-secondary)]">
            Conta desta importação (opcional)
          </label>
          <select
            value={contaId}
            onChange={(e) => onContaChange(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-green)]"
          >
            <option value="">Nenhuma</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
            Aplicada a todos os lançamentos selecionados abaixo.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {rows.map((r) => {
          const options = categories.filter((c) => c.tipo === r.tipo);
          return (
            <Card key={r.id} className={r.include ? "" : "opacity-50"}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={r.include}
                  onChange={(e) => updateRow(r.id, { include: e.target.checked })}
                  className="mt-1.5 h-4 w-4 shrink-0 accent-[var(--color-green)]"
                />
                <div className="flex flex-1 flex-col gap-2">
                  {!r.dataValida && (
                    <p className="text-xs text-[var(--color-expense)]">
                      Data não reconhecida — este item não será importado.
                    </p>
                  )}
                  <input
                    value={r.descricao}
                    onChange={(e) => updateRow(r.id, { descricao: e.target.value })}
                    placeholder="Descrição"
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-green)]"
                  />

                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 rounded-full bg-[var(--color-surface-alt)] p-1">
                      {(["receita", "despesa"] as Tipo[]).map((t) => (
                        <button
                          key={t}
                          onClick={() =>
                            updateRow(r.id, {
                              tipo: t,
                              categoria_id:
                                categories.find((c) => c.tipo === t)?.id ?? "",
                            })
                          }
                          className="rounded-full px-2.5 py-1 text-xs"
                          style={{
                            background: r.tipo === t ? "var(--color-surface)" : "transparent",
                            color:
                              r.tipo === t
                                ? t === "receita"
                                  ? "var(--color-income)"
                                  : "var(--color-expense)"
                                : "var(--color-text-secondary)",
                            fontWeight: r.tipo === t ? 600 : 400,
                          }}
                        >
                          {t === "receita" ? "Ganho" : "Gasto"}
                        </button>
                      ))}
                    </div>
                    <span className="num-serif ml-auto text-sm">
                      {formatCurrency(r.valor)}
                    </span>
                  </div>

                  <select
                    value={r.categoria_id}
                    onChange={(e) => updateRow(r.id, { categoria_id: e.target.value })}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-green)]"
                  >
                    {options.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <button
        onClick={onImport}
        disabled={importing || includedCount === 0}
        className="sticky bottom-4 rounded-lg bg-[var(--color-green)] py-3 text-sm font-medium text-[var(--color-bg)] disabled:opacity-50"
      >
        {importing ? "Importando..." : `Importar ${includedCount} lançamento${includedCount === 1 ? "" : "s"}`}
      </button>
    </div>
  );
}
