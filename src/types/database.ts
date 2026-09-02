export type Tipo = "receita" | "despesa";

export type FormaPagamento =
  | "Pix"
  | "Dinheiro"
  | "Cartão de Débito"
  | "Cartão de Crédito"
  | "Vale Alimentação"
  | "Transferência"
  | "Boleto";

export type ContaTipo = "conta" | "cartao" | "investimento";

export interface Category {
  id: string;
  user_id: string;
  tipo: Tipo;
  nome: string;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  tipo: ContaTipo;
  nome: string;
  saldo_inicial: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  tipo: Tipo;
  valor: number;
  categoria_id: string;
  conta_id: string | null;
  data: string;
  descricao: string | null;
  forma_pagamento: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  categoria_id: string;
  limite_mensal: number;
}

export interface TransactionWithCategory extends Transaction {
  categories: Pick<Category, "id" | "nome" | "tipo"> | null;
  accounts: Pick<Account, "id" | "nome" | "tipo"> | null;
}
