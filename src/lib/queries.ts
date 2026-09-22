import type { createClient } from "@/lib/neon/client";
import type {
  Account,
  Budget,
  Category,
  ContaTipo,
  GastoFixo,
  Tipo,
  TransactionWithCategory,
} from "@/types/database";

type Client = ReturnType<typeof createClient>;

export async function getCategories(db: Client): Promise<Category[]> {
  const { data, error } = await db
    .from("categories")
    .select("*")
    .order("nome");
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(
  db: Client,
  tipo: Tipo,
  nome: string
) {
  const { error } = await db.from("categories").insert({ tipo, nome });
  if (error) throw error;
}

export async function deleteCategory(db: Client, id: string) {
  const { error } = await db.from("categories").delete().eq("id", id);
  if (error) throw error;
}

export async function getAccounts(db: Client): Promise<Account[]> {
  const { data, error } = await db
    .from("accounts")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function createAccount(
  db: Client,
  tipo: ContaTipo,
  nome: string,
  saldoInicial: number
) {
  const { error } = await db
    .from("accounts")
    .insert({ tipo, nome, saldo_inicial: saldoInicial });
  if (error) throw error;
}

export async function updateAccount(
  db: Client,
  id: string,
  fields: {
    nome?: string;
    saldo_inicial?: number;
    dia_fechamento?: number | null;
    dia_vencimento?: number | null;
  }
) {
  const { error } = await db.from("accounts").update(fields).eq("id", id);
  if (error) throw error;
}

export async function deleteAccount(db: Client, id: string) {
  const { error } = await db.from("accounts").delete().eq("id", id);
  if (error) throw error;
}

export async function getBudgets(db: Client): Promise<Budget[]> {
  const { data, error } = await db.from("budgets").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function upsertBudget(
  db: Client,
  categoriaId: string,
  limiteMensal: number
) {
  const { error } = await db
    .from("budgets")
    .upsert(
      { categoria_id: categoriaId, limite_mensal: limiteMensal },
      { onConflict: "user_id,categoria_id" }
    );
  if (error) throw error;
}

export async function deleteBudget(db: Client, categoriaId: string) {
  const { error } = await db
    .from("budgets")
    .delete()
    .eq("categoria_id", categoriaId);
  if (error) throw error;
}

export async function getGastosFixos(db: Client): Promise<GastoFixo[]> {
  const { data, error } = await db
    .from("gastos_fixos")
    .select("*")
    .order("nome");
  if (error) throw error;
  return data ?? [];
}

export interface GastoFixoInput {
  tipo: Tipo;
  nome: string;
  valor: number;
  categoria_id: string;
  conta_id: string | null;
  dia_vencimento: number | null;
}

export async function createGastoFixo(
  db: Client,
  input: GastoFixoInput
) {
  const { error } = await db.from("gastos_fixos").insert(input);
  if (error) throw error;
}

export async function updateGastoFixo(
  db: Client,
  id: string,
  input: GastoFixoInput
) {
  const { error } = await db.from("gastos_fixos").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteGastoFixo(db: Client, id: string) {
  const { error } = await db.from("gastos_fixos").delete().eq("id", id);
  if (error) throw error;
}

const TRANSACTION_SELECT = "*, categories ( id, nome, tipo ), accounts ( id, nome, tipo )";

export async function getTransactionsInRange(
  db: Client,
  start: string,
  end: string
): Promise<TransactionWithCategory[]> {
  const { data, error } = await db
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
  db: Client
): Promise<TransactionWithCategory[]> {
  const { data, error } = await db
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
  gasto_fixo_id?: string | null;
}

export async function createTransaction(
  db: Client,
  input: TransactionInput
) {
  const { error } = await db.from("transactions").insert(input);
  if (error) throw error;
}

export async function updateTransaction(
  db: Client,
  id: string,
  input: TransactionInput
) {
  const { error } = await db
    .from("transactions")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTransaction(db: Client, id: string) {
  const { error } = await db.from("transactions").delete().eq("id", id);
  if (error) throw error;
}
