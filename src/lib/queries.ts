import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Budget,
  Category,
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

export async function getTransactionsInRange(
  supabase: Client,
  start: string,
  end: string
): Promise<TransactionWithCategory[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*, categories ( id, nome, tipo )")
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
    .select("*, categories ( id, nome, tipo )")
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TransactionWithCategory[];
}

export interface TransactionInput {
  tipo: Tipo;
  valor: number;
  categoria_id: string;
  data: string;
  descricao: string | null;
  forma_pagamento: string | null;
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
