import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Account,
  Budget,
  Category,
  ContaTipo,
  GastoFixo,
  Tipo,
  TransactionWithCategory,
} from "@/types/database";

type Client = SupabaseClient;

export async function getCategories(supabase: Client): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("nome");
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(
  supabase: Client,
  userId: string,
  tipo: Tipo,
  nome: string
) {
  const { error } = await supabase
    .from("categories")
    .insert({ user_id: userId, tipo, nome });
  if (error) throw error;
}

export async function deleteCategory(supabase: Client, id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

export async function getAccounts(supabase: Client): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function createAccount(
  supabase: Client,
  userId: string,
  tipo: ContaTipo,
  nome: string,
  saldoInicial: number
) {
  const { error } = await supabase
    .from("accounts")
    .insert({ user_id: userId, tipo, nome, saldo_inicial: saldoInicial });
  if (error) throw error;
}

export async function updateAccount(
  supabase: Client,
  id: string,
  fields: {
    nome?: string;
    saldo_inicial?: number;
    dia_fechamento?: number | null;
    dia_vencimento?: number | null;
  }
) {
  const { error } = await supabase.from("accounts").update(fields).eq("id", id);
  if (error) throw error;
}

export async function deleteAccount(supabase: Client, id: string) {
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}

export async function getBudgets(supabase: Client): Promise<Budget[]> {
  const { data, error } = await supabase.from("budgets").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function upsertBudget(
  supabase: Client,
  userId: string,
  categoriaId: string,
  limiteMensal: number
) {
  const { error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: userId, categoria_id: categoriaId, limite_mensal: limiteMensal },
      { onConflict: "user_id,categoria_id" }
    );
  if (error) throw error;
}

export async function deleteBudget(supabase: Client, categoriaId: string) {
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("categoria_id", categoriaId);
  if (error) throw error;
}

export async function getGastosFixos(supabase: Client): Promise<GastoFixo[]> {
  const { data, error } = await supabase
    .from("gastos_fixos")
    .select("*")
    .order("nome");
  if (error) throw error;
  return data ?? [];
}

export interface GastoFixoInput {
  nome: string;
  valor: number;
  categoria_id: string;
  conta_id: string | null;
  dia_vencimento: number | null;
}

export async function createGastoFixo(
  supabase: Client,
  userId: string,
  input: GastoFixoInput
) {
  const { error } = await supabase
    .from("gastos_fixos")
    .insert({ ...input, user_id: userId });
  if (error) throw error;
}

export async function updateGastoFixo(
  supabase: Client,
  id: string,
  input: GastoFixoInput
) {
  const { error } = await supabase.from("gastos_fixos").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteGastoFixo(supabase: Client, id: string) {
  const { error } = await supabase.from("gastos_fixos").delete().eq("id", id);
  if (error) throw error;
}

const TRANSACTION_SELECT = "*, categories ( id, nome, tipo ), accounts ( id, nome, tipo )";

export async function getTransactionsInRange(
  supabase: Client,
  start: string,
  end: string
): Promise<TransactionWithCategory[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select(TRANSACTION_SELECT)
    .gte("data", start)
    .lte("data", end)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TransactionWithCategory[];
}

export async function getAllTransactions(
  supabase: Client
): Promise<TransactionWithCategory[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select(TRANSACTION_SELECT)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TransactionWithCategory[];
}

export interface TransactionInput {
  tipo: Tipo;
  valor: number;
  categoria_id: string;
  conta_id: string | null;
  data: string;
  descricao: string | null;
  forma_pagamento: string | null;
  gasto_fixo_id?: string | null;
}

export async function createTransaction(
  supabase: Client,
  userId: string,
  input: TransactionInput
) {
  const { error } = await supabase
    .from("transactions")
    .insert({ ...input, user_id: userId });
  if (error) throw error;
}

export async function updateTransaction(
  supabase: Client,
  id: string,
  input: TransactionInput
) {
  const { error } = await supabase
    .from("transactions")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTransaction(supabase: Client, id: string) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}
